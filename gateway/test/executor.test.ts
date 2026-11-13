import test from "node:test";
import assert from "node:assert/strict";
import dgram from "node:dgram";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildAck, encodeDatagram } from "@campusconnect/protocol";
import { NoticeStore } from "../../emergency-receiver/src/store.js";
import { NoticeReceiver } from "../../emergency-receiver/src/receiver-core.js";
import { UdpChannel } from "../src/delivery/executor.js";

const keys = { k1: "g".repeat(40) };

/** Real UDP receiver wrapping the production receiver core, plus a controllable impairment layer. */
async function startReceiver(imp: { dropNext?: number; delayMs?: number; mute?: boolean } = {}) {
  const store = new NoticeStore(path.join(mkdtempSync(path.join(tmpdir(), "gw-")), "r.db"));
  const rx = new NoticeReceiver({ receiverId: "RX-LIB", keys, activeKid: "k1", store, ackMode: "LOCAL_DURABLE" });
  const sock = dgram.createSocket("udp4");
  let seen = 0; let closed = false; const pending = new Set<NodeJS.Timeout>();
  sock.on("message", async (msg, r) => {
    seen += 1;
    if (imp.mute) return;
    if (imp.dropNext && imp.dropNext > 0) { imp.dropNext -= 1; return; }          // loss on the forward path
    const out = await rx.handle(msg);
    if (out.ack) {
      const t = setTimeout(() => { pending.delete(t); if (!closed) sock.send(out.ack!, r.port, r.address); }, imp.delayMs ?? 0);
      pending.add(t);
    }
  });
  await new Promise<void>((res) => sock.bind(0, "127.0.0.1", res));
  return { port: (sock.address() as dgram.AddressInfo).port, store, rx, imp, close: () => { closed = true; pending.forEach(clearTimeout); sock.close(); store.close(); }, seen: () => seen };
}
const mkChannel = async (port: number) => { const c = new UdpChannel("127.0.0.1", port, "RX-LIB", keys, "k1"); await c.bind(); return c; };

test("N-02: a lost first copy is covered by the SCHEDULED second copy (no ACK-timeout wait) and the confirmed ACK is verified", async () => {
  const rx = await startReceiver({ dropNext: 1 }); const ch = await mkChannel(rx.port);
  const t0 = Date.now();
  const r = await ch.deliver({ actionId: "A7", text: "TEST NOTICE", zones: ["LIB-F2-E"], deadlineMs: 2000, timeoutMs: 800 });
  assert.equal(r.state, "DELIVERED_CONFIRMED"); assert.equal(r.unconfirmed, false);
  assert.equal(r.confirmedBy?.cpy, 2); assert.equal(r.confirmedBy?.rnd, 0);
  assert.ok(Date.now() - t0 < 400, "confirmed well before the 800 ms round timeout");        // sequential retries would take >= 800 ms
  assert.equal(r.attempts.length, 2); assert.ok(r.attempts[1].sentAt - r.attempts[0].sentAt >= 25);   // spacing honoured
  assert.equal(rx.store.count(), 1); assert.equal(ch.counters.ackInvalid, 0);
  assert.ok(typeof r.offsetMs === "number" && typeof r.delayMs === "number");
  ch.close(); rx.close();
});

test("cancel-on-ACK: later copies of a confirmed message are not sent", async () => {
  const rx = await startReceiver(); const ch = await mkChannel(rx.port);
  const r = await ch.deliver({ actionId: "A10", text: "TEST NOTICE", zones: ["Z"], deadlineMs: 2000, timeoutMs: 500 }); // k=4, spacing 30 ms
  assert.equal(r.state, "DELIVERED_CONFIRMED");
  assert.equal(r.attempts.length, 1, "first copy answered in ~1 ms; copies 2-4 must have been cancelled");
  ch.close(); rx.close();
});

test("S-04: a forged ACK from an attacker is ignored; the message is NOT reported delivered", async () => {
  const atk = dgram.createSocket("udp4");
  atk.on("message", (msg, r) => {                       // attacker answers every datagram with an ACK signed by the wrong key
    const n = JSON.parse(msg.toString());
    const fake = buildAck({ mid: n.mid, rnd: n.rnd, cpy: n.cpy, seq: n.seq, rid: "RX-LIB", kid: "k1", st: "RECEIVED", t2: 1, t3: 2, proc_ms: 1, qd: 0, wnd: { max: 0, bitmap: "" } }, { k1: "x".repeat(40) });
    atk.send(encodeDatagram(fake), r.port, r.address);
  });
  await new Promise<void>((res) => atk.bind(0, "127.0.0.1", res));
  const ch = await mkChannel((atk.address() as dgram.AddressInfo).port);
  const r = await ch.deliver({ actionId: "A7", text: "TEST", zones: ["Z"], deadlineMs: 600, timeoutMs: 200 });
  assert.equal(r.state, "DEGRADED_FALLBACK"); assert.equal(r.unconfirmed, true);
  assert.ok(ch.counters.ackInvalid >= 1);
  ch.close(); atk.close();
});

test("receiver down: every round times out, result is unconfirmed DEGRADED_FALLBACK, never DELIVERED", async () => {
  const rx = await startReceiver({ mute: true }); const ch = await mkChannel(rx.port);
  const r = await ch.deliver({ actionId: "A9", text: "TEST", zones: ["Z"], deadlineMs: 700, timeoutMs: 150 });
  assert.equal(r.state, "DEGRADED_FALLBACK"); assert.equal(r.unconfirmed, true);
  assert.ok(r.attempts.length >= 3, "two rounds of spaced copies");
  ch.close(); rx.close();
});

test("an ACK that arrives after the deadline does not count as on-time delivery", async () => {
  const rx = await startReceiver({ delayMs: 500 }); const ch = await mkChannel(rx.port);
  const r = await ch.deliver({ actionId: "A5", text: "TEST", zones: ["Z"], deadlineMs: 250, timeoutMs: 100 });
  assert.equal(r.state, "DEGRADED_FALLBACK");
  ch.close(); rx.close();
});

test("duplicate delivery of copies is idempotent: exactly one stored notice when copies both arrive", async () => {
  const rx = await startReceiver({ delayMs: 60 }); const ch = await mkChannel(rx.port);
  const r = await ch.deliver({ actionId: "A6", text: "TEST", zones: ["Z"], deadlineMs: 1500, timeoutMs: 600 }); // two back-to-back copies, ACK delayed
  assert.equal(r.state, "DELIVERED_CONFIRMED"); assert.equal(rx.store.count(), 1);
  assert.equal(r.attempts.length, 2);
  ch.close(); rx.close();
});

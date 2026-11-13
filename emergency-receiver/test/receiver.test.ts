import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildNotice, encodeDatagram, parseAck, verifyEnvelope } from "@campusconnect/protocol";
import { NoticeStore } from "../src/store.js";
import { NoticeReceiver } from "../src/receiver-core.js";

const keys = { k1: "r".repeat(40) };
const T0 = 1_800_000_000_000;
const dbFile = () => path.join(mkdtempSync(path.join(tmpdir(), "rx-")), "r.db");
const mk = (seq: number, over: Record<string, unknown> = {}, iat = T0) => buildNotice({
  mid: "mid-" + (over.mid ?? "A"), rnd: 0, cpy: 1, seq, iat, cls: "CRITICAL_NOTICE", pri: "HIGH", pol: "static/S1",
  rid: "RX-LIB", kid: "k1", test: true, body: { zones: ["LIB-F2-E"], text: "TEST NOTICE" }, ...over
}, keys);
const make = (file = dbFile(), extra: Record<string, unknown> = {}) => {
  const store = new NoticeStore(file);
  let now = T0 + 50;
  const rx = new NoticeReceiver({ receiverId: "RX-LIB", keys, activeKid: "k1", store, ackMode: "LOCAL_DURABLE", now: () => now, ...extra });
  return { rx, store, file, setNow: (n: number) => { now = n; } };
};

test("valid notice is stored once and answered with a verifiable signed ACK carrying t2/t3", async () => {
  const { rx, store } = make();
  const out = await rx.handle(encodeDatagram(mk(1)));
  assert.equal(out.verdict, "RECEIVED");
  const ack = parseAck(out.ack!)!;
  assert.equal(verifyEnvelope(ack as any, keys).ok, true);
  assert.equal(ack.mid, "mid-A"); assert.equal(ack.cpy, 1); assert.equal(ack.st, "RECEIVED");
  assert.ok(ack.t3 >= ack.t2);
  assert.equal(store.count(), 1);
});

test("AT: two copies arriving simultaneously give exactly one stored row and two ACKs", async () => {
  const { rx, store } = make();
  const [a, b] = await Promise.all([
    rx.handle(encodeDatagram(mk(1, { cpy: 1 }))),
    rx.handle(encodeDatagram(mk(2, { cpy: 2 })))
  ]);
  assert.equal(store.count(), 1);
  assert.ok(a.ack && b.ack);
  assert.deepEqual([a.verdict, b.verdict].sort(), ["DUPLICATE", "RECEIVED"]);
});

test("replaying a captured datagram is rejected (REPLAY) and produces no ACK", async () => {
  const { rx } = make();
  const d = encodeDatagram(mk(5));
  assert.equal((await rx.handle(d)).verdict, "RECEIVED");
  const again = await rx.handle(d);
  assert.equal(again.verdict, "REJECTED_REPLAY");
  assert.equal(again.ack, undefined);
});

test("AT-14: replay protection survives a receiver restart", async () => {
  const file = dbFile();
  const first = make(file);
  const d = encodeDatagram(mk(9));
  assert.equal((await first.rx.handle(d)).verdict, "RECEIVED");
  first.store.close();
  const second = make(file);
  assert.equal((await second.rx.handle(d)).verdict, "REJECTED_REPLAY");
});

test("reordered datagrams inside the window are accepted", async () => {
  const { rx } = make();
  assert.equal((await rx.handle(encodeDatagram(mk(10, { mid: "x10" })))).verdict, "RECEIVED");
  assert.equal((await rx.handle(encodeDatagram(mk(8, { mid: "x8" })))).verdict, "RECEIVED");
  assert.equal((await rx.handle(encodeDatagram(mk(9, { mid: "x9" })))).verdict, "RECEIVED");
});

test("wrong key, tampered body, wrong receiver, non-test notice are all rejected with a reason", async () => {
  const { rx } = make();
  const evil = buildNotice({ mid: "e", rnd: 0, cpy: 1, seq: 1, iat: T0, cls: "CRITICAL_NOTICE", pri: "HIGH", pol: "p", rid: "RX-LIB", kid: "k1", test: true, body: { zones: [], text: "x" } }, { k1: "z".repeat(40) });
  assert.equal((await rx.handle(encodeDatagram(evil))).verdict, "REJECTED_SIG");
  const good = mk(2) as any;
  assert.equal((await rx.handle(Buffer.from(JSON.stringify({ ...good, body: { zones: [], text: "tampered" } })))).verdict, "REJECTED_SIG");
  assert.equal((await rx.handle(encodeDatagram(mk(3, { rid: "RX-OTHER" })))).verdict, "REJECTED_WRONG_RECEIVER");
  assert.equal((await rx.handle(Buffer.alloc(1300, 1))).verdict, "REJECTED_SIZE");
});

test("clock-skewed sender is rejected with REJECTED_TIME; expired notice is rejected", async () => {
  const { rx } = make();
  const skew = await rx.handle(encodeDatagram(mk(1, {}, T0 - 120_000)));
  assert.equal(skew.verdict, "REJECTED_TIME");
  assert.match(String(skew.reason), /skew/);
  const exp = await rx.handle(encodeDatagram(mk(2, { exp: T0 + 10 })));
  assert.equal(exp.verdict, "REJECTED_TIME");
});

test("BACKEND_DURABLE: no ACK when the backend cannot persist (ACK means what it promises)", async () => {
  const { rx, store } = make(dbFile(), { ackMode: "BACKEND_DURABLE", backendSync: async () => { throw new Error("down"); } });
  const out = await rx.handle(encodeDatagram(mk(1)));
  assert.equal(out.verdict, "BACKEND_UNAVAILABLE");
  assert.equal(out.ack, undefined);
  assert.equal(store.count(), 0);
});

test("LOCAL_DURABLE: ACK is sent while backend is down; receipts sync later (wal_lag shrinks)", async () => {
  let up = false; const synced: string[] = [];
  const { rx } = make(dbFile(), { backendSync: async (n: { mid: string }) => { if (!up) throw new Error("down"); synced.push(n.mid); } });
  assert.ok((await rx.handle(encodeDatagram(mk(1)))).ack);
  assert.equal(rx.health().wal_lag, 1);
  assert.equal(await rx.syncPending(), 0);
  up = true;
  assert.equal(await rx.syncPending(), 1);
  assert.equal(rx.health().wal_lag, 0);
});

test("fault injection: dropAcks stores the notice but sends no ACK", async () => {
  const { rx, store } = make();
  rx.faults.dropAcks = true;
  const out = await rx.handle(encodeDatagram(mk(1)));
  assert.equal(out.ack, undefined);
  assert.equal(store.count(), 1);
});

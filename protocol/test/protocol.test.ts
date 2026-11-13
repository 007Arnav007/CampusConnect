import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAck, buildNotice, canonicalize, encodeDatagram, encodeFrame, FrameDecoder, FrameError,
  ntpEstimate, parseAck, parseNotice, ReplayWindow, signEnvelope, verifyEnvelope, MAX_DATAGRAM_BYTES
} from "../src/index.js";

const keys = { k1: "a".repeat(32) + "-primary", k0: "b".repeat(32) + "-old" };
const base = {
  mid: "11111111-2222-3333-4444-555555555555", rnd: 0, cpy: 1, seq: 1042, iat: 1_762_507_270_123,
  cls: "CRITICAL_NOTICE" as const, pri: "HIGH" as const, pol: "as-1/A9/snap-0412", rid: "RX-LIB", kid: "k1",
  test: true, body: { zones: ["LIB-F2-E"], text: "TEST NOTICE: network maintenance" }
};

// ---------- B-01 reproduction (model of the v1 server-owned sequence logic) ----------
test("B-01: the legacy server-owned sequence can never confirm a receipt (documented defect)", () => {
  // Faithful in-memory model of ReceiverSequenceService.next() + DeliveryRecordService.recordEmergencyReceipt():
  //  next():   last = last + 1; RETURN last
  //  receipt:  UPDATE ... SET last = incoming WHERE last < incoming   -> 0 rows when incoming == last
  let last = 0;
  const next = () => ++last;
  const recordReceipt = (incoming: number) => { if (!(last < incoming)) throw new Error("stale or already used"); last = incoming; };
  const seq = next();                 // gateway asks the backend for a sequence
  assert.throws(() => recordReceipt(seq), /stale or already used/); // receiver can never be confirmed
});

test("B-01 fixed: sender-owned sequence + sliding window accepts every in-order and reordered datagram once", () => {
  const w = new ReplayWindow();
  for (const s of [1, 2, 3, 5, 4]) assert.equal(w.check(s), "ACCEPT"); // 4 arrives after 5: reordered but valid
});

// ---------- signing (S-03, S-04) ----------
test("S-03: signature covers version, type, kid, test flag and body (type-confusion/downgrade rejected)", () => {
  const n = buildNotice(base, keys);
  assert.deepEqual(verifyEnvelope(n as any, keys), { ok: true });
  for (const [field, value] of Object.entries({ t: "ACK", v: 1, test: false, cls: "TICKET_EVENT", rid: "RX-OTHER", pri: "LOW" })) {
    assert.equal(verifyEnvelope({ ...n, [field]: value } as any, keys).ok, false, `tampering ${field} must break the MAC`);
  }
  assert.equal(verifyEnvelope({ ...n, body: { ...n.body, text: "x" } } as any, keys).ok, false);
});

test("key rotation: both keys verify, unknown kid is rejected", () => {
  const a = buildNotice({ ...base, kid: "k0" }, keys);
  const b = buildNotice({ ...base, kid: "k1" }, keys);
  assert.equal(verifyEnvelope(a as any, keys).ok, true);
  assert.equal(verifyEnvelope(b as any, keys).ok, true);
  assert.deepEqual(verifyEnvelope({ ...b, kid: "k9" } as any, keys), { ok: false, reason: "UNKNOWN_KID" });
  assert.deepEqual(verifyEnvelope({ ...b, kid: "k1", sig: "AAAA" } as any, keys), { ok: false, reason: "BAD_SIG" });
});

test("S-04: a forged or mismatched ACK does not verify", () => {
  const ack = buildAck({ mid: base.mid, rnd: 0, cpy: 1, seq: 1042, rid: "RX-LIB", kid: "k1", st: "RECEIVED", t2: 1, t3: 2, proc_ms: 1, qd: 0, wnd: { max: 1042, bitmap: "AA" } }, keys);
  assert.equal(verifyEnvelope(ack as any, keys).ok, true);
  const forged = { ...ack, st: "RECEIVED", mid: "99999999-2222-3333-4444-555555555555" };
  assert.equal(verifyEnvelope(forged as any, keys).ok, false);
  const attackerKey = { k1: "z".repeat(40) };
  const attackerAck = signEnvelope({ ...ack, sig: undefined } as any, attackerKey);
  assert.equal(verifyEnvelope(attackerAck as any, keys).ok, false);
});

test("canonicalisation is order independent and matches RFC 8785 sorting", () => {
  assert.equal(canonicalize({ b: 1, a: [true, null, "é"], c: { z: 1, y: 2 } }), '{"a":[true,null,"é"],"b":1,"c":{"y":2,"z":1}}');
  assert.equal(canonicalize({ a: 1, b: 2 }), canonicalize({ b: 2, a: 1 }));
  assert.throws(() => canonicalize({ a: NaN }));
});

// ---------- size / limits (N-01) ----------
test("N-01: datagrams above 1200 B are refused at build and parse time", () => {
  assert.throws(() => buildNotice({ ...base, body: { zones: Array.from({ length: 80 }, (_, i) => `ZONE-${i}-ABCDEFGH`), text: "x" } }, keys), /limit is 1200/);
  assert.equal(parseNotice(Buffer.alloc(MAX_DATAGRAM_BYTES + 1, 65)).ok, false);
  assert.throws(() => buildNotice({ ...base, test: false }, keys), /test=true/);
  assert.throws(() => buildNotice({ ...base, body: { zones: [], text: "x".repeat(401) } }, keys));
});

test("parseNotice accepts a well-formed signed notice and rejects garbage", () => {
  const n = buildNotice(base, keys);
  const p = parseNotice(encodeDatagram(n));
  assert.equal(p.ok, true);
  assert.equal(parseNotice(Buffer.from("not json")).ok, false);
  assert.equal(parseNotice(Buffer.from(JSON.stringify({ ...n, rnd: "0" }))).ok, false);
  assert.equal(parseAck(Buffer.from("{}")), undefined);
});

// ---------- anti-replay window (S-05) ----------
test("replay window: duplicates, window edge and far-future jump", () => {
  const w = new ReplayWindow();
  assert.equal(w.check(100), "ACCEPT");
  assert.equal(w.check(100), "REPLAY");
  assert.equal(w.check(99), "ACCEPT");
  assert.equal(w.check(99), "REPLAY");
  assert.equal(w.check(37), "ACCEPT");   // window holds offsets 0..63, so 100-63 = 37 is the oldest valid sequence
  assert.equal(w.check(36), "TOO_OLD");
  assert.equal(w.check(1000), "ACCEPT"); // window jumps; everything before is now too old
  assert.equal(w.check(100), "TOO_OLD");
});

test("replay window: restart does not reopen the replay hole (AT-14)", () => {
  const w = new ReplayWindow();
  [10, 12, 11, 15].forEach((s) => w.check(s));
  const r = ReplayWindow.restore(JSON.parse(JSON.stringify(w.snapshot())));
  for (const s of [10, 11, 12, 15]) assert.equal(r.check(s), "REPLAY");
  assert.equal(r.check(13), "ACCEPT");
});

test("replay window property: any permutation within 64 of the max is accepted exactly once", () => {
  let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  for (let trial = 0; trial < 200; trial++) {
    const seqs = Array.from({ length: 64 }, (_, i) => 1000 + i);
    for (let i = seqs.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [seqs[i], seqs[j]] = [seqs[j], seqs[i]]; }
    const w = new ReplayWindow();
    // push the largest first so the entire set lies inside the window
    w.check(1063);
    for (const s of seqs) assert.equal(w.check(s), s === 1063 ? "REPLAY" : "ACCEPT");
    for (const s of seqs) assert.equal(w.check(s), "REPLAY");
  }
});

// ---------- framing (N-04) ----------
test("N-04: multi-byte characters split across TCP chunks survive", () => {
  const text = JSON.stringify({ msg: "नमस्ते 🌐 café" });
  const frame = encodeFrame(text);
  const d = new FrameDecoder();
  const got: Buffer[] = [];
  for (let i = 0; i < frame.length; i++) got.push(...d.push(frame.subarray(i, i + 1))); // one byte at a time
  assert.equal(got.length, 1);
  assert.equal(got[0].toString("utf8"), text);
});

test("framing: coalesced frames, oversize and zero-length frames", () => {
  const d = new FrameDecoder();
  const both = Buffer.concat([encodeFrame("one"), encodeFrame("two")]);
  assert.deepEqual(d.push(both).map(String), ["one", "two"]);
  assert.throws(() => d.push(Buffer.from([0xff, 0xff, 0xff, 0xff])), (e: unknown) => e instanceof FrameError && e.code === "OVERSIZE");
  assert.throws(() => new FrameDecoder().push(Buffer.from([0, 0, 0, 0])), FrameError);
  assert.throws(() => encodeFrame(Buffer.alloc(70_000)), FrameError);
});

// ---------- clock (N-07) ----------
test("NTP estimate recovers a known offset and delay", () => {
  const offset = 4000, oneWay = 30;
  const t1 = 1_000_000, t2 = t1 + oneWay + offset, t3 = t2 + 5, t4 = t3 - offset + oneWay;
  const e = ntpEstimate(t1, t2, t3, t4);
  assert.equal(e.offsetMs, offset);
  assert.equal(e.delayMs, 2 * oneWay);
});

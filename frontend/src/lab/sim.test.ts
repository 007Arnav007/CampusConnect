import test from "node:test";
import assert from "node:assert/strict";
import { empirical, framingDemo, latencyTrace, monteCarlo, ReplayWindow, rfc6298, timerStats } from "./sim.js";

test("deterministic for a seed", () => {
  const c = { meanLoss: 0.1, burstMs: 150, rttMs: 40, jitter: 0.25 };
  assert.deepEqual(monteCarlo(c, 2, 30, 700, 300, 5), monteCarlo(c, 2, 30, 700, 300, 5));
});
test("under bursty loss, spaced copies beat back-to-back copies (spec 5.4.10 expectation)", () => {
  const c = { meanLoss: 0.18, burstMs: 200, rttMs: 40, jitter: 0.25 };
  assert.ok(monteCarlo(c, 2, 30, 700, 3000).onTime > monteCarlo(c, 2, 0, 700, 3000).onTime);
});
test("more copies never reduce on-time probability and cost more datagrams", () => {
  const c = { meanLoss: 0.15, burstMs: 80, rttMs: 40, jitter: 0.25 };
  const a = monteCarlo(c, 1, 30, 600, 3000, 3), b = monteCarlo(c, 4, 30, 600, 3000, 3);
  assert.ok(b.onTime >= a.onTime - 0.01 && b.meanDatagrams > a.meanDatagrams);
});
test("RFC 6298: first sample sets SRTT=R and RTTVAR=R/2; RTO = SRTT + 4*RTTVAR", () => {
  const t = rfc6298([100, 100], [false, false], 4, 0);
  assert.equal(t[0], 500); assert.equal(t[1], 100 + 4 * 50);
});
test("on an RTT step the empirical quantile timer adapts and spurious rate is bounded", () => {
  const { lat, lost } = latencyTrace("rtt_step", 600, 2);
  const s = timerStats(lat, lost, empirical(lat, lost)); assert.ok(s.spuriousPct < 25);
});
test("anti-replay window accepts reordered once, rejects replays and too-old", () => {
  const w = new ReplayWindow();
  assert.deepEqual([10, 12, 11, 12, 11, 100, 10].map((s) => w.check(s)), ["ACCEPT", "ACCEPT", "ACCEPT", "REPLAY", "REPLAY", "ACCEPT", "TOO_OLD"]);
});
test("framing lab: naive per-chunk decoding corrupts multi-byte text, accumulated bytes do not", () => {
  const r = framingDemo("नमस्ते café 🌐", 4);
  assert.equal(r.corrupted, true); assert.equal(r.correct, "नमस्ते café 🌐");
});

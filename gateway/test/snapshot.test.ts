import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { evaluate, isOod, verifySnapshot } from "../src/delivery/snapshot.js";

const fx = (n: string) => JSON.parse(readFileSync(new URL(`../../protocol/fixtures/${n}`, import.meta.url), "utf8"));
const snap = fx("policy-snapshot.json"); const { publicKey, vectors } = fx("snapshot-vectors.json");

test("R8: valid Ed25519 snapshot verifies; tampering, wrong key and expiry are rejected", () => {
  assert.ok(verifySnapshot(snap, publicKey, 1_700_000_001));
  assert.equal(verifySnapshot({ ...snap, body: snap.body.replace('"snap-demo-0001"', '"snap-evil-0001"') }, publicKey, 1_700_000_001), undefined);
  assert.equal(verifySnapshot(snap, "A".repeat(43), 1_700_000_001), undefined);
  assert.equal(verifySnapshot(snap, publicKey, 1_700_000_000 + 10 ** 10), undefined);
});

test("TypeScript evaluator reproduces the Python evaluator on 61 golden vectors (max abs error < 1e-6) incl. OOD gate", () => {
  const s = verifySnapshot(snap, publicKey, 1_700_000_001)!; let worst = 0;
  for (const v of vectors) {
    const u = evaluate(s, v.x);
    for (const a of Object.keys(v.u)) worst = Math.max(worst, Math.abs(u[a] - v.u[a]));
    assert.equal(isOod(s, v.x), v.ood);
  }
  assert.ok(worst < 1e-6, `max abs error ${worst}`);
});

// Gateway-side snapshot loader: verifies Ed25519 signature + TTL + action-set version, then scores locally (< 1 ms, no network).
import { createPublicKey, verify } from "node:crypto";
import { ACTION_SET_VERSION } from "./actions.js";

export type Snapshot = {
  snapshotId: string; actionSetVersion: string; createdAt: number; expiresAt: number;
  featureSpec: { names: string[]; mean: number[]; std: number[]; min: number[]; max: number[] };
  models: Record<string, { type: "linear"; w: number[]; b: number }>;
};
const SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");     // Ed25519 SubjectPublicKeyInfo header

export function verifySnapshot(raw: { body: string; sig: string }, publicKeyB64: string, nowSec = Date.now() / 1000): Snapshot | undefined {
  try {
    const key = createPublicKey({ key: Buffer.concat([SPKI_PREFIX, Buffer.from(publicKeyB64, "base64url")]), format: "der", type: "spki" });
    if (!verify(null, Buffer.from(raw.body, "utf8"), key, Buffer.from(raw.sig, "base64url"))) return undefined;
    const s = JSON.parse(raw.body) as Snapshot;
    if (s.actionSetVersion !== ACTION_SET_VERSION || nowSec > s.expiresAt) return undefined;
    return s;
  } catch { return undefined; }
}
export function evaluate(s: Snapshot, x: number[]): Record<string, number> {
  const z = x.map((v, i) => (v - s.featureSpec.mean[i]) / s.featureSpec.std[i]);
  return Object.fromEntries(Object.entries(s.models).map(([a, m]) => [a, m.w.reduce((acc, w, i) => acc + w * z[i], m.b)]));
}
export function isOod(s: Snapshot, x: number[], margin = 0.1): boolean {
  return x.some((v, i) => { const span = s.featureSpec.max[i] - s.featureSpec.min[i]; return v < s.featureSpec.min[i] - margin * span || v > s.featureSpec.max[i] + margin * span; });
}

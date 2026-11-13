import { createHmac, timingSafeEqual } from "node:crypto";
import { canonicalize } from "./jcs.js";

export type Keyring = Record<string, string>; // kid -> secret (>= 32 chars)

export function assertKeyring(keys: Keyring): void {
  const ids = Object.keys(keys);
  if (ids.length === 0) throw new Error("keyring is empty");
  for (const kid of ids) {
    if (keys[kid].length < 32) throw new Error(`key ${kid} must be at least 32 characters`);
  }
}

/** HMAC-SHA256 over the JCS form of every field except `sig` (fixes S-03: version, type, kid, test flag are all covered). */
export function signEnvelope<T extends { kid: string }>(envelope: T, keys: Keyring): T & { sig: string } {
  const secret = keys[envelope.kid];
  if (!secret) throw new Error(`unknown key id ${envelope.kid}`);
  const { sig: _ignored, ...rest } = envelope as T & { sig?: string };
  const sig = createHmac("sha256", secret).update(canonicalize(rest)).digest("base64url");
  return { ...(rest as T), sig };
}

export type VerifyResult = { ok: true } | { ok: false; reason: "UNKNOWN_KID" | "BAD_SIG" | "MALFORMED" };

export function verifyEnvelope(envelope: Record<string, unknown>, keys: Keyring): VerifyResult {
  const kid = envelope.kid;
  const sig = envelope.sig;
  if (typeof kid !== "string" || typeof sig !== "string") return { ok: false, reason: "MALFORMED" };
  const secret = keys[kid];
  if (!secret) return { ok: false, reason: "UNKNOWN_KID" };
  const { sig: _s, ...rest } = envelope;
  let expected: Buffer;
  try {
    expected = createHmac("sha256", secret).update(canonicalize(rest)).digest();
  } catch {
    return { ok: false, reason: "MALFORMED" };
  }
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, reason: "BAD_SIG" };
  return { ok: true };
}

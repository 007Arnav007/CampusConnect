import { randomBytes } from "node:crypto";
import { signEnvelope, type Keyring } from "./crypto.js";

export const MAX_DATAGRAM_BYTES = 1200;
export const MAX_TEXT_CHARS = 400;
export const MAX_VALIDITY_MS = 60_000;

export type Notice = {
  v: 2; t: "NOTICE"; mid: string; rnd: number; cpy: number; seq: number;
  iat: number; exp: number; inc?: string; cls: "CRITICAL_NOTICE" | "TICKET_EVENT";
  pri: "LOW" | "NORMAL" | "HIGH"; pol: string; rid: string; kid: string; nonce: string;
  test: boolean; body: { zones: string[]; text: string }; sig?: string;
};

export type Ack = {
  v: 2; t: "ACK"; mid: string; rnd: number; cpy: number; seq: number; rid: string; kid: string;
  st: "RECEIVED" | "DUPLICATE"; t2: number; t3: number; proc_ms: number; qd: number;
  wnd: { max: number; bitmap: string }; sig?: string;
};

export type NoticeInput = Omit<Notice, "v" | "t" | "nonce" | "sig" | "exp"> & { nonce?: string; exp?: number };

export function buildNotice(input: NoticeInput, keys: Keyring): Notice & { sig: string } {
  if (input.cls === "CRITICAL_NOTICE" && input.test !== true) throw new Error("CRITICAL_NOTICE must carry test=true in this project");
  if (input.body.text.length > MAX_TEXT_CHARS) throw new Error("notice text exceeds 400 characters");
  const exp = input.exp ?? input.iat + 30_000;
  if (exp - input.iat > MAX_VALIDITY_MS || exp <= input.iat) throw new Error("invalid validity window");
  const notice: Notice = { ...input, v: 2, t: "NOTICE", exp, nonce: input.nonce ?? randomBytes(12).toString("base64url") };
  const signed = signEnvelope(notice, keys);
  encodeDatagram(signed); // enforce the size cap at build time
  return signed;
}

export function buildAck(input: Omit<Ack, "v" | "t" | "sig">, keys: Keyring): Ack & { sig: string } {
  return signEnvelope({ ...input, v: 2, t: "ACK" } as Ack, keys);
}

export function encodeDatagram(envelope: object): Buffer {
  const buf = Buffer.from(JSON.stringify(envelope), "utf8");
  if (buf.length > MAX_DATAGRAM_BYTES) throw new Error(`datagram is ${buf.length} B; limit is ${MAX_DATAGRAM_BYTES} B`);
  return buf;
}

export type Rejection = "SIZE" | "MALFORMED" | "SIG" | "TIME" | "REPLAY" | "TEST_MODE" | "WRONG_RECEIVER";

export function parseNotice(raw: Buffer): { ok: true; notice: Notice } | { ok: false; reason: Rejection } {
  if (raw.length > MAX_DATAGRAM_BYTES) return { ok: false, reason: "SIZE" };
  let j: any;
  try { j = JSON.parse(raw.toString("utf8")); } catch { return { ok: false, reason: "MALFORMED" }; }
  const isStr = (x: unknown) => typeof x === "string" && x.length > 0 && x.length < 200;
  const isInt = (x: unknown) => Number.isSafeInteger(x);
  if (!j || j.v !== 2 || j.t !== "NOTICE" || !isStr(j.mid) || !isInt(j.rnd) || !isInt(j.cpy) || !isInt(j.seq)
    || !isInt(j.iat) || !isInt(j.exp) || !isStr(j.rid) || !isStr(j.kid) || !isStr(j.nonce) || !isStr(j.sig)
    || typeof j.test !== "boolean" || !j.body || !Array.isArray(j.body.zones) || typeof j.body.text !== "string"
    || j.body.text.length > MAX_TEXT_CHARS || j.exp - j.iat > MAX_VALIDITY_MS) {
    return { ok: false, reason: "MALFORMED" };
  }
  return { ok: true, notice: j as Notice };
}

export function parseAck(raw: Buffer): Ack | undefined {
  try {
    const j = JSON.parse(raw.toString("utf8"));
    if (j?.v === 2 && j.t === "ACK" && typeof j.mid === "string" && typeof j.sig === "string" && Number.isSafeInteger(j.rnd) && Number.isSafeInteger(j.cpy)) return j as Ack;
  } catch { /* fall through */ }
  return undefined;
}

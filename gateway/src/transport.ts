// Transport v2: length-prefixed, HMAC-signed TCP events with verified ACKs (N-04, S-03, S-04) and an RFC 6298 timeout (N-05).
// The UDP critical-notice path lives in ./delivery (scheduled copies, shield, signed snapshots).
import net from "node:net";
import { createHash } from "node:crypto";
import { assertKeyring, encodeFrame, FrameDecoder, parseAck, signEnvelope, verifyEnvelope, type Keyring } from "@campusconnect/protocol";
import { Rfc6298 } from "./delivery/rto.js";

export type TransportMetrics = {
  tcp: { connected: boolean; sent: number; acknowledged: number; failed: number; timedOut: number; ackInvalid: number; rtoMs: number; lastEventAt?: string };
  udp: { sent: number; acknowledged: number; failed: number; timedOut: number; ackInvalid: number; lastAlertAt?: string };
};
export const metrics: TransportMetrics = {
  tcp: { connected: false, sent: 0, acknowledged: 0, failed: 0, timedOut: 0, ackInvalid: 0, rtoMs: 500 },
  udp: { sent: 0, acknowledged: 0, failed: 0, timedOut: 0, ackInvalid: 0 }
};

const tcpHost = process.env.TCP_EVENT_HOST ?? "127.0.0.1";
const tcpPort = Number(process.env.TCP_EVENT_PORT ?? 41235);
const rid = process.env.RECEIVER_ID ?? "RX-LIB";
const kid = process.env.PROTOCOL_KEY_ID ?? "k1";
export function protocolKeys(): Keyring {
  const keys: Keyring = { [kid]: process.env.PROTOCOL_HMAC_SECRET ?? "" };
  if (process.env.PROTOCOL_HMAC_SECRET_OLD) keys[`${kid}-old`] = process.env.PROTOCOL_HMAC_SECRET_OLD;
  assertKeyring(keys); return keys;
}

const rto = new Rfc6298(4, 100, 5000);
let seq = 1;
let sock: net.Socket | undefined; let connecting: Promise<net.Socket> | undefined;
const pending = new Map<string, { resolve: (a: Record<string, unknown>) => void; reject: (e: Error) => void; timer: NodeJS.Timeout; t1: number }>();

function connect(): Promise<net.Socket> {
  if (sock && !sock.destroyed && sock.writable) return Promise.resolve(sock);
  if (connecting) return connecting;
  connecting = new Promise<net.Socket>((resolve, reject) => {
    const s = net.createConnection({ host: tcpHost, port: tcpPort });
    const decoder = new FrameDecoder();
    const to = setTimeout(() => s.destroy(new Error("TCP connect timeout")), 1500);
    s.once("connect", () => { clearTimeout(to); sock = s; metrics.tcp.connected = true; resolve(s); });
    s.on("data", (chunk) => {
      try {
        for (const frame of decoder.push(chunk)) {
          const ack = parseAck(frame); const keys = protocolKeys();
          const p = ack && pending.get(ack.mid);
          if (!ack || !p || ack.rid !== rid || !verifyEnvelope(ack as unknown as Record<string, unknown>, keys).ok) { metrics.tcp.ackInvalid += 1; continue; }
          clearTimeout(p.timer); pending.delete(ack.mid); rto.sample(Math.max(1, Date.now() - p.t1 - ack.proc_ms)); metrics.tcp.rtoMs = Math.round(rto.rto());
          p.resolve(ack as unknown as Record<string, unknown>);
        }
      } catch { s.destroy(); }                                                   // malformed / oversize frame closes the connection
    });
    s.on("error", (e) => { metrics.tcp.failed += 1; if (!sock) reject(e); });
    s.on("close", () => { metrics.tcp.connected = false; sock = undefined; connecting = undefined;
      for (const [k, p] of pending) { clearTimeout(p.timer); pending.delete(k); p.reject(new Error("TCP receiver disconnected")); } });
  }).finally(() => { connecting = undefined; });
  return connecting;
}

async function attempt(event: Record<string, unknown>, timeoutMs: number) {
  const s = await connect(); const eid = String(event.eid);
  const ack = new Promise<Record<string, unknown>>((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(eid); metrics.tcp.timedOut += 1; reject(new Error("TCP acknowledgement timeout")); }, timeoutMs);
    pending.set(eid, { resolve, reject, timer, t1: Date.now() });
    s.write(encodeFrame(JSON.stringify(event)), (e) => { if (e) { clearTimeout(timer); pending.delete(eid); reject(e); } });
  });
  metrics.tcp.sent += 1;
  const a = await ack;
  if (a.st !== "RECEIVED" && a.st !== "DUPLICATE") throw new Error("TCP receiver rejected the event");
  metrics.tcp.acknowledged += 1; metrics.tcp.lastEventAt = new Date().toISOString();
  return a;
}

export async function sendTicketEvent(input: { eventId: string; ticketId: string; ticketNumber: string; eventType: string; attempt: number }) {
  const keys = protocolKeys();
  const hash = createHash("sha256").update(JSON.stringify([input.eventId, input.eventType, input.ticketId, input.ticketNumber])).digest("hex");
  let last: Error = new Error("TCP event dispatch failed");
  for (let tryNo = 0; tryNo < 3; tryNo += 1) {                                 // RTO doubles per try (loss-aware backoff)
    const event = signEnvelope({ v: 2, t: "EVENT", eid: input.eventId, etype: input.eventType, tid: input.ticketId, tnum: input.ticketNumber,
      attempt: input.attempt + tryNo, seq: seq++, iat: Date.now(), rid, kid, hash }, keys);
    try { return await attempt(event as unknown as Record<string, unknown>, Math.min(rto.rto() * 2 ** tryNo, 5000)); }
    catch (e) { last = e instanceof Error ? e : last; }
  }
  throw last;
}
export const getTransportMetrics = () => metrics;

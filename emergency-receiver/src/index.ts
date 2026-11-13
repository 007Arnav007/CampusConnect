import "./env.js";
import dgram from "node:dgram";
import http from "node:http";
import net from "node:net";
import { timingSafeEqual } from "node:crypto";
import { assertKeyring, buildAck, encodeFrame, FrameDecoder, verifyEnvelope, type Keyring } from "@campusconnect/protocol";
import { NoticeStore } from "./store.js";
import { NoticeReceiver, type AckMode, type SyncRecord } from "./receiver-core.js";

const receiverId = process.env.RECEIVER_ID ?? "RX-LIB";
const kid = process.env.PROTOCOL_KEY_ID ?? "k1";
const keys: Keyring = { [kid]: process.env.PROTOCOL_HMAC_SECRET ?? "" };
if (process.env.PROTOCOL_HMAC_SECRET_OLD) keys[`${kid}-old`] = process.env.PROTOCOL_HMAC_SECRET_OLD;
assertKeyring(keys); // S-02-style fail-fast: refuse to start without a strong key

const bindHost = process.env.BIND_HOST ?? "127.0.0.1";
const udpPort = Number(process.env.UDP_PORT ?? 41234);
const tcpPort = Number(process.env.TCP_EVENT_PORT ?? 41235);
const healthPort = Number(process.env.RECEIVER_HEALTH_PORT ?? 4001);
const internalToken = process.env.INTERNAL_SERVICE_TOKEN ?? "";
const backendUrl = (process.env.BACKEND_URL ?? "http://localhost:8080").replace(/\/+$/, "");
const labMode = process.env.LAB_MODE === "true";

async function postBackend(path: string, body: unknown) {
  if (!internalToken) throw new Error("INTERNAL_SERVICE_TOKEN not configured");
  const r = await fetch(`${backendUrl}${path}`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-Internal-Service-Token": internalToken },
    body: JSON.stringify(body), signal: AbortSignal.timeout(1500)
  });
  if (!r.ok) throw new Error(`backend ${r.status}`);
}
// Matches the existing backend contract (emergency_receipts). Sequence numbers are informational there (B-01 fix).
const backendSync = (rec: SyncRecord) => postBackend("/api/v1/internal/emergency-receipts", {
  messageId: rec.mid, sequenceNumber: rec.seq, receiverId: rec.rid, incidentId: rec.inc ?? null, nonce: rec.nonce,
  payloadHash: rec.hash, receivedAt: new Date(rec.receivedAtMs).toISOString()
});

const receiver = new NoticeReceiver({
  receiverId, keys, activeKid: kid, ackMode: (process.env.ACK_MODE as AckMode) ?? "LOCAL_DURABLE",
  store: new NoticeStore(process.env.RECEIVER_DB ?? `./receiver-${receiverId}.db`), backendSync
});
setInterval(() => { void receiver.syncPending(); }, 2000).unref();

const udp = dgram.createSocket("udp4");
udp.on("message", async (msg, remote) => {
  const out = await receiver.handle(msg);
  if (out.verdict.startsWith("REJECTED")) console.warn(JSON.stringify({ event: "NOTICE_REJECTED", verdict: out.verdict, reason: out.reason }));
  if (!out.ack) return;
  const send = () => udp.send(out.ack!, remote.port, remote.address);
  if (out.ackDelayMs) setTimeout(send, out.ackDelayMs); else send();
});
udp.bind(udpPort, bindHost, () => console.log(`UDP receiver ${receiverId} on ${bindHost}:${udpPort}`));

// TCP event channel: 4-byte length prefix, signed EVENT in, signed ACK out.
// Bounded dedup set: an unbounded Set would grow forever on a long-running receiver.
const SEEN_EVENTS_CAP = 10_000;
const seenEvents = new Set<string>();
const tcp = net.createServer((conn) => {
  const decoder = new FrameDecoder();
  conn.on("data", (chunk) => {
    try {
      for (const frame of decoder.push(chunk)) {
        let ev: any; try { ev = JSON.parse(frame.toString("utf8")); } catch { conn.destroy(); return; }
        if (ev?.t !== "EVENT" || !verifyEnvelope(ev, keys).ok || typeof ev.eid !== "string") { conn.destroy(); return; }
        const dup = seenEvents.has(ev.eid);
        seenEvents.add(ev.eid);
        if (seenEvents.size > SEEN_EVENTS_CAP) {
          // Keep the newest entries: clearing wholesale is simple and the replay
          // window on ev.seq (checked at the backend) still guards duplicates.
          seenEvents.clear();
          seenEvents.add(ev.eid);
        }
        if (!dup && ev.tid) void postBackend("/api/v1/internal/tcp-receipts", { eventId: ev.eid, eventType: String(ev.etype ?? "EVENT").slice(0, 80), ticketId: ev.tid, receiverId, payloadHash: ev.hash ?? "n/a", receivedAt: new Date().toISOString() }).catch(() => undefined);
        const t2 = Date.now();
        const ack = buildAck({ mid: ev.eid, rnd: 0, cpy: ev.attempt ?? 1, seq: ev.seq ?? 0, rid: receiverId, kid, st: dup ? "DUPLICATE" : "RECEIVED", t2, t3: Date.now(), proc_ms: 0, qd: 0, wnd: { max: 0, bitmap: "" } }, keys);
        if (!receiver.faults.dropAcks) conn.write(encodeFrame(JSON.stringify(ack)));
      }
    } catch (e) {
      // Never let a socket-callback throw become an uncaughtException that takes
      // down the whole receiver (UDP + health server included).
      console.error(JSON.stringify({ event: "TCP_HANDLER_ERROR", error: e instanceof Error ? e.message : String(e) }));
      conn.destroy();
    }
  });
  conn.on("error", () => undefined);
});
tcp.listen(tcpPort, bindHost, () => console.log(`TCP receiver on ${bindHost}:${tcpPort}`));

const isAuthorised = (h: string | undefined) => {
  if (!h || !internalToken) return false;
  const a = Buffer.from(h), b = Buffer.from(internalToken);
  return a.length === b.length && timingSafeEqual(a, b);
};
http.createServer((req, res) => {
  if (req.url === "/health") { res.setHeader("content-type", "application/json"); res.end(JSON.stringify(receiver.health())); return; }
  if (req.url === "/fault" && req.method === "POST" && labMode && isAuthorised(req.headers["x-internal-service-token"] as string)) {
    let body = ""; req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const f = JSON.parse(body);
        if (typeof f.dropAcks === "boolean") receiver.faults.dropAcks = f.dropAcks;
        if (typeof f.stall === "boolean") receiver.faults.stall = f.stall;
        if (Number.isFinite(f.ackDelayMs)) receiver.faults.ackDelayMs = Math.max(0, Math.min(5000, f.ackDelayMs));
        res.end(JSON.stringify(receiver.faults));
      } catch { res.statusCode = 400; res.end("{}"); }
    });
    return;
  }
  res.statusCode = 404; res.end();
}).listen(healthPort, bindHost, () => console.log(`health on ${bindHost}:${healthPort}`));

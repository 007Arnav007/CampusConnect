// Critical Notice Delivery (TEST MODE) orchestration: backend-authorised request -> Shield -> signed snapshot (or static table) -> UDP engine.
import { readFileSync } from "node:fs";
import { choose, type ShieldContext } from "./delivery/shield.js";
import { evaluate, isOod, verifySnapshot, type Snapshot } from "./delivery/snapshot.js";
import { ACTIONS } from "./delivery/actions.js";
import { UdpChannel } from "./delivery/executor.js";
import { protocolKeys, metrics } from "./transport.js";

let channel: UdpChannel | undefined;
let snapshot: Snapshot | undefined;
const path = { lossEwma: 0.05, burstLen: 2, rttMs: 40, jitter: 5 };      // replaced by active-probe path_metrics (7.9)
const recent: boolean[] = [];

export function loadSnapshot(file = process.env.POLICY_SNAPSHOT_PATH, publicKey = process.env.POLICY_SNAPSHOT_PUBLIC_KEY) {
  if (!file || !publicKey) return undefined;
  try { snapshot = verifySnapshot(JSON.parse(readFileSync(file, "utf8")), publicKey); } catch { snapshot = undefined; }
  return snapshot;
}
export const snapshotStatus = () => snapshot ? { snapshotId: snapshot.snapshotId, expiresAt: snapshot.expiresAt, mode: "learned+shield" } : { mode: "static-table" };

async function ch() {
  if (!channel) {
    channel = new UdpChannel(process.env.UDP_HOST ?? "127.0.0.1", Number(process.env.UDP_PORT ?? 41234), process.env.RECEIVER_ID ?? "RX-LIB", protocolKeys(), process.env.PROTOCOL_KEY_ID ?? "k1");
    await channel.bind();
  }
  return channel;
}

export async function dispatchCriticalTest(input: { text: string; zones: string[]; incident?: string; severity: number; deadlineMs: number }) {
  const c = await ch();
  const now = Date.now() / 1000;
  const snap = snapshot && snapshot.expiresAt > now ? snapshot : undefined;            // R8: expired snapshot => static table
  const x = [path.lossEwma, path.burstLen, path.rttMs, path.jitter, Math.log(input.deadlineMs), input.severity, 1];
  const ctx: ShieldContext = {
    msg_class: "CRITICAL_NOTICE", deadline_ms: input.deadlineMs, signed: true, test_mode: process.env.CRITICAL_TEST_MODE === "true",
    exp_minus_iat_ms: 30_000, payload_bytes: Buffer.byteLength(input.text), datagram_bytes: 700, gateway_load: 0.2, snapshot_valid: snap !== undefined || !snapshot,
    authorised: true, tcp_probe_ok: true, receiver_bucket_ok: true, incident_bucket_ok: true, ood: snap ? isOod(snap, x) : false, breaker_open: false,
    timeout_ms: Math.min(c.rto.rto(), 0.5 * input.deadlineMs)
  };
  const decision = choose(ctx, snap ? evaluate(snap, x) : undefined, path.lossEwma, path.burstLen);
  if (decision.action === "REFUSE") return { decision, result: undefined };
  // This build executes the UDP schedule only. If the Shield selected a hedge or
  // TCP-parallel action, substitute the plain-UDP schedule and report the
  // substitution so the audit trail describes what was actually sent.
  const executedAction = ACTIONS[decision.action].transport.startsWith("UDP") && !ACTIONS[decision.action].hedge && !ACTIONS[decision.action].parallelTcp
    ? decision.action
    : "A9";
  const result = await c.deliver({ actionId: executedAction, text: input.text, zones: input.zones, incident: input.incident, deadlineMs: input.deadlineMs, policy: `as-1/${executedAction}/${snap?.snapshotId ?? "static"}` });
  metrics.udp.sent += result.attempts.length; if (result.state === "DELIVERED_CONFIRMED") metrics.udp.acknowledged += 1; else metrics.udp.timedOut += 1;
  metrics.udp.ackInvalid = c.counters.ackInvalid;
  for (const a of result.attempts) recent.push(a.ackAt !== undefined);
  while (recent.length > 50) recent.shift();
  path.lossEwma = 0.8 * path.lossEwma + 0.2 * (1 - recent.filter(Boolean).length / Math.max(recent.length, 1));
  return { decision: { ...decision, action: executedAction, reason: executedAction === decision.action ? decision.reason : `substituted ${decision.action} with UDP-only ${executedAction}` }, result };
}

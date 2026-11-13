// Deterministic Shield (spec 5.4.8) - pure functions, mirrors ml-service/src/delivery/shield.py rule for rule.
import { ACK_REQUIRED, ACTIONS, ALLOWED, BYTE_BUDGET, MAX_DATAGRAMS, datagrams, staticTable, worstCaseBytes, type MsgClass } from "./actions.js";

export type ShieldContext = {
  msg_class: MsgClass; deadline_ms: number; signed: boolean; test_mode: boolean; exp_minus_iat_ms: number; payload_bytes: number;
  datagram_bytes: number; gateway_load: number; snapshot_valid: boolean; authorised: boolean; tcp_probe_ok: boolean;
  receiver_bucket_ok: boolean; incident_bucket_ok: boolean; ood: boolean; breaker_open: boolean; timeout_ms: number;
};
export const REFUSE = "REFUSE";
const GLOBAL_GATES = new Set(["R6", "R8", "R9", "R10"]);

export function violated(id: string, x: ShieldContext): string[] {
  const a = ACTIONS[id]; const v: string[] = [];
  if (!ALLOWED[x.msg_class].includes(id)) v.push("R1");
  if (x.msg_class === "CRITICAL_NOTICE" && !(ACK_REQUIRED[x.msg_class] && x.signed && x.exp_minus_iat_ms <= 60_000 && x.test_mode)) v.push("R2");
  if (datagrams(a) > MAX_DATAGRAMS || worstCaseBytes(a) > BYTE_BUDGET[x.msg_class]) v.push("R3");
  if (x.payload_bytes > 900 || x.datagram_bytes > 1200) v.push("R4");
  if (!(x.receiver_bucket_ok && x.incident_bucket_ok) || (x.gateway_load > 0.85 && (x.msg_class === "NORMAL" || x.msg_class === "LIVE"))) v.push("R5");
  if (!x.authorised) v.push("R6");
  const roundsMs = x.timeout_ms * a.rounds + (a.k - 1) * a.spacingMs;
  if (x.timeout_ms > 5000 || (roundsMs > x.deadline_ms && a.rounds > 1 && x.timeout_ms > x.deadline_ms)) v.push("R7");
  if (!x.snapshot_valid) v.push("R8");
  if (x.ood) v.push("R9");
  if (x.breaker_open) v.push("R10");
  if ((a.hedge || a.parallelTcp || a.transport === "TCP") && !x.tcp_probe_ok) v.push("R11");
  return v;
}
export const safeSet = (x: ShieldContext) => Object.keys(ACTIONS).filter((a) => violated(a, x).length === 0);

export type Decision = { action: string; source: "learned" | "static-table" | "refused"; safe: string[]; reason: string };

function finalise(fallback: string, x: ShieldContext): string {
  if (violated(fallback, x).length === 0) return fallback;
  for (const a of ALLOWED[x.msg_class]) if (violated(a, x).length === 0) return a;
  return REFUSE;
}
const stat = (fb: string, x: ShieldContext, safe: string[], reason: string): Decision => {
  const a = finalise(fb, x); return { action: a, source: a === REFUSE ? "refused" : "static-table", safe, reason };
};

/** Models may only reorder safe actions; NaN is dropped; +/-Infinity cannot escape A_safe. */
export function choose(x: ShieldContext, utilities: Record<string, number> | undefined, loss = 0, burst = 1): Decision {
  const safe = safeSet(x);
  const gates = new Set<string>(); for (const a of Object.keys(ACTIONS)) for (const r of violated(a, x)) if (GLOBAL_GATES.has(r)) gates.add(r);
  const fb = staticTable(x.msg_class, loss, burst);
  if (gates.size) return stat(fb, x, safe, `gate ${[...gates].sort().join(",")}`);
  if (!utilities || Object.keys(utilities).length === 0 || safe.length === 0) return stat(fb, x, safe, "no utilities or empty A_safe");
  const ranked = safe.map((a) => [utilities[a] ?? -Infinity, a] as const).filter(([u]) => !Number.isNaN(u));
  if (!ranked.length) return stat(fb, x, safe, "all utilities invalid");
  const best = ranked.reduce((m, c) => (c[0] > m[0] || (c[0] === m[0] && Number(c[1].slice(1)) < Number(m[1].slice(1))) ? c : m));
  return { action: best[1], source: "learned", safe, reason: "" };
}

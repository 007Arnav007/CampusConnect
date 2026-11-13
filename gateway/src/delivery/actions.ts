// Mirror of ml-service/src/delivery/actions.py (action set as-1). Golden-tested against Python vectors.
export const ACTION_SET_VERSION = "as-1";
export const MAX_DATAGRAMS = 8;
export const UDP_BYTES = 700;
export const TCP_BYTES = 760;

export type Action = { id: string; name: string; transport: string; k: number; spacingMs: number; rounds: number; hedge?: boolean; parallelTcp?: boolean };
const A = (id: string, name: string, transport: string, k: number, spacingMs: number, rounds: number, x: Partial<Action> = {}): Action => ({ id, name, transport, k, spacingMs, rounds, ...x });
export const ACTIONS: Record<string, Action> = Object.fromEntries([
  A("A0", "HTTPS_ONCE", "HTTP", 1, 0, 1), A("A1", "WS_PUSH_PERSIST", "WS", 1, 0, 1),
  A("A2", "TCP_ACK_R1", "TCP", 1, 0, 1), A("A3", "TCP_ACK_R2", "TCP", 1, 0, 2), A("A4", "TCP_ACK_R3_NEWCONN", "TCP", 1, 0, 3),
  A("A5", "UDP_K1", "UDP", 1, 0, 2), A("A6", "UDP_K2_S0", "UDP", 2, 0, 2), A("A7", "UDP_K2_S30", "UDP", 2, 30, 2),
  A("A8", "UDP_K3_S30", "UDP", 3, 30, 2), A("A9", "UDP_K3_S80", "UDP", 3, 80, 2), A("A10", "UDP_K4_S30", "UDP", 4, 30, 2),
  A("A11", "UDP_K4_S80", "UDP", 4, 80, 2), A("A12", "UDP_K2_S30_HEDGE_TCP", "UDP_TCP", 2, 30, 1, { hedge: true }),
  A("A13", "UDP_K3_S30_HEDGE_TCP", "UDP_TCP", 3, 30, 1, { hedge: true }), A("A14", "TCP_PLUS_UDP_PARALLEL", "TCP_UDP", 2, 30, 1, { parallelTcp: true })
].map((a) => [a.id, a]));

export type MsgClass = "NORMAL" | "LIVE" | "RELIABLE" | "HIGH" | "CRITICAL_NOTICE";
export const ALLOWED: Record<MsgClass, string[]> = {
  NORMAL: ["A0"], LIVE: ["A1", "A0"], RELIABLE: ["A2", "A3", "A4"], HIGH: ["A2", "A3", "A4", "A5", "A6", "A7", "A12"],
  CRITICAL_NOTICE: ["A7", "A8", "A9", "A10", "A11", "A12", "A13", "A14"]
};
export const ACK_REQUIRED: Record<MsgClass, boolean> = { NORMAL: false, LIVE: false, RELIABLE: true, HIGH: true, CRITICAL_NOTICE: true };
export const BYTE_BUDGET: Record<MsgClass, number> = { NORMAL: 4000, LIVE: 4000, RELIABLE: 12000, HIGH: 12000, CRITICAL_NOTICE: 16000 };

export const datagrams = (a: Action) => a.k * a.rounds + (a.hedge || a.parallelTcp ? 1 : 0);
export function worstCaseBytes(a: Action): number {
  const udp = a.transport.startsWith("UDP") || a.transport === "TCP_UDP" ? a.k * a.rounds * UDP_BYTES : 0;
  const tcp = a.transport === "TCP" ? a.rounds * TCP_BYTES : a.hedge || a.parallelTcp ? TCP_BYTES : 0;
  return udp + tcp;
}
export function staticTable(cls: MsgClass, loss: number, burst: number): string {
  const band = loss > 0.1 || burst >= 6 ? 2 : loss >= 0.02 ? 1 : 0;
  const t: Partial<Record<MsgClass, string[]>> = { RELIABLE: ["A2", "A3", "A4"], HIGH: ["A2", "A3", "A12"], CRITICAL_NOTICE: ["A7", "A9", "A13"] };
  return t[cls] ? t[cls]![band] : cls === "LIVE" ? "A1" : "A0";
}

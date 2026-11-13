// Delivery engine v2 (spec 7.6): one UDP socket per receiver channel, gateway-owned sequence numbers, copies SCHEDULED with spacing
// (not sequential retries), cancel-on-first-valid-ACK, rounds, TCP-free hedge hook, signed-ACK verification, per-attempt records.
import dgram from "node:dgram";
import { randomUUID } from "node:crypto";
import { buildNotice, encodeDatagram, ntpEstimate, parseAck, verifyEnvelope, type Ack, type Keyring } from "@campusconnect/protocol";
import { ACTIONS } from "./actions.js";
import { Rfc6298 } from "./rto.js";

export type AttemptRecord = { mid: string; rnd: number; cpy: number; seq: number; sentAt: number; bytes: number; ackAt?: number; rtoMsUsed: number };
export type DeliveryState = "DELIVERED_CONFIRMED" | "FAILED_TIMEOUT" | "DEGRADED_FALLBACK";
export type DeliveryResult = {
  mid: string; state: DeliveryState; confirmedBy?: { rnd: number; cpy: number }; latencyMs?: number; attempts: AttemptRecord[];
  offsetMs?: number; delayMs?: number; ackStatus?: Ack["st"]; unconfirmed: boolean; actionId: string;
};

export class UdpChannel {
  private socket = dgram.createSocket("udp4");
  private seq: number;
  readonly counters = { sent: 0, acksValid: 0, ackInvalid: 0 };
  private waiters = new Map<string, (ack: Ack, t4: number) => void>();
  readonly rto = new Rfc6298(4, 40, 5000);
  constructor(readonly host: string, readonly port: number, readonly receiverId: string, private readonly keys: Keyring, private readonly kid: string, startSeq = 1) {
    this.seq = startSeq;                                       // sender-owned sequence (B-01 fix); persist high-water mark in production
    this.socket.on("message", (msg) => {
      const t4 = Date.now(); const ack = parseAck(msg);
      if (!ack) { this.counters.ackInvalid += 1; return; }
      // S-04: an ACK counts only if the MAC verifies and it names this receiver and an in-flight (mid,rnd,cpy)
      const v = verifyEnvelope(ack as unknown as Record<string, unknown>, this.keys);
      const w = this.waiters.get(`${ack.mid}|${ack.rnd}|${ack.cpy}`);
      if (!v.ok || ack.rid !== this.receiverId || !w) { this.counters.ackInvalid += 1; return; }
      this.counters.acksValid += 1; w(ack, t4);
    });
  }
  bind(): Promise<void> { return new Promise((r) => this.socket.bind(0, "127.0.0.1", () => r())); }
  close() { this.socket.close(); }
  nextSeq() { return this.seq++; }

  private send(buf: Buffer) { return new Promise<void>((res, rej) => this.socket.send(buf, this.port, this.host, (e) => (e ? rej(e) : res()))); }

  /** Executes a shield-approved UDP action. Never reports DELIVERED_CONFIRMED without a verified, correlated ACK. */
  async deliver(opts: { actionId: string; text: string; zones: string[]; incident?: string; deadlineMs: number; timeoutMs?: number; policy?: string; priority?: "LOW" | "NORMAL" | "HIGH" }): Promise<DeliveryResult> {
    const a = ACTIONS[opts.actionId]; if (!a || !a.transport.startsWith("UDP")) throw new Error(`action ${opts.actionId} is not a UDP action`);
    const mid = randomUUID(); const t0 = Date.now(); const attempts: AttemptRecord[] = [];
    const timers: NodeJS.Timeout[] = []; let settled = false;
    let timeout = Math.min(opts.timeoutMs ?? this.rto.rto(), 0.5 * opts.deadlineMs, 5000);

    return await new Promise<DeliveryResult>((resolve) => {
      const finish = (r: Omit<DeliveryResult, "mid" | "attempts" | "actionId">) => {
        if (settled) return; settled = true; timers.forEach(clearTimeout);
        for (const k of [...this.waiters.keys()]) if (k.startsWith(mid)) this.waiters.delete(k);
        resolve({ mid, attempts, actionId: opts.actionId, ...r });
      };
      const sendCopy = (rnd: number, cpy: number) => {
        if (settled) return;                                                  // cancel-on-ACK
        const iat = Date.now(); const seq = this.nextSeq();
        const n = buildNotice({ mid, rnd, cpy, seq, iat, cls: "CRITICAL_NOTICE", pri: opts.priority ?? "HIGH", pol: opts.policy ?? `as-1/${opts.actionId}`, rid: this.receiverId, kid: this.kid, test: true, inc: opts.incident, body: { zones: opts.zones, text: opts.text } }, this.keys);
        const buf = encodeDatagram(n); const rec: AttemptRecord = { mid, rnd, cpy, seq, sentAt: iat, bytes: buf.length, rtoMsUsed: timeout };
        attempts.push(rec);
        this.waiters.set(`${mid}|${rnd}|${cpy}`, (ack, t4) => {
          rec.ackAt = t4;
          if (t4 - t0 > opts.deadlineMs) return;                              // ACK after the deadline does not count as on-time delivery
          this.rto.sample(Math.max(1, t4 - iat - ack.proc_ms));
          const est = ntpEstimate(iat, ack.t2, ack.t3, t4);
          finish({ state: "DELIVERED_CONFIRMED", confirmedBy: { rnd, cpy }, latencyMs: t4 - t0, offsetMs: est.offsetMs, delayMs: est.delayMs, ackStatus: ack.st, unconfirmed: false });
        });
        this.counters.sent += 1; this.send(buf).catch(() => undefined);
      };
      const runRound = (rnd: number) => {
        if (settled) return;
        for (let i = 0; i < a.k; i++) timers.push(setTimeout(() => sendCopy(rnd, i + 1), i * a.spacingMs)); // scheduled, not sequential
        const last = rnd >= a.rounds - 1;
        const wait = last ? Math.max(0, opts.deadlineMs - (Date.now() - t0)) : timeout;
        timers.push(setTimeout(() => {
          if (settled) return;
          if (last || Date.now() - t0 >= opts.deadlineMs) finish({ state: "DEGRADED_FALLBACK", unconfirmed: true });  // persisted, NOT delivered
          else { timeout = Math.min(timeout * 2, 0.5 * opts.deadlineMs, 5000); runRound(rnd + 1); }
        }, wait));
      };
      timers.push(setTimeout(() => finish({ state: "DEGRADED_FALLBACK", unconfirmed: true }), opts.deadlineMs + 50)); // hard stop (R7)
      runRound(0);
    });
  }
}

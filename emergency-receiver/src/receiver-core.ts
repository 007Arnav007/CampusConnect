import { createHash } from "node:crypto";
import {
  buildAck, encodeDatagram, OffsetTracker, parseNotice, ReplayWindow, verifyEnvelope,
  type Keyring, type Notice
} from "@campusconnect/protocol";
import { NoticeStore } from "./store.js";

export type SyncRecord = { mid: string; seq: number; rid: string; inc?: string; nonce: string; hash: string; receivedAtMs: number };
export type AckMode = "LOCAL_DURABLE" | "BACKEND_DURABLE";
export type Verdict = "RECEIVED" | "DUPLICATE" | "REJECTED_SIZE" | "REJECTED_MALFORMED" | "REJECTED_SIG" | "REJECTED_TIME"
  | "REJECTED_REPLAY" | "REJECTED_TEST_MODE" | "REJECTED_WRONG_RECEIVER" | "BACKEND_UNAVAILABLE";

export type Faults = { dropAcks: boolean; ackDelayMs: number; stall: boolean };
export type Handled = { verdict: Verdict; ack?: Buffer; ackDelayMs?: number; mid?: string; seq?: number; reason?: string };

export type ReceiverOptions = {
  receiverId: string; keys: Keyring; activeKid: string; store: NoticeStore; ackMode: AckMode;
  now?: () => number; backendSync?: (r: SyncRecord) => Promise<void>;
  maxPastMs?: number; maxFutureMs?: number; testModeOnly?: boolean;
};

export class NoticeReceiver {
  readonly counters = { received: 0, acked: 0, duplicates: 0, rejected: {} as Record<string, number> };
  readonly faults: Faults = { dropAcks: false, ackDelayMs: 0, stall: false };
  private windows = new Map<string, ReplayWindow>();
  private offsets = new Map<string, OffsetTracker>();
  private inflight = new Map<string, Promise<Handled>>();
  private now: () => number;
  constructor(private readonly o: ReceiverOptions) { this.now = o.now ?? Date.now; }

  private reject(verdict: Verdict, extra: Partial<Handled> = {}): Handled {
    this.counters.rejected[verdict] = (this.counters.rejected[verdict] ?? 0) + 1;
    return { verdict, ...extra };
  }
  private windowFor(channel: string): ReplayWindow {
    let w = this.windows.get(channel);
    if (!w) {
      const saved = this.o.store.loadWindow(channel);
      w = saved ? ReplayWindow.restore(saved) : new ReplayWindow();
      this.windows.set(channel, w);
    }
    return w;
  }

  async handle(raw: Buffer): Promise<Handled> {
    const t2 = this.now();
    this.counters.received += 1;
    if (this.faults.stall) return { verdict: "BACKEND_UNAVAILABLE", reason: "stalled (fault injection)" };
    const parsed = parseNotice(raw);
    if (!parsed.ok) return this.reject(parsed.reason === "SIZE" ? "REJECTED_SIZE" : "REJECTED_MALFORMED");
    const n = parsed.notice;
    const sig = verifyEnvelope(JSON.parse(raw.toString("utf8")), this.o.keys);
    if (!sig.ok) return this.reject("REJECTED_SIG", { reason: sig.reason, mid: n.mid });
    if (n.rid !== this.o.receiverId) return this.reject("REJECTED_WRONG_RECEIVER", { mid: n.mid });
    if (this.o.testModeOnly !== false && n.test !== true) return this.reject("REJECTED_TEST_MODE", { mid: n.mid });

    // Time check applies the clock offset learned for this channel (N-07); expiry is enforced as well.
    const channel = `${n.rid}`;
    const offset = this.offsets.get(channel)?.value ?? 0;
    const adjusted = t2 - offset;
    if (n.iat < adjusted - (this.o.maxPastMs ?? 30_000) || n.iat > adjusted + (this.o.maxFutureMs ?? 10_000) || n.exp < adjusted) {
      return this.reject("REJECTED_TIME", { mid: n.mid, reason: `iat skew ${Math.round(t2 - n.iat)} ms` });
    }
    const w = this.windowFor(channel);
    const verdict = w.check(n.seq);
    if (verdict !== "ACCEPT") return this.reject("REJECTED_REPLAY", { mid: n.mid, seq: n.seq, reason: verdict });
    if (!this.offsets.has(channel)) this.offsets.set(channel, new OffsetTracker());
    this.offsets.get(channel)!.add(t2 - n.iat - 20); // assume ~20 ms one-way delay when learning

    // Exactly-once storage even when two copies land together: serialise per message id.
    const existing = this.inflight.get(n.mid);
    const work = (existing ? existing.then(() => this.finish(n, raw, t2, true, channel)) : this.finish(n, raw, t2, false, channel));
    if (!existing) this.inflight.set(n.mid, work);
    try { return await work; } finally { if (!existing) this.inflight.delete(n.mid); }
  }

  private async finish(n: Notice, raw: Buffer, t2: number, knownDuplicate: boolean, channel: string): Promise<Handled> {
    const hash = createHash("sha256").update(JSON.stringify({ mid: n.mid, body: n.body, inc: n.inc ?? null })).digest("hex");
    let status: "RECEIVED" | "DUPLICATE" = "RECEIVED";
    if (knownDuplicate || this.o.store.has(n.mid)) {
      status = "DUPLICATE"; this.o.store.bumpCopies(n.mid); this.counters.duplicates += 1;
    } else {
      if (this.o.ackMode === "BACKEND_DURABLE") {
        try { await this.o.backendSync?.({ mid: n.mid, seq: n.seq, rid: n.rid, inc: n.inc, nonce: n.nonce, hash, receivedAtMs: t2 }); } catch { return this.reject("BACKEND_UNAVAILABLE", { mid: n.mid }); }
      }
      this.o.store.insert({ mid: n.mid, seq: n.seq, rid: n.rid, at: t2, hash, body: JSON.stringify(n.body), nonce: n.nonce, inc: n.inc });
      if (this.o.ackMode === "BACKEND_DURABLE") this.o.store.markSynced(n.mid);
    }
    // Persist the replay-window snapshot only after the notice row is durable: if the
    // insert had thrown, the window would otherwise advance past a seq with no row.
    this.o.store.saveWindow(channel, this.windowFor(channel).snapshot());
    const t3 = this.now();
    const w = this.windowFor(n.rid).describe();
    const ack = buildAck({
      mid: n.mid, rnd: n.rnd, cpy: n.cpy, seq: n.seq, rid: this.o.receiverId, kid: this.o.activeKid, st: status,
      t2, t3, proc_ms: t3 - t2, qd: this.o.store.unsyncedCount(), wnd: w
    }, this.o.keys);
    if (this.faults.dropAcks) return { verdict: status, mid: n.mid, seq: n.seq, reason: "ack dropped (fault injection)" };
    this.counters.acked += 1;
    return { verdict: status, ack: encodeDatagram(ack), ackDelayMs: this.faults.ackDelayMs, mid: n.mid, seq: n.seq };
  }

  /** LOCAL_DURABLE: pushes unsynced receipts to the backend in the background. Returns how many were synced. */
  async syncPending(): Promise<number> {
    if (!this.o.backendSync) return 0;
    let ok = 0;
    for (const row of this.o.store.unsynced()) {
      try {
        await this.o.backendSync({ mid: row.mid, seq: row.first_seq, rid: row.rid, inc: row.inc ?? undefined, nonce: row.nonce, hash: row.payload_hash, receivedAtMs: row.received_at });
        this.o.store.markSynced(row.mid); ok += 1;
      } catch { break; } // backend down: keep the receipts, retry later (wal_lag grows)
    }
    return ok;
  }

  health() {
    return { receiverId: this.o.receiverId, ackMode: this.o.ackMode, ...this.counters, stored: this.o.store.count(), wal_lag: this.o.store.unsyncedCount(), faults: this.faults };
  }
}

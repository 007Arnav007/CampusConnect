// Pure, deterministic simulation helpers for the CNT Visual Lab (no React, no DOM). Seeded so every demo is reproducible.
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function gauss(r: () => number) { return Math.sqrt(-2 * Math.log(Math.max(r(), 1e-12))) * Math.cos(2 * Math.PI * r()); }

// ---------- Gilbert-Elliott channel (10 ms slots) ----------
export type Channel = { meanLoss: number; burstMs: number; rttMs: number; jitter: number };
const SLOT = 10, LG = 0.003, LB = 0.9;
export function slotStates(c: Channel, seed: number, horizonMs: number): Uint8Array {
  const r = rng(seed); const n = Math.ceil(horizonMs / SLOT) + 2; const s = new Uint8Array(n);
  const pBad = Math.min(Math.max((c.meanLoss - LG) / (LB - LG), 0), 0.95);
  const pBG = Math.min(SLOT / Math.max(c.burstMs, SLOT), 1); const pGB = (pBG * pBad) / Math.max(1 - pBad, 1e-9);
  s[0] = r() < pBad ? 1 : 0;
  for (let i = 1; i < n; i++) s[i] = s[i - 1] ? (r() < pBG ? 0 : 1) : r() < pGB ? 1 : 0;
  return s;
}
export type Copy = { sendMs: number; lostFwd: boolean; lostBack: boolean; ackMs?: number };
export type Delivery = { copies: Copy[]; onTime: boolean; firstAckMs?: number; datagrams: number; states: Uint8Array };

/** k copies spaced by spacingMs, cancel-on-first-ACK, one round, deadline D. Packet fates use common random numbers (seeded). */
export function deliver(c: Channel, k: number, spacingMs: number, deadlineMs: number, seed: number): Delivery {
  const states = slotStates(c, seed, deadlineMs + 2000); const r = rng(seed ^ 0x9e3779b9);
  const lost = (t: number, u: number) => u < (states[Math.min(Math.floor(t / SLOT), states.length - 1)] ? LB : LG);
  const copies: Copy[] = []; let first = Infinity;
  const draws = Array.from({ length: k }, () => [r(), r(), gauss(r), gauss(r)]);
  for (let i = 0; i < k; i++) {
    const t = i * spacingMs; if (t >= first || t >= deadlineMs) break;               // cancel-on-ACK
    const [u1, u2, z1, z2] = draws[i]; const half = c.rttMs / 2;
    const d1 = half * Math.exp(c.jitter * z1 - (c.jitter * c.jitter) / 2), d2 = half * Math.exp(c.jitter * z2 - (c.jitter * c.jitter) / 2);
    const lf = lost(t, u1); const rx = t + d1; const lb = lf ? true : lost(rx + 2, u2);
    const cp: Copy = { sendMs: t, lostFwd: lf, lostBack: lb }; if (!lf && !lb) { cp.ackMs = rx + 2 + d2; first = Math.min(first, cp.ackMs); }
    copies.push(cp);
  }
  return { copies, onTime: first <= deadlineMs, firstAckMs: Number.isFinite(first) ? first : undefined, datagrams: copies.length, states };
}
export function monteCarlo(c: Channel, k: number, spacingMs: number, deadlineMs: number, n = 1500, seed0 = 1) {
  let ok = 0, dg = 0;
  for (let i = 0; i < n; i++) { const d = deliver(c, k, spacingMs, deadlineMs, seed0 + i * 7919); ok += d.onTime ? 1 : 0; dg += d.datagrams; }
  return { onTime: ok / n, meanDatagrams: dg / n };
}

// ---------- RTO race ----------
export type RtoKind = "stationary" | "rtt_step" | "jitter_spike" | "stall";
export function latencyTrace(kind: RtoKind, n: number, seed: number) {
  const r = rng(seed); const lat: number[] = [], lost: boolean[] = []; const onset = Math.floor(n * 0.4);
  for (let i = 0; i < n; i++) {
    let base = 50, sig = 0.2, proc = 5;
    if (kind === "rtt_step" && i >= onset) base += 150;
    if (kind === "jitter_spike" && i >= onset && i < onset + 50) sig = 1.0;
    if (kind === "stall" && i >= onset && i < onset + 25) proc += 400;
    lat.push(base * Math.exp(sig * gauss(r) - sig * sig / 2) + proc); lost.push(r() < 0.04);
  }
  return { lat, lost };
}
export function rfc6298(lat: number[], lost: boolean[], k = 4, minRto = 40) {
  let srtt: number | undefined, rv = 0; const out: number[] = [];
  for (let i = 0; i < lat.length; i++) {
    out.push(srtt === undefined ? 500 : Math.min(5000, Math.max(minRto, srtt + Math.max(1, k * rv))));
    if (lost[i]) continue;
    if (srtt === undefined) { srtt = lat[i]; rv = lat[i] / 2; } else { rv = 0.75 * rv + 0.25 * Math.abs(srtt - lat[i]); srtt = 0.875 * srtt + 0.125 * lat[i]; }
  }
  return out;
}
export function empirical(lat: number[], lost: boolean[], q = 0.95, mult = 1.2) {
  const w: number[] = [], out: number[] = [];
  for (let i = 0; i < lat.length; i++) {
    if (w.length < 10) out.push(500); else { const s = [...w.slice(-100)].sort((a, b) => a - b); out.push(Math.min(5000, Math.max(40, s[Math.min(s.length - 1, Math.floor(q * s.length))] * mult))); }
    if (!lost[i]) w.push(lat[i]);
  }
  return out;
}
export function timerStats(lat: number[], lost: boolean[], tmo: number[]) {
  let spur = 0, ok = 0, recSum = 0, recN = 0;
  for (let i = 0; i < lat.length; i++) { if (lost[i]) { recSum += tmo[i]; recN++; } else { ok++; if (lat[i] > tmo[i]) spur++; } }
  return { spuriousPct: (100 * spur) / Math.max(ok, 1), recoveryMs: recN ? recSum / recN : NaN };
}

// ---------- anti-replay window (64 entries) ----------
export class ReplayWindow {
  max = -1; bits = 0n;
  check(seq: number): "ACCEPT" | "REPLAY" | "TOO_OLD" {
    if (this.max < 0) { this.max = seq; this.bits = 1n; return "ACCEPT"; }
    if (seq > this.max) { const sh = BigInt(seq - this.max); this.bits = sh >= 64n ? 1n : ((this.bits << sh) | 1n) & ((1n << 64n) - 1n); this.max = seq; return "ACCEPT"; }
    const off = this.max - seq; if (off >= 64) return "TOO_OLD";
    const b = 1n << BigInt(off); if (this.bits & b) return "REPLAY"; this.bits |= b; return "ACCEPT";
  }
}

// ---------- TCP framing lab (N-04) ----------
/** Splits a byte string into chunks of `size`, then decodes (a) naively per chunk and (b) after accumulating bytes. */
export function framingDemo(text: string, size: number) {
  const bytes = new TextEncoder().encode(text); const chunks: Uint8Array[] = [];
  for (let i = 0; i < bytes.length; i += size) chunks.push(bytes.slice(i, i + size));
  const naive = chunks.map((c) => new TextDecoder().decode(c)).join("");
  const acc = new Uint8Array(bytes.length); let o = 0; for (const c of chunks) { acc.set(c, o); o += c.length; }
  return { chunks, naive, correct: new TextDecoder().decode(acc), corrupted: naive !== text };
}

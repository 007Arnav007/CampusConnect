/**
 * Sliding anti-replay window (concept of RFC 4303 section 3.4.3), 64 entries.
 * bit i of `bitmap` is set when sequence (max - i) has been accepted.
 * Fixes S-05: reordered datagrams inside the window are accepted exactly once.
 */
export type ReplayVerdict = "ACCEPT" | "REPLAY" | "TOO_OLD";
export const WINDOW = 64;
const MASK = (1n << 64n) - 1n;

export class ReplayWindow {
  private max = 0n;
  private bitmap = 0n;
  private started = false;

  /** Checks and, when acceptable, records the sequence number. */
  check(seq: number | bigint): ReplayVerdict {
    const s = BigInt(seq);
    if (s < 0n) return "TOO_OLD";
    if (!this.started) {
      this.started = true; this.max = s; this.bitmap = 1n;
      return "ACCEPT";
    }
    if (s > this.max) {
      const shift = s - this.max;
      this.bitmap = shift >= 64n ? 1n : ((this.bitmap << shift) | 1n) & MASK;
      this.max = s;
      return "ACCEPT";
    }
    const offset = this.max - s;
    if (offset >= 64n) return "TOO_OLD";
    const bit = 1n << offset;
    if ((this.bitmap & bit) !== 0n) return "REPLAY";
    this.bitmap |= bit;
    return "ACCEPT";
  }

  snapshot(): { max: string; bitmap: string; started: boolean } {
    return { max: this.max.toString(), bitmap: this.bitmap.toString(16), started: this.started };
  }

  static restore(s: { max: string; bitmap: string; started: boolean }): ReplayWindow {
    const w = new ReplayWindow();
    w.max = BigInt(s.max); w.bitmap = BigInt("0x" + s.bitmap); w.started = s.started;
    return w;
  }

  /** Compact form echoed in ACKs (`wnd`). */
  describe() {
    return { max: Number(this.max), bitmap: Buffer.from(this.bitmap.toString(16).padStart(16, "0"), "hex").toString("base64url") };
  }
}

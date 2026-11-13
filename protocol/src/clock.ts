/** NTP-style four-timestamp estimate (all epoch ms). t1 send, t2 remote receive, t3 remote send, t4 receive. */
export function ntpEstimate(t1: number, t2: number, t3: number, t4: number) {
  return { offsetMs: ((t2 - t1) + (t3 - t4)) / 2, delayMs: (t4 - t1) - (t3 - t2) };
}

/** Keeps a robust (median of last N) offset per peer so one outlier does not move the estimate. */
export class OffsetTracker {
  private samples: number[] = [];
  constructor(private readonly size = 15) {}
  add(offsetMs: number) { this.samples.push(offsetMs); if (this.samples.length > this.size) this.samples.shift(); }
  get value(): number {
    if (!this.samples.length) return 0;
    const s = [...this.samples].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  }
}

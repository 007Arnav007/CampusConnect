// RFC 6298 estimator (baseline T-B2) and empirical-quantile fallback (T-B3). Karn-safe: samples are keyed by unique (mid,rnd,cpy).
export class Rfc6298 {
  srtt?: number; rttvar = 0;
  constructor(private readonly k = 4, private readonly minRto = 40, private readonly maxRto = 5000, private readonly g = 1) {}
  sample(rttMs: number) {
    if (this.srtt === undefined) { this.srtt = rttMs; this.rttvar = rttMs / 2; return; }
    this.rttvar = 0.75 * this.rttvar + 0.25 * Math.abs(this.srtt - rttMs);
    this.srtt = 0.875 * this.srtt + 0.125 * rttMs;
  }
  rto(): number {
    if (this.srtt === undefined) return 500;
    return Math.min(this.maxRto, Math.max(this.minRto, this.srtt + Math.max(this.g, this.k * this.rttvar)));
  }
}
export class EmpiricalQuantile {
  private w: number[] = [];
  constructor(private readonly q = 0.95, private readonly mult = 1.2, private readonly n = 100) {}
  sample(x: number) { this.w.push(x); if (this.w.length > this.n) this.w.shift(); }
  rto(): number {
    if (this.w.length < 10) return 500;
    const s = [...this.w].sort((a, b) => a - b); return Math.min(5000, Math.max(40, s[Math.min(s.length - 1, Math.floor(this.q * s.length))] * this.mult));
  }
}

"""E5 - Q-RTO vs RFC 6298 / fixed / empirical timers on six impairment scenarios (spec 5.3.5). Primary output: Pareto of
spurious-retransmission rate vs recovery delay; claim only if Q-RTO dominates at matched spurious rate in >= 4/6 scenarios."""
from __future__ import annotations
import json, time
from pathlib import Path
import numpy as np
from common import ROOT, paired_bootstrap, run_dir, write_manifest
from src.delivery import timers as T

CODE = [Path(__file__), ROOT / "experiments/common.py", ROOT / "ml-service/src/delivery/timers.py"]
N_SEEDS = 20; TARGETS = (0.02, 0.05)


def frontier_at(points, target):
    """Min recovery delay achievable at spurious <= target, linearly interpolated on the lower-left frontier."""
    pts = sorted((s, r) for s, r in points if not np.isnan(r))
    best = [];  m = np.inf
    for s, r in pts:
        if r < m: best.append((s, r)); m = r
    xs = np.array([p[0] for p in best]); ys = np.array([p[1] for p in best])
    if len(xs) == 0 or target < xs.min(): return np.nan           # cannot reach this spurious rate with this family
    return float(np.interp(target, xs, ys))


def main():
    config = {"n_seeds": N_SEEDS, "targets": TARGETS, "train_streams": 240, "calib_streams": 80, "seeds": {"train": 100, "calib": 200, "test": 9000}}
    d = run_dir("E5", CODE, config); t0 = time.time()
    kinds = T.KINDS
    train = [T.make_stream(kinds[i % 6], 100_000 + i, randomize=True) for i in range(240)]
    calib = [T.make_stream(kinds[i % 6], 200_000 + i, randomize=True) for i in range(80)]
    full = T.QRTO(use_incident=True).fit(train, calib); noinc = T.QRTO(use_incident=False).fit(train, calib)
    print(f"[{time.time()-t0:.0f}s] trained", flush=True)
    fams = {}
    for k in kinds:
        per_seed = {name: [] for name in ("RFC6298", "Fixed", "Empirical", "Q-RTO+CQR", "Q-RTO", "Q-RTO(noinc)+CQR")}
        for sd in range(N_SEEDS):
            s = T.make_stream(k, 900_000 + sd * 13 + kinds.index(k))
            srtt, rv = T.rfc6298_series(s)
            P = {n: [] for n in per_seed}
            for kk in (0.5, 1, 2, 4, 6, 8):
                for mr in (40, 100, 200): P["RFC6298"].append(T.score(s, T.rfc6298_timeout(srtt, rv, kk, mr)))
            for f in (100, 150, 200, 300, 500, 800, 1200): P["Fixed"].append(T.score(s, np.full(len(s.lat), float(f))))
            for m in (1.0, 1.2, 1.5, 2.0, 3.0): P["Empirical"].append(T.score(s, T.empirical_timeout(s, m)))
            for tau in full.taus:
                P["Q-RTO+CQR"].append(T.score(s, full.timeout(s, tau, True))); P["Q-RTO"].append(T.score(s, full.timeout(s, tau, False)))
                P["Q-RTO(noinc)+CQR"].append(T.score(s, noinc.timeout(s, tau, True)))
            for n in per_seed: per_seed[n].append(P[n])
        res = {"pareto": {}, "matched": {}}
        for n, runs in per_seed.items():
            res["pareto"][n] = np.nanmean(np.array(runs), axis=0).tolist()          # mean over seeds, per knob
            res["matched"][n] = {str(t): [frontier_at(r, t) for r in runs] for t in TARGETS}
        res["tests"] = {}
        for base in ("RFC6298", "Fixed", "Empirical"):
            res["tests"][base] = {}
            for t in TARGETS:
                a = np.array(res["matched"]["Q-RTO+CQR"][str(t)]); b = np.array(res["matched"][base][str(t)]); ok = ~np.isnan(a) & ~np.isnan(b)
                res["tests"][base][str(t)] = {**paired_bootstrap(a[ok], b[ok]), "usable_seeds": int(ok.sum())} if ok.sum() >= 5 else {"usable_seeds": int(ok.sum())}
        fams[k] = res
        print(f"[{time.time()-t0:.0f}s] {k}: Q-RTO vs RFC6298 @2%: " + str({t: round(res['tests']['RFC6298'][t].get('mean', float('nan')), 1) for t in ('0.02', '0.05')}), flush=True)
    wins = {}
    for base in ("RFC6298", "Fixed", "Empirical"):
        w = 0
        for k in kinds:
            ts = [fams[k]["tests"][base][str(t)] for t in TARGETS]
            if all("hi" in x and x["hi"] < 0 for x in ts): w += 1       # lower recovery delay, CI excludes 0, at both targets
        wins[base] = w
    out = {"scenarios": fams, "dominance_wins_of_6": wins, "claim_supported": {b: wins[b] >= 4 for b in wins}}
    (d / "results.json").write_text(json.dumps(out, indent=1))
    write_manifest(d, config, {"elapsed_s": round(time.time() - t0, 1)})
    import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
    fig, axes = plt.subplots(2, 3, figsize=(13, 7))
    for ax, k in zip(axes.ravel(), kinds):
        for n, st in (("RFC6298", "s"), ("Fixed", "x"), ("Empirical", "^"), ("Q-RTO+CQR", "o"), ("Q-RTO(noinc)+CQR", "d")):
            pts = np.array(fams[k]["pareto"][n]); ax.plot(pts[:, 0] * 100, pts[:, 1], st, label=n, alpha=.8)
        ax.set_title(k); ax.set_xlabel("spurious retransmissions (%)"); ax.set_ylabel("loss-recovery delay (ms)"); ax.set_xlim(0, 25); ax.grid(alpha=.3)
    axes[0, 0].legend(fontsize=7); fig.tight_layout(); fig.savefig(d / "fig_pareto.png", dpi=130)
    print(json.dumps({"wins_of_6": wins}), "->", d)

if __name__ == "__main__": main()

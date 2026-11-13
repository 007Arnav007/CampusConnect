"""E3 - Fault Localizer vs baselines under blind-spot, reporter and noise sweeps (spec 5.2.9, 5.2.11, 15.2).
Hidden test seeds are used exactly once per frozen code hash. Run: python experiments/e3_localizer.py [--quick]"""
from __future__ import annotations

import argparse, json, time
from pathlib import Path

import numpy as np

from common import ROOT, paired_bootstrap, run_dir, wilson, write_manifest
from src.localizer import baselines
from src.localizer.calibration import NONE, Conformal, TwoStageCalibrator, needs_review, prf, to_vector, zone_scope
from src.localizer.model import Localizer, fit_params
from src.netsim.scenarios import CHECKPOINTS, FAULT_FAMILIES, generate_dataset
from src.netsim.topology import build_topology

CODE = [Path(__file__), ROOT / "experiments/common.py", *sorted((ROOT / "ml-service/src/localizer").glob("*.py")),
        *sorted((ROOT / "ml-service/src/netsim").glob("*.py")), ROOT / "topology/campus.yaml"]
SEEDS = {"train": 11, "val": 22, "calib": 33, "test": 4401}     # disjoint; test seeds are frozen


def mix(topo, n, seed, benign=True, benign_share=0.12, **kw):
    """Training/calibration data mixes several blind fractions so the model sees varied monitoring coverage.
    Calibration is fault-only: AT-LOC-3 coverage is a single-fault claim, so exchangeability must hold with the test cells."""
    out = []; per = n // 4
    for i, b in enumerate((0.0, 0.1, 0.2, 0.3)):
        out += generate_dataset(topo, per, seed * 10 + i, blind_frac=b, benign_share=benign_share if benign else 0.0, **kw)
    return out


def rank_of(ranking, truth):
    return ranking.index(truth) + 1


def main(quick: bool):
    n_test = 80 if quick else 250
    config = {"n_train": 1600, "n_val": 400, "n_calib": 600, "n_test": n_test, "seeds": SEEDS, "alpha": 0.10, "quick": quick}
    d = run_dir("E3" + ("-quick" if quick else ""), CODE, config)
    topo = build_topology(); t0 = time.time()
    train, val, calib = mix(topo, 1600, SEEDS["train"]), mix(topo, 400, SEEDS["val"], benign_share=0.3), mix(topo, 600, SEEDS["calib"], benign=False)
    params = fit_params(topo, train)
    (d / "calibration.json").write_text(params.dump())
    full = Localizer(topo, params, "full")
    variants = {"L-A1": Localizer(topo, params, "tel_only"), "L-A2": Localizer(topo, params, "rep_only"),
                "L-A3": Localizer(topo, params, "no_missingness"), "L-F": full}
    CK = 5.0

    def truth_idx(sc, names): return names.index(sc.label if sc.faults else NONE)

    vecs, tidx = [], []
    for sc in val:
        names, v = to_vector(full.posterior(sc.evidence[CK])); vecs.append(v); tidx.append(truth_idx(sc, names))
    cal = TwoStageCalibrator().fit(vecs, tidx); T = cal.T
    cv, ci, ct = [], [], []
    for sc in calib:
        names, v = to_vector(full.posterior(sc.evidence[CK])); cv.append(v); ci.append(truth_idx(sc, names))
        ct.append(topo.ntype[sc.faults[0]] if sc.faults else NONE)
    conf = Conformal(alpha=0.10, cal=cal).fit(cv, ci, ct)

    def evaluate_cell(label, **gen_kw):
        data = generate_dataset(topo, n_test, SEEDS["test"], benign_share=0.0, **gen_kw)
        hit = {m: [] for m in ("L-B1", "L-B2", "L-B3", *variants)}; top3 = {m: [] for m in hit}; mrr = {m: [] for m in hit}
        cov, size, cov_m = [], [], []; sc_prf = []
        for sc in data:
            ev = sc.evidence[CK]; truth = sc.label
            for m, fn in baselines.BASELINES.items():
                r = fn(topo, ev); k = rank_of(r, truth); hit[m].append(k == 1); top3[m].append(k <= 3); mrr[m].append(1 / k)
            for m, loc in variants.items():
                post = loc.posterior(ev); r = post.ranking(); k = rank_of(r, truth)
                hit[m].append(k == 1); top3[m].append(k <= 3); mrr[m].append(1 / k)
                if m == "L-F":
                    names, v = to_vector(post)
                    cs = conf.predict_set(names, v); cov.append(truth in cs); size.append(len(cs))
                    cov_m.append(truth in conf.predict_set(names, v, topo.ntype, mondrian=True))
                    pz = post.zone_marginal; notify = {topo.zones[i] for i in np.where(zone_scope(pz, 0.5))[0]}
                    true_z = {topo.zones[i] for i in np.where(topo.impact[topo.node_idx[truth]] > 0.25)[0]}
                    sc_prf.append(prf(notify, true_z))
        res = {"n": len(data)}
        for m in hit:
            k = int(sum(hit[m])); lo, hi = wilson(k, len(data))
            res[m] = {"top1": k / len(data), "top1_ci": [lo, hi], "top3": float(np.mean(top3[m])), "mrr": float(np.mean(mrr[m]))}
        res["_hits"] = {m: [int(x) for x in hit[m]] for m in ("L-F", "L-B1", "L-B2", "L-A3")}
        res["conformal"] = {"coverage": float(np.mean(cov)), "coverage_mondrian": float(np.mean(cov_m)), "mean_set_size": float(np.mean(size))}
        res["scoping"] = {"precision": float(np.mean([x[0] for x in sc_prf])), "recall": float(np.mean([x[1] for x in sc_prf])), "f2": float(np.mean([x[2] for x in sc_prf]))}
        print(f"[{time.time()-t0:5.0f}s] {label}: L-F top1={res['L-F']['top1']:.3f}  L-B1={res['L-B1']['top1']:.3f}  L-B2={res['L-B2']['top1']:.3f}  L-A3={res['L-A3']['top1']:.3f}  cov={res['conformal']['coverage']:.3f}", flush=True)
        return res

    (d / "calibrator.json").write_text(json.dumps({"T": cal.T, "platt_a": cal.a, "platt_b": cal.b, "qhat": conf.qhat, "alpha": conf.alpha,
        "qhat_by_type": conf.qhat_by_type, "model_version": params.version, "topology_hash": topo.hash(), "checkpoint_min": CK}, indent=2))
    out = {"T": T, "platt": [cal.a, cal.b], "qhat": conf.qhat, "blind": {}, "reporter": {}, "noise": {}}
    for mode in ("mcar", "mnar"):
        for b in (0.0, 0.1, 0.2, 0.3, 0.5):
            out["blind"][f"{mode}-{int(b*100)}"] = evaluate_cell(f"blind {mode} {b:.0%}", blind_frac=b, blind_mode=mode)
    for s in (0.5, 1.0, 2.0):
        out["reporter"][str(s)] = evaluate_cell(f"rho x{s}", blind_frac=0.2, rho_scale=s)
    for m in (0.0, 0.1, 0.2, 0.3):
        out["noise"][f"mislocate-{int(m*100)}"] = evaluate_cell(f"mislocate {m:.0%}", blind_frac=0.2, mislocate=m)

    # ---- kill criterion H1 (5.2.11): L-F vs L-B1 at b = 20 % ----
    kill = {}
    for mode in ("mcar", "mnar"):
        h = out["blind"][f"{mode}-20"]["_hits"]
        diff = paired_bootstrap(np.array(h["L-F"]), np.array(h["L-B1"]))
        kill[mode] = {**diff, "passes": bool(diff["mean"] >= 0.05 and diff["lo"] > 0)}
        mis = paired_bootstrap(np.array(h["L-F"]), np.array(h["L-A3"]))
        kill[mode]["informative_missingness_gain_vs_L-A3"] = mis
    out["kill_criterion_H1"] = kill

    # ---- time to localize at b = 20 % MCAR ----
    ttl = {"L-F": [], "L-B1": []}; data = generate_dataset(topo, n_test, SEEDS["test"], benign_share=0.0, blind_frac=0.2)
    for sc in data:
        for name in ttl:
            found = None
            for cp in CHECKPOINTS:
                ev = sc.evidence[cp]
                if name == "L-F":
                    post = full.posterior(ev); names, v = to_vector(post); p = cal.apply(v)
                    ok = post.ranking()[0] == sc.label and p[names.index(sc.label)] >= 0.5
                else:
                    ok = baselines.l_b1_telemetry_only(topo, ev)[0] == sc.label
                if ok: found = cp; break
            ttl[name].append(found)
    out["time_to_localize"] = {k: {"median_min": float(np.median([x for x in v if x is not None])) if any(x is not None for x in v) else None,
                                   "never_localized": float(np.mean([x is None for x in v]))} for k, v in ttl.items()}

    # ---- false-incident rate on benign scenarios (surges, nothing) ----
    from src.localize_api import check_operational_surge
    benign = [s for s in generate_dataset(topo, 400 if not quick else 100, SEEDS["test"] + 1, benign_share=1.0, blind_frac=0.2)]
    p_none = []
    for sc in benign:
        ev = sc.evidence[CK]
        post = full.posterior(ev); names, v = to_vector(post); p = cal.apply(v)
        top = names[int(np.argmax(p[:-1]))] if len(names) > 1 else None
        is_surge, _, _ = check_operational_surge(topo, ev, top, ev.tickets) if top else (False, None, None)
        p_none.append(max(float(p[-1]), 0.85) if is_surge else float(p[-1]))
    by_fam = {f: [p < 0.5 for p, sc in zip(p_none, benign) if sc.family == f] for f in ("NONE", "BENIGN_SURGE")}
    det_data = generate_dataset(topo, 150 if not quick else 40, SEEDS["test"] + 3, benign_share=0.0, blind_frac=0.2)
    p_det = []
    for sc in det_data:
        ev = sc.evidence[CK]
        post = full.posterior(ev); names, v = to_vector(post); p = cal.apply(v)
        top = names[int(np.argmax(p[:-1]))] if len(names) > 1 else None
        is_surge, _, _ = check_operational_surge(topo, ev, top, ev.tickets) if top else (False, None, None)
        p_det.append(max(float(p[-1]), 0.85) if is_surge else float(p[-1]))
    out["false_incident_rate"] = {"n": len(benign), "rate_p_none_below_0.5": float(np.mean([p < 0.5 for p in p_none])),
                                  "by_family": {f: {"n": len(v), "rate": float(np.mean(v)) if v else None} for f, v in by_fam.items()},
                                  "detection_rate_faulty_at_5min": float(np.mean([p < 0.5 for p in p_det]))}

    # ---- concurrent faults: pairs enabled vs single-only ----
    pair_data = generate_dataset(topo, 120 if not quick else 40, SEEDS["test"] + 2, benign_share=0.0, families=["AP_DEGRADED", "AP_DEAD"], pair_share=1.0, blind_frac=0.1)
    pair_loc = Localizer(topo, params, "full", pairs=True)
    def both_in_top(loc, k):
        ok = []
        for sc in pair_data:
            if len(sc.faults) < 2: continue
            r = loc.posterior(sc.evidence[8.0]).ranking()[:k]; ok.append(all(f in r for f in sc.faults))
        return float(np.mean(ok)), len(ok)
    out["concurrent_faults"] = {"single_only_both_in_top3": both_in_top(full, 3), "pairs_both_in_top3": both_in_top(pair_loc, 3)}

    # ---- latency (AT-LOC-2) ----
    ev = data[0].evidence[5.0]; ts = []
    for _ in range(40):
        t1 = time.perf_counter(); full.posterior(ev); ts.append((time.perf_counter() - t1) * 1000)
    out["latency_ms_p95"] = float(np.percentile(ts, 95))

    for sub in ("blind", "reporter", "noise"):
        for cell in out[sub].values(): cell.pop("_hits", None)
    (d / "results.json").write_text(json.dumps(out, indent=2, sort_keys=True))
    write_manifest(d, config, {"topology_hash": topo.hash(), "elapsed_s": round(time.time() - t0, 1), "families": FAULT_FAMILIES})
    make_figures(out, d)
    print("wrote", d)


def make_figures(out, d):
    import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
    bs = [0, 10, 20, 30, 50]
    fig, axes = plt.subplots(1, 2, figsize=(11, 4), sharey=True)
    for ax, mode in zip(axes, ("mcar", "mnar")):
        for m, st in (("L-F", "o-"), ("L-A1", "s--"), ("L-A2", "^--"), ("L-A3", "d:"), ("L-B1", "x-"), ("L-B2", "v-"), ("L-B3", "+-")):
            ax.plot(bs, [out["blind"][f"{mode}-{b}"][m]["top1"] for b in bs], st, label=m)
        ax.set_title(f"Top-1 vs blind-node % ({mode.upper()})"); ax.set_xlabel("% nodes without telemetry"); ax.grid(alpha=.3)
    axes[0].set_ylabel("Top-1 accuracy @ 5 min"); axes[1].legend(ncol=2, fontsize=8)
    fig.tight_layout(); fig.savefig(d / "fig_blind_sweep.png", dpi=140); plt.close(fig)
    md = ["| cell | L-F | L-A3 | L-A1 | L-A2 | L-B1 | L-B2 | L-B3 | coverage | set size |", "|---|---|---|---|---|---|---|---|---|---|"]
    for grp in ("blind", "reporter", "noise"):
        for k, c in out[grp].items():
            md.append(f"| {grp}:{k} | " + " | ".join(f"{c[m]['top1']:.3f}" for m in ("L-F", "L-A3", "L-A1", "L-A2", "L-B1", "L-B2", "L-B3")) + f" | {c['conformal']['coverage']:.3f} | {c['conformal']['mean_set_size']:.2f} |")
    (d / "table_top1.md").write_text("\n".join(md))


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--quick", action="store_true"); main(ap.parse_args().quick)

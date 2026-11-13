"""E6 - Policy Selector + Shield vs fixed / static / oracle policies on the delivery DES (spec 5.4.9, 15.2).
Honest scope: synthetic channel (Gilbert-Elliott + lognormal jitter); real-socket confirmation is a separate lab run."""
from __future__ import annotations
import json, time
from pathlib import Path
import numpy as np
from common import ROOT, paired_bootstrap, run_dir, wilson, write_manifest
from src.delivery import policy as pol
from src.delivery.actions import ACTIONS, static_table
from src.delivery.des import Channel, ChannelParams, simulate, utility
from src.delivery.shield import ShieldContext, choose

CODE = [Path(__file__), ROOT / "experiments/common.py", *sorted((ROOT / "ml-service/src/delivery").glob("*.py"))]
CRIT = [f"A{i}" for i in range(7, 15)]
BASE = ["A3", "A11", "A5", "A6"]
REPS = 6


def sample_context(rng):
    p = ChannelParams(base_rtt_ms=float(rng.uniform(15, 150)), jitter_sigma=float(rng.uniform(0.1, 0.5)),
                      mean_loss=float(np.exp(rng.uniform(np.log(0.005), np.log(0.30)))), mean_bad_ms=float(np.exp(rng.uniform(np.log(10), np.log(400)))),
                      proc_ms=5.0, stall_ms=float(400 if rng.random() < 0.08 else 0))
    D = float(rng.choice([300, 500, 1000, 2000, 5000])); sev = float(rng.uniform(0, 1))
    # what the gateway *measures* (noisy probe estimates, not the true channel parameters)
    n = 60; loss_hat = rng.binomial(n, min(p.mean_loss * 1.0, 0.95)) / n
    burst_hat = max(1.0, p.burst_len_pkts() * float(np.exp(rng.normal(0, 0.3))))
    c = {"loss_ewma": loss_hat, "burst_len": burst_hat, "rtt_ms": p.base_rtt_ms * float(np.exp(rng.normal(0, 0.1))),
         "jitter": p.jitter_sigma * p.base_rtt_ms / 2, "deadline_ms": D, "severity": sev, "receiver_health": float(1.0 - 0.7 * (p.stall_ms > 0))}
    return p, c


def run_context(p, c, seed0, actions, w_b):
    tmo = 3 * c["rtt_ms"] + 60
    res = {a: [] for a in actions}
    for r in range(REPS):
        ch = Channel(p, seed0 * 100 + r)
        for a in actions:
            o = simulate(ACTIONS[a], ch, c["deadline_ms"], tmo, t0=100.0 + 53 * r)
            res[a].append(o)
    return res


def mean_stats(outs, c, w_b):
    return {"S": float(np.mean([o.success for o in outs])), "L": float(np.mean([o.latency_ms for o in outs if o.success] or [np.nan])),
            "B": float(np.mean([o.bytes_sent for o in outs])), "U": float(np.mean([utility(o, c["severity"], c["deadline_ms"], w_b) for o in outs]))}


def main():
    config = {"n_train": 2500, "n_test": 1200, "reps": REPS, "w_b_sweep": [0.02, 0.05, 0.2], "seeds": {"train": 6001, "test": 7001}}
    d = run_dir("E6", CODE, config); t0 = time.time()
    ALL = sorted(set(CRIT + BASE), key=lambda a: int(a[1:]))
    def build(n, seed):
        rng = np.random.default_rng(seed); data = []
        for i in range(n):
            p, c = sample_context(rng); data.append((p, c, run_context(p, c, seed + i, ALL, 0.05)))
        return data
    train, test = build(config["n_train"], 6001), build(config["n_test"], 7001)
    print(f"[{time.time()-t0:.0f}s] simulated", flush=True)
    results = {}
    for w_b in config["w_b_sweep"]:
        def fitset(use_inc):
            X = np.array([pol.context_vector(c, use_inc) for _, c, _ in train])
            # use every replicate as its own labelled example (more data, true Bernoulli labels)
            Xr = np.repeat(X, REPS, axis=0)
            Sr = {a: np.array([o.success for _, _, res in train for o in res[a]], int) for a in CRIT}
            Lr = {a: np.array([o.latency_ms if o.success else 0.0 for _, _, res in train for o in res[a]]) for a in CRIT}
            return pol.UtilityModel(CRIT, use_inc, w_b).fit(Xr, Sr, Lr)
        full, netonly = fitset(True), fitset(False)
        nospace = [a for a in CRIT if a in ("A8", "A10", "A14")]
        rows = {k: [] for k in ("P-B1", "P-B2", "P-B3", "P-B4", "P-F", "P-B5", "P-A3", "P-A4", "ORACLE")}
        rng = np.random.default_rng(5)
        picks = {k: [] for k in rows}
        for p, c, res in test:
            st = {a: mean_stats(res[a], c, w_b) for a in ALL}
            x_f, x_n = pol.context_vector(c, True), pol.context_vector(c, False)
            sh = ShieldContext("CRITICAL_NOTICE", c["deadline_ms"], timeout_ms=3 * c["rtt_ms"] + 60)
            uf = full.predict(x_f, c["severity"], c["deadline_ms"]); un = netonly.predict(x_n, 0.5, c["deadline_ms"])
            ch = {"P-B1": "A3", "P-B2": "A11", "P-B3": static_table("CRITICAL_NOTICE", c["loss_ewma"], c["burst_len"]),
                  "P-F": choose(sh, uf, c["loss_ewma"], c["burst_len"]).action, "P-B5": choose(sh, un, c["loss_ewma"], c["burst_len"]).action,
                  "P-A3": choose(sh, {a: uf[a] for a in nospace}, c["loss_ewma"], c["burst_len"]).action,
                  "P-A4": str(rng.choice(CRIT)), "ORACLE": max(CRIT, key=lambda a: st[a]["U"])}
            band = (0 if c["loss_ewma"] < .02 else 1 if c["loss_ewma"] < .10 else 2, int(c["burst_len"] >= 6), c["deadline_ms"])
            picks["_band"] = picks.get("_band", []) + [band]
            for k, a in ch.items(): rows[k].append((a, st[a])); picks[k].append(a)
        # hindsight best fixed action per condition band (upper bound for any fixed-per-condition policy)
        bands = picks.pop("_band"); best = {}
        for b in set(bands):
            idx = [i for i, x in enumerate(bands) if x == b]
            best[b] = max(CRIT + BASE, key=lambda a: np.mean([test[i][2] and mean_stats(test[i][2][a], test[i][1], w_b)["U"] for i in idx]))
        for i, (p, c, res) in enumerate(test):
            a = best[bands[i]]; rows["P-B4"].append((a, mean_stats(res[a], c, w_b)))
        summary = {}
        for k, v in rows.items():
            S = np.array([x[1]["S"] for x in v]); U = np.array([x[1]["U"] for x in v]); B = np.array([x[1]["B"] for x in v])
            ks = int(round(S.sum() * REPS)); lo, hi = wilson(ks, len(S) * REPS)
            summary[k] = {"on_time": float(S.mean()), "on_time_ci": [lo, hi], "utility": float(U.mean()), "bytes": float(B.mean()),
                          "lat_p95": float(np.nanpercentile([x[1]["L"] for x in v], 95)), "lat_p99": float(np.nanpercentile([x[1]["L"] for x in v], 99))}
        base_b = summary["P-B1"]["bytes"]
        for k in summary: summary[k]["bytes_vs_B1"] = summary[k]["bytes"] / base_b
        U = {k: np.array([x[1]["U"] for x in v]) for k, v in rows.items()}
        tests = {f"P-F_minus_{b}": paired_bootstrap(U["P-F"], U[b]) for b in ("P-B1", "P-B2", "P-B3", "P-B4", "P-B5", "P-A3", "P-A4")}
        regret = {k: float(np.mean(U["ORACLE"] - U[k])) for k in U}
        by_deadline = {}
        for D in (300, 500, 1000, 2000, 5000):
            idx = [i for i, (_, c, _) in enumerate(test) if c["deadline_ms"] == D]
            by_deadline[str(D)] = {"n": len(idx), **{k: {"on_time": float(np.mean([rows[k][i][1]["S"] for i in idx])), "utility": float(np.mean([rows[k][i][1]["U"] for i in idx])),
                                                        "bytes_vs_B1": float(np.mean([rows[k][i][1]["B"] for i in idx]) / max(np.mean([rows["P-B1"][i][1]["B"] for i in idx]), 1))}
                                                    for k in ("P-B1", "P-B2", "P-B3", "P-F", "P-B5", "ORACLE")}}
        results[str(w_b)] = {"summary": summary, "paired_utility_diff": tests, "regret_vs_oracle": regret, "by_deadline": by_deadline,
                             "feasible_for_critical": ["P-B2", "P-B3", "P-F", "P-B5", "P-A3", "P-A4", "ORACLE"],
                             "reference_only_not_feasible_for_critical(R1)": ["P-B1", "P-B4"]}
        print(f"[{time.time()-t0:.0f}s] w_b={w_b}: " + "  ".join(f"{k}={summary[k]['utility']:.3f}" for k in ("P-B1", "P-B2", "P-B3", "P-B4", "P-F", "P-B5", "P-A3", "ORACLE")), flush=True)
    # spaced vs back-to-back at matched k (sanity expectation 5.4.10)
    sp = {}
    for lbl, a_s, a_b in (("k2", "A7", "A6"),):
        d_ = [ (np.mean([o.success for o in res[a_s]]), np.mean([o.success for o in res[a_b]])) for p, c, res in test if p.mean_loss > 0.05 and p.mean_bad_ms > 80]
        sp[lbl] = {"bursty_contexts": len(d_), "spaced_on_time": float(np.mean([x[0] for x in d_])), "back_to_back_on_time": float(np.mean([x[1] for x in d_]))}
    (d / "results.json").write_text(json.dumps({"by_weight": results, "spaced_vs_b2b": sp}, indent=1))
    write_manifest(d, config, {"elapsed_s": round(time.time() - t0, 1)})
    print(json.dumps(sp), "->", d)

if __name__ == "__main__": main()

"""Copies the artifacts of the latest full E3 run into the ml-service model registry with provenance + checksum (spec 5.0, 5.7)."""
import glob, hashlib, json, shutil
from pathlib import Path
from common import ROOT


def latest_run() -> Path:
    """Pick the run with the newest manifest created_utc (not lexicographic dir name)."""
    runs = [Path(p).parent for p in glob.glob(str(ROOT / "experiments/runs/E3/*/calibrator.json"))]
    if not runs: raise SystemExit("no E3 run found; run e3_localizer.py first")

    def sort_key(p: Path):
        try:
            manifest = json.loads((p / "manifest.json").read_text())
            created = str(manifest.get("created_utc", ""))
        except (OSError, ValueError):
            created = ""
        return (created, p.stat().st_mtime)

    return max(runs, key=sort_key)


run = latest_run()
dst = ROOT / "ml-service/models/localizer/active"; dst.mkdir(parents=True, exist_ok=True)
for f in ("calibration.json", "calibrator.json"): shutil.copy(run / f, dst / f)
res = json.loads((run / "results.json").read_text())
h = hashlib.sha256(b"".join((dst / f).read_bytes() for f in ("calibration.json", "calibrator.json"))).hexdigest()
meta = {"name": "localizer", "version": "bayes-1", "status": "ACTIVE-DEMO", "sha256": h, "trainedOn": "synthetic generator netsim v2 (seeds 11/22/33)",
        "sourceRun": str(run.relative_to(ROOT)), "claims": "Only the numbers in the source run's results.json are supported; synthetic data, not validated on a real campus.",
        "metricsAt20pctBlind": {k: res["blind"]["mcar-20"][k]["top1"] for k in ("L-F", "L-B1")}, "mode": "trained-artifact"}
(dst / "metadata.json").write_text(json.dumps(meta, indent=2)); print("promoted", run.name, h[:12])

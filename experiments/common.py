"""Shared experiment utilities: manifests (reproducibility), Wilson CI, paired bootstrap."""
from __future__ import annotations

import hashlib
import json
import platform
import sys
import time
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "ml-service"))


def code_hash(paths: list[Path]) -> str:
    h = hashlib.sha256()
    for p in sorted(paths):
        h.update(p.read_bytes())
    return h.hexdigest()[:16]


def run_dir(name: str, files: list[Path], config: dict) -> Path:
    cid = code_hash(files)
    cfg = hashlib.sha256(json.dumps(config, sort_keys=True).encode()).hexdigest()[:8]
    d = ROOT / "experiments" / "runs" / name / f"{cid}-{cfg}"
    d.mkdir(parents=True, exist_ok=True)
    return d


def write_manifest(d: Path, config: dict, extra: dict | None = None):
    import scipy, sklearn
    (d / "manifest.json").write_text(json.dumps({
        "created_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "config": config,
        "python": platform.python_version(), "numpy": np.__version__, "scipy": scipy.__version__, "sklearn": sklearn.__version__,
        **(extra or {})}, indent=2, sort_keys=True))


def wilson(k: int, n: int, z: float = 1.96) -> tuple[float, float]:
    if n == 0: return (0.0, 1.0)
    p = k / n; d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d; w = z * np.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (float(c - w), float(c + w))


def paired_bootstrap(a: np.ndarray, b: np.ndarray, n_boot: int = 4000, seed: int = 0) -> dict:
    """CI for mean(a-b) resampling *scenarios* (paired)."""
    rng = np.random.default_rng(seed); d = np.asarray(a, float) - np.asarray(b, float)
    idx = rng.integers(0, len(d), size=(n_boot, len(d)))
    m = d[idx].mean(axis=1)
    return {"mean": float(d.mean()), "lo": float(np.percentile(m, 2.5)), "hi": float(np.percentile(m, 97.5)), "n": int(len(d))}

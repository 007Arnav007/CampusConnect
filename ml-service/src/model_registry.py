from __future__ import annotations

from pathlib import Path
from typing import Any

try:
    import joblib
except ImportError:  # Optional until a trained artifact is installed.
    joblib = None


ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "models"


def list_models() -> list[dict[str, Any]]:
    models: list[dict[str, Any]] = []
    for metadata in MODEL_DIR.glob("**/metadata.json"):
        try:
            import json
            data = json.loads(metadata.read_text(encoding="utf-8"))
            models.append({**data, "artifact": str(metadata.with_name("model.joblib"))})
        except (OSError, ValueError):
            continue
    return models


def load_anomaly_model() -> tuple[Any | None, dict[str, Any]]:
    artifact = MODEL_DIR / "anomaly" / "active" / "model.joblib"
    metadata = MODEL_DIR / "anomaly" / "active" / "metadata.json"
    if joblib is None or not artifact.exists():
        return None, {"modelVersion": "anomaly-fallback-v1", "mode": "heuristic-fallback"}
    try:
        model = joblib.load(artifact)
        import json
        info = json.loads(metadata.read_text(encoding="utf-8")) if metadata.exists() else {}
        return model, {"modelVersion": info.get("modelVersion", "anomaly-trained-v1"), "mode": "trained-artifact"}
    except (OSError, ValueError, RuntimeError):
        return None, {"modelVersion": "anomaly-fallback-v1", "mode": "heuristic-fallback"}

"""Train the first reproducible anomaly baseline from simulator CSV exports.

The split is performed by scenario file, not by individual telemetry rows.
This avoids leaking adjacent observations from one simulated incident into the
evaluation set.
"""

from __future__ import annotations

import argparse
import csv
import json
import random
from pathlib import Path

from joblib import dump
from sklearn.ensemble import IsolationForest
from sklearn.metrics import average_precision_score, precision_recall_fscore_support


FEATURES = ["packet_loss_rate", "rtt_ms", "jitter_ms", "throughput_mbps", "gateway_load"]


def read_rows(paths: list[Path]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for path in paths:
        with path.open(newline="", encoding="utf-8") as handle:
            rows.extend(csv.DictReader(handle))
    return rows


def matrix(rows: list[dict[str, str]]) -> list[list[float]]:
    return [[float(row[name]) for name in FEATURES] for row in rows]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, required=True, help="Directory containing simulator CSV files")
    parser.add_argument("--output", type=Path, default=Path("models/anomaly/active"))
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    paths = sorted(args.data.glob("*.csv"))
    if len(paths) < 2:
        raise SystemExit("Need at least two scenario CSV files for a scenario-level split.")
    random.Random(args.seed).shuffle(paths)
    split = max(1, int(len(paths) * 0.8))
    train_paths, test_paths = paths[:split], paths[split:]
    train_rows, test_rows = read_rows(train_paths), read_rows(test_paths)
    if not train_rows or not test_rows:
        raise SystemExit("Training and test splits must both contain rows.")

    model = IsolationForest(
        n_estimators=200,
        contamination="auto",
        random_state=args.seed,
    )
    model.fit(matrix(train_rows))
    scores = [-float(value) for value in model.decision_function(matrix(test_rows))]
    labels = [row["is_anomaly"].lower() == "true" for row in test_rows]
    predicted = [value == -1 for value in model.predict(matrix(test_rows))]
    precision, recall, f1, _ = precision_recall_fscore_support(labels, predicted, average="binary", zero_division=0)
    ap = average_precision_score(labels, scores) if any(labels) else 0.0
    baseline = [
        float(row["packet_loss_rate"]) > 0.05 or float(row["rtt_ms"]) > 100 or float(row["gateway_load"]) > 0.8
        for row in test_rows
    ]
    baseline_precision, baseline_recall, baseline_f1, _ = precision_recall_fscore_support(
        labels, baseline, average="binary", zero_division=0
    )

    args.output.mkdir(parents=True, exist_ok=True)
    dump(model, args.output / "model.joblib")
    (args.output / "metadata.json").write_text(json.dumps({
        "modelVersion": "anomaly-isolation-forest-v1",
        "algorithm": "IsolationForest",
        "features": FEATURES,
        "seed": args.seed,
        "trainScenarios": [path.name for path in train_paths],
        "testScenarios": [path.name for path in test_paths],
        "metrics": {
            "isolationForest": {"precision": precision, "recall": recall, "f1": f1, "averagePrecision": ap},
            "thresholdBaseline": {"precision": baseline_precision, "recall": baseline_recall, "f1": baseline_f1},
        },
    }, indent=2), encoding="utf-8")
    print(json.dumps({"modelVersion": "anomaly-isolation-forest-v1", "metrics": {
        "isolationForest": {"precision": precision, "recall": recall, "f1": f1, "averagePrecision": ap},
        "thresholdBaseline": {"precision": baseline_precision, "recall": baseline_recall, "f1": baseline_f1},
    }}, indent=2))


if __name__ == "__main__":
    main()

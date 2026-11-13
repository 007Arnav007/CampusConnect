# CampusConnect ML Service

Python 3.11 FastAPI prototype for bounded, explainable incident inference. It
uses optional model artifacts when present, otherwise explicitly returns
deterministic heuristic-fallback results. Scores are operational estimates, not
empirical accuracy claims or delivery guarantees.

```powershell
py -3.11 -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m uvicorn src.main:app --port 5100
```

Endpoints include `/health`, `/models`, `/api/v1/ml/anomaly`,
`/v1/anomaly/detect`, `correlate`, `root-cause`, `impact`, `propagation`, and
`policy-score`. The training command is:

```powershell
py -3.11 -m src.training.train_anomaly --data ..\datasets\research --output models\anomaly\active
```

Training requires simulator CSV exports and evaluates by complete scenario
files. It never promotes a model silently; review `metadata.json` before
activating an artifact.

Optional artifacts belong in `models/` and are never required for startup.

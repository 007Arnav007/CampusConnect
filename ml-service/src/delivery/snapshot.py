"""Signed policy snapshot (spec 5.4.7): control plane -> data plane. Ed25519 over the exact bytes of `body`.
Signing the byte string (not a re-serialised object) avoids float-formatting differences between Python and JavaScript."""
from __future__ import annotations

import base64
import json
import time

import numpy as np
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey

from .actions import ACTION_SET_VERSION, static_table

FEATURES = ["loss_ewma", "burst_len", "rtt_ms", "jitter", "deadline_log", "severity", "receiver_health"]


def fit_linear_utilities(X: np.ndarray, U: dict[str, np.ndarray], l2: float = 1.0) -> dict:
    """Ridge regression per action on standardised features: U_a(x) ~ w_a . z(x) + b_a (direct method)."""
    mean, std = X.mean(0), X.std(0) + 1e-9
    Z = (X - mean) / std
    models = {}
    for a, y in U.items():
        A = np.hstack([Z, np.ones((len(Z), 1))]); reg = l2 * np.eye(A.shape[1]); reg[-1, -1] = 0
        coef = np.linalg.solve(A.T @ A + reg, A.T @ y)
        models[a] = {"type": "linear", "w": coef[:-1].tolist(), "b": float(coef[-1])}
    lo, hi = X.min(0), X.max(0)
    return {"names": FEATURES, "mean": mean.tolist(), "std": std.tolist(), "min": lo.tolist(), "max": hi.tolist()}, models


def make_snapshot(spec: dict, models: dict, private_key: Ed25519PrivateKey, ttl_s: int = 3600, snapshot_id: str = "snap-0001",
                  now: float | None = None) -> dict:
    created = now if now is not None else time.time()
    body = json.dumps({"snapshotId": snapshot_id, "kind": "policy", "actionSetVersion": ACTION_SET_VERSION, "createdAt": created,
                       "expiresAt": created + ttl_s, "featureSpec": spec, "models": models,
                       "staticTable": {c: [static_table(c, l, b) for l, b in ((0.0, 1), (0.05, 1), (0.2, 1))] for c in ("RELIABLE", "HIGH", "CRITICAL_NOTICE")}},
                      sort_keys=True, separators=(",", ":"))
    sig = private_key.sign(body.encode("utf-8"))
    return {"body": body, "sig": base64.urlsafe_b64encode(sig).decode().rstrip("=")}


def public_key_b64(pk: Ed25519PrivateKey) -> str:
    from cryptography.hazmat.primitives import serialization
    raw = pk.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def verify_snapshot(snap: dict, public_key_b64_str: str, now: float | None = None) -> dict | None:
    try:
        pk = Ed25519PublicKey.from_public_bytes(base64.urlsafe_b64decode(public_key_b64_str + "=="))
        pk.verify(base64.urlsafe_b64decode(snap["sig"] + "=="), snap["body"].encode("utf-8"))
        body = json.loads(snap["body"])
    except Exception:
        return None
    if body["actionSetVersion"] != ACTION_SET_VERSION or (now if now is not None else time.time()) > body["expiresAt"]:
        return None
    return body


def evaluate(body: dict, x: np.ndarray) -> dict[str, float]:
    spec = body["featureSpec"]; z = (x - np.array(spec["mean"])) / np.array(spec["std"])
    return {a: float(np.dot(m["w"], z) + m["b"]) for a, m in body["models"].items()}


def is_ood(body: dict, x: np.ndarray, margin: float = 0.10) -> bool:
    lo, hi = np.array(body["featureSpec"]["min"]), np.array(body["featureSpec"]["max"]); span = hi - lo
    return bool(np.any(x < lo - margin * span) or np.any(x > hi + margin * span))

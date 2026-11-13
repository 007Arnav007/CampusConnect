"""Cross-language check: a notice signed by the TypeScript protocol library verifies in an independent Python implementation."""
import base64, hashlib, hmac, json
from pathlib import Path

FIX = json.loads((Path(__file__).resolve().parents[2] / "protocol/fixtures/vectors.json").read_text(encoding="utf-8"))


def jcs(v):   # integers/strings/bools/null only in envelopes, so json.dumps with sorted keys equals RFC 8785 here
    return json.dumps(v, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sign(env, secret):
    body = {k: v for k, v in env.items() if k != "sig"}
    return base64.urlsafe_b64encode(hmac.new(secret.encode(), jcs(body).encode(), hashlib.sha256).digest()).decode().rstrip("=")


def test_python_reproduces_typescript_signature():
    n = FIX["notice"]; assert sign(n, FIX["keys"]["k1"]) == n["sig"]


def test_tampering_breaks_signature_in_python_too():
    n = dict(FIX["notice"]); n["test"] = False
    assert sign(n, FIX["keys"]["k1"]) != FIX["notice"]["sig"]

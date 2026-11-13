"""Generates golden vectors from the Python Shield for the TypeScript port (guards against cross-language drift)."""
import json, random
from dataclasses import asdict
from common import ROOT
from src.delivery.actions import ACTIONS, CLASSES, static_table
from src.delivery.shield import ShieldContext, safe_set, violated

rnd = random.Random(351); out = []
for _ in range(400):
    x = ShieldContext(rnd.choice(CLASSES), rnd.choice([300, 800, 2000, 9000]) * rnd.random() + 100, rnd.random() < .85, rnd.random() < .85,
                      rnd.choice([30_000, 59_999, 60_000, 60_001, 90_000]), rnd.choice([100, 400, 900, 901, 1500]), rnd.choice([300, 700, 1200, 1201]),
                      rnd.random(), rnd.random() < .9, rnd.random() < .9, rnd.random() < .9, rnd.random() < .9, rnd.random() < .9,
                      rnd.random() < .1, rnd.random() < .1, rnd.choice([40, 300, 1500, 4999, 5001, 8000]))
    out.append({"ctx": asdict(x), "violated": {a: violated(a, x) for a in ACTIONS}, "safe": safe_set(x)})
tab = [{"cls": c, "loss": l, "burst": b, "action": static_table(c, l, b)} for c in CLASSES for l in (0.0, 0.019, 0.02, 0.1, 0.101, 0.5) for b in (1, 5.9, 6, 12)]
(ROOT / "protocol/fixtures/shield-vectors.json").write_text(json.dumps({"contexts": out, "static": tab}))
print(len(out), "context vectors,", len(tab), "static-table vectors")

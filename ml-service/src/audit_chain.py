"""Hash-chained audit log (spec 5.7): each entry commits to its predecessor, so edits/deletions are detectable."""
from __future__ import annotations

import hashlib
import json

GENESIS = "0" * 64


def canonical(row: dict) -> str:
    return json.dumps(row, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def entry_hash(prev_hash: str, row: dict) -> str:
    return hashlib.sha256((prev_hash + canonical(row)).encode("utf-8")).hexdigest()


def append(chain: list[dict], row: dict) -> dict:
    prev = chain[-1]["hash"] if chain else GENESIS
    e = {"prev_hash": prev, "row": row, "hash": entry_hash(prev, row)}; chain.append(e); return e


def verify(chain: list[dict]) -> tuple[bool, int | None]:
    """Returns (ok, index of the first bad entry)."""
    prev = GENESIS
    for i, e in enumerate(chain):
        if e["prev_hash"] != prev or e["hash"] != entry_hash(prev, e["row"]): return False, i
        prev = e["hash"]
    return True, None

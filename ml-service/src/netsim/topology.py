"""Build the campus graph, zones and the impact matrix I[h, z] from topology/campus.yaml."""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import yaml

DEFAULT_YAML = Path(__file__).resolve().parents[3] / "topology" / "campus.yaml"
SERVICE_TYPES = {"DNS-01": "DNS", "DHCP-01": "DHCP", "RADIUS-01": "RADIUS"}


@dataclass
class Topology:
    nodes: list[str]
    ntype: dict[str, str]
    parent: dict[str, str | None]
    redundant_parent: dict[str, str]          # DSW -> its second router
    children: dict[str, list[str]]
    zones: list[str]
    zone_users: dict[str, int]
    zone_building: dict[str, str]
    zone_aps: dict[str, list[str]]
    ap_zone: dict[str, str]
    prior: dict[str, float]
    impact: np.ndarray                         # [len(nodes), len(zones)]
    full_loss_desc: dict[str, list[str]]       # descendants that are unreachable (IMPACTED) if h fails
    node_idx: dict[str, int] = field(default_factory=dict)
    zone_idx: dict[str, int] = field(default_factory=dict)
    spec: dict = field(default_factory=dict)

    def hash(self) -> str:
        blob = json.dumps({"n": self.nodes, "p": self.parent, "z": self.zones, "I": self.impact.round(4).tolist()}, sort_keys=True)
        return "sha256:" + hashlib.sha256(blob.encode()).hexdigest()

    def descendants(self, v: str) -> list[str]:
        out, stack = [], list(self.children.get(v, []))
        while stack:
            c = stack.pop(); out.append(c); stack.extend(self.children.get(c, []))
        return out

    def adjacent_zones(self, z: str) -> list[str]:
        """Zones on the same floor first, then the same building (used for mislocated reports)."""
        b, floor = self.zone_building[z], z.split("-")[1]
        same_floor = [o for o in self.zones if o != z and o.startswith(f"{b}-{floor}-")]
        same_bldg = [o for o in self.zones if o != z and self.zone_building[o] == b and o not in same_floor]
        return same_floor + same_bldg

    def to_json(self) -> dict:
        return {"hash": self.hash(), "nodes": [{"id": n, "type": self.ntype[n], "parent": self.parent[n]} for n in self.nodes],
                "zones": [{"id": z, "building": self.zone_building[z], "users": self.zone_users[z], "aps": self.zone_aps[z]} for z in self.zones]}


def build_topology(path: Path | str | None = None) -> Topology:
    spec = yaml.safe_load(Path(path or DEFAULT_YAML).read_text(encoding="utf-8"))
    rng = np.random.default_rng(spec["seed"])
    nodes: list[str] = []; ntype: dict[str, str] = {}; parent: dict[str, str | None] = {}; red: dict[str, str] = {}

    def add(n: str, t: str, p: str | None):
        nodes.append(n); ntype[n] = t; parent[n] = p

    core = spec["core"]; add(core, "CORE", None)
    r1, r2 = spec["routers"]
    add(r1, "RTR", core); add(r2, "RTR", core)
    add(spec["firewall"], "FW", core); add(spec["gateway"], "GW", spec["firewall"])
    for s in spec["services"]:
        add(s, SERVICE_TYPES[s], core)

    zones: list[str] = []; zone_users: dict[str, int] = {}; zone_building: dict[str, str] = {}
    zone_aps: dict[str, list[str]] = {}; ap_zone: dict[str, str] = {}
    sw_zones: dict[str, list[str]] = {}; dsw_of_sw: dict[str, str] = {}
    for b in spec["buildings"]:
        dsw = f"DSW-{b['code']}"; add(dsw, "DSW", r1); red[dsw] = r2
        for f in range(1, b["floors"] + 1):
            sw = f"SW-{b['code']}{f}"; add(sw, "SW", dsw); dsw_of_sw[sw] = dsw; sw_zones[sw] = []
            for zl in b["zones_per_floor"]:
                z = f"{b['code']}-{f}-{zl}"
                zones.append(z); zone_building[z] = b["code"]; sw_zones[sw].append(z)
                zone_users[z] = int(rng.integers(b["users"][0], b["users"][1] + 1))
                zone_aps[z] = []
                for k in range(1, spec["aps_per_zone"] + 1):
                    ap = f"AP-{b['code']}{f}{zl}{k}"; add(ap, "AP", sw); zone_aps[z].append(ap); ap_zone[ap] = z

    children: dict[str, list[str]] = {n: [] for n in nodes}
    for n, p in parent.items():
        if p: children[p].append(n)
    node_idx = {n: i for i, n in enumerate(nodes)}; zone_idx = {z: i for i, z in enumerate(zones)}
    ru = spec["residual_impact"]
    impact = np.zeros((len(nodes), len(zones)))
    full_loss: dict[str, list[str]] = {n: [] for n in nodes}

    def zones_below(n: str) -> list[str]:
        out = []
        for m in [n] + _desc(children, n):
            if ntype[m] == "AP": out.append(ap_zone[m])
        return sorted(set(out))

    for n in nodes:
        t = ntype[n]; i = node_idx[n]
        if t == "AP":
            impact[i, zone_idx[ap_zone[n]]] = 1.0 / len(zone_aps[ap_zone[n]])
            full_loss[n] = []
        elif t in ("SW", "DSW", "CORE"):
            for z in zones_below(n): impact[i, zone_idx[z]] = 1.0
            full_loss[n] = _desc(children, n)
        elif t == "RTR":
            impact[i, :] = ru["router_one_of_two"]; full_loss[n] = []   # redundancy: descendants stay reachable
        elif t == "FW": impact[i, :] = ru["firewall"]; full_loss[n] = []
        elif t == "GW": impact[i, :] = ru["gateway"]; full_loss[n] = []
        elif t == "DNS": impact[i, :] = ru["dns"]
        elif t == "DHCP": impact[i, :] = ru["dhcp"]
        elif t == "RADIUS": impact[i, :] = ru["radius"]
    # Note: CORE needs no explicit branch above - it is the root ancestor, so
    # zones_below/full_loss already mark every zone as impacted.
    w = spec["prior_weights"]
    raw = {n: w[ntype[n]] for n in nodes}; total = sum(raw.values())
    prior = {n: raw[n] / total for n in nodes}
    return Topology(nodes, ntype, parent, red, children, zones, zone_users, zone_building, zone_aps, ap_zone,
                    prior, impact, full_loss, node_idx, zone_idx, spec)


def _desc(children: dict[str, list[str]], v: str) -> list[str]:
    out, stack = [], list(children.get(v, []))
    while stack:
        c = stack.pop(); out.append(c); stack.extend(children.get(c, []))
    return out

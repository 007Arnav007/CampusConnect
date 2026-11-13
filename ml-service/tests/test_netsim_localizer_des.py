import numpy as np

from src.delivery.actions import ACTIONS
from src.delivery.des import Channel, ChannelParams, simulate
from src.localizer.calibration import Conformal, prf, scope_threshold, zone_scope
from src.localizer.model import Localizer, fit_params
from src.netsim.scenarios import generate_dataset, generate_scenario
from src.netsim.topology import build_topology

topo = build_topology()


def test_topology_is_large_enough_and_hash_is_stable():
    assert len(topo.nodes) >= 80 and len(topo.zones) >= 20
    assert build_topology().hash() == topo.hash()


def test_scenarios_are_deterministic_for_a_seed():
    a = generate_scenario(topo, "x", 5, "AP_DEGRADED"); b = generate_scenario(topo, "x", 5, "AP_DEGRADED")
    assert a.faults == b.faults and a.evidence[5.0].anomaly == b.evidence[5.0].anomaly


def test_localizer_is_deterministic_and_prefers_truth_on_a_clear_switch_failure():
    train = generate_dataset(topo, 160, 11, blind_frac=0.1)
    loc = Localizer(topo, fit_params(topo, train))
    sc = generate_scenario(topo, "s", 3, "SW_DOWN")
    p1 = loc.posterior(sc.evidence[10.0]); p2 = loc.posterior(sc.evidence[10.0])
    assert np.array_equal(p1.p_node, p2.p_node) and p1.ranking()[0] == sc.faults[0]


def test_conformal_quantile_finite_sample_rule():
    rng = np.random.default_rng(0); n = 99
    vecs = [np.array([0.7, 0.2, 0.1]) for _ in range(n)]; truth = [0] * 90 + [1] * 9     # 90 easy, 9 hard
    c = Conformal(alpha=0.1).fit(vecs, truth)
    assert abs(c.qhat - 0.3) < 1e-9                       # k = ceil((99+1)*0.9) = 90 -> 90th smallest score = 0.3
    assert c.predict_set(["a", "b", "c"], vecs[0]) == ["a"]      # the 9 hard cases (score 0.8) are excluded: coverage 90/99 >= 0.9


def test_scoping_threshold_falls_with_severity_and_prf_is_sane():
    assert scope_threshold(1.0) < scope_threshold(0.0)
    assert zone_scope(np.array([0.3]), 1.0)[0] and not zone_scope(np.array([0.3]), 0.0)[0]
    assert prf({"a", "b"}, {"a"})[1] == 1.0


def test_des_cancel_on_ack_saves_bytes_when_the_first_copy_is_answered():
    clean = ChannelParams(base_rtt_ms=10, mean_loss=0.003, mean_bad_ms=10)
    o = simulate(ACTIONS["A10"], Channel(clean, 1), 2000, 300)      # ACK (~10 ms) beats the 30 ms spacing: copies 2-4 are cancelled
    assert o.success and o.datagrams == 1


def test_des_spaced_copies_beat_back_to_back_under_bursty_loss():
    bursty = ChannelParams(base_rtt_ms=40, mean_loss=0.18, mean_bad_ms=200)
    def rate(a):
        return np.mean([simulate(ACTIONS[a], Channel(bursty, s), 700, 150, t0=100 + (s % 40) * 31).success for s in range(1500)])
    assert rate("A7") > rate("A6")                              # 5.4.10 sanity: if this fails suspect the loss model

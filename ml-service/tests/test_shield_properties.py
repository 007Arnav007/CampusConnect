"""Property tests (Hypothesis): whatever the context and *whatever the model outputs*, the executed action is shield-safe."""
import math

from hypothesis import given, settings, strategies as st

from src.delivery.actions import ACK_REQUIRED, ACTIONS, ALLOWED, BYTE_BUDGET, CLASSES, MAX_DATAGRAMS, UDP_BYTES, datagrams, static_table, worst_case_bytes
from src.delivery.shield import REFUSE, ShieldContext, choose, safe_set, violated

ctx = st.builds(
    ShieldContext, msg_class=st.sampled_from(CLASSES), deadline_ms=st.floats(100, 20_000), signed=st.booleans(), test_mode=st.booleans(),
    exp_minus_iat_ms=st.floats(1, 200_000), payload_bytes=st.integers(1, 2000), datagram_bytes=st.integers(1, 2000),
    gateway_load=st.floats(0, 1), snapshot_valid=st.booleans(), authorised=st.booleans(), tcp_probe_ok=st.booleans(),
    receiver_bucket_ok=st.booleans(), incident_bucket_ok=st.booleans(), ood=st.booleans(), breaker_open=st.booleans(),
    timeout_ms=st.floats(10, 9000))
weird = st.one_of(st.floats(allow_nan=True, allow_infinity=True), st.floats(-1e9, 1e9))
utils = st.dictionaries(st.sampled_from(list(ACTIONS)), weird)


@settings(max_examples=600, deadline=None)
@given(ctx, utils, st.floats(0, 1), st.floats(1, 20))
def test_executed_action_is_always_safe(x, u, loss, burst):
    d = choose(x, u, loss, burst)
    if d.action == REFUSE:
        assert d.source == "refused"
        return
    a = ACTIONS[d.action]
    assert not violated(d.action, x), (d, violated(d.action, x))
    assert d.action in ALLOWED[x.msg_class]
    assert datagrams(a) <= MAX_DATAGRAMS and worst_case_bytes(a) <= BYTE_BUDGET[x.msg_class]
    assert x.datagram_bytes <= 1200 and x.payload_bytes <= 900
    if x.msg_class == "CRITICAL_NOTICE":
        assert x.signed and x.test_mode and ACK_REQUIRED["CRITICAL_NOTICE"] and x.exp_minus_iat_ms <= 60_000


@settings(max_examples=300, deadline=None)
@given(ctx, utils)
def test_untrusted_model_cannot_override_global_gates(x, u):
    d = choose(x, u, 0.05, 2)
    if not x.snapshot_valid or not x.authorised or x.ood or x.breaker_open:
        assert d.source in ("static-table", "refused")


@settings(max_examples=200, deadline=None)
@given(st.sampled_from(["RELIABLE", "HIGH", "CRITICAL_NOTICE"]), st.floats(0, 1), st.floats(1, 20))
def test_static_table_is_monotone_in_loss(cls, loss, burst):
    order = {a: i for i, a in enumerate(ALLOWED[cls] + ("A2", "A3", "A4", "A12"))}
    lo = static_table(cls, 0.0, 1.0); hi = static_table(cls, 0.5, 10.0)
    assert datagrams(ACTIONS[hi]) >= datagrams(ACTIONS[lo]) or ACTIONS[hi].rounds >= ACTIONS[lo].rounds


def test_unsigned_critical_notice_is_refused_not_sent():
    d = choose(ShieldContext("CRITICAL_NOTICE", 2000, signed=False), {"A9": 5.0}, 0.2, 5)
    assert d.action == REFUSE


def test_nan_and_inf_utilities_cannot_pick_unsafe_actions():
    x = ShieldContext("CRITICAL_NOTICE", 2000)
    d = choose(x, {"A1": math.inf, "A0": math.inf, "A9": math.nan, "A11": 1.0}, 0.05, 2)
    assert d.action == "A11"

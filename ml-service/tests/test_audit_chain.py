import copy

from src.audit_chain import append, verify


def _chain():
    c = []
    for i, a in enumerate(["MODEL_PROMOTED", "INCIDENT_REJECTED", "PARAM_CHANGED"]): append(c, {"seq": i, "action": a, "actor": "admin"})
    return c


def test_intact_chain_verifies():
    assert verify(_chain()) == (True, None)


def test_edit_is_detected_at_the_edited_entry():
    c = _chain(); c[1]["row"]["action"] = "INCIDENT_CONFIRMED"
    assert verify(c) == (False, 1)


def test_deletion_and_reordering_are_detected():
    c = _chain(); assert verify(c[:1] + c[2:])[0] is False
    d = copy.deepcopy(_chain()); d[0], d[1] = d[1], d[0]; assert verify(d)[0] is False

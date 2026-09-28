"""
JANASEVA OS — Backend Unit Tests: Priority Engine, SLA, Auth
"""
from __future__ import annotations

import pytest


# ─── Priority Engine Tests ────────────────────────────────────────────────────

class MockComplaint:
    def __init__(self, category_code: str, is_emergency: bool = False):
        self.category_code = category_code


from app.services.complaint_service import _calculate_priority_score
from app.models.complaint import ComplaintPriority


def test_emergency_flag_raises_priority():
    c = MockComplaint("POTHOLE", is_emergency=True)
    score, priority = _calculate_priority_score(c, is_emergency=True)
    assert score >= 80
    assert priority in (ComplaintPriority.CRITICAL, ComplaintPriority.HIGH)


def test_flood_category_high_priority():
    c = MockComplaint("FLOOD")
    score, priority = _calculate_priority_score(c, is_emergency=False)
    assert score >= 65
    assert priority in (ComplaintPriority.CRITICAL, ComplaintPriority.HIGH)


def test_streetlight_low_priority():
    c = MockComplaint("STREETLIGHT")
    score, priority = _calculate_priority_score(c, is_emergency=False)
    assert score < 65
    assert priority in (ComplaintPriority.MEDIUM, ComplaintPriority.LOW)


def test_emergency_flood_is_critical():
    c = MockComplaint("FLOOD", is_emergency=True)
    score, priority = _calculate_priority_score(c, is_emergency=True)
    assert priority == ComplaintPriority.CRITICAL


def test_score_bounded_0_to_100():
    for cat in ["POTHOLE", "FIRE", "FLOOD", "GARBAGE", "STREETLIGHT", "MEDICAL"]:
        c = MockComplaint(cat)
        score, _ = _calculate_priority_score(c, is_emergency=False)
        assert 0 <= score <= 100


# ─── Complaint ID Format Tests ────────────────────────────────────────────────

from app.services.complaint_service import _generate_complaint_id


def test_complaint_id_format():
    cid = _generate_complaint_id(1)
    assert cid.startswith("JS-")
    parts = cid.split("-")
    assert len(parts) == 3
    assert parts[0] == "JS"
    assert len(parts[1]) == 4  # year
    assert len(parts[2]) == 6  # zero-padded sequence


def test_complaint_id_padding():
    assert _generate_complaint_id(1).endswith("000001")
    assert _generate_complaint_id(999).endswith("000999")
    assert _generate_complaint_id(1000000).endswith("1000000")


# ─── Security Tests ───────────────────────────────────────────────────────────

from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.core.exceptions import UnauthorizedException


def test_password_hash_verify():
    plain = "MyS3curePassword!"
    hashed = hash_password(plain)
    assert hashed != plain
    assert verify_password(plain, hashed)


def test_wrong_password_fails():
    hashed = hash_password("correct_horse_battery_staple")
    assert not verify_password("wrong_password", hashed)


def test_access_token_roundtrip():
    token = create_access_token("user-123", extra_claims={"role": "CITIZEN"})
    payload = decode_access_token(token)
    assert payload["sub"] == "user-123"
    assert payload["role"] == "CITIZEN"
    assert payload["type"] == "access"


def test_invalid_token_raises():
    with pytest.raises(UnauthorizedException):
        decode_access_token("not.a.valid.token")


def test_token_is_access_type():
    from app.core.security import create_refresh_token
    refresh = create_refresh_token("user-456")
    with pytest.raises(UnauthorizedException):
        decode_access_token(refresh)  # should fail — wrong type

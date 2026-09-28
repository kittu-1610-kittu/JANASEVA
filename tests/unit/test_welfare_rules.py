"""
JANASEVA OS — Unit Tests: Welfare Rules Matching
"""
from __future__ import annotations

import sys
from pathlib import Path

# Add apps/api to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "apps" / "api"))

from app.services.welfare_service import CitizenProfile, evaluate_rules as _evaluate_rules


def test_pm_kisan_eligibility():
    rules = {
        "occupation": "FARMER",
        "land_holding_max_hectare": 2.0,
    }
    profile = CitizenProfile(
        age=42,
        occupation="FARMER",
        land_holding_hectare=1.5,
    )
    criteria, score = _evaluate_rules(rules, profile)
    assert score == 1.0
    assert len(criteria) == 2
    assert all(c.matched for c in criteria)


def test_ineligible_when_over_land_limit():
    rules = {
        "occupation": "FARMER",
        "land_holding_max_hectare": 2.0,
    }
    profile = CitizenProfile(
        age=42,
        occupation="FARMER",
        land_holding_hectare=5.0,
    )
    criteria, score = _evaluate_rules(rules, profile)
    assert score < 1.0
    assert any(not c.matched for c in criteria)


def test_housing_scheme_eligibility():
    rules = {
        "income_bracket_max": "LIG",
        "owns_pucca_house": False,
    }
    profile = CitizenProfile(
        age=30,
        income_bracket="EWS",
        owns_pucca_house=False,
    )
    criteria, score = _evaluate_rules(rules, profile)
    assert score == 1.0

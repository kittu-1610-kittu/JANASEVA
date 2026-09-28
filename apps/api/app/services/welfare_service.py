"""
JANASEVA OS — Welfare & Scheme Eligibility Service
Deterministic rules evaluation engine for government welfare discovery.
"""
from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field


class CitizenProfile(BaseModel):
    age: int = Field(ge=0, le=120)
    occupation: str | None = None          # FARMER, STUDENT, UNEMPLOYED, etc.
    income_bracket: str | None = None      # EWS, LIG, MIG-I, MIG-II, ABOVE
    caste_category: str | None = None      # SC, ST, OBC, GENERAL, MINORITY
    family_size: int | None = None
    owns_pucca_house: bool = False
    land_holding_hectare: float | None = None
    education_level: str | None = None     # NONE, PRIMARY, CLASS_1_TO_12, UNDERGRADUATE, etc.
    district: str | None = None


class MatchedCriterion(BaseModel):
    rule_key: str
    citizen_value: str
    required_value: str
    matched: bool


class SchemeMatch(BaseModel):
    scheme_id: str
    name: str
    code: str
    category: str
    description: str
    benefits: str
    required_documents: list[str]
    application_url: str | None
    matched_criteria: list[MatchedCriterion]
    match_score: float
    disclaimer: str


def evaluate_rules(
    rules: dict[str, Any], profile: CitizenProfile
) -> tuple[list[MatchedCriterion], float]:
    """
    Deterministic rule evaluation. Returns matched criteria and score.
    Score = matched_rules / total_rules.
    """
    criteria: list[MatchedCriterion] = []
    matched = 0
    total = 0

    def check(key: str, citizen_val: Any, required_val: Any, match: bool) -> None:
        nonlocal matched, total
        total += 1
        if match:
            matched += 1
        criteria.append(MatchedCriterion(
            rule_key=key,
            citizen_value=str(citizen_val) if citizen_val is not None else "not provided",
            required_value=str(required_val),
            matched=match,
        ))

    if "age_min" in rules:
        check("age_min", profile.age, rules["age_min"], profile.age >= rules["age_min"])
    if "age_max" in rules:
        check("age_max", profile.age, rules["age_max"], profile.age <= rules["age_max"])
    if "occupation" in rules:
        req_occ = str(rules["occupation"]).upper()
        c_occ = (profile.occupation or "").upper()
        check("occupation", profile.occupation, rules["occupation"],
              c_occ == req_occ if profile.occupation else False)
    if "income_bracket_max" in rules:
        bracket_order = {"EWS": 0, "BPL": 0, "LIG": 1, "MIG-I": 2, "MIG-II": 3, "MIDDLE": 3, "ABOVE": 4}
        c_bracket = (profile.income_bracket or "ABOVE").upper()
        r_bracket = str(rules["income_bracket_max"]).upper()
        citizen_rank = bracket_order.get(c_bracket, 4)
        required_rank = bracket_order.get(r_bracket, 4)
        check("income_bracket", profile.income_bracket, f"≤{rules['income_bracket_max']}",
              citizen_rank <= required_rank and profile.income_bracket is not None)
    if "owns_pucca_house" in rules:
        check("owns_pucca_house", profile.owns_pucca_house, rules["owns_pucca_house"],
              profile.owns_pucca_house == rules["owns_pucca_house"])
    if "land_holding_max_hectare" in rules:
        matched_land = (profile.land_holding_hectare <= rules["land_holding_max_hectare"]) if profile.land_holding_hectare is not None else False
        check("land_holding", profile.land_holding_hectare,
              f"≤{rules['land_holding_max_hectare']} ha",
              matched_land)
    if "categories" in rules:
        cat_list = rules["categories"] if isinstance(rules["categories"], list) else [rules["categories"]]
        cat_list_upper = [str(c).upper() for c in cat_list]
        c_cat = (profile.caste_category or "").upper()
        matched_cat = c_cat in cat_list_upper if profile.caste_category else False
        check("caste_category", profile.caste_category, str(cat_list), matched_cat)
    if "education_level" in rules:
        allowed = rules["education_level"] if isinstance(rules["education_level"], list) else [rules["education_level"]]
        allowed_upper = [str(x).upper() for x in allowed]
        c_edu = (profile.education_level or "").upper()
        matched_edu = c_edu in allowed_upper if profile.education_level else False
        check("education_level", profile.education_level, str(allowed), matched_edu)

    score = matched / total if total > 0 else 0.0
    return criteria, score

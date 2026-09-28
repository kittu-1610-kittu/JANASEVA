"""
JANASEVA OS — Welfare / Scheme Discovery Router  /api/v1/welfare
Rules-based scheme eligibility matching. Transparent and auditable.
"""
from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user
from app.core.database import get_db
from app.models.operational import Scheme
from app.models.user import User
from app.services.welfare_service import (
    CitizenProfile,
    MatchedCriterion,
    SchemeMatch,
    evaluate_rules as _evaluate_rules,
)

router = APIRouter(prefix="/welfare", tags=["Welfare & Schemes"])


DISCLAIMER = (
    "⚠️ This is an indicative match based on the configured/published eligibility criteria. "
    "Eligibility is not guaranteed. Please verify through the official application channel "
    "and consult the relevant government department before applying."
)


@router.post("/match", response_model=list[SchemeMatch])
async def match_schemes(
    profile: CitizenProfile,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Rules-based scheme discovery.
    Returns schemes that potentially match the citizen profile.
    Always includes a disclaimer — never states definitive eligibility.
    """
    try:
        stmt = select(Scheme).where(Scheme.is_active.is_(True))
        result = await db.execute(stmt)
        schemes = result.scalars().all()
    except Exception:
        from app.services.demo_store import DEMO_SCHEMES_DATA
        schemes = [
            Scheme(
                id=s["id"],
                name=s["name"],
                code=s["code"],
                category=s["category"],
                description=s["description"],
                benefits=s["benefits"],
                eligibility_rules=s["rules"],
                required_documents=s.get("required_documents", ["Aadhaar Card", "Income Certificate"]),
                application_url=s.get("application_url", "https://janaseva.demo/apply"),
                is_active=True,
            )
            for s in DEMO_SCHEMES_DATA
        ]

    matches: list[SchemeMatch] = []
    for scheme in schemes:
        criteria, score = _evaluate_rules(scheme.eligibility_rules, profile)
        if score >= 0.4:  # At least 40% rules matched
            matches.append(SchemeMatch(
                scheme_id=str(scheme.id),
                name=scheme.name,
                code=scheme.code,
                category=scheme.category,
                description=scheme.description,
                benefits=scheme.benefits,
                required_documents=scheme.required_documents or [],
                application_url=scheme.application_url or "https://janaseva.demo/apply",
                matched_criteria=criteria,
                match_score=round(score, 2),
                disclaimer=DISCLAIMER,
            ))

    matches.sort(key=lambda m: m.match_score, reverse=True)
    return matches


@router.get("/schemes", response_model=list[dict])
async def list_schemes(
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """List all active welfare schemes (no auth required — public info)."""
    try:
        stmt = select(Scheme).where(Scheme.is_active.is_(True)).order_by(Scheme.category)
        result = await db.execute(stmt)
        schemes = result.scalars().all()
        return [
            {
                "id": str(s.id),
                "name": s.name,
                "code": s.code,
                "category": s.category,
                "description": s.description,
                "benefits": s.benefits,
                "required_documents": s.required_documents,
                "application_url": s.application_url,
            }
            for s in schemes
        ]
    except Exception:
        from app.services.demo_store import DEMO_SCHEMES_DATA
        return [
            {
                "id": str(s["id"]),
                "name": s["name"],
                "code": s["code"],
                "category": s["category"],
                "description": s["description"],
                "benefits": s["benefits"],
                "required_documents": ["Aadhaar Card", "Income Certificate"],
                "application_url": "https://janaseva.demo/apply",
            }
            for s in DEMO_SCHEMES_DATA
        ]

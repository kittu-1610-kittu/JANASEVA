"""
JANASEVA OS — District Administration & Collector Ops Router  /api/v1/admin-ops
High-level strategic governance endpoints for the District Magistrate / Collector.
Cross-departmental performance monitoring, executive directives, and EOC emergency levels.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, RequireAdmin, get_current_user
from app.core.database import get_db
from app.models.user import User

router = APIRouter(prefix="/admin-ops", tags=["District Collector Operations"])


# ─── Schemas ─────────────────────────────────────────────────────────────────
class DepartmentLeagueEntry(BaseModel):
    dept_id: str
    department_name: str
    department_code: str
    head_officer_name: str
    open_tickets: int
    resolved_today: int
    sla_compliance_pct: float
    avg_resolution_hours: float
    citizen_rating: float
    critical_breaches: int
    status_trend: str  # IMPROVING, STABLE, ACTION_NEEDED


class ExecutiveDirective(BaseModel):
    directive_id: str
    title: str
    target_department: str
    issued_to_name: str
    priority: str  # URGENT, HIGH, ROUTINE
    issued_date: str
    compliance_deadline: str
    status: str  # PENDING_COMPLIANCE, IN_PROGRESS, COMPLIED_VERIFIED, OVERDUE
    instructions: str


class AdminOverviewResponse(BaseModel):
    metrics: dict[str, Any]
    departments_league: list[DepartmentLeagueEntry]
    executive_directives: list[ExecutiveDirective]
    eoc_alert_level: str
    district_name: str


class CreateDirectiveRequest(BaseModel):
    title: str = Field(min_length=5, max_length=200)
    target_department: str
    issued_to_name: str = "Department Head"
    priority: str = "URGENT"
    compliance_days: int = 2
    instructions: str = Field(min_length=10, max_length=2000)


class UpdateAlertLevelRequest(BaseModel):
    alert_level: str  # NORMAL, LEVEL_1_ADVISORY, LEVEL_2_WARNING, LEVEL_3_RED_ALERT
    reason: str | None = None


# ─── In-Memory Admin State ───────────────────────────────────────────────────
_CURRENT_ALERT_LEVEL = "LEVEL_1_ADVISORY"

_DEPARTMENTS_LEAGUE: list[dict[str, Any]] = [
    {
        "dept_id": "DEPT-01",
        "department_name": "Road Infrastructure & Public Works (PWD)",
        "department_code": "ROADS",
        "head_officer_name": "Er. Rajesh Kumar",
        "open_tickets": 28,
        "resolved_today": 14,
        "sla_compliance_pct": 92.4,
        "avg_resolution_hours": 18.2,
        "citizen_rating": 4.4,
        "critical_breaches": 1,
        "status_trend": "IMPROVING",
    },
    {
        "dept_id": "DEPT-02",
        "department_name": "Public Health & Primary Care Directorate",
        "department_code": "HEALTH",
        "head_officer_name": "Dr. Ananya Iyer",
        "open_tickets": 19,
        "resolved_today": 22,
        "sla_compliance_pct": 96.8,
        "avg_resolution_hours": 9.5,
        "citizen_rating": 4.7,
        "critical_breaches": 0,
        "status_trend": "IMPROVING",
    },
    {
        "dept_id": "DEPT-03",
        "department_name": "District Police & Law Enforcement",
        "department_code": "POLICE",
        "head_officer_name": "Insp. Mohan Das",
        "open_tickets": 14,
        "resolved_today": 31,
        "sla_compliance_pct": 98.1,
        "avg_resolution_hours": 3.8,
        "citizen_rating": 4.6,
        "critical_breaches": 0,
        "status_trend": "STABLE",
    },
    {
        "dept_id": "DEPT-04",
        "department_name": "Water Supply & Underground Drainage",
        "department_code": "WATER",
        "head_officer_name": "Er. P. Venkatesh",
        "open_tickets": 35,
        "resolved_today": 8,
        "sla_compliance_pct": 81.5,
        "avg_resolution_hours": 29.4,
        "citizen_rating": 3.8,
        "critical_breaches": 4,
        "status_trend": "ACTION_NEEDED",
    },
    {
        "dept_id": "DEPT-05",
        "department_name": "Sanitation & Solid Waste Management",
        "department_code": "SANITATION",
        "head_officer_name": "Sri K. Somanna",
        "open_tickets": 22,
        "resolved_today": 19,
        "sla_compliance_pct": 89.0,
        "avg_resolution_hours": 16.0,
        "citizen_rating": 4.1,
        "critical_breaches": 2,
        "status_trend": "STABLE",
    },
    {
        "dept_id": "DEPT-06",
        "department_name": "Electricity & Street Lighting Board",
        "department_code": "ELECTRICITY",
        "head_officer_name": "Er. Naveen Hegde",
        "open_tickets": 17,
        "resolved_today": 12,
        "sla_compliance_pct": 94.2,
        "avg_resolution_hours": 12.1,
        "citizen_rating": 4.3,
        "critical_breaches": 1,
        "status_trend": "IMPROVING",
    },
]

_DIRECTIVES: list[dict[str, Any]] = [
    {
        "directive_id": "DIR-2026-0089",
        "title": "Immediate Desilting of Old Fort Canal Backwaters",
        "target_department": "Water Supply & Underground Drainage",
        "issued_to_name": "Er. P. Venkatesh",
        "priority": "URGENT",
        "issued_date": "2026-09-27",
        "compliance_deadline": "2026-09-30",
        "status": "IN_PROGRESS",
        "instructions": "Mobilize 4 high-capacity jetting pumps to clear blockages along Old Fort Canal to mitigate Ward 4 flood risk.",
    },
    {
        "directive_id": "DIR-2026-0088",
        "title": "Intensified Night Fogging for Vector Control in Kuvempu Nagar",
        "target_department": "Public Health & Primary Care Directorate",
        "issued_to_name": "Dr. Ananya Iyer",
        "priority": "HIGH",
        "issued_date": "2026-09-26",
        "compliance_deadline": "2026-09-29",
        "status": "COMPLIED_VERIFIED",
        "instructions": "Execute anti-larval spray and cold fogging across all 7 crosses of Ward 3 following dengue cluster report.",
    },
]


# ─── Endpoints ───────────────────────────────────────────────────────────────
@router.get("/overview", response_model=AdminOverviewResponse)
async def get_admin_overview(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Retrieve district magistrate governance dashboard overview."""
    total_open = sum(d["open_tickets"] for d in _DEPARTMENTS_LEAGUE)
    total_resolved = sum(d["resolved_today"] for d in _DEPARTMENTS_LEAGUE)
    avg_sla = round(sum(d["sla_compliance_pct"] for d in _DEPARTMENTS_LEAGUE) / len(_DEPARTMENTS_LEAGUE), 1)
    tot_breaches = sum(d["critical_breaches"] for d in _DEPARTMENTS_LEAGUE)
    avg_rating = round(sum(d["citizen_rating"] for d in _DEPARTMENTS_LEAGUE) / len(_DEPARTMENTS_LEAGUE), 2)

    metrics = {
        "district_name": "Krishnapur District",
        "total_open_grievances": total_open,
        "resolved_past_24h": total_resolved,
        "district_sla_compliance_pct": avg_sla,
        "critical_sla_breaches": tot_breaches,
        "citizen_trust_index": avg_rating,
        "active_directives_count": len([d for d in _DIRECTIVES if d["status"] != "COMPLIED_VERIFIED"]),
        "active_departments_count": len(_DEPARTMENTS_LEAGUE),
    }

    return AdminOverviewResponse(
        metrics=metrics,
        departments_league=[DepartmentLeagueEntry.model_validate(d) for d in _DEPARTMENTS_LEAGUE],
        executive_directives=[ExecutiveDirective.model_validate(d) for d in _DIRECTIVES],
        eoc_alert_level=_CURRENT_ALERT_LEVEL,
        district_name="Krishnapur District",
    )


@router.post("/directives", status_code=status.HTTP_201_CREATED)
async def issue_executive_directive(
    data: CreateDirectiveRequest,
    current_user: Annotated[User, Depends(get_current_user)],
):
    """District Magistrate issues a formal binding executive directive to a department."""
    from datetime import date, timedelta
    now_date = date.today()
    deadline = now_date + timedelta(days=data.compliance_days)
    did = f"DIR-2026-{len(_DIRECTIVES) + 90:04d}"

    directive = {
        "directive_id": did,
        "title": data.title,
        "target_department": data.target_department,
        "issued_to_name": data.issued_to_name,
        "priority": data.priority,
        "issued_date": now_date.isoformat(),
        "compliance_deadline": deadline.isoformat(),
        "status": "PENDING_COMPLIANCE",
        "instructions": data.instructions,
    }
    _DIRECTIVES.insert(0, directive)
    return {
        "success": True,
        "directive": directive,
        "message": f"Executive directive {did} issued to {data.target_department} with deadline {deadline.isoformat()}.",
    }


@router.post("/alert-level")
async def update_alert_level(
    data: UpdateAlertLevelRequest,
    current_user: Annotated[User, Depends(get_current_user)],
):
    """District Magistrate updates the EOC Emergency Alert Level."""
    global _CURRENT_ALERT_LEVEL
    _CURRENT_ALERT_LEVEL = data.alert_level.upper()
    return {
        "success": True,
        "alert_level": _CURRENT_ALERT_LEVEL,
        "message": f"District Emergency Operations Center escalated to {_CURRENT_ALERT_LEVEL}.",
    }

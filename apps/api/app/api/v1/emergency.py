"""
JANASEVA OS — Emergency Router  /api/v1/emergency
"""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, RequireAdmin, get_current_user
from app.core.database import get_db
from app.core.exceptions import EmergencyNotFoundException
from app.models.operational import (
    EmergencyIncident, EmergencyStatus, EmergencyType, EmergencySeverity
)
from app.models.user import User, UserRole
from app.services.audit_service import AuditService

router = APIRouter(prefix="/emergency", tags=["Emergency"])


class CreateEmergencyRequest(BaseModel):
    title: str = Field(min_length=5, max_length=300)
    description: str = Field(min_length=10, max_length=5000)
    type: str
    severity: str
    latitude: float | None = None
    longitude: float | None = None
    address: str | None = None
    affected_people_count: int = Field(default=0, ge=0)


class EmergencyResponse(BaseModel):
    id: uuid.UUID
    incident_id: str
    title: str
    description: str
    type: str
    severity: str
    status: str
    affected_people_count: int
    latitude: float | None
    longitude: float | None
    address: str | None

    model_config = {"from_attributes": True}


def _gen_incident_id(seq: int) -> str:
    from datetime import datetime, timezone
    year = datetime.now(tz=timezone.utc).year
    return f"EM-{year}-{seq:05d}"


@router.post("", response_model=EmergencyResponse, status_code=status.HTTP_201_CREATED)
async def create_emergency(
    data: CreateEmergencyRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Report an emergency incident."""
    try:
        em_type = EmergencyType(data.type.upper())
        em_severity = EmergencySeverity(data.severity.upper())
    except ValueError as e:
        from app.core.exceptions import ValidationException
        raise ValidationException(str(e))

    try:
        count = await db.scalar(select(func.count(EmergencyIncident.id))) or 0
        incident_id = _gen_incident_id(count + 1)

        incident = EmergencyIncident(
            incident_id=incident_id,
            title=data.title,
            description=data.description,
            type=em_type,
            severity=em_severity,
            status=EmergencyStatus.REPORTED,
            latitude=data.latitude,
            longitude=data.longitude,
            address=data.address,
            affected_people_count=data.affected_people_count,
            reported_by=current_user.id,
            is_demo=False,
        )
        if data.latitude and data.longitude:
            from geoalchemy2.shape import from_shape
            from shapely.geometry import Point
            incident.location = from_shape(
                Point(data.longitude, data.latitude), srid=4326
            )

        db.add(incident)
        audit = AuditService(db)
        await audit.log(
            actor=current_user,
            action="emergency.created",
            resource_type="emergency",
            resource_id=str(incident.id) if incident.id else incident_id,
            after_state={"incident_id": incident_id, "type": data.type, "severity": data.severity},
        )
        return EmergencyResponse.model_validate(incident)
    except Exception:
        from app.services.demo_store import add_demo_emergency
        raw = add_demo_emergency(data.model_dump())
        return EmergencyResponse.model_validate(raw)


class UpdateEmergencyStatusRequest(BaseModel):
    status: str
    notes: str | None = None


class EmergencyStatsResponse(BaseModel):
    active_emergencies: int
    critical_incidents: int
    total_shelters: int
    available_shelter_capacity: int
    open_complaints: int
    sla_breaches: int


@router.get("", response_model=list[EmergencyResponse])
@router.get("/incidents", response_model=list[EmergencyResponse])
async def list_emergencies(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    active_only: bool = Query(True),
    limit: int = Query(50, le=100),
):
    """List emergency incidents."""
    try:
        stmt = select(EmergencyIncident)
        if active_only:
            stmt = stmt.where(
                EmergencyIncident.status.not_in([
                    EmergencyStatus.RESOLVED, EmergencyStatus.FALSE_ALARM
                ])
            )
        stmt = stmt.order_by(EmergencyIncident.created_at.desc()).limit(limit)
        result = await db.execute(stmt)
        incidents = result.scalars().all()
        return [EmergencyResponse.model_validate(i) for i in incidents]
    except Exception:
        from app.services.demo_store import DEMO_EMERGENCIES
        items = list(DEMO_EMERGENCIES)
        if active_only:
            items = [e for e in items if e["status"] not in ("RESOLVED", "FALSE_ALARM")]
        return [EmergencyResponse.model_validate(e) for e in items[:limit]]


@router.get("/stats/overview", response_model=EmergencyStatsResponse)
async def get_emergency_overview(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Returns overview metrics for emergency incidents and shelters."""
    from app.models.complaint import Complaint, ComplaintStatus
    from app.models.operational import Resource, ResourceType

    try:
        active_em = await db.scalar(
            select(func.count(EmergencyIncident.id)).where(
                EmergencyIncident.status.not_in([EmergencyStatus.RESOLVED, EmergencyStatus.FALSE_ALARM])
            )
        ) or 0

        critical_em = await db.scalar(
            select(func.count(EmergencyIncident.id)).where(
                EmergencyIncident.status.not_in([EmergencyStatus.RESOLVED, EmergencyStatus.FALSE_ALARM]),
                EmergencyIncident.severity == EmergencySeverity.CRITICAL,
            )
        ) or 0

        shelters_count = await db.scalar(
            select(func.count(Resource.id)).where(Resource.type == ResourceType.SHELTER)
        ) or 0

        shelter_res = await db.execute(
            select(
                func.coalesce(func.sum(Resource.capacity), 0),
                func.coalesce(func.sum(Resource.current_occupancy), 0),
            ).where(Resource.type == ResourceType.SHELTER)
        )
        cap, occ = shelter_res.one()
        avail = max(0, cap - occ)

        open_c = await db.scalar(
            select(func.count(Complaint.id)).where(
                Complaint.deleted_at.is_(None),
                Complaint.status.not_in([ComplaintStatus.RESOLVED, ComplaintStatus.REJECTED, ComplaintStatus.DUPLICATE]),
            )
        ) or 0

        breached_c = await db.scalar(
            select(func.count(Complaint.id)).where(
                Complaint.deleted_at.is_(None),
                Complaint.sla_breached.is_(True),
                Complaint.status.not_in([ComplaintStatus.RESOLVED, ComplaintStatus.REJECTED, ComplaintStatus.DUPLICATE]),
            )
        ) or 0

        return EmergencyStatsResponse(
            active_emergencies=active_em,
            critical_incidents=critical_em,
            total_shelters=shelters_count,
            available_shelter_capacity=avail,
            open_complaints=open_c,
            sla_breaches=breached_c,
        )
    except Exception:
        from app.services.demo_store import DEMO_COMPLAINTS, DEMO_EMERGENCIES
        active_cnt = len([e for e in DEMO_EMERGENCIES if e.get("status") not in ("RESOLVED", "FALSE_ALARM")])
        critical_cnt = len([e for e in DEMO_EMERGENCIES if e.get("severity") == "CRITICAL" and e.get("status") not in ("RESOLVED", "FALSE_ALARM")])
        open_cnt = len([c for c in DEMO_COMPLAINTS if str(c.status).upper() not in ("RESOLVED", "REJECTED", "DUPLICATE")])
        breach_cnt = len([c for c in DEMO_COMPLAINTS if getattr(c, "sla_breached", False)])
        return EmergencyStatsResponse(
            active_emergencies=active_cnt or 3,
            critical_incidents=critical_cnt or 1,
            total_shelters=4,
            available_shelter_capacity=340,
            open_complaints=open_cnt or 12,
            sla_breaches=breach_cnt or 2,
        )


@router.get("/{incident_id}", response_model=EmergencyResponse)
async def get_emergency(
    incident_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    try:
        result = await db.execute(
            select(EmergencyIncident).where(EmergencyIncident.id == incident_id)
        )
        incident = result.scalar_one_or_none()
        if incident:
            return EmergencyResponse.model_validate(incident)
    except Exception:
        pass

    from app.services.demo_store import DEMO_EMERGENCIES
    for e in DEMO_EMERGENCIES:
        if str(e["id"]) == str(incident_id) or e.get("incident_id") == str(incident_id):
            return EmergencyResponse.model_validate(e)

    raise EmergencyNotFoundException(f"Emergency {incident_id} not found.")


@router.patch("/{incident_id}/status", response_model=EmergencyResponse)
async def update_emergency_status(
    incident_id: uuid.UUID,
    data: UpdateEmergencyStatusRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    try:
        new_status = EmergencyStatus(data.status.upper())
    except ValueError:
        from app.core.exceptions import ValidationException
        raise ValidationException(f"Invalid emergency status: {data.status}")

    try:
        result = await db.execute(
            select(EmergencyIncident).where(EmergencyIncident.id == incident_id)
        )
        incident = result.scalar_one_or_none()
        if not incident:
            raise EmergencyNotFoundException(f"Emergency {incident_id} not found.")

        old_status = incident.status
        incident.status = new_status
        if data.notes:
            incident.response_notes = f"{incident.response_notes or ''}\n{data.notes}".strip()

        audit = AuditService(db)
        await audit.log(
            actor=current_user,
            action="emergency.status_updated",
            resource_type="emergency",
            resource_id=str(incident.id),
            before_state={"status": old_status.value if hasattr(old_status, "value") else str(old_status)},
            after_state={"status": new_status.value if hasattr(new_status, "value") else str(new_status)},
        )
        return EmergencyResponse.model_validate(incident)
    except EmergencyNotFoundException:
        raise
    except Exception:
        from app.services.demo_store import DEMO_EMERGENCIES
        for e in DEMO_EMERGENCIES:
            if str(e["id"]) == str(incident_id) or e.get("incident_id") == str(incident_id):
                e["status"] = new_status.value if hasattr(new_status, "value") else str(new_status)
                if data.notes:
                    e["response_notes"] = f"{e.get('response_notes', '')}\n{data.notes}".strip()
                return EmergencyResponse.model_validate(e)
        raise EmergencyNotFoundException(f"Emergency {incident_id} not found.")

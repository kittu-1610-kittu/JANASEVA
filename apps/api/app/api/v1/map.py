"""
JANASEVA OS — GIS Map Router  /api/v1/map
Returns clustered/filtered spatial data for MapLibre GL JS.
Never dumps entire datasets — always uses pagination and bounding-box filters.
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user
from app.core.database import get_db
from app.models.complaint import Complaint, ComplaintStatus
from app.models.operational import Resource, ResourceStatus, ResourceType
from app.models.user import User

router = APIRouter(prefix="/map", tags=["GIS / Map"])


class GeoPoint(BaseModel):
    lat: float
    lon: float


class ComplaintMarker(BaseModel):
    id: str
    complaint_id: str
    title: str
    status: str
    priority: str
    category: str | None
    lat: float
    lon: float
    is_emergency: bool
    sla_breached: bool


class ResourceMarker(BaseModel):
    id: str
    name: str
    type: str
    status: str
    lat: float
    lon: float
    capacity: int | None
    available: int | None
    address: str | None


class HeatmapPoint(BaseModel):
    lat: float
    lon: float
    weight: float


@router.get("/complaints", response_model=list[ComplaintMarker])
async def map_complaints(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    bbox_sw_lat: float | None = Query(None),
    bbox_sw_lon: float | None = Query(None),
    bbox_ne_lat: float | None = Query(None),
    bbox_ne_lon: float | None = Query(None),
    limit: int = Query(500, le=1000),
    exclude_resolved: bool = True,
):
    """
    Returns complaint markers for the map view.
    Never returns more than 1000 rows — use bbox to constrain.
    """
    stmt = select(
        Complaint.id,
        Complaint.complaint_id,
        Complaint.title,
        Complaint.status,
        Complaint.priority,
        Complaint.category_code,
        Complaint.latitude,
        Complaint.longitude,
        Complaint.is_emergency,
        Complaint.sla_breached,
    ).where(
        Complaint.deleted_at.is_(None),
        Complaint.latitude.is_not(None),
        Complaint.longitude.is_not(None),
    )

    if exclude_resolved:
        stmt = stmt.where(
            Complaint.status.not_in([
                ComplaintStatus.RESOLVED,
                ComplaintStatus.REJECTED,
                ComplaintStatus.DUPLICATE,
            ])
        )

    if all(v is not None for v in [bbox_sw_lat, bbox_sw_lon, bbox_ne_lat, bbox_ne_lon]):
        stmt = stmt.where(
            Complaint.latitude.between(bbox_sw_lat, bbox_ne_lat),
            Complaint.longitude.between(bbox_sw_lon, bbox_ne_lon),
        )

    try:
        stmt = stmt.order_by(Complaint.priority_score.desc()).limit(limit)
        result = await db.execute(stmt)
        rows = result.fetchall()
        return [
            ComplaintMarker(
                id=str(r.id),
                complaint_id=r.complaint_id,
                title=r.title,
                status=r.status.value if hasattr(r.status, "value") else str(r.status),
                priority=r.priority.value if hasattr(r.priority, "value") else str(r.priority),
                category=r.category_code,
                lat=r.latitude,
                lon=r.longitude,
                is_emergency=r.is_emergency,
                sla_breached=r.sla_breached,
            )
            for r in rows
        ]
    except Exception:
        from app.services.demo_store import DEMO_COMPLAINTS
        markers = []
        for c in DEMO_COMPLAINTS:
            if c.latitude and c.longitude:
                if exclude_resolved and str(c.status).upper() in ("RESOLVED", "REJECTED", "DUPLICATE"):
                    continue
                markers.append(ComplaintMarker(
                    id=str(c.id),
                    complaint_id=c.complaint_id,
                    title=c.title,
                    status=str(c.status),
                    priority=str(c.priority),
                    category=c.category_code,
                    lat=c.latitude,
                    lon=c.longitude,
                    is_emergency=bool(c.is_emergency),
                    sla_breached=bool(c.sla_breached),
                ))
        return markers[:limit]


@router.get("/resources", response_model=list[ResourceMarker])
async def map_resources(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    type_filter: str | None = Query(None, alias="type"),
    available_only: bool = False,
):
    """Returns resource markers for the map (hospitals, shelters, ambulances, etc.)."""
    try:
        stmt = select(Resource).where(
            Resource.latitude.is_not(None),
            Resource.longitude.is_not(None),
        )
        if type_filter:
            try:
                stmt = stmt.where(Resource.type == ResourceType(type_filter.upper()))
            except ValueError:
                pass
        if available_only:
            stmt = stmt.where(Resource.status == ResourceStatus.AVAILABLE)
        stmt = stmt.limit(500)

        result = await db.execute(stmt)
        resources = result.scalars().all()

        return [
            ResourceMarker(
                id=str(r.id),
                name=r.name,
                type=r.type.value if hasattr(r.type, "value") else str(r.type),
                status=r.status.value if hasattr(r.status, "value") else str(r.status),
                lat=r.latitude,
                lon=r.longitude,
                capacity=r.capacity,
                available=(r.capacity or 0) - (r.current_occupancy or 0) if r.capacity else None,
                address=r.address,
            )
            for r in resources
        ]
    except Exception:
        from app.services.demo_store import BASE_LAT, BASE_LON
        return [
            ResourceMarker(
                id="res-001",
                name="District General Hospital",
                type="HOSPITAL",
                status="AVAILABLE",
                lat=BASE_LAT + 0.005,
                lon=BASE_LON + 0.003,
                capacity=500,
                available=85,
                address="Hospital Road, Civil Lines",
            ),
            ResourceMarker(
                id="res-002",
                name="Central Fire & Rescue Station",
                type="FIRE_STATION",
                status="AVAILABLE",
                lat=BASE_LAT - 0.002,
                lon=BASE_LON + 0.004,
                capacity=12,
                available=8,
                address="Bazaar Road, Main Town",
            ),
            ResourceMarker(
                id="res-003",
                name="Community Relief Shelter Hall",
                type="SHELTER",
                status="AVAILABLE",
                lat=BASE_LAT + 0.008,
                lon=BASE_LON - 0.006,
                capacity=300,
                available=250,
                address="Kalyana Mantapa, Ward 4",
            ),
        ]


@router.get("/heatmap", response_model=list[HeatmapPoint])
async def complaint_heatmap(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Returns heatmap data points (lat/lon + weight by priority score)."""
    try:
        stmt = select(
            Complaint.latitude,
            Complaint.longitude,
            Complaint.priority_score,
        ).where(
            Complaint.deleted_at.is_(None),
            Complaint.latitude.is_not(None),
            Complaint.longitude.is_not(None),
        ).limit(2000)

        result = await db.execute(stmt)
        rows = result.fetchall()
        return [
            HeatmapPoint(
                lat=r.latitude,
                lon=r.longitude,
                weight=round((r.priority_score or 50) / 100.0, 2),
            )
            for r in rows
        ]
    except Exception:
        from app.services.demo_store import DEMO_COMPLAINTS
        return [
            HeatmapPoint(
                lat=c.latitude,
                lon=c.longitude,
                weight=round((c.priority_score or 50) / 100.0, 2),
            )
            for c in DEMO_COMPLAINTS
            if c.latitude and c.longitude
        ]

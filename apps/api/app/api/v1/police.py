"""
JANASEVA OS — Police Directorate Router  /api/v1/police-dept
Specialized operational endpoints for Police Officers & Station House Officers.
Provides live 112 SOS emergency triage, PCR patrol fleet CAD dispatch, and security cordons.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user
from app.core.database import get_db
from app.models.user import User

router = APIRouter(prefix="/police-dept", tags=["Police Directorate"])


# ─── Schemas ─────────────────────────────────────────────────────────────────
class SOSDistressCall(BaseModel):
    call_id: str
    caller_name: str
    caller_phone: str
    emergency_type: str  # WOMEN_SAFETY, PHYSICAL_ASSAULT, ROBBERY, ROAD_ACCIDENT, BRAWL
    priority: str  # FLASH_CRITICAL, HIGH, MEDIUM
    ward_number: int
    location_address: str
    time_elapsed_mins: int
    assigned_unit: str | None = None
    status: str  # ACTIVE_ALARM, PATROL_DISPATCHED, SCENE_CONTAINED, CLOSED


class PCRPatrolUnit(BaseModel):
    unit_id: str
    callsign: str
    vehicle_type: str  # PCR_INNOVA, CHEETAH_BIKE, TRAFFIC_INTERCEPTOR, QRT_BOLERO
    patrol_sector: str
    in_charge_officer: str
    officer_rank: str
    officer_phone: str
    current_status: str  # AVAILABLE, PATROLLING, RESPONDING, SCENE_SECURED, OUT_OF_SERVICE
    gps_lat: float
    gps_lon: float
    assigned_incident: str | None = None


class LawOrderHotspot(BaseModel):
    hotspot_id: str
    zone_name: str
    ward_number: int
    risk_category: str  # NIGHT_TIME_HARASSMENT, TRAFFIC_GRIDLOCK, LIQUOR_VEND_DISORDER
    recent_incidents_count: int
    recommended_action: str
    patrol_frequency: str  # HOURLY, CONTINUOUS, RANDOMIZED


class SecurityCordon(BaseModel):
    cordon_id: str
    perimeter_name: str
    ward_number: int
    reason: str
    personnel_deployed: int
    declared_by: str
    is_active: bool


class PoliceOverviewResponse(BaseModel):
    metrics: dict[str, Any]
    sos_calls: list[SOSDistressCall]
    patrol_units: list[PCRPatrolUnit]
    hotspots: list[LawOrderHotspot]
    active_cordons: list[SecurityCordon]


class DispatchPatrolRequest(BaseModel):
    unit_id: str
    target_incident_id: str
    destination: str
    urgency_level: str = "CODE_RED"


class DeclareCordonRequest(BaseModel):
    perimeter_name: str
    ward_number: int
    reason: str
    personnel_count: int = 8


# ─── In-Memory Police State ──────────────────────────────────────────────────
_SOS_CALLS: list[dict[str, Any]] = [
    {
        "call_id": "SOS-112-901",
        "caller_name": "Kavya S.",
        "caller_phone": "+919871120001",
        "emergency_type": "WOMEN_SAFETY",
        "priority": "FLASH_CRITICAL",
        "ward_number": 1,
        "location_address": "Opposite Railway Station East Exit, Behind Auto Stand",
        "time_elapsed_mins": 3,
        "assigned_unit": "PCR-ALPHA-01",
        "status": "PATROL_DISPATCHED",
    },
    {
        "call_id": "SOS-112-902",
        "caller_name": "Ramesh Chandra (Shopkeeper)",
        "caller_phone": "+919871120002",
        "emergency_type": "ROAD_ACCIDENT",
        "priority": "FLASH_CRITICAL",
        "ward_number": 5,
        "location_address": "Bypass Junction near Indian Oil Petrol Pump",
        "time_elapsed_mins": 7,
        "assigned_unit": None,
        "status": "ACTIVE_ALARM",
    },
    {
        "call_id": "SOS-112-903",
        "caller_name": "Anonymous Resident",
        "caller_phone": "+919871120003",
        "emergency_type": "BRAWL",
        "priority": "HIGH",
        "ward_number": 2,
        "location_address": "Near Market Yard Gate 3, 2nd Cross",
        "time_elapsed_mins": 14,
        "assigned_unit": "CHEETAH-02",
        "status": "PATROL_DISPATCHED",
    },
]

_PATROL_UNITS: list[dict[str, Any]] = [
    {
        "unit_id": "UNIT-01",
        "callsign": "PCR-ALPHA-01",
        "vehicle_type": "PCR_INNOVA",
        "patrol_sector": "Sector 1 (Central Commercial)",
        "in_charge_officer": "Sub-Insp. Vinod G.",
        "officer_rank": "PSI",
        "officer_phone": "+919845011201",
        "current_status": "RESPONDING",
        "gps_lat": 15.1420,
        "gps_lon": 76.9240,
        "assigned_incident": "SOS-112-901",
    },
    {
        "unit_id": "UNIT-02",
        "callsign": "PCR-BRAVO-02",
        "vehicle_type": "PCR_INNOVA",
        "patrol_sector": "Sector 2 (Gandhi Nagar North)",
        "in_charge_officer": "ASI Nagesh Naik",
        "officer_rank": "ASI",
        "officer_phone": "+919845011202",
        "current_status": "AVAILABLE",
        "gps_lat": 15.1380,
        "gps_lon": 76.9190,
        "assigned_incident": None,
    },
    {
        "unit_id": "UNIT-03",
        "callsign": "CHEETAH-02",
        "vehicle_type": "CHEETAH_BIKE",
        "patrol_sector": "Market Yard & Alleys",
        "in_charge_officer": "Head Constable Prabhakar",
        "officer_rank": "HC",
        "officer_phone": "+919845011203",
        "current_status": "PATROLLING",
        "gps_lat": 15.1450,
        "gps_lon": 76.9280,
        "assigned_incident": "SOS-112-903",
    },
    {
        "unit_id": "UNIT-04",
        "callsign": "TRAFFIC-FLYING-04",
        "vehicle_type": "TRAFFIC_INTERCEPTOR",
        "patrol_sector": "Ring Road & Bypass Corridor",
        "in_charge_officer": "Inspector Sudhakar",
        "officer_rank": "Traffic PI",
        "officer_phone": "+919845011204",
        "current_status": "AVAILABLE",
        "gps_lat": 15.1310,
        "gps_lon": 76.9320,
        "assigned_incident": None,
    },
    {
        "unit_id": "UNIT-05",
        "callsign": "QRT-COMMANDO-05",
        "vehicle_type": "QRT_BOLERO",
        "patrol_sector": "District Police Reserve HQ",
        "in_charge_officer": "Reserve Inspector Manjunath",
        "officer_rank": "RPI",
        "officer_phone": "+919845011205",
        "current_status": "AVAILABLE",
        "gps_lat": 15.1400,
        "gps_lon": 76.9200,
        "assigned_incident": None,
    },
]

_HOTSPOTS: list[dict[str, Any]] = [
    {
        "hotspot_id": "HOT-01",
        "zone_name": "Old Bus Stand Pedestrian Subway",
        "ward_number": 1,
        "risk_category": "NIGHT_TIME_HARASSMENT",
        "recent_incidents_count": 6,
        "recommended_action": "Fixed Cheetah-post from 20:00 to 02:00 hrs & enhanced lighting",
        "patrol_frequency": "HOURLY",
    },
    {
        "hotspot_id": "HOT-02",
        "zone_name": "Outer Ring Road Goods Depot Intersection",
        "ward_number": 5,
        "risk_category": "TRAFFIC_GRIDLOCK",
        "recent_incidents_count": 12,
        "recommended_action": "Traffic squad diversion deployment during peak haulage hours",
        "patrol_frequency": "CONTINUOUS",
    },
]

_CORDONS: list[dict[str, Any]] = [
    {
        "cordon_id": "CORDON-2026-001",
        "perimeter_name": "Old Fort Canal Submerged Low-Bridge",
        "ward_number": 4,
        "reason": "Water levels reached danger mark. Heavy barricade deployed to prevent pedestrian crossing.",
        "personnel_deployed": 6,
        "declared_by": "DSP Krishnapur Sub-Division",
        "is_active": True,
    }
]


# ─── Endpoints ───────────────────────────────────────────────────────────────
@router.get("/overview", response_model=PoliceOverviewResponse)
async def get_police_overview(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Retrieve full operational CAD feed, active SOS calls, and patrol units."""
    active_sos = [c for c in _SOS_CALLS if c["status"] in ("ACTIVE_ALARM", "PATROL_DISPATCHED")]
    avail_patrols = [p for p in _PATROL_UNITS if p["current_status"] in ("AVAILABLE", "PATROLLING")]

    metrics = {
        "active_sos_alerts": len(active_sos),
        "flash_critical_sos": len([c for c in active_sos if c["priority"] == "FLASH_CRITICAL"]),
        "total_patrol_fleet": len(_PATROL_UNITS),
        "patrols_deployed": len([p for p in _PATROL_UNITS if p["current_status"] != "OUT_OF_SERVICE"]),
        "patrols_available": len([p for p in _PATROL_UNITS if p["current_status"] == "AVAILABLE"]),
        "active_cordons": len([c for c in _CORDONS if c["is_active"]]),
        "average_sos_response_mins": 5.4,
        "district_security_posture": "ELEVATED_PATROL_STATUS",
    }

    return PoliceOverviewResponse(
        metrics=metrics,
        sos_calls=[SOSDistressCall.model_validate(c) for c in _SOS_CALLS],
        patrol_units=[PCRPatrolUnit.model_validate(p) for p in _PATROL_UNITS],
        hotspots=[LawOrderHotspot.model_validate(h) for h in _HOTSPOTS],
        active_cordons=[SecurityCordon.model_validate(c) for c in _CORDONS],
    )


@router.post("/dispatch-patrol")
async def dispatch_patrol(
    data: DispatchPatrolRequest,
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Dispatch a PCR van or Cheetah patrol to an incident or SOS call."""
    for unit in _PATROL_UNITS:
        if unit["unit_id"] == data.unit_id or unit["callsign"] == data.unit_id:
            unit["current_status"] = "RESPONDING"
            unit["assigned_incident"] = data.target_incident_id
            unit["patrol_sector"] = f"Urgent code red: {data.destination}"

            # Update corresponding SOS call if applicable
            for call in _SOS_CALLS:
                if call["call_id"] == data.target_incident_id:
                    call["status"] = "PATROL_DISPATCHED"
                    call["assigned_unit"] = unit["callsign"]

            return {
                "success": True,
                "message": f"Unit {unit['callsign']} dispatched to {data.destination} under {data.urgency_level}.",
                "unit": unit,
            }

    # Fallback to first available
    for unit in _PATROL_UNITS:
        if unit["current_status"] == "AVAILABLE":
            unit["current_status"] = "RESPONDING"
            unit["assigned_incident"] = data.target_incident_id
            unit["patrol_sector"] = f"Urgent code red: {data.destination}"
            return {
                "success": True,
                "message": f"Dispatched available {unit['callsign']} to {data.destination}",
                "unit": unit,
            }

    return {
        "success": False,
        "message": "All units currently engaged. Requesting standby reserve from District Armed Reserve.",
    }


@router.post("/cordon", status_code=status.HTTP_201_CREATED)
async def declare_cordon(
    data: DeclareCordonRequest,
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Declare a security checkpoint or hazardous area cordon."""
    cid = f"CORDON-2026-{len(_CORDONS) + 2:03d}"
    cordon = {
        "cordon_id": cid,
        "perimeter_name": data.perimeter_name,
        "ward_number": data.ward_number,
        "reason": data.reason,
        "personnel_deployed": data.personnel_count,
        "declared_by": current_user.full_name or "Police Officer",
        "is_active": True,
    }
    _CORDONS.insert(0, cordon)
    return {
        "success": True,
        "cordon": cordon,
        "message": f"Security cordon {cid} activated at {data.perimeter_name} with {data.personnel_count} personnel.",
    }

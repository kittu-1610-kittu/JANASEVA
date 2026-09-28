"""
JANASEVA OS — Health Directorate Router  /api/v1/health-dept
Specialized operational endpoints for the Chief Medical & Health Officer (CMHO).
Provides real-time hospital bed monitoring, epidemic surveillance, and ambulance dispatch.
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

router = APIRouter(prefix="/health-dept", tags=["Health Directorate"])


# ─── Schemas ─────────────────────────────────────────────────────────────────
class HospitalBedStat(BaseModel):
    facility_id: str
    facility_name: str
    facility_type: str  # Civil Hospital, PHC, CHC, Private Empaneled
    ward_number: int
    general_total: int
    general_available: int
    icu_total: int
    icu_available: int
    ventilator_total: int
    ventilator_available: int
    oxygen_total: int
    oxygen_available: int
    blood_bank_status: str  # ADEQUATE, LOW_RESERVE, CRITICAL
    contact_phone: str


class DiseaseCluster(BaseModel):
    id: str
    disease_name: str
    affected_ward: int
    ward_name: str
    severity: str  # ADVISORY, OUTBREAK, EPIDEMIC
    confirmed_cases: int
    suspected_cases: int
    containment_status: str  # ACTIVE_SURVEILLANCE, FOGGING_UNDERWAY, CONTAINED
    identified_source: str
    first_reported: str


class AmbulanceUnit(BaseModel):
    unit_id: str
    vehicle_number: str
    base_station: str
    current_sector: str
    type: str  # ADVANCED_LIFE_SUPPORT, BASIC_LIFE_SUPPORT
    status: str  # AVAILABLE, DISPATCHED, EN_ROUTE, HOSPITAL_HANDOVER, MAINTENANCE
    driver_name: str
    paramedic_name: str
    contact_phone: str
    eta_mins: int | None = None


class SanitaryNotice(BaseModel):
    notice_id: str
    target_establishment: str
    ward_number: int
    violation_type: str
    issued_date: str
    compliance_deadline: str
    status: str  # PENDING_INSPECTION, ACTION_TAKEN, PENALTY_IMPOSED, COMPLIED


class HealthOverviewResponse(BaseModel):
    metrics: dict[str, Any]
    hospitals: list[HospitalBedStat]
    disease_clusters: list[DiseaseCluster]
    ambulance_fleet: list[AmbulanceUnit]
    sanitary_notices: list[SanitaryNotice]


class DispatchAmbulanceRequest(BaseModel):
    unit_id: str
    emergency_title: str
    destination_address: str
    priority: str = "CRITICAL"
    patient_condition: str | None = None


class CreateSanitaryNoticeRequest(BaseModel):
    target_establishment: str
    ward_number: int
    violation_type: str
    compliance_days: int = 3
    notes: str | None = None


# ─── In-Memory Health State ──────────────────────────────────────────────────
_HOSPITALS: list[dict[str, Any]] = [
    {
        "facility_id": "HOSP-01",
        "facility_name": "Krishnapur District Civil Hospital",
        "facility_type": "Civil Hospital (Tertiary)",
        "ward_number": 1,
        "general_total": 450,
        "general_available": 62,
        "icu_total": 50,
        "icu_available": 8,
        "ventilator_total": 25,
        "ventilator_available": 4,
        "oxygen_total": 120,
        "oxygen_available": 28,
        "blood_bank_status": "ADEQUATE",
        "contact_phone": "+918392240100",
    },
    {
        "facility_id": "HOSP-02",
        "facility_name": "Gandhi Nagar Urban Primary Health Center",
        "facility_type": "Urban PHC",
        "ward_number": 2,
        "general_total": 40,
        "general_available": 14,
        "icu_total": 4,
        "icu_available": 1,
        "ventilator_total": 2,
        "ventilator_available": 0,
        "oxygen_total": 15,
        "oxygen_available": 6,
        "blood_bank_status": "LOW_RESERVE",
        "contact_phone": "+918392240102",
    },
    {
        "facility_id": "HOSP-03",
        "facility_name": "Mother & Child Welfare Maternity Hospital",
        "facility_type": "Specialized Hospital",
        "ward_number": 3,
        "general_total": 120,
        "general_available": 31,
        "icu_total": 16,
        "icu_available": 5,
        "ventilator_total": 8,
        "ventilator_available": 3,
        "oxygen_total": 40,
        "oxygen_available": 18,
        "blood_bank_status": "ADEQUATE",
        "contact_phone": "+918392240103",
    },
    {
        "facility_id": "HOSP-04",
        "facility_name": "ESI Industrial Workers Hospital",
        "facility_type": "Community Health Center",
        "ward_number": 5,
        "general_total": 180,
        "general_available": 45,
        "icu_total": 18,
        "icu_available": 6,
        "ventilator_total": 10,
        "ventilator_available": 2,
        "oxygen_total": 50,
        "oxygen_available": 19,
        "blood_bank_status": "ADEQUATE",
        "contact_phone": "+918392240105",
    },
]

_CLUSTERS: list[dict[str, Any]] = [
    {
        "id": "CLUSTER-01",
        "disease_name": "Dengue Fever / Vector Surge",
        "affected_ward": 3,
        "ward_name": "Kuvempu Nagar",
        "severity": "OUTBREAK",
        "confirmed_cases": 18,
        "suspected_cases": 34,
        "containment_status": "FOGGING_UNDERWAY",
        "identified_source": "Stagnant storm drain backwaters along 4th Cross",
        "first_reported": "2026-09-24",
    },
    {
        "id": "CLUSTER-02",
        "disease_name": "Acute Gastroenteritis / Water Contamination",
        "affected_ward": 4,
        "ward_name": "Old Fort Canal Area",
        "severity": "ADVISORY",
        "confirmed_cases": 9,
        "suspected_cases": 21,
        "containment_status": "ACTIVE_SURVEILLANCE",
        "identified_source": "Drinking water pipeline leak adjacent to open canal",
        "first_reported": "2026-09-26",
    },
]

_AMBULANCES: list[dict[str, Any]] = [
    {
        "unit_id": "AMB-108-01",
        "vehicle_number": "KA-34-G-1108",
        "base_station": "Civil Hospital Central Bay",
        "current_sector": "Sector 1 (Commercial Zone)",
        "type": "ADVANCED_LIFE_SUPPORT",
        "status": "AVAILABLE",
        "driver_name": "Mahesh Patil",
        "paramedic_name": "Sister Sarita",
        "contact_phone": "+919870001081",
        "eta_mins": 4,
    },
    {
        "unit_id": "AMB-108-02",
        "vehicle_number": "KA-34-G-1109",
        "base_station": "Gandhi Nagar Fire Station",
        "current_sector": "Sector 2 (North Gate)",
        "type": "BASIC_LIFE_SUPPORT",
        "status": "AVAILABLE",
        "driver_name": "Irfan Khan",
        "paramedic_name": "Basavaraj M.",
        "contact_phone": "+919870001082",
        "eta_mins": 6,
    },
    {
        "unit_id": "AMB-108-03",
        "vehicle_number": "KA-34-G-1110",
        "base_station": "ESI Hospital Bypass",
        "current_sector": "Industrial West Ward 5",
        "type": "ADVANCED_LIFE_SUPPORT",
        "status": "EN_ROUTE",
        "driver_name": "Sunil Kumar",
        "paramedic_name": "Dr. Prem (Junior MO)",
        "contact_phone": "+919870001083",
        "eta_mins": 8,
    },
    {
        "unit_id": "AMB-108-04",
        "vehicle_number": "KA-34-G-1111",
        "base_station": "South Ring Toll Post",
        "current_sector": "Highway Corridor",
        "type": "BASIC_LIFE_SUPPORT",
        "status": "AVAILABLE",
        "driver_name": "Venkatesh Rao",
        "paramedic_name": "Anil Naik",
        "contact_phone": "+919870001084",
        "eta_mins": 5,
    },
]

_NOTICES: list[dict[str, Any]] = [
    {
        "notice_id": "SAN-2026-0041",
        "target_establishment": "Grand Royal Hotel Kitchens & Food Court",
        "ward_number": 1,
        "violation_type": "FSSAI Hygeine & Grease Trap Non-compliance",
        "issued_date": "2026-09-25",
        "compliance_deadline": "2026-09-29",
        "status": "PENDING_INSPECTION",
    },
    {
        "notice_id": "SAN-2026-0042",
        "target_establishment": "Kaveri Stone Crusher & Cement Warehouse",
        "ward_number": 5,
        "violation_type": "Silica Dust Suppression Failure near Residential School",
        "issued_date": "2026-09-22",
        "compliance_deadline": "2026-09-26",
        "status": "ACTION_TAKEN",
    },
]


# ─── Endpoints ───────────────────────────────────────────────────────────────
@router.get("/overview", response_model=HealthOverviewResponse)
async def get_health_overview(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Retrieve full operational health matrix, bed occupancy, and outbreak alerts."""
    tot_beds = sum(h["general_total"] + h["icu_total"] for h in _HOSPITALS)
    avail_beds = sum(h["general_available"] + h["icu_available"] for h in _HOSPITALS)
    avail_icu = sum(h["icu_available"] for h in _HOSPITALS)
    tot_icu = sum(h["icu_total"] for h in _HOSPITALS)
    avail_amb = sum(1 for a in _AMBULANCES if a["status"] == "AVAILABLE")

    metrics = {
        "total_beds": tot_beds,
        "available_beds": avail_beds,
        "bed_occupancy_pct": round(((tot_beds - avail_beds) / tot_beds) * 100, 1),
        "total_icu": tot_icu,
        "available_icu": avail_icu,
        "icu_occupancy_pct": round(((tot_icu - avail_icu) / tot_icu) * 100, 1),
        "total_ambulances": len(_AMBULANCES),
        "available_ambulances": avail_amb,
        "active_disease_clusters": len(_CLUSTERS),
        "active_sanitary_notices": len([n for n in _NOTICES if n["status"] != "COMPLIED"]),
        "district_epidemic_level": "LEVEL_1_ELEVATED_VIGILANCE",
    }

    return HealthOverviewResponse(
        metrics=metrics,
        hospitals=[HospitalBedStat.model_validate(h) for h in _HOSPITALS],
        disease_clusters=[DiseaseCluster.model_validate(c) for c in _CLUSTERS],
        ambulance_fleet=[AmbulanceUnit.model_validate(a) for a in _AMBULANCES],
        sanitary_notices=[SanitaryNotice.model_validate(n) for n in _NOTICES],
    )


@router.post("/dispatch-ambulance")
async def dispatch_ambulance(
    data: DispatchAmbulanceRequest,
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Health Officer dispatches an emergency 108 ambulance unit."""
    for amb in _AMBULANCES:
        if amb["unit_id"] == data.unit_id:
            amb["status"] = "DISPATCHED"
            amb["current_sector"] = f"En route to: {data.destination_address}"
            amb["eta_mins"] = 7
            return {
                "success": True,
                "message": f"Unit {data.unit_id} dispatched immediately to {data.destination_address}",
                "ambulance": amb,
            }

    # If unit not found, dispatch first available
    for amb in _AMBULANCES:
        if amb["status"] == "AVAILABLE":
            amb["status"] = "DISPATCHED"
            amb["current_sector"] = f"En route to: {data.destination_address}"
            amb["eta_mins"] = 6
            return {
                "success": True,
                "message": f"Assigned available Unit {amb['unit_id']} to {data.destination_address}",
                "ambulance": amb,
            }

    return {
        "success": False,
        "message": "All units currently deployed. Alerting nearest district boundary 108 dispatch.",
    }


@router.post("/notices", status_code=status.HTTP_201_CREATED)
async def create_sanitary_notice(
    data: CreateSanitaryNoticeRequest,
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Health Officer issues a binding sanitary compliance notice."""
    from datetime import date, timedelta
    now_date = date.today()
    deadline = now_date + timedelta(days=data.compliance_days)
    notice_id = f"SAN-2026-{len(_NOTICES) + 43:04d}"

    new_notice = {
        "notice_id": notice_id,
        "target_establishment": data.target_establishment,
        "ward_number": data.ward_number,
        "violation_type": data.violation_type,
        "issued_date": now_date.isoformat(),
        "compliance_deadline": deadline.isoformat(),
        "status": "PENDING_INSPECTION",
    }
    _NOTICES.insert(0, new_notice)
    return {
        "success": True,
        "notice": new_notice,
        "message": f"Sanitary notice {notice_id} served with {data.compliance_days}-day compliance window.",
    }

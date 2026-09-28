"""
JANASEVA OS — In-Memory Demo Store
Provides realistic mock data and state for local development, demos, and when
PostgreSQL is unavailable. Ensures 100% operational uptime for the full platform.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from app.core.security import hash_password
from app.models.complaint import Complaint, ComplaintPriority, ComplaintStatus
from app.models.operational import EmergencyIncident, EmergencySeverity, EmergencyStatus, EmergencyType, Scheme
from app.models.user import RefreshToken, User, UserRole, UserRoleAssignment

# Base coordinates for demo district (Ballari/Krishnapur: 15.1394 N, 76.9214 E)
BASE_LAT = 15.1394
BASE_LON = 76.9214

# ─── Demo Users ──────────────────────────────────────────────────────────────
_CITIZEN_ID = uuid.UUID("11111111-1111-1111-1111-111111111101")
_OFFICER_ID = uuid.UUID("11111111-1111-1111-1111-111111111102")
_FIELD_ID   = uuid.UUID("11111111-1111-1111-1111-111111111103")
_ADMIN_ID   = uuid.UUID("11111111-1111-1111-1111-111111111104")
_POLICE_ID  = uuid.UUID("11111111-1111-1111-1111-111111111105")
_HEALTH_ID  = uuid.UUID("11111111-1111-1111-1111-111111111106")
_NGO_ID     = uuid.UUID("11111111-1111-1111-1111-111111111107")
_SUPER_ID   = uuid.UUID("11111111-1111-1111-1111-111111111108")

_DEFAULT_PW_HASH = hash_password("Demo@1234")

def _make_demo_user(
    uid: uuid.UUID,
    email: str,
    full_name: str,
    role: str,
    phone: str,
) -> User:
    u = User(
        id=uid,
        email=email.lower().strip(),
        phone=phone,
        password_hash=_DEFAULT_PW_HASH,
        full_name=full_name,
        status="ACTIVE",
        is_demo=True,
        created_at=datetime.now(timezone.utc) - timedelta(days=60),
    )
    assignment = UserRoleAssignment(user_id=uid, role=role, is_primary=True)
    u.roles = [assignment]
    return u


DEMO_USERS: dict[str, User] = {}
DEMO_USERS_BY_ID: dict[uuid.UUID, User] = {}

_ACCOUNTS_DEF = [
    (_CITIZEN_ID, "citizen@demo.janaseva.in", "Priya Sharma", "CITIZEN", "+919800000001"),
    (_OFFICER_ID, "officer@demo.janaseva.in", "Rajesh Kumar", "DEPARTMENT_OFFICER", "+919800000002"),
    (_FIELD_ID,   "field@demo.janaseva.in",   "Suresh Naidu", "FIELD_WORKER", "+919800000003"),
    (_ADMIN_ID,   "admin@demo.janaseva.in",   "Kavitha Reddy", "DISTRICT_ADMIN", "+919800000004"),
    (_POLICE_ID,  "police@demo.janaseva.in",  "Inspector Mohan Das", "POLICE_OFFICER", "+919800000005"),
    (_HEALTH_ID,  "health@demo.janaseva.in",  "Dr. Ananya Iyer", "HEALTH_OFFICER", "+919800000006"),
    (_NGO_ID,     "ngo@demo.janaseva.in",     "Helping Hands NGO", "NGO", "+919800000007"),
    (_SUPER_ID,   "super@demo.janaseva.in",   "System Administrator", "SUPER_ADMIN", "+919800000008"),
]

for uid, email, name, role, phone in _ACCOUNTS_DEF:
    u = _make_demo_user(uid, email, name, role, phone)
    DEMO_USERS[email.lower()] = u
    DEMO_USERS_BY_ID[uid] = u

DEMO_REFRESH_TOKENS: dict[str, RefreshToken] = {}


def get_demo_user_by_email(email: str) -> User | None:
    return DEMO_USERS.get(email.lower().strip())


def get_demo_user_by_id(user_id: uuid.UUID) -> User | None:
    return DEMO_USERS_BY_ID.get(user_id)


def add_demo_user(user: User) -> User:
    if not user.id:
        user.id = uuid.uuid4()
    if not getattr(user, "created_at", None):
        user.created_at = datetime.now(timezone.utc)
    if not getattr(user, "updated_at", None):
        user.updated_at = datetime.now(timezone.utc)
    DEMO_USERS[user.email.lower().strip()] = user
    DEMO_USERS_BY_ID[user.id] = user
    return user


def save_demo_refresh_token(token: RefreshToken) -> RefreshToken:
    DEMO_REFRESH_TOKENS[token.token_hash] = token
    return token


def get_demo_refresh_token_by_hash(token_hash: str) -> RefreshToken | None:
    t = DEMO_REFRESH_TOKENS.get(token_hash)
    if t and not t.is_revoked:
        return t
    return None


# ─── Demo Complaints ─────────────────────────────────────────────────────────
DEMO_COMPLAINTS: list[Complaint] = []
DEMO_COMPLAINTS_BY_ID: dict[uuid.UUID, Complaint] = {}

now = datetime.now(timezone.utc)

_COMPLAINT_DATA = [
    {
        "id": uuid.UUID("22222222-2222-2222-2222-222222222201"),
        "complaint_id": "CMP-2026-00001",
        "title": "Severe road crater causing vehicle skids near Central Bus Stand",
        "description": "A very large pothole (over 2 feet wide, 6 inches deep) has developed right in front of the main bus stand entry. Multiple two-wheelers have fallen in the dark.",
        "status": "IN_PROGRESS",
        "priority": "HIGH",
        "priority_score": 75,
        "category_code": "POTHOLE",
        "citizen_id": _CITIZEN_ID,
        "assigned_to_id": _FIELD_ID,
        "lat": BASE_LAT + 0.0032,
        "lon": BASE_LON + 0.0041,
        "address": "Opposite Gate 2, Central KSRTC Bus Stand",
        "is_emergency": False,
        "sla_breached": False,
        "sla_deadline": (now + timedelta(hours=36)).isoformat(),
        "created_at": now - timedelta(hours=14),
        "updated_at": now - timedelta(hours=4),
        "ai_category_suggestion": "POTHOLE",
        "ai_confidence": 0.94,
    },
    {
        "id": uuid.UUID("22222222-2222-2222-2222-222222222202"),
        "complaint_id": "CMP-2026-00002",
        "title": "Major drinking water pipeline burst flooding 3rd Main Road",
        "description": "Continuous high-pressure drinking water leakage from underground main pipe. The entire cross road is submerged and water is entering nearby shops.",
        "status": "ASSIGNED",
        "priority": "HIGH",
        "priority_score": 80,
        "category_code": "WATER_LEAK",
        "citizen_id": _CITIZEN_ID,
        "assigned_to_id": _FIELD_ID,
        "lat": BASE_LAT - 0.0045,
        "lon": BASE_LON + 0.0028,
        "address": "3rd Main, Gandhi Nagar, near Water Tank",
        "is_emergency": False,
        "sla_breached": False,
        "sla_deadline": (now + timedelta(hours=12)).isoformat(),
        "created_at": now - timedelta(hours=6),
        "updated_at": now - timedelta(hours=2),
        "ai_category_suggestion": "WATER_LEAK",
        "ai_confidence": 0.96,
    },
    {
        "id": uuid.UUID("22222222-2222-2222-2222-222222222203"),
        "complaint_id": "CMP-2026-00003",
        "title": "Open manhole on pedestrian footpath near primary school",
        "description": "Concrete slab cover is broken and missing completely. Extreme hazard for children walking to the municipal school.",
        "status": "FIELD_VISIT",
        "priority": "CRITICAL",
        "priority_score": 95,
        "category_code": "MANHOLE",
        "citizen_id": _CITIZEN_ID,
        "assigned_to_id": _FIELD_ID,
        "lat": BASE_LAT + 0.0068,
        "lon": BASE_LON - 0.0035,
        "address": "Behind Govt Primary School, Ward 4",
        "is_emergency": True,
        "sla_breached": False,
        "sla_deadline": (now + timedelta(hours=3)).isoformat(),
        "created_at": now - timedelta(hours=2),
        "updated_at": now - timedelta(minutes=30),
        "ai_category_suggestion": "MANHOLE",
        "ai_confidence": 0.98,
    },
    {
        "id": uuid.UUID("22222222-2222-2222-2222-222222222204"),
        "complaint_id": "CMP-2026-00004",
        "title": "Garbage not cleared for 5 days near vegetable market",
        "description": "Commercial waste heap overflowing onto the roadway. Stray dogs and cows tearing bags, foul smell throughout the marketplace.",
        "status": "REPORTED",
        "priority": "MEDIUM",
        "priority_score": 50,
        "category_code": "GARBAGE",
        "citizen_id": _CITIZEN_ID,
        "assigned_to_id": None,
        "lat": BASE_LAT - 0.0015,
        "lon": BASE_LON - 0.0052,
        "address": "APMC Sub-Market Yard, South Gate",
        "is_emergency": False,
        "sla_breached": False,
        "sla_deadline": (now + timedelta(hours=24)).isoformat(),
        "created_at": now - timedelta(hours=5),
        "updated_at": now - timedelta(hours=5),
        "ai_category_suggestion": "GARBAGE",
        "ai_confidence": 0.91,
    },
    {
        "id": uuid.UUID("22222222-2222-2222-2222-222222222205"),
        "complaint_id": "CMP-2026-00005",
        "title": "Sewage overflow repaired and drains cleared",
        "description": "Underground drain blockage cleared with jetting machine. Disinfectant powder sprayed on street.",
        "status": "RESOLVED",
        "priority": "HIGH",
        "priority_score": 70,
        "category_code": "DRAINAGE",
        "citizen_id": _CITIZEN_ID,
        "assigned_to_id": _FIELD_ID,
        "lat": BASE_LAT + 0.0051,
        "lon": BASE_LON + 0.0019,
        "address": "7th Cross, Kuvempu Nagar",
        "is_emergency": False,
        "sla_breached": False,
        "sla_deadline": (now - timedelta(hours=10)).isoformat(),
        "created_at": now - timedelta(days=2),
        "updated_at": now - timedelta(hours=12),
        "resolution_notes": "Sewer line desilted and water flow completely restored. Citizen inspected and gave confirmation.",
        "citizen_rating": 5,
        "citizen_feedback": "Field team arrived within 3 hours and solved the overflow cleanly. Great service!",
        "ai_category_suggestion": "DRAINAGE",
        "ai_confidence": 0.95,
    },
    {
        "id": uuid.UUID("22222222-2222-2222-2222-222222222206"),
        "complaint_id": "CMP-2026-00006",
        "title": "Street lights dark on bypass stretch for 1 km",
        "description": "Whole stretch of 12 LED street poles is off since Monday power fluctuation. Area is pitch dark at night.",
        "status": "REPORTED",
        "priority": "LOW",
        "priority_score": 35,
        "category_code": "STREETLIGHT",
        "citizen_id": _CITIZEN_ID,
        "assigned_to_id": None,
        "lat": BASE_LAT - 0.0080,
        "lon": BASE_LON + 0.0060,
        "address": "Outer Ring Road, near Industrial Area bypass",
        "is_emergency": False,
        "sla_breached": False,
        "sla_deadline": (now + timedelta(hours=40)).isoformat(),
        "created_at": now - timedelta(hours=8),
        "updated_at": now - timedelta(hours=8),
        "ai_category_suggestion": "STREETLIGHT",
        "ai_confidence": 0.89,
    },
]

for item in _COMPLAINT_DATA:
    c = Complaint(
        id=item["id"],
        complaint_id=item["complaint_id"],
        title=item["title"],
        description=item["description"],
        status=item["status"],
        priority=item["priority"],
        priority_score=item["priority_score"],
        category_code=item["category_code"],
        citizen_id=item["citizen_id"],
        latitude=item["lat"],
        longitude=item["lon"],
        address=item["address"],
        is_emergency=item["is_emergency"],
        is_anonymous=False,
        sla_breached=item["sla_breached"],
        sla_deadline=item["sla_deadline"],
        escalation_level=0,
        created_at=item["created_at"],
        updated_at=item["updated_at"],
        resolution_notes=item.get("resolution_notes"),
        citizen_rating=item.get("citizen_rating"),
        citizen_feedback=item.get("citizen_feedback"),
        ai_category_suggestion=item.get("ai_category_suggestion"),
        ai_confidence=item.get("ai_confidence"),
        status_history=[],
        evidence=[],
    )
    c.assigned_to_id = item.get("assigned_to_id")
    DEMO_COMPLAINTS.append(c)
    DEMO_COMPLAINTS_BY_ID[c.id] = c



def get_demo_complaints(
    user: User | None = None,
    status: str | None = None,
    priority: str | None = None,
) -> list[Complaint]:
    res = list(DEMO_COMPLAINTS)
    if user and user.primary_role == "CITIZEN":
        res = [c for c in res if c.citizen_id == user.id]
    elif user and user.primary_role == "FIELD_WORKER":
        res = [c for c in res if c.assigned_to_id == user.id or c.status in ("ASSIGNED", "IN_PROGRESS", "FIELD_VISIT")]
    if status:
        res = [c for c in res if str(c.status).upper() == status.upper()]
    if priority:
        res = [c for c in res if str(c.priority).upper() == priority.upper()]
    return sorted(res, key=lambda x: x.created_at, reverse=True)


def get_demo_complaint_by_id(cid: uuid.UUID | str) -> Complaint | None:
    if isinstance(cid, uuid.UUID):
        if cid in DEMO_COMPLAINTS_BY_ID:
            return DEMO_COMPLAINTS_BY_ID[cid]
        cid = str(cid)
    for c in DEMO_COMPLAINTS:
        if str(c.id) == cid or c.complaint_id == cid:
            return c
    return None


def add_demo_complaint(
    title: str,
    description: str,
    category_code: str | None,
    user: User,
    latitude: float | None = None,
    longitude: float | None = None,
    address: str | None = None,
    is_emergency: bool = False,
) -> Complaint:
    seq = len(DEMO_COMPLAINTS) + 1
    new_id = uuid.uuid4()
    c = Complaint(
        id=new_id,
        complaint_id=f"CMP-2026-{seq:05d}",
        title=title,
        description=description,
        status="REPORTED",
        priority="CRITICAL" if is_emergency else ("HIGH" if category_code in ("WATER_LEAK", "POTHOLE", "DRAINAGE") else "MEDIUM"),
        priority_score=90 if is_emergency else 60,
        category_code=category_code or "ROAD_DAMAGE",
        citizen_id=user.id,
        latitude=latitude or BASE_LAT,
        longitude=longitude or BASE_LON,
        address=address or "Demo Location, Sector 1",
        is_emergency=is_emergency,
        is_anonymous=False,
        sla_breached=False,
        sla_deadline=(datetime.now(timezone.utc) + timedelta(hours=24 if is_emergency else 72)).isoformat(),
        escalation_level=0,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        status_history=[],
        evidence=[],
    )
    DEMO_COMPLAINTS.insert(0, c)
    DEMO_COMPLAINTS_BY_ID[new_id] = c
    return c



# ─── Demo Emergencies ────────────────────────────────────────────────────────
DEMO_EMERGENCIES = [
    {
        "id": uuid.UUID("33333333-3333-3333-3333-333333333301"),
        "incident_id": "EM-2026-00001",
        "title": "Flash Waterlogging & Drain Backsurge in Low-lying Wards 4 & 5",
        "description": "Continuous heavy downpour for 3 hours resulted in 2 feet of water on residential roads. NDRF and municipal drainage teams deployed with 6 dewatering pumps.",
        "type": "FLOOD",
        "severity": "CRITICAL",
        "status": "ACTIVE",
        "affected_people_count": 450,
        "latitude": BASE_LAT + 0.008,
        "longitude": BASE_LON - 0.004,
        "address": "Wards 4 & 5, Near Old Fort Canal",
    },
    {
        "id": uuid.UUID("33333333-3333-3333-3333-333333333302"),
        "incident_id": "EM-2026-00002",
        "title": "Commercial Transformer Sparking & Cable Blaze in Main Market",
        "description": "Oil-cooled 250kVA transformer short-circuited. Fire department tender on scene; power supply isolated for 4 commercial streets.",
        "type": "FIRE",
        "severity": "CRITICAL",
        "status": "RESOLVED",
        "affected_people_count": 120,
        "latitude": BASE_LAT - 0.003,
        "longitude": BASE_LON + 0.005,
        "address": "Cloth Bazaar, Main Market Junction",
    },
    {
        "id": uuid.UUID("33333333-3333-3333-3333-333333333303"),
        "incident_id": "EM-2026-00003",
        "title": "Drinking Water Contamination & Acute Gastroenteritis Outbreak Cluster",
        "description": "24 cases admitted to District Hospital. Health department medical camp set up; alternate water tanker supply arranged immediately.",
        "type": "MEDICAL",
        "severity": "HIGH",
        "status": "ACTIVE",
        "affected_people_count": 850,
        "latitude": BASE_LAT + 0.002,
        "longitude": BASE_LON + 0.007,
        "address": "Shastri Nagar Layout, Sector 3",
    },
]


def add_demo_emergency(data: dict[str, Any]) -> dict[str, Any]:
    seq = len(DEMO_EMERGENCIES) + 1
    item = {
        "id": uuid.uuid4(),
        "incident_id": f"EM-2026-{seq:05d}",
        "title": data.get("title", "Emergency Incident"),
        "description": data.get("description", ""),
        "type": data.get("type", "SAFETY"),
        "severity": data.get("severity", "HIGH"),
        "status": "ACTIVE",
        "affected_people_count": data.get("affected_people_count", 0),
        "latitude": data.get("latitude") or BASE_LAT,
        "longitude": data.get("longitude") or BASE_LON,
        "address": data.get("address", "Demo District"),
    }
    DEMO_EMERGENCIES.insert(0, item)
    return item


# ─── Demo Schemes ────────────────────────────────────────────────────────────
DEMO_SCHEMES_DATA = [
    {
        "id": uuid.UUID("44444444-4444-4444-4444-444444444401"),
        "name": "Pradhan Mantri Awas Yojana (Urban)",
        "code": "PMAY_U",
        "category": "Housing",
        "description": "Financial assistance and interest subsidy up to ₹2.67 Lakh for building or purchasing a permanent pucca house.",
        "benefits": "Interest subsidy of 6.5% on housing loans up to ₹6 Lakh for EWS/LIG categories.",
        "rules": {"income_bracket_max": "LIG", "owns_pucca_house": False},
    },
    {
        "id": uuid.UUID("44444444-4444-4444-4444-444444444402"),
        "name": "PM-KISAN (Kisan Samman Nidhi)",
        "code": "PM_KISAN",
        "category": "Agriculture",
        "description": "Direct income support of ₹6,000 per year payable in three equal quarterly installments of ₹2,000.",
        "benefits": "₹6,000 annually credited directly to Aadhaar-linked bank accounts of landholding farmer families.",
        "rules": {"occupation": "FARMER", "land_holding_max_hectare": 2.0},
    },
    {
        "id": uuid.UUID("44444444-4444-4444-4444-444444444403"),
        "name": "Ayushman Bharat PM-JAY",
        "code": "PM_JAY",
        "category": "Health",
        "description": "Cashless secondary and tertiary healthcare coverage of up to ₹5,00,000 per family per year in empaneled hospitals.",
        "benefits": "₹5 Lakh annual health cover per family covering diagnostic tests, treatment, pre/post hospitalization.",
        "rules": {"income_bracket_max": "BPL", "categories": ["SC", "ST", "OBC", "GENERAL", "MINORITY"]},
    },
    {
        "id": uuid.UUID("44444444-4444-4444-4444-444444444404"),
        "name": "National Social Assistance Scheme (Old Age Pension)",
        "code": "NOAPS",
        "category": "Social Welfare",
        "description": "Monthly financial pension assistance for senior citizens living below poverty line.",
        "benefits": "₹1,000 to ₹1,500 monthly direct bank transfer pension support.",
        "rules": {"age_min": 60, "income_bracket_max": "BPL"},
    },
]

# ─── Demo Departments & Wards ────────────────────────────────────────────────
DEMO_DEPARTMENTS = [
    {"id": uuid.UUID("55555555-5555-5555-5555-555555555501"), "name": "Road Infrastructure & Engineering", "code": "ROADS"},
    {"id": uuid.UUID("55555555-5555-5555-5555-555555555502"), "name": "Water Supply & Underground Drainage", "code": "WATER"},
    {"id": uuid.UUID("55555555-5555-5555-5555-555555555503"), "name": "Sanitation & Solid Waste Management", "code": "SANITATION"},
    {"id": uuid.UUID("55555555-5555-5555-5555-555555555504"), "name": "Public Health & Primary Care", "code": "HEALTH"},
    {"id": uuid.UUID("55555555-5555-5555-5555-555555555505"), "name": "Police & Public Safety", "code": "POLICE"},
    {"id": uuid.UUID("55555555-5555-5555-5555-555555555506"), "name": "Electricity & Street Lighting", "code": "ELECTRICITY"},
]

DEMO_WARDS = [
    {"id": uuid.UUID("66666666-6666-6666-6666-666666666601"), "name": "Ward 1 — Central Commercial Zone", "ward_number": 1},
    {"id": uuid.UUID("66666666-6666-6666-6666-666666666602"), "name": "Ward 2 — Gandhi Nagar North", "ward_number": 2},
    {"id": uuid.UUID("66666666-6666-6666-6666-666666666603"), "name": "Ward 3 — Kuvempu Nagar Residential", "ward_number": 3},
    {"id": uuid.UUID("66666666-6666-6666-6666-666666666604"), "name": "Ward 4 — Old Fort Canal Area", "ward_number": 4},
    {"id": uuid.UUID("66666666-6666-6666-6666-666666666605"), "name": "Ward 5 — Industrial Bypass West", "ward_number": 5},
]

def get_demo_departments() -> list[dict[str, Any]]:
    return list(DEMO_DEPARTMENTS)

def get_demo_wards() -> list[dict[str, Any]]:
    return list(DEMO_WARDS)

def get_demo_field_workers() -> list[dict[str, Any]]:
    return [
        {
            "id": _FIELD_ID,
            "full_name": "Ramesh Patel",
            "phone": "+919800000003",
            "email": "field@demo.janaseva.in",
        },
        {
            "id": uuid.UUID("11111111-1111-1111-1111-111111111113"),
            "full_name": "Suresh Gowda",
            "phone": "+919800000013",
            "email": "suresh.field@demo.janaseva.in",
        },
    ]


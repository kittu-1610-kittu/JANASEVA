"""
JANASEVA OS — Seed Data Script
Creates a complete synthetic demo district with all demo accounts,
departments, wards, categories, SLA policies, resources, and complaints.

Run: python -m data.seed.seed_all
Or via Docker: docker compose exec api python -m data.seed.seed_all
"""
from __future__ import annotations

import asyncio
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "apps" / "api"))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.core.security import hash_password
from app.models.complaint import (
    Complaint,
    ComplaintAssignment,
    ComplaintCategory,
    ComplaintPriority,
    ComplaintStatus,
    ComplaintStatusHistory,
)
from app.models.geography import Department, District, RoutingRule, Ward
from app.models.operational import (
    AIPrediction,
    EscalationRule,
    FoodListing,
    FoodStatus,
    Resource,
    ResourceStatus,
    ResourceType,
    Scheme,
    SLAPolicy,
)
from app.models.user import RefreshToken, User, UserRole, UserRoleAssignment, UserStatus

settings = get_settings()

# ─── Demo Accounts ────────────────────────────────────────────────────────────
DEMO_ACCOUNTS = [
    {
        "email": "citizen@demo.janaseva.in",
        "password": "Demo@1234",
        "full_name": "Priya Sharma",
        "role": UserRole.CITIZEN,
        "phone": "+919800000001",
    },
    {
        "email": "officer@demo.janaseva.in",
        "password": "Demo@1234",
        "full_name": "Rajesh Kumar",
        "role": UserRole.DEPARTMENT_OFFICER,
        "phone": "+919800000002",
    },
    {
        "email": "field@demo.janaseva.in",
        "password": "Demo@1234",
        "full_name": "Suresh Naidu",
        "role": UserRole.FIELD_WORKER,
        "phone": "+919800000003",
    },
    {
        "email": "admin@demo.janaseva.in",
        "password": "Demo@1234",
        "full_name": "Kavitha Reddy",
        "role": UserRole.DISTRICT_ADMIN,
        "phone": "+919800000004",
    },
    {
        "email": "police@demo.janaseva.in",
        "password": "Demo@1234",
        "full_name": "Inspector Mohan Das",
        "role": UserRole.POLICE_OFFICER,
        "phone": "+919800000005",
    },
    {
        "email": "health@demo.janaseva.in",
        "password": "Demo@1234",
        "full_name": "Dr. Ananya Iyer",
        "role": UserRole.HEALTH_OFFICER,
        "phone": "+919800000006",
    },
    {
        "email": "ngo@demo.janaseva.in",
        "password": "Demo@1234",
        "full_name": "Helping Hands NGO",
        "role": UserRole.NGO,
        "phone": "+919800000007",
    },
    {
        "email": "super@demo.janaseva.in",
        "password": "Demo@1234",
        "full_name": "System Administrator",
        "role": UserRole.SUPER_ADMIN,
        "phone": "+919800000008",
    },
]

DEPARTMENTS = [
    {"name": "Roads & Infrastructure", "code": "ROADS", "description": "Road maintenance, potholes, bridges"},
    {"name": "Water Supply & Sanitation", "code": "WATER", "description": "Water supply, drainage, sewage"},
    {"name": "Solid Waste Management", "code": "WASTE", "description": "Garbage collection, waste disposal"},
    {"name": "Electricity", "code": "ELEC", "description": "Street lights, electrical faults"},
    {"name": "Health & Medical", "code": "HEALTH", "description": "Hospitals, health camps, epidemics"},
    {"name": "Police & Safety", "code": "POLICE", "description": "Law enforcement, safety"},
    {"name": "Revenue & Land", "code": "REVENUE", "description": "Land records, certificates"},
    {"name": "Education", "code": "EDUCATION", "description": "Schools, mid-day meals"},
    {"name": "Agriculture", "code": "AGRI", "description": "Farmer support, crop assistance"},
    {"name": "Animal Husbandry", "code": "ANIMAL", "description": "Stray animals, veterinary"},
    {"name": "Fire & Emergency", "code": "FIRE", "description": "Fire fighting, rescue operations"},
    {"name": "Town Planning", "code": "PLANNING", "description": "Building permits, encroachments"},
]

CATEGORIES = [
    {"name": "Pothole", "code": "POTHOLE", "dept": "ROADS", "sla_hours": 72, "icon": "🕳️"},
    {"name": "Road Damage", "code": "ROAD_DAMAGE", "dept": "ROADS", "sla_hours": 72, "icon": "🚧"},
    {"name": "Water Leakage", "code": "WATER_LEAK", "dept": "WATER", "sla_hours": 24, "icon": "💧"},
    {"name": "Water Supply Failure", "code": "WATER_SUPPLY", "dept": "WATER", "sla_hours": 12, "icon": "🚰"},
    {"name": "Drainage Blockage", "code": "DRAINAGE", "dept": "WATER", "sla_hours": 24, "icon": "🔽"},
    {"name": "Garbage Not Collected", "code": "GARBAGE", "dept": "WASTE", "sla_hours": 24, "icon": "🗑️"},
    {"name": "Illegal Dumping", "code": "ILLEGAL_DUMP", "dept": "WASTE", "sla_hours": 48, "icon": "⚠️"},
    {"name": "Street Light Out", "code": "STREETLIGHT", "dept": "ELEC", "sla_hours": 48, "icon": "💡"},
    {"name": "Transformer Fault", "code": "TRANSFORMER", "dept": "ELEC", "sla_hours": 8, "icon": "⚡"},
    {"name": "Medical Emergency", "code": "MEDICAL", "dept": "HEALTH", "sla_hours": 1, "is_emergency": True, "icon": "🏥"},
    {"name": "Epidemic Concern", "code": "EPIDEMIC", "dept": "HEALTH", "sla_hours": 4, "icon": "🦠"},
    {"name": "Safety Threat", "code": "SAFETY", "dept": "POLICE", "sla_hours": 1, "is_emergency": True, "icon": "🚨"},
    {"name": "Stray Animal Menace", "code": "STRAY_ANIMAL", "dept": "ANIMAL", "sla_hours": 48, "icon": "🐕"},
    {"name": "Fire Hazard", "code": "FIRE", "dept": "FIRE", "sla_hours": 1, "is_emergency": True, "icon": "🔥"},
    {"name": "Flood", "code": "FLOOD", "dept": "FIRE", "sla_hours": 1, "is_emergency": True, "icon": "🌊"},
    {"name": "Illegal Construction", "code": "ILLEGAL_CONST", "dept": "PLANNING", "sla_hours": 72, "icon": "🏗️"},
    {"name": "Tree Fall", "code": "TREE_FALL", "dept": "ROADS", "sla_hours": 12, "icon": "🌳"},
    {"name": "Manhole Open", "code": "MANHOLE", "dept": "WATER", "sla_hours": 6, "icon": "🔵"},
]

SCHEMES = [
    {
        "name": "PM Awas Yojana (Urban)",
        "code": "PMAY_U",
        "category": "Housing",
        "description": "Housing assistance for economically weaker sections and low-income groups.",
        "eligibility_rules": {
            "income_bracket_max": "LIG",
            "age_min": 18,
            "owns_pucca_house": False,
            "categories": ["EWS", "LIG", "MIG-I", "MIG-II"],
        },
        "benefits": "Subsidy on home loan interest up to ₹2.67 lakh. Construction assistance.",
        "required_documents": [
            "Aadhar Card", "Income Certificate", "Bank Statement (6 months)",
            "Land/Property Documents", "BPL Certificate (if applicable)"
        ],
        "application_url": "https://pmaymis.gov.in/",
    },
    {
        "name": "Ayushman Bharat PM-JAY",
        "code": "PMJAY",
        "category": "Health",
        "description": "Health coverage up to ₹5 lakh per family per year for secondary and tertiary hospitalization.",
        "eligibility_rules": {
            "secc_database": True,
            "income_bracket_max": "MIDDLE",
            "family_categories": ["D1", "D2", "D3", "D4", "D5"],
        },
        "benefits": "Up to ₹5 lakh health cover per family per year. Cashless treatment at empanelled hospitals.",
        "required_documents": ["Aadhar Card", "Ration Card", "SECC Data Verification"],
        "application_url": "https://pmjay.gov.in/",
    },
    {
        "name": "National Scholarship Portal",
        "code": "NSP",
        "category": "Education",
        "description": "Scholarships for students from minority, OBC, SC, ST communities.",
        "eligibility_rules": {
            "age_max": 25,
            "education_level": ["CLASS_1_TO_12", "UNDERGRADUATE", "POSTGRADUATE"],
            "income_max_annual": 250000,
            "categories": ["SC", "ST", "OBC", "MINORITY"],
        },
        "benefits": "Annual scholarship ranging from ₹10,000 to ₹20,000 depending on level.",
        "required_documents": ["Aadhar Card", "Income Certificate", "Caste Certificate", "Mark Sheets", "Bank Account"],
        "application_url": "https://scholarships.gov.in/",
    },
    {
        "name": "Kisan Credit Card",
        "code": "KCC",
        "category": "Agriculture",
        "description": "Credit facility for farmers to meet agricultural and allied activities needs.",
        "eligibility_rules": {
            "occupation": "FARMER",
            "age_min": 18,
            "age_max": 75,
            "land_ownership": True,
        },
        "benefits": "Credit limit up to ₹3 lakh at 4% interest. Accident insurance cover.",
        "required_documents": ["Aadhar Card", "Land Records (7/12)", "Bank Account", "Passport Photo"],
        "application_url": "https://pmkisan.gov.in/",
    },
    {
        "name": "PM Kisan Samman Nidhi",
        "code": "PMKISAN",
        "category": "Agriculture",
        "description": "₹6,000 per year direct income support to small and marginal farmers.",
        "eligibility_rules": {
            "occupation": "FARMER",
            "land_holding_max_hectare": 2,
            "age_min": 18,
        },
        "benefits": "₹6,000 per year in 3 equal instalments directly to bank account.",
        "required_documents": ["Aadhar Card", "Land Records", "Bank Account"],
        "application_url": "https://pmkisan.gov.in/",
    },
]


async def clear_demo_data(db: AsyncSession) -> None:
    """Remove existing demo data (safe to re-run)."""
    print("Clearing existing demo data...")
    # Order matters due to foreign keys
    for table in [
        "food_listings", "schemes", "audit_logs", "notifications",
        "ai_predictions", "knowledge_chunks", "knowledge_documents",
        "complaint_evidence", "complaint_assignments",
        "complaint_status_history", "complaints",
        "task_status_history", "tasks",
        "resources", "escalation_rules", "sla_policies",
        "routing_rules", "complaint_categories",
        "refresh_tokens", "user_roles", "users",
        "wards", "departments", "districts",
    ]:
        try:
            await db.execute(text(f"DELETE FROM {table} WHERE is_demo = TRUE"))
        except Exception:
            # Table might not have is_demo or doesn't exist yet
            pass
    await db.commit()


async def seed_district(db: AsyncSession) -> District:
    district = District(
        name=settings.demo_district_name,
        code="KRP",
        state=settings.demo_state_name,
        country="India",
        population=1_250_000,
        area_sq_km=4850.0,
        headquarters="Krishnapur City",
        is_demo=True,
    )
    db.add(district)
    await db.flush()
    print(f"  ✓ District: {district.name}")
    return district


async def seed_wards(db: AsyncSession, district: District) -> list[Ward]:
    ward_names = [
        "Shivaji Nagar", "Gandhi Pura", "Nehru Colony", "Ambedkar Ward",
        "Rajiv Nagar", "Indira Colony", "Patel Ward", "Bhagat Singh Nagar",
        "Subhash Chandra Ward", "Lal Bahadur Colony",
        "New Town", "Old Town", "Bazaar Ward", "Market Area",
        "Industrial Zone", "University Area", "Hospital District",
        "Railway Colony", "Bus Stand Area", "Forest Nagar",
        "River Side", "Lake View", "Hill Top", "Valley View",
        "Central Ward", "East Ward", "West Ward", "North Ward",
        "South Ward", "Heritage Zone",
        "Tech Park Area", "Green Belt", "Sports Complex Ward",
        "Cultural Hub", "Commercial Strip", "Fishing Village",
        "Farming Colony", "Cattle Market Ward", "Tribal Area", "Mining Zone",
        "Border Ward", "Special Economic Zone",
    ]
    wards = []
    # Krishnapur approx center: 12.97°N, 77.59°E
    base_lat, base_lon = 12.97, 77.59
    for i, name in enumerate(ward_names, start=1):
        ward = Ward(
            district_id=district.id,
            name=name,
            ward_number=i,
            population=25000 + (i * 1000),
            area_sq_km=round(2.5 + (i * 0.15), 2),
            is_demo=True,
        )
        db.add(ward)
        wards.append(ward)
    await db.flush()
    print(f"  ✓ Wards: {len(wards)}")
    return wards


async def seed_departments(db: AsyncSession, district: District) -> dict[str, Department]:
    dept_map = {}
    for dept_data in DEPARTMENTS:
        dept = Department(
            district_id=district.id,
            name=dept_data["name"],
            code=dept_data["code"],
            description=dept_data["description"],
            is_active=True,
            is_demo=True,
        )
        db.add(dept)
        dept_map[dept_data["code"]] = dept
    await db.flush()
    print(f"  ✓ Departments: {len(dept_map)}")
    return dept_map


async def seed_categories(
    db: AsyncSession, dept_map: dict[str, Department]
) -> dict[str, ComplaintCategory]:
    cat_map = {}
    for cat_data in CATEGORIES:
        dept = dept_map.get(cat_data["dept"])
        cat = ComplaintCategory(
            name=cat_data["name"],
            code=cat_data["code"],
            default_sla_hours=cat_data.get("sla_hours", 48),
            is_emergency_eligible=cat_data.get("is_emergency", False),
            icon=cat_data.get("icon"),
            is_active=True,
        )
        db.add(cat)
        cat_map[cat_data["code"]] = cat
    await db.flush()
    print(f"  ✓ Complaint Categories: {len(cat_map)}")
    return cat_map


async def seed_routing_rules(
    db: AsyncSession, dept_map: dict[str, Department], cat_map: dict[str, ComplaintCategory]
) -> None:
    for cat_data in CATEGORIES:
        dept = dept_map.get(cat_data["dept"])
        if not dept:
            continue
        rule = RoutingRule(
            department_id=dept.id,
            category_code=cat_data["code"],
            priority=100,
            is_active=True,
        )
        db.add(rule)
    await db.flush()
    print(f"  ✓ Routing Rules: {len(CATEGORIES)}")


async def seed_sla_policies(db: AsyncSession, dept_map: dict[str, Department]) -> None:
    policies = [
        {
            "name": "Emergency SLA",
            "category_code": None,
            "priority": "CRITICAL",
            "response_hours": 0,
            "resolution_hours": 1,
            "l1": 1, "l2": 2,
        },
        {
            "name": "Water Issues SLA",
            "category_code": "WATER_LEAK",
            "priority": None,
            "response_hours": 2,
            "resolution_hours": 24,
            "l1": 12, "l2": 20,
        },
        {
            "name": "Garbage Collection SLA",
            "category_code": "GARBAGE",
            "priority": None,
            "response_hours": 4,
            "resolution_hours": 24,
            "l1": 18, "l2": 22,
        },
        {
            "name": "Street Light SLA",
            "category_code": "STREETLIGHT",
            "priority": None,
            "response_hours": 4,
            "resolution_hours": 48,
            "l1": 36, "l2": 44,
        },
        {
            "name": "Road Damage SLA",
            "category_code": "ROAD_DAMAGE",
            "priority": None,
            "response_hours": 8,
            "resolution_hours": 72,
            "l1": 48, "l2": 68,
        },
        {
            "name": "Default SLA",
            "category_code": None,
            "priority": None,
            "response_hours": 4,
            "resolution_hours": 48,
            "l1": 24, "l2": 42,
        },
    ]
    for p in policies:
        policy = SLAPolicy(
            name=p["name"],
            category_code=p.get("category_code"),
            priority=p.get("priority"),
            response_hours=p["response_hours"],
            resolution_hours=p["resolution_hours"],
            escalation_level1_hours=p["l1"],
            escalation_level2_hours=p["l2"],
            is_active=True,
        )
        db.add(policy)
    await db.flush()
    print(f"  ✓ SLA Policies: {len(policies)}")


async def seed_users(db: AsyncSession, district: District, dept_map: dict[str, Department]) -> dict[str, User]:
    user_map = {}
    for acc in DEMO_ACCOUNTS:
        user = User(
            email=acc["email"],
            phone=acc.get("phone"),
            hashed_password=hash_password(acc["password"]),
            full_name=acc["full_name"],
            primary_role=acc["role"],
            status=UserStatus.ACTIVE,
            email_verified=True,
            district_id=district.id,
            is_demo=True,
        )
        if acc["role"] == UserRole.DEPARTMENT_OFFICER:
            user.department_id = dept_map.get("ROADS", {}).id if dept_map.get("ROADS") else None
        db.add(user)
        user_map[acc["email"]] = user

    await db.flush()

    # Assign role records
    for acc in DEMO_ACCOUNTS:
        user = user_map[acc["email"]]
        role_rec = UserRoleAssignment(user_id=user.id, role=acc["role"])
        db.add(role_rec)

    await db.flush()
    print(f"  ✓ Demo Users: {len(user_map)}")
    return user_map


async def seed_resources(db: AsyncSession, district: District) -> None:
    resources = [
        # Hospitals
        *[
            Resource(
                name=f"District Hospital {i}",
                type=ResourceType.HOSPITAL,
                status=ResourceStatus.AVAILABLE,
                address=f"Hospital Road, Ward {i}, {settings.demo_district_name}",
                latitude=12.97 + (i * 0.05),
                longitude=77.59 + (i * 0.04),
                capacity=200 + (i * 50),
                current_occupancy=100 + (i * 20),
                is_demo=True,
            )
            for i in range(1, 8)
        ],
        # Ambulances
        *[
            Resource(
                name=f"Ambulance KRP-{i:02d}",
                type=ResourceType.AMBULANCE,
                status=ResourceStatus.AVAILABLE if i % 3 != 0 else ResourceStatus.ASSIGNED,
                address=f"Medical Center, {settings.demo_district_name}",
                latitude=12.97 + (i * 0.03),
                longitude=77.59 + (i * 0.025),
                capacity=2,
                current_occupancy=0,
                is_demo=True,
            )
            for i in range(1, 13)
        ],
        # Shelters
        *[
            Resource(
                name=f"Emergency Shelter {i}",
                type=ResourceType.SHELTER,
                status=ResourceStatus.AVAILABLE,
                address=f"Community Hall, Ward {i*2}, {settings.demo_district_name}",
                latitude=12.97 + (i * 0.06),
                longitude=77.59 + (i * 0.05),
                capacity=300 + (i * 50),
                current_occupancy=0,
                is_demo=True,
            )
            for i in range(1, 11)
        ],
        # Food Centers
        *[
            Resource(
                name=f"Community Kitchen {i}",
                type=ResourceType.FOOD_CENTER,
                status=ResourceStatus.AVAILABLE,
                address=f"Central Kitchen, Sector {i}, {settings.demo_district_name}",
                latitude=12.97 + (i * 0.04),
                longitude=77.59 + (i * 0.035),
                capacity=500,
                current_occupancy=0,
                is_demo=True,
            )
            for i in range(1, 8)
        ],
    ]
    for r in resources:
        db.add(r)
    await db.flush()
    print(f"  ✓ Resources: {len(resources)}")


async def seed_complaints(
    db: AsyncSession,
    users: dict[str, User],
    dept_map: dict[str, Department],
    wards: list[Ward],
) -> None:
    citizen = users.get("citizen@demo.janaseva.in")
    if not citizen:
        return

    demo_complaints = [
        {
            "complaint_id": "JS-2026-000001",
            "title": "Large pothole on MG Road near Bus Stop",
            "description": "There is a large pothole approximately 2 feet wide on MG Road near the central bus stop. Multiple vehicles have been damaged. Urgent repair needed.",
            "category_code": "POTHOLE",
            "status": ComplaintStatus.ASSIGNED,
            "priority": ComplaintPriority.MEDIUM,
            "priority_score": 50,
            "lat": 12.972, "lon": 77.594,
            "dept": "ROADS",
        },
        {
            "complaint_id": "JS-2026-000002",
            "title": "Water pipeline burst near Gandhi Street",
            "description": "A water pipeline has burst on Gandhi Street. Water is flooding the road and residents have no water supply. This has been going on for 6 hours.",
            "category_code": "WATER_LEAK",
            "status": ComplaintStatus.IN_PROGRESS,
            "priority": ComplaintPriority.HIGH,
            "priority_score": 70,
            "lat": 12.975, "lon": 77.591,
            "dept": "WATER",
        },
        {
            "complaint_id": "JS-2026-000003",
            "title": "Garbage not collected for 5 days in Ambedkar Ward",
            "description": "Garbage has not been collected for the past 5 days in Ambedkar Ward. Foul smell and health hazard. Residents are very upset.",
            "category_code": "GARBAGE",
            "status": ComplaintStatus.VERIFIED,
            "priority": ComplaintPriority.HIGH,
            "priority_score": 68,
            "lat": 12.969, "lon": 77.598,
            "dept": "WASTE",
            "sla_breached": True,
        },
        {
            "complaint_id": "JS-2026-000004",
            "title": "Street light not working on Hospital Road",
            "description": "The street light on Hospital Road near the government hospital has been non-functional for 3 days. This is a safety concern for night-time pedestrians and patients.",
            "category_code": "STREETLIGHT",
            "status": ComplaintStatus.REPORTED,
            "priority": ComplaintPriority.LOW,
            "priority_score": 30,
            "lat": 12.978, "lon": 77.588,
            "dept": "ELEC",
        },
        {
            "complaint_id": "JS-2026-000005",
            "title": "Open manhole on Railway Colony Road",
            "description": "There is an open manhole on Railway Colony Road. Very dangerous for pedestrians and vehicles. A child nearly fell in yesterday evening.",
            "category_code": "MANHOLE",
            "status": ComplaintStatus.ESCALATED,
            "priority": ComplaintPriority.CRITICAL,
            "priority_score": 90,
            "lat": 12.965, "lon": 77.602,
            "dept": "WATER",
            "sla_breached": True,
        },
    ]

    roads_dept = dept_map.get("ROADS")
    water_dept = dept_map.get("WATER")
    waste_dept = dept_map.get("WASTE")
    elec_dept = dept_map.get("ELEC")

    dept_code_map = {
        "ROADS": roads_dept,
        "WATER": water_dept,
        "WASTE": waste_dept,
        "ELEC": elec_dept,
    }

    for i, cd in enumerate(demo_complaints):
        ward = wards[i % len(wards)]
        dept = dept_code_map.get(cd.get("dept", "ROADS"))
        now = datetime.now(tz=timezone.utc)
        complaint = Complaint(
            complaint_id=cd["complaint_id"],
            citizen_id=citizen.id,
            title=cd["title"],
            description=cd["description"],
            category_code=cd["category_code"],
            status=cd["status"],
            priority=cd["priority"],
            priority_score=cd["priority_score"],
            ward_id=ward.id,
            department_id=dept.id if dept else None,
            latitude=cd["lat"],
            longitude=cd["lon"],
            address=f"Demo Address, Ward {ward.ward_number}, {settings.demo_district_name}",
            is_demo=True,
            sla_breached=cd.get("sla_breached", False),
            sla_deadline=(now + timedelta(hours=-2 if cd.get("sla_breached") else 24)).isoformat(),
            escalation_level=1 if cd["status"] == ComplaintStatus.ESCALATED else 0,
        )
        db.add(complaint)
        await db.flush()

        # Status history
        history = ComplaintStatusHistory(
            complaint_id=complaint.id,
            from_status=None,
            to_status=ComplaintStatus.REPORTED,
            changed_by=citizen.id,
            notes="Demo complaint created by seed.",
        )
        db.add(history)

    await db.flush()
    print(f"  ✓ Demo Complaints: {len(demo_complaints)}")


async def seed_schemes(db: AsyncSession) -> None:
    for s in SCHEMES:
        scheme = Scheme(
            name=s["name"],
            code=s["code"],
            category=s["category"],
            description=s["description"],
            eligibility_rules=s["eligibility_rules"],
            benefits=s["benefits"],
            required_documents=s["required_documents"],
            application_url=s.get("application_url"),
            is_active=True,
            is_demo=True,
        )
        db.add(scheme)
    await db.flush()
    print(f"  ✓ Welfare Schemes: {len(SCHEMES)}")


async def seed_food_listings(db: AsyncSession, users: dict[str, User]) -> None:
    ngo_user = users.get("ngo@demo.janaseva.in")
    if not ngo_user:
        return
    now = datetime.now(tz=timezone.utc)
    listings = [
        FoodListing(
            provider_id=ngo_user.id,
            provider_name="Helping Hands NGO",
            meal_type="Cooked Lunch",
            quantity=50,
            serves=50,
            available_from=now.isoformat(),
            available_until=(now + timedelta(hours=3)).isoformat(),
            status=FoodStatus.AVAILABLE,
            latitude=12.971,
            longitude=77.593,
            address="Helping Hands Center, Gandhi Pura",
            notes="Veg only. Please bring containers.",
            is_demo=True,
        ),
        FoodListing(
            provider_id=ngo_user.id,
            provider_name="Hotel Kaveri",
            meal_type="Dinner Surplus",
            quantity=30,
            serves=30,
            available_from=(now + timedelta(hours=5)).isoformat(),
            available_until=(now + timedelta(hours=7)).isoformat(),
            status=FoodStatus.AVAILABLE,
            latitude=12.968,
            longitude=77.596,
            address="Hotel Kaveri, MG Road",
            is_demo=True,
        ),
    ]
    for fl in listings:
        db.add(fl)
    await db.flush()
    print(f"  ✓ Food Listings: {len(listings)}")


async def main() -> None:
    print("\n" + "="*60)
    print("  JANASEVA OS — SEED DATA SCRIPT")
    print(f"  District: {settings.demo_district_name}")
    print(f"  DB: {settings.database_url[:40]}...")
    print("="*60 + "\n")

    engine = create_async_engine(settings.database_url, echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    async with async_session() as db:
        await clear_demo_data(db)

        print("Seeding...")
        district = await seed_district(db)
        wards = await seed_wards(db, district)
        dept_map = await seed_departments(db, district)
        await seed_categories(db, dept_map)
        await seed_routing_rules(db, dept_map, {})
        await seed_sla_policies(db, dept_map)
        users = await seed_users(db, district, dept_map)
        await seed_resources(db, district)
        await seed_complaints(db, users, dept_map, wards)
        await seed_schemes(db)
        await seed_food_listings(db, users)

        await db.commit()

    await engine.dispose()

    print("\n" + "="*60)
    print("  ✅ SEED COMPLETE")
    print("\n  Demo Accounts:")
    for acc in DEMO_ACCOUNTS:
        print(f"  [{acc['role'].value:25}] {acc['email']}  /  {acc['password']}")
    print("\n  ⚠️  DEMO DATA ONLY — Not real government data.")
    print("="*60 + "\n")


if __name__ == "__main__":
    asyncio.run(main())

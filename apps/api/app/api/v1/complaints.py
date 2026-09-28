"""
JANASEVA OS — Complaints Router  /api/v1/complaints
"""
from __future__ import annotations

import math
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, RequireAdmin, RequireFieldWorker, RequireOfficer, get_current_user
from app.core.database import get_db
from app.models.complaint import ComplaintStatus
from app.models.geography import Department, Ward
from app.models.user import User, UserRole
from app.schemas.complaint import (
    ComplaintAssignRequest,
    ComplaintCreateRequest,
    ComplaintDetailResponse,
    ComplaintFeedbackRequest,
    ComplaintListItem,
    ComplaintResolveRequest,
    ComplaintStatusUpdateRequest,
    EvidenceResponse,
    EvidenceUploadRequest,
    PaginatedComplaints,
)
from app.services.complaint_service import ComplaintService

router = APIRouter(prefix="/complaints", tags=["Complaints"])


@router.post("", response_model=ComplaintDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_complaint(
    data: ComplaintCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Citizen submits a new complaint."""
    service = ComplaintService(db)
    complaint = await service.create_complaint(data, current_user)
    return ComplaintDetailResponse.model_validate(complaint)


@router.get("", response_model=PaginatedComplaints)
async def list_complaints(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    status_filter: str | None = Query(None, alias="status"),
    priority: str | None = None,
    department_id: uuid.UUID | None = None,
    ward_id: uuid.UUID | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """List complaints with role-based scoping and filters."""
    service = ComplaintService(db)
    items, total = await service.list_complaints(
        current_user,
        status=status_filter,
        priority=priority,
        department_id=department_id,
        ward_id=ward_id,
        page=page,
        page_size=page_size,
    )
    return PaginatedComplaints(
        items=[ComplaintListItem.model_validate(c) for c in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total else 0,
    )


class DepartmentMetaItem(BaseModel):
    id: uuid.UUID
    name: str
    code: str

    model_config = {"from_attributes": True}


class WardMetaItem(BaseModel):
    id: uuid.UUID
    name: str
    ward_number: int

    model_config = {"from_attributes": True}


class FieldWorkerMetaItem(BaseModel):
    id: uuid.UUID
    full_name: str
    phone: str | None
    email: str

    model_config = {"from_attributes": True}


@router.get("/meta/departments", response_model=list[DepartmentMetaItem])
async def list_departments_meta(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get active departments list for routing and forms."""
    try:
        stmt = select(Department).where(Department.deleted_at.is_(None)).order_by(Department.name)
        result = await db.execute(stmt)
        items = list(result.scalars().all())
        if items:
            return [DepartmentMetaItem.model_validate(d) for d in items]
    except Exception:
        pass
    from app.services.demo_store import get_demo_departments
    return [DepartmentMetaItem.model_validate(d) for d in get_demo_departments()]


@router.get("/meta/wards", response_model=list[WardMetaItem])
async def list_wards_meta(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get active wards list for location mapping."""
    try:
        stmt = select(Ward).where(Ward.deleted_at.is_(None)).order_by(Ward.ward_number)
        result = await db.execute(stmt)
        items = list(result.scalars().all())
        if items:
            return [WardMetaItem.model_validate(w) for w in items]
    except Exception:
        pass
    from app.services.demo_store import get_demo_wards
    return [WardMetaItem.model_validate(w) for w in get_demo_wards()]


@router.get("/meta/field-workers", response_model=list[FieldWorkerMetaItem])
async def list_field_workers(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get field workers for task assignment."""
    try:
        stmt = select(User).where(
            User.deleted_at.is_(None),
            User.roles.any(role=UserRole.FIELD_WORKER),
        )
        if current_user.primary_role == UserRole.DEPARTMENT_OFFICER and current_user.department_id:
            stmt = stmt.where(User.department_id == current_user.department_id)
        result = await db.execute(stmt)
        items = list(result.scalars().all())
        if items:
            return [FieldWorkerMetaItem.model_validate(u) for u in items]
    except Exception:
        pass
    from app.services.demo_store import get_demo_field_workers
    return [FieldWorkerMetaItem.model_validate(u) for u in get_demo_field_workers()]


@router.get("/{complaint_id}", response_model=ComplaintDetailResponse)
async def get_complaint(
    complaint_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = ComplaintService(db)
    complaint = await service.get_complaint(complaint_id, current_user)
    return ComplaintDetailResponse.model_validate(complaint)


@router.post("/{complaint_id}/assign", response_model=ComplaintDetailResponse)
async def assign_complaint(
    complaint_id: uuid.UUID,
    data: ComplaintAssignRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, RequireOfficer],
):
    """Officer assigns a complaint to a field worker."""
    service = ComplaintService(db)
    complaint = await service.assign_complaint(complaint_id, data, current_user)
    return ComplaintDetailResponse.model_validate(complaint)


@router.post("/{complaint_id}/resolve", response_model=ComplaintDetailResponse)
async def resolve_complaint(
    complaint_id: uuid.UUID,
    data: ComplaintResolveRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, RequireOfficer],
):
    """Officer marks complaint as resolved."""
    service = ComplaintService(db)
    complaint = await service.resolve_complaint(complaint_id, data, current_user)
    return ComplaintDetailResponse.model_validate(complaint)


@router.post("/{complaint_id}/feedback", response_model=ComplaintDetailResponse)
async def submit_feedback(
    complaint_id: uuid.UUID,
    data: ComplaintFeedbackRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Citizen submits feedback after resolution."""
    service = ComplaintService(db)
    complaint = await service.submit_feedback(complaint_id, data, current_user)
    return ComplaintDetailResponse.model_validate(complaint)


@router.post("/{complaint_id}/status", response_model=ComplaintDetailResponse)
async def update_complaint_status(
    complaint_id: uuid.UUID,
    data: ComplaintStatusUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Officer or Field Worker updates the complaint status."""
    service = ComplaintService(db)
    try:
        new_status = ComplaintStatus(data.status.upper())
    except ValueError as e:
        from app.core.exceptions import ValidationException
        raise ValidationException(f"Invalid status: {data.status}")
    complaint = await service.transition_status(
        complaint_id, new_status, current_user, notes=data.notes
    )
    return ComplaintDetailResponse.model_validate(complaint)


@router.post("/{complaint_id}/evidence", response_model=EvidenceResponse)
async def add_complaint_evidence(
    complaint_id: uuid.UUID,
    data: EvidenceUploadRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Upload or record evidence against a complaint."""
    service = ComplaintService(db)
    storage_key = data.file_url or f"evidence/{complaint_id}/{uuid.uuid4()}_{data.file_name}"
    storage_bucket = "janaseva-evidence"
    evidence = await service.add_evidence(
        complaint_id=complaint_id,
        file_name=data.file_name,
        mime_type=data.mime_type,
        evidence_type=data.evidence_type,
        caption=data.caption,
        file_size_bytes=1024,
        storage_key=storage_key,
        storage_bucket=storage_bucket,
        current_user=current_user,
    )
    return EvidenceResponse.model_validate(evidence)


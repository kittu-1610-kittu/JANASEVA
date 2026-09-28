"""
JANASEVA OS — Complaint Schemas
"""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class LocationInput(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    address: str | None = None
    location_text: str | None = None


class ComplaintCreateRequest(BaseModel):
    title: str = Field(min_length=5, max_length=300)
    description: str = Field(min_length=10, max_length=5000)
    category_code: str | None = None
    subcategory_code: str | None = None
    location: LocationInput | None = None
    is_emergency: bool = False
    is_anonymous: bool = False
    # If citizen accepts AI suggestion
    accepted_ai_category: str | None = None


class ComplaintUpdateRequest(BaseModel):
    description: str | None = Field(None, min_length=10, max_length=5000)
    category_code: str | None = None


class ComplaintStatusUpdateRequest(BaseModel):
    status: str
    notes: str | None = None


class EvidenceUploadRequest(BaseModel):
    file_name: str
    mime_type: str = "image/jpeg"
    caption: str | None = None
    evidence_type: str = "COMPLETION"
    file_url: str | None = None


class ComplaintAssignRequest(BaseModel):
    user_id: uuid.UUID
    notes: str | None = None


class ComplaintResolveRequest(BaseModel):
    resolution_notes: str = Field(min_length=5, max_length=2000)


class ComplaintFeedbackRequest(BaseModel):
    rating: int = Field(ge=1, le=5)
    feedback: str | None = Field(None, max_length=1000)


class EvidenceResponse(BaseModel):
    id: uuid.UUID
    evidence_type: str
    file_name: str
    mime_type: str
    caption: str | None
    is_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ComplaintStatusHistoryResponse(BaseModel):
    id: uuid.UUID
    from_status: str | None
    to_status: str
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ComplaintListItem(BaseModel):
    id: uuid.UUID
    complaint_id: str
    title: str
    status: str
    priority: str
    category_code: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    is_emergency: bool = False
    sla_breached: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class ComplaintDetailResponse(BaseModel):
    id: uuid.UUID
    complaint_id: str
    title: str
    description: str
    status: str
    priority: str
    priority_score: int = 50
    category_code: str | None = None
    subcategory_code: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    address: str | None = None
    location_text: str | None = None
    is_emergency: bool = False
    is_anonymous: bool = False
    sla_breached: bool = False
    sla_deadline: str | None = None
    escalation_level: int = 0
    ai_category_suggestion: str | None = None
    ai_confidence: float | None = None
    resolution_notes: str | None = None
    citizen_rating: int | None = None
    citizen_feedback: str | None = None
    created_at: datetime
    updated_at: datetime
    status_history: list[ComplaintStatusHistoryResponse] = []
    evidence: list[EvidenceResponse] = []

    model_config = {"from_attributes": True}



class PaginatedComplaints(BaseModel):
    items: list[ComplaintListItem]
    total: int
    page: int
    page_size: int
    pages: int

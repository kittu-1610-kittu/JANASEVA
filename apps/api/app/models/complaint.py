"""
JANASEVA OS — Complaint Models
Full complaint lifecycle with status history, evidence, assignments.
"""
from __future__ import annotations

import enum
import uuid

from geoalchemy2 import Geography
from sqlalchemy import (
    Boolean,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class ComplaintStatus(str, enum.Enum):
    REPORTED = "REPORTED"
    AI_CLASSIFIED = "AI_CLASSIFIED"
    VERIFIED = "VERIFIED"
    ASSIGNED = "ASSIGNED"
    FIELD_VISIT = "FIELD_VISIT"
    IN_PROGRESS = "IN_PROGRESS"
    EVIDENCE_SUBMITTED = "EVIDENCE_SUBMITTED"
    OFFICER_VERIFIED = "OFFICER_VERIFIED"
    RESOLVED = "RESOLVED"
    CITIZEN_FEEDBACK = "CITIZEN_FEEDBACK"
    REJECTED = "REJECTED"
    DUPLICATE = "DUPLICATE"
    ESCALATED = "ESCALATED"
    CANNOT_RESOLVE = "CANNOT_RESOLVE"
    REOPENED = "REOPENED"


class ComplaintPriority(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class EvidenceType(str, enum.Enum):
    BEFORE = "BEFORE"
    AFTER = "AFTER"
    SUPPORTING = "SUPPORTING"


class ComplaintCategory(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "complaint_categories"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("complaint_categories.id", ondelete="SET NULL"),
        nullable=True,
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon: Mapped[str | None] = mapped_column(String(100), nullable=True)
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    default_sla_hours: Mapped[int] = mapped_column(Integer, default=48, nullable=False)
    is_emergency_eligible: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    children: Mapped[list[ComplaintCategory]] = relationship(
        "ComplaintCategory", back_populates="parent"
    )
    parent: Mapped[ComplaintCategory | None] = relationship(
        "ComplaintCategory", back_populates="children", remote_side="ComplaintCategory.id"
    )


class Complaint(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "complaints"

    # Human-readable ID e.g. JS-2026-000284
    complaint_id: Mapped[str] = mapped_column(
        String(30), unique=True, nullable=False, index=True
    )

    # Citizen
    citizen_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    # Classification
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("complaint_categories.id", ondelete="SET NULL"),
        nullable=True,
    )
    category_code: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    subcategory_code: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Content
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # Location
    location_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    ward_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wards.id", ondelete="SET NULL"),
        nullable=True,
    )
    # PostGIS point
    location: Mapped[bytes | None] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=True
    )
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Routing
    department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Status / Priority
    status: Mapped[ComplaintStatus] = mapped_column(
        Enum(ComplaintStatus, name="complaint_status_enum"),
        nullable=False,
        default=ComplaintStatus.REPORTED,
        index=True,
    )
    priority: Mapped[ComplaintPriority] = mapped_column(
        Enum(ComplaintPriority, name="complaint_priority_enum"),
        nullable=False,
        default=ComplaintPriority.MEDIUM,
        index=True,
    )
    priority_score: Mapped[int] = mapped_column(Integer, default=50, nullable=False)

    # SLA
    sla_policy_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sla_policies.id", ondelete="SET NULL"),
        nullable=True,
    )
    sla_deadline: Mapped[str | None] = mapped_column(String(50), nullable=True)  # ISO datetime
    sla_breached: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # AI
    ai_category_suggestion: Mapped[str | None] = mapped_column(String(50), nullable=True)
    ai_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    ai_prediction_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ai_predictions.id", ondelete="SET NULL"),
        nullable=True,
    )
    human_corrected_category: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Duplicate detection
    duplicate_of_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("complaints.id", ondelete="SET NULL"),
        nullable=True,
    )
    duplicate_similarity_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Flags
    is_emergency: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    escalation_level: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Resolution
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[str | None] = mapped_column(String(50), nullable=True)
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Citizen feedback
    citizen_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    citizen_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Extra metadata
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)

    # Relationships
    status_history: Mapped[list[ComplaintStatusHistory]] = relationship(
        "ComplaintStatusHistory",
        back_populates="complaint",
        cascade="all, delete-orphan",
        order_by="ComplaintStatusHistory.created_at",
    )
    evidence: Mapped[list[ComplaintEvidence]] = relationship(
        "ComplaintEvidence", back_populates="complaint", cascade="all, delete-orphan"
    )
    assignments: Mapped[list[ComplaintAssignment]] = relationship(
        "ComplaintAssignment", back_populates="complaint", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_complaints_citizen_id", "citizen_id"),
        Index("ix_complaints_status_priority", "status", "priority"),
        Index("ix_complaints_department_status", "department_id", "status"),
        Index("ix_complaints_ward_id", "ward_id"),
        Index("ix_complaints_sla_breached", "sla_breached"),
        Index("ix_complaints_is_emergency", "is_emergency"),
    )

    def __repr__(self) -> str:
        return f"<Complaint {self.complaint_id} [{self.status}]>"


class ComplaintStatusHistory(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Immutable audit trail of every status transition."""
    __tablename__ = "complaint_status_history"

    complaint_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("complaints.id", ondelete="CASCADE"),
        nullable=False,
    )
    from_status: Mapped[ComplaintStatus | None] = mapped_column(
        Enum(ComplaintStatus, name="complaint_status_enum"), nullable=True
    )
    to_status: Mapped[ComplaintStatus] = mapped_column(
        Enum(ComplaintStatus, name="complaint_status_enum"), nullable=False
    )
    changed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    complaint: Mapped[Complaint] = relationship("Complaint", back_populates="status_history")

    __table_args__ = (
        Index("ix_complaint_status_history_complaint_id", "complaint_id"),
    )


class ComplaintEvidence(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "complaint_evidence"

    complaint_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("complaints.id", ondelete="CASCADE"),
        nullable=False,
    )
    uploaded_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    evidence_type: Mapped[EvidenceType] = mapped_column(
        Enum(EvidenceType, name="evidence_type_enum"), nullable=False
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    storage_key: Mapped[str] = mapped_column(Text, nullable=False)
    storage_bucket: Mapped[str] = mapped_column(String(100), nullable=False)
    caption: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verified_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    complaint: Mapped[Complaint] = relationship("Complaint", back_populates="evidence")

    __table_args__ = (
        Index("ix_evidence_complaint_id", "complaint_id"),
    )


class ComplaintAssignment(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "complaint_assignments"

    complaint_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("complaints.id", ondelete="CASCADE"),
        nullable=False,
    )
    assigned_to: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    assigned_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    complaint: Mapped[Complaint] = relationship("Complaint", back_populates="assignments")

    __table_args__ = (
        Index("ix_assignment_complaint_id", "complaint_id"),
        Index("ix_assignment_assigned_to", "assigned_to"),
    )

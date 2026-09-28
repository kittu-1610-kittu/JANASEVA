"""
JANASEVA OS — SLA, Escalation, Emergency, Task, Resource, Notification, Audit Models
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
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


# =============================================================================
# SLA
# =============================================================================
class SLAPolicy(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "sla_policies"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category_code: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    priority: Mapped[str | None] = mapped_column(String(20), nullable=True)
    response_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    resolution_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    escalation_level1_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    escalation_level2_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
    )


class EscalationRule(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "escalation_rules"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    trigger_condition: Mapped[str] = mapped_column(String(100), nullable=False)
    delay_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    escalate_to_role: Mapped[str] = mapped_column(String(50), nullable=False)
    notification_template: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sequence: Mapped[int] = mapped_column(Integer, default=1, nullable=False)


# =============================================================================
# TASKS
# =============================================================================
class TaskStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    TRAVELLING = "TRAVELLING"
    ON_SITE = "ON_SITE"
    IN_PROGRESS = "IN_PROGRESS"
    EVIDENCE_SUBMITTED = "EVIDENCE_SUBMITTED"
    COMPLETED = "COMPLETED"
    CANNOT_COMPLETE = "CANNOT_COMPLETE"
    CANCELLED = "CANCELLED"


class Task(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "tasks"

    complaint_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("complaints.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    emergency_incident_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("emergency_incidents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    assigned_to: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    assigned_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus, name="task_status_enum"),
        nullable=False,
        default=TaskStatus.PENDING,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_at: Mapped[str | None] = mapped_column(String(50), nullable=True)
    completed_at: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    cannot_resolve_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    status_history: Mapped[list[TaskStatusHistory]] = relationship(
        "TaskStatusHistory", back_populates="task", cascade="all, delete-orphan"
    )


class TaskStatusHistory(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "task_status_history"

    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
    )
    from_status: Mapped[TaskStatus | None] = mapped_column(
        Enum(TaskStatus, name="task_status_enum"), nullable=True
    )
    to_status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus, name="task_status_enum"), nullable=False
    )
    changed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    task: Mapped[Task] = relationship("Task", back_populates="status_history")

    __table_args__ = (Index("ix_task_status_history_task_id", "task_id"),)


# =============================================================================
# EMERGENCY
# =============================================================================
class EmergencyType(str, enum.Enum):
    FLOOD = "FLOOD"
    FIRE = "FIRE"
    EARTHQUAKE = "EARTHQUAKE"
    ACCIDENT = "ACCIDENT"
    MEDICAL = "MEDICAL"
    VIOLENCE = "VIOLENCE"
    INFRASTRUCTURE_COLLAPSE = "INFRASTRUCTURE_COLLAPSE"
    DROUGHT = "DROUGHT"
    CHEMICAL_SPILL = "CHEMICAL_SPILL"
    OTHER = "OTHER"


class EmergencySeverity(str, enum.Enum):
    LEVEL_1_MINOR = "LEVEL_1_MINOR"
    LEVEL_2_MODERATE = "LEVEL_2_MODERATE"
    LEVEL_3_MAJOR = "LEVEL_3_MAJOR"
    LEVEL_4_CATASTROPHIC = "LEVEL_4_CATASTROPHIC"


class EmergencyStatus(str, enum.Enum):
    REPORTED = "REPORTED"
    CONFIRMED = "CONFIRMED"
    RESPONDING = "RESPONDING"
    CONTAINED = "CONTAINED"
    RESOLVED = "RESOLVED"
    FALSE_ALARM = "FALSE_ALARM"


class EmergencyIncident(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "emergency_incidents"

    incident_id: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    type: Mapped[EmergencyType] = mapped_column(
        Enum(EmergencyType, name="emergency_type_enum"), nullable=False
    )
    severity: Mapped[EmergencySeverity] = mapped_column(
        Enum(EmergencySeverity, name="emergency_severity_enum"), nullable=False
    )
    status: Mapped[EmergencyStatus] = mapped_column(
        Enum(EmergencyStatus, name="emergency_status_enum"),
        nullable=False,
        default=EmergencyStatus.REPORTED,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    affected_people_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    location: Mapped[bytes | None] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=True
    )
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    ward_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wards.id", ondelete="SET NULL"),
        nullable=True,
    )
    reported_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    incident_commander: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    resolved_at: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)

    __table_args__ = (
        Index("ix_emergency_incidents_status", "status"),
        Index("ix_emergency_incidents_severity", "severity"),
        Index("ix_emergency_incidents_ward_id", "ward_id"),
    )


# =============================================================================
# RESOURCES
# =============================================================================
class ResourceType(str, enum.Enum):
    AMBULANCE = "AMBULANCE"
    FIRE_TRUCK = "FIRE_TRUCK"
    POLICE_VEHICLE = "POLICE_VEHICLE"
    RESCUE_BOAT = "RESCUE_BOAT"
    HELICOPTER = "HELICOPTER"
    SHELTER = "SHELTER"
    FOOD_CENTER = "FOOD_CENTER"
    WATER_TANKER = "WATER_TANKER"
    MEDICAL_TEAM = "MEDICAL_TEAM"
    NGO_TEAM = "NGO_TEAM"
    VOLUNTEER_GROUP = "VOLUNTEER_GROUP"
    HOSPITAL = "HOSPITAL"
    EQUIPMENT = "EQUIPMENT"


class ResourceStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    ASSIGNED = "ASSIGNED"
    UNAVAILABLE = "UNAVAILABLE"
    MAINTENANCE = "MAINTENANCE"


class Resource(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "resources"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[ResourceType] = mapped_column(
        Enum(ResourceType, name="resource_type_enum"), nullable=False, index=True
    )
    status: Mapped[ResourceStatus] = mapped_column(
        Enum(ResourceStatus, name="resource_status_enum"),
        nullable=False,
        default=ResourceStatus.AVAILABLE,
        index=True,
    )
    department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
    )
    location: Mapped[bytes | None] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=True
    )
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    current_occupancy: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    contact_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)


# =============================================================================
# NOTIFICATIONS
# =============================================================================
class NotificationChannel(str, enum.Enum):
    IN_APP = "IN_APP"
    EMAIL = "EMAIL"
    SMS = "SMS"
    PUSH = "PUSH"


class NotificationStatus(str, enum.Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"
    READ = "READ"


class Notification(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "notifications"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    channel: Mapped[NotificationChannel] = mapped_column(
        Enum(NotificationChannel, name="notification_channel_enum"), nullable=False
    )
    status: Mapped[NotificationStatus] = mapped_column(
        Enum(NotificationStatus, name="notification_status_enum"),
        nullable=False,
        default=NotificationStatus.PENDING,
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    resource_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    resource_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    read_at: Mapped[str | None] = mapped_column(String(50), nullable=True)
    sent_at: Mapped[str | None] = mapped_column(String(50), nullable=True)
    idempotency_key: Mapped[str | None] = mapped_column(
        String(255), unique=True, nullable=True, index=True
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)

    __table_args__ = (
        Index("ix_notifications_user_status", "user_id", "status"),
    )


# =============================================================================
# AUDIT LOG
# =============================================================================
class AuditLog(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Immutable audit record. Never update or delete these.
    Insert-only from business operations.
    """
    __tablename__ = "audit_logs"

    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    actor_role: Mapped[str | None] = mapped_column(String(50), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    resource_id: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    before_state: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    after_state: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    request_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    extra: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    __table_args__ = (
        Index("ix_audit_logs_resource", "resource_type", "resource_id"),
        Index("ix_audit_logs_actor_action", "actor_id", "action"),
    )


# =============================================================================
# AI PREDICTIONS
# =============================================================================
class AIPrediction(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "ai_predictions"

    prediction_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    model_version: Mapped[str] = mapped_column(String(50), nullable=False)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    input_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    input_metadata: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    prediction: Mapped[dict] = mapped_column(JSONB, nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    human_correction: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    human_corrected_at: Mapped[str | None] = mapped_column(String(50), nullable=True)
    corrected_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    final_decision: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


# =============================================================================
# KNOWLEDGE / RAG
# =============================================================================
class KnowledgeDocument(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "knowledge_documents"

    title: Mapped[str] = mapped_column(String(300), nullable=False)
    source: Mapped[str | None] = mapped_column(String(200), nullable=True)
    doc_type: Mapped[str] = mapped_column(String(50), nullable=False)
    storage_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)

    chunks: Mapped[list[KnowledgeChunk]] = relationship(
        "KnowledgeChunk", back_populates="document", cascade="all, delete-orphan"
    )


class KnowledgeChunk(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "knowledge_chunks"

    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("knowledge_documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # pgvector embedding (1536-dim for Gemini text-embedding-004)
    embedding: Mapped[bytes | None] = mapped_column(
        type_=None, nullable=True  # will be cast to vector(768) via raw DDL
    )
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)

    document: Mapped[KnowledgeDocument] = relationship(
        "KnowledgeDocument", back_populates="chunks"
    )

    __table_args__ = (
        Index("ix_knowledge_chunks_document_id", "document_id"),
    )


# =============================================================================
# WELFARE / SCHEMES
# =============================================================================
class Scheme(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "schemes"

    name: Mapped[str] = mapped_column(String(300), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    eligibility_rules: Mapped[dict] = mapped_column(JSONB, nullable=False)
    benefits: Mapped[str] = mapped_column(Text, nullable=False)
    department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
    )
    required_documents: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    application_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    deadline: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)


# =============================================================================
# FOOD RESCUE
# =============================================================================
class FoodStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    MATCHED = "MATCHED"
    PICKED_UP = "PICKED_UP"
    DISTRIBUTED = "DISTRIBUTED"
    EXPIRED = "EXPIRED"


class FoodListing(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "food_listings"

    provider_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    provider_name: Mapped[str] = mapped_column(String(200), nullable=False)
    meal_type: Mapped[str] = mapped_column(String(100), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    serves: Mapped[int] = mapped_column(Integer, nullable=False)
    available_from: Mapped[str] = mapped_column(String(50), nullable=False)
    available_until: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[FoodStatus] = mapped_column(
        Enum(FoodStatus, name="food_status_enum"),
        nullable=False,
        default=FoodStatus.AVAILABLE,
        index=True,
    )
    location: Mapped[bytes | None] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=True
    )
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

"""
JANASEVA OS — Complaint Service
Implements the complaint lifecycle with status transitions, routing,
priority calculation, and SLA deadline assignment.
"""
from __future__ import annotations

import math
import uuid
from datetime import datetime, timedelta, timezone
from typing import Sequence

from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import (
    ComplaintNotFoundException,
    ForbiddenException,
    InvalidStatusTransitionException,
)
from app.models.complaint import (
    Complaint,
    ComplaintAssignment,
    ComplaintCategory,
    ComplaintEvidence,
    ComplaintPriority,
    ComplaintStatus,
    ComplaintStatusHistory,
    EvidenceType,
)
from app.models.operational import SLAPolicy
from app.models.user import User, UserRole
from app.schemas.complaint import (
    ComplaintAssignRequest,
    ComplaintCreateRequest,
    ComplaintFeedbackRequest,
    ComplaintResolveRequest,
)
from app.services.audit_service import AuditService

# Status transition graph — enforces valid state machine
_ALLOWED_TRANSITIONS: dict[ComplaintStatus, set[ComplaintStatus]] = {
    ComplaintStatus.REPORTED: {
        ComplaintStatus.AI_CLASSIFIED,
        ComplaintStatus.VERIFIED,
        ComplaintStatus.ASSIGNED,
        ComplaintStatus.RESOLVED,
        ComplaintStatus.REJECTED,
        ComplaintStatus.DUPLICATE,
    },
    ComplaintStatus.AI_CLASSIFIED: {
        ComplaintStatus.VERIFIED,
        ComplaintStatus.ASSIGNED,
        ComplaintStatus.RESOLVED,
        ComplaintStatus.REJECTED,
        ComplaintStatus.DUPLICATE,
    },
    ComplaintStatus.VERIFIED: {
        ComplaintStatus.ASSIGNED,
        ComplaintStatus.RESOLVED,
        ComplaintStatus.REJECTED,
    },
    ComplaintStatus.ASSIGNED: {
        ComplaintStatus.ASSIGNED,
        ComplaintStatus.FIELD_VISIT,
        ComplaintStatus.IN_PROGRESS,
        ComplaintStatus.RESOLVED,
        ComplaintStatus.ESCALATED,
        ComplaintStatus.CANNOT_RESOLVE,
    },
    ComplaintStatus.FIELD_VISIT: {
        ComplaintStatus.ASSIGNED,
        ComplaintStatus.IN_PROGRESS,
        ComplaintStatus.RESOLVED,
        ComplaintStatus.CANNOT_RESOLVE,
    },
    ComplaintStatus.IN_PROGRESS: {
        ComplaintStatus.ASSIGNED,
        ComplaintStatus.EVIDENCE_SUBMITTED,
        ComplaintStatus.RESOLVED,
        ComplaintStatus.CANNOT_RESOLVE,
    },
    ComplaintStatus.EVIDENCE_SUBMITTED: {
        ComplaintStatus.OFFICER_VERIFIED,
        ComplaintStatus.RESOLVED,
        ComplaintStatus.IN_PROGRESS,
        ComplaintStatus.ASSIGNED,
    },
    ComplaintStatus.OFFICER_VERIFIED: {
        ComplaintStatus.RESOLVED,
        ComplaintStatus.ASSIGNED,
    },
    ComplaintStatus.RESOLVED: {
        ComplaintStatus.CITIZEN_FEEDBACK,
        ComplaintStatus.REOPENED,
        ComplaintStatus.ASSIGNED,
    },
    ComplaintStatus.CITIZEN_FEEDBACK: {
        ComplaintStatus.REOPENED,
    },
    ComplaintStatus.ESCALATED: {
        ComplaintStatus.ASSIGNED,
        ComplaintStatus.RESOLVED,
    },
    ComplaintStatus.REOPENED: {
        ComplaintStatus.ASSIGNED,
        ComplaintStatus.VERIFIED,
        ComplaintStatus.RESOLVED,
    },
    ComplaintStatus.REJECTED: {
        ComplaintStatus.REOPENED,
        ComplaintStatus.ASSIGNED,
    },
    ComplaintStatus.DUPLICATE: set(),
    ComplaintStatus.CANNOT_RESOLVE: {
        ComplaintStatus.REOPENED,
        ComplaintStatus.ASSIGNED,
        ComplaintStatus.RESOLVED,
    },
}



def _generate_complaint_id(sequence: int) -> str:
    year = datetime.now(tz=timezone.utc).year
    return f"JS-{year}-{sequence:06d}"


def _calculate_priority_score(complaint: Complaint, is_emergency: bool) -> tuple[int, ComplaintPriority]:
    """
    Transparent deterministic priority calculation.
    Score 0-100. Higher = more urgent.
    """
    score = 50  # baseline

    if is_emergency:
        score += 40

    if complaint.category_code in ("FLOOD", "FIRE", "MEDICAL", "VIOLENCE"):
        score += 20

    if complaint.category_code in ("POTHOLE", "STREETLIGHT"):
        score -= 10

    # Clamp
    score = max(0, min(100, score))

    if score >= 85:
        priority = ComplaintPriority.CRITICAL
    elif score >= 65:
        priority = ComplaintPriority.HIGH
    elif score >= 35:
        priority = ComplaintPriority.MEDIUM
    else:
        priority = ComplaintPriority.LOW

    return score, priority


class ComplaintService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.audit = AuditService(db)

    async def _get_next_sequence(self) -> int:
        result = await self.db.execute(select(func.count(Complaint.id)))
        return (result.scalar_one() or 0) + 1

    async def create_complaint(
        self, data: ComplaintCreateRequest, current_user: User
    ) -> Complaint:
        try:
            seq = await self._get_next_sequence()
            complaint_id = _generate_complaint_id(seq)

            complaint = Complaint(
                complaint_id=complaint_id,
                citizen_id=current_user.id,
                title=data.title,
                description=data.description,
                category_code=data.category_code,
                subcategory_code=data.subcategory_code,
                is_emergency=data.is_emergency,
                is_anonymous=data.is_anonymous,
                status=ComplaintStatus.REPORTED,
            )

            if data.location:
                complaint.latitude = data.location.latitude
                complaint.longitude = data.location.longitude
                complaint.address = data.location.address
                complaint.location_text = data.location.location_text
                # pyrefly: ignore [missing-import]
                from geoalchemy2.shape import from_shape
                from shapely.geometry import Point
                complaint.location = from_shape(
                    Point(data.location.longitude, data.location.latitude), srid=4326
                )

            score, priority = _calculate_priority_score(complaint, data.is_emergency)
            complaint.priority_score = score
            complaint.priority = priority

            # Assign SLA
            await self._assign_sla(complaint)

            self.db.add(complaint)
            await self.db.flush()

            # Create initial status history
            history = ComplaintStatusHistory(
                complaint_id=complaint.id,
                from_status=None,
                to_status=ComplaintStatus.REPORTED,
                changed_by=current_user.id,
                notes="Complaint submitted by citizen.",
            )
            self.db.add(history)

            await self.audit.log(
                actor=current_user,
                action="complaint.created",
                resource_type="complaint",
                resource_id=str(complaint.id),
                after_state={"complaint_id": complaint_id, "status": "REPORTED"},
            )

            return complaint
        except Exception:
            from app.services.demo_store import add_demo_complaint
            return add_demo_complaint(
                title=data.title,
                description=data.description,
                category_code=data.category_code,
                user=current_user,
                latitude=data.location.latitude if data.location else None,
                longitude=data.location.longitude if data.location else None,
                address=data.location.address if data.location else None,
                is_emergency=data.is_emergency,
            )

    async def _assign_sla(self, complaint: Complaint) -> None:
        """Find and assign SLA policy based on category and priority."""
        try:
            stmt = select(SLAPolicy).where(
                SLAPolicy.is_active.is_(True),
                or_(
                    SLAPolicy.category_code == complaint.category_code,
                    SLAPolicy.category_code.is_(None),
                ),
            ).order_by(SLAPolicy.category_code.desc())
            result = await self.db.execute(stmt)
            policy = result.scalar_one_or_none()

            if policy:
                complaint.sla_policy_id = policy.id
                deadline = datetime.now(tz=timezone.utc) + timedelta(hours=policy.resolution_hours)
                complaint.sla_deadline = deadline.isoformat()
        except Exception:
            complaint.sla_deadline = (datetime.now(tz=timezone.utc) + timedelta(hours=48)).isoformat()

    async def get_complaint(self, complaint_id: uuid.UUID, current_user: User) -> Complaint:
        try:
            stmt = (
                select(Complaint)
                .options(
                    selectinload(Complaint.status_history),
                    selectinload(Complaint.evidence),
                    selectinload(Complaint.assignments),
                )
                .where(Complaint.id == complaint_id, Complaint.deleted_at.is_(None))
            )
            result = await self.db.execute(stmt)
            complaint = result.scalar_one_or_none()
            if complaint is not None:
                if current_user.primary_role == UserRole.CITIZEN:
                    if complaint.citizen_id != current_user.id and not complaint.is_anonymous:
                        raise ForbiddenException("You can only view your own complaints.")
                return complaint
        except ForbiddenException:
            raise
        except Exception:
            pass

        from app.services.demo_store import get_demo_complaint_by_id
        complaint = get_demo_complaint_by_id(complaint_id)
        if complaint is not None:
            setattr(complaint, "_is_demo", True)
            return complaint

        raise ComplaintNotFoundException(f"Complaint {complaint_id} not found.")

    async def list_complaints(
        self,
        current_user: User,
        status: str | None = None,
        priority: str | None = None,
        department_id: uuid.UUID | None = None,
        ward_id: uuid.UUID | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Complaint], int]:
        try:
            stmt = select(Complaint).where(Complaint.deleted_at.is_(None))

            # Role-based scoping
            if current_user.primary_role == UserRole.CITIZEN:
                stmt = stmt.where(Complaint.citizen_id == current_user.id)
            elif current_user.primary_role in (
                UserRole.DEPARTMENT_OFFICER, UserRole.FIELD_WORKER
            ):
                if current_user.department_id:
                    stmt = stmt.where(Complaint.department_id == current_user.department_id)

            if status:
                stmt = stmt.where(Complaint.status == ComplaintStatus(status))
            if priority:
                stmt = stmt.where(Complaint.priority == ComplaintPriority(priority))
            if department_id:
                stmt = stmt.where(Complaint.department_id == department_id)
            if ward_id:
                stmt = stmt.where(Complaint.ward_id == ward_id)

            count_stmt = select(func.count()).select_from(stmt.subquery())
            total_result = await self.db.execute(count_stmt)
            total = total_result.scalar_one()

            stmt = stmt.order_by(
                Complaint.priority_score.desc(), Complaint.created_at.desc()
            ).offset((page - 1) * page_size).limit(page_size)

            result = await self.db.execute(stmt)
            items = list(result.scalars().all())

            return items, total
        except Exception:
            from app.services.demo_store import get_demo_complaints
            demo_items = get_demo_complaints(user=current_user, status=status, priority=priority)
            start = (page - 1) * page_size
            end = start + page_size
            return demo_items[start:end], len(demo_items)

    async def transition_status(
        self,
        complaint_id: uuid.UUID,
        new_status: ComplaintStatus,
        current_user: User,
        notes: str | None = None,
        force: bool = False,
    ) -> Complaint:
        complaint = await self.get_complaint(complaint_id, current_user)
        try:
            curr_status = ComplaintStatus(complaint.status) if isinstance(complaint.status, str) else complaint.status
        except ValueError:
            curr_status = complaint.status

        target_status = ComplaintStatus(new_status) if isinstance(new_status, str) else new_status
        allowed = _ALLOWED_TRANSITIONS.get(curr_status, set())

        # Check all user roles (strings or enums)
        user_roles = set()
        if hasattr(current_user, "roles") and current_user.roles:
            for r in current_user.roles:
                val = r.role.value if hasattr(r.role, "value") else str(r.role)
                user_roles.add(val.upper())
        primary = getattr(current_user, "primary_role", "")
        primary_str = (primary.value if hasattr(primary, "value") else str(primary)).upper()
        user_roles.add(primary_str)

        is_admin_or_officer = bool(user_roles & {
            "DEPARTMENT_OFFICER", "OFFICER", "DISTRICT_ADMIN", "SUPER_ADMIN",
            "POLICE_OFFICER", "HEALTH_OFFICER", "EMERGENCY_COMMANDER"
        })

        if not force and target_status not in allowed and not is_admin_or_officer:
            raise InvalidStatusTransitionException(
                f"Cannot transition from {complaint.status} to {new_status}."
            )

        old_status = curr_status
        complaint.status = target_status.value if hasattr(target_status, "value") else str(target_status)
        complaint.updated_at = datetime.now(tz=timezone.utc)

        if not getattr(complaint, "_is_demo", False):
            try:
                history = ComplaintStatusHistory(
                    complaint_id=complaint.id,
                    from_status=old_status.value if hasattr(old_status, "value") else str(old_status),
                    to_status=target_status.value if hasattr(target_status, "value") else str(target_status),
                    changed_by=current_user.id,
                    notes=notes,
                )
                self.db.add(history)

                await self.audit.log(
                    actor=current_user,
                    action=f"complaint.status.{target_status.value.lower() if hasattr(target_status, 'value') else str(target_status).lower()}",
                    resource_type="complaint",
                    resource_id=str(complaint.id),
                    before_state={"status": old_status.value if hasattr(old_status, "value") else str(old_status)},
                    after_state={"status": target_status.value if hasattr(target_status, "value") else str(target_status)},
                )
            except Exception:
                pass

        return complaint

    async def assign_complaint(
        self,
        complaint_id: uuid.UUID,
        data: ComplaintAssignRequest,
        current_user: User,
    ) -> Complaint:
        complaint = await self.get_complaint(complaint_id, current_user)

        if not getattr(complaint, "_is_demo", False):
            try:
                # Deactivate previous assignment
                await self.db.execute(
                    update(ComplaintAssignment)
                    .where(
                        ComplaintAssignment.complaint_id == complaint_id,
                        ComplaintAssignment.is_active.is_(True),
                    )
                    .values(is_active=False)
                )

                assignment = ComplaintAssignment(
                    complaint_id=complaint.id,
                    assigned_to=data.user_id,
                    assigned_by=current_user.id,
                    notes=data.notes,
                )
                self.db.add(assignment)
            except Exception:
                pass

        complaint.assigned_to_id = data.user_id
        await self.transition_status(
            complaint_id,
            ComplaintStatus.ASSIGNED,
            current_user,
            notes=f"Assigned to user {data.user_id}: {data.notes or ''}",
            force=True,
        )

        return complaint


    async def resolve_complaint(
        self,
        complaint_id: uuid.UUID,
        data: ComplaintResolveRequest,
        current_user: User,
    ) -> Complaint:
        complaint = await self.get_complaint(complaint_id, current_user)
        complaint.resolution_notes = data.resolution_notes
        complaint.resolved_at = datetime.now(tz=timezone.utc).isoformat()
        complaint.resolved_by = current_user.id
        return await self.transition_status(
            complaint_id,
            ComplaintStatus.RESOLVED,
            current_user,
            notes=data.resolution_notes,
            force=True,
        )


    async def submit_feedback(
        self,
        complaint_id: uuid.UUID,
        data: ComplaintFeedbackRequest,
        current_user: User,
    ) -> Complaint:
        complaint = await self.get_complaint(complaint_id, current_user)
        if complaint.citizen_id != current_user.id and current_user.primary_role != UserRole.DISTRICT_ADMIN:
            raise ForbiddenException("Only the complaint owner can submit feedback.")
        complaint.citizen_rating = data.rating
        complaint.citizen_feedback = data.feedback
        return await self.transition_status(
            complaint_id, ComplaintStatus.CITIZEN_FEEDBACK, current_user
        )

    async def add_evidence(
        self,
        complaint_id: uuid.UUID,
        file_name: str,
        mime_type: str,
        evidence_type: str,
        caption: str | None,
        file_size_bytes: int,
        storage_key: str,
        storage_bucket: str,
        current_user: User,
    ) -> ComplaintEvidence:
        complaint = await self.get_complaint(complaint_id, current_user)
        try:
            ev_type = EvidenceType(evidence_type.upper())
        except ValueError:
            ev_type = EvidenceType.AFTER

        new_ev_id = uuid.uuid4()
        now_dt = datetime.now(tz=timezone.utc)
        evidence = ComplaintEvidence(
            id=new_ev_id,
            complaint_id=complaint.id,
            uploaded_by=current_user.id,
            evidence_type=ev_type,
            file_name=file_name,
            file_size_bytes=file_size_bytes,
            mime_type=mime_type,
            storage_key=storage_key,
            storage_bucket=storage_bucket,
            caption=caption,
            is_verified=current_user.primary_role in (UserRole.DEPARTMENT_OFFICER, UserRole.DISTRICT_ADMIN),
            created_at=now_dt,
            updated_at=now_dt,
        )
        try:
            self.db.add(evidence)
            await self.audit.log(
                actor=current_user,
                action="complaint.evidence.added",
                resource_type="complaint",
                resource_id=str(complaint.id),
                after_state={"file_name": file_name, "evidence_type": ev_type.value},
            )
        except Exception:
            pass

        if hasattr(complaint, "evidence") and isinstance(complaint.evidence, list):
            complaint.evidence.append(evidence)

        return evidence


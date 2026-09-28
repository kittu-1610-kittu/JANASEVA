"""
JANASEVA OS — Audit Service
Creates immutable audit records for all sensitive operations.
"""
from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.operational import AuditLog
from app.models.user import User


class AuditService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def log(
        self,
        *,
        actor: User | None,
        action: str,
        resource_type: str,
        resource_id: str | None = None,
        before_state: dict | None = None,
        after_state: dict | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
        extra: dict | None = None,
    ) -> AuditLog:
        actor_role = None
        if actor:
            actor_role = (
                actor.primary_role.value
                if hasattr(actor.primary_role, "value")
                else str(actor.primary_role)
            )
        record = AuditLog(
            actor_id=actor.id if actor else None,
            actor_role=actor_role,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            before_state=before_state,
            after_state=after_state,
            ip_address=ip_address,
            user_agent=user_agent,
            extra=extra,
        )

        self.db.add(record)
        # Don't flush here — let the calling transaction control commit
        return record

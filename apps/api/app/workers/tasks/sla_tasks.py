"""
JANASEVA OS — SLA Celery Tasks
Checks for SLA breaches and escalation conditions.
"""
from __future__ import annotations

from datetime import datetime, timezone

from app.workers.celery_app import celery_app
from app.core.logging import get_logger

logger = get_logger(__name__)


@celery_app.task(name="app.workers.tasks.sla_tasks.check_sla_breaches", queue="sla")
def check_sla_breaches() -> dict:
    """
    Scan all open complaints where sla_deadline has passed
    and sla_breached is still False. Mark as breached.
    """
    import asyncio
    from app.core.database import get_db_context
    from sqlalchemy import select, update
    from app.models.complaint import Complaint, ComplaintStatus

    TERMINAL_STATUSES = {
        ComplaintStatus.RESOLVED,
        ComplaintStatus.REJECTED,
        ComplaintStatus.DUPLICATE,
        ComplaintStatus.CANNOT_RESOLVE,
        ComplaintStatus.CITIZEN_FEEDBACK,
    }

    async def _run():
        now_iso = datetime.now(tz=timezone.utc).isoformat()
        breached_count = 0
        async with get_db_context() as db:
            stmt = (
                select(Complaint)
                .where(
                    Complaint.sla_breached.is_(False),
                    Complaint.sla_deadline.is_not(None),
                    Complaint.sla_deadline < now_iso,
                    Complaint.deleted_at.is_(None),
                )
            )
            result = await db.execute(stmt)
            complaints = result.scalars().all()

            for c in complaints:
                if c.status not in TERMINAL_STATUSES:
                    c.sla_breached = True
                    breached_count += 1
                    logger.info("sla.breached", complaint_id=c.complaint_id)

        return breached_count

    loop = asyncio.new_event_loop()
    try:
        count = loop.run_until_complete(_run())
        logger.info("sla.check_complete", newly_breached=count)
        return {"breached": count, "checked_at": datetime.now(tz=timezone.utc).isoformat()}
    finally:
        loop.close()


@celery_app.task(name="app.workers.tasks.sla_tasks.run_escalation_checks", queue="sla")
def run_escalation_checks() -> dict:
    """
    Evaluate escalation rules against open SLA-breached complaints.
    """
    logger.info("escalation.check_started")
    # Full escalation engine implementation in Step 6
    return {"status": "ok"}

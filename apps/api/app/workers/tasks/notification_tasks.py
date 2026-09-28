"""
JANASEVA OS — Notification Tasks (Celery)
Processes notification events asynchronously.
"""
from __future__ import annotations
from app.workers.celery_app import celery_app
from app.core.logging import get_logger

logger = get_logger(__name__)


@celery_app.task(name="app.workers.tasks.notification_tasks.send_notification", queue="notifications")
def send_notification(notification_id: str) -> dict:
    """Process a queued notification record."""
    import asyncio
    from app.core.database import get_db_context
    from sqlalchemy import select
    from app.models.operational import Notification, NotificationStatus, NotificationChannel
    from datetime import datetime, timezone

    async def _run():
        async with get_db_context() as db:
            from sqlalchemy.dialects.postgresql import UUID as PUUID
            import uuid
            stmt = select(Notification).where(Notification.id == uuid.UUID(notification_id))
            result = await db.execute(stmt)
            notif = result.scalar_one_or_none()
            if not notif or notif.status != NotificationStatus.PENDING:
                return {"skipped": True}

            # Route by channel
            if notif.channel == NotificationChannel.IN_APP:
                notif.status = NotificationStatus.SENT
                notif.sent_at = datetime.now(tz=timezone.utc).isoformat()
                logger.info("notification.in_app.sent", id=notification_id, user=str(notif.user_id))
            elif notif.channel == NotificationChannel.EMAIL:
                # Email stub — wire to SMTP in production
                logger.info("notification.email.stub", id=notification_id)
                notif.status = NotificationStatus.SENT
                notif.sent_at = datetime.now(tz=timezone.utc).isoformat()
            elif notif.channel == NotificationChannel.SMS:
                logger.info("notification.sms.stub", id=notification_id)
                notif.status = NotificationStatus.SENT
                notif.sent_at = datetime.now(tz=timezone.utc).isoformat()
            else:
                notif.status = NotificationStatus.FAILED
                notif.error_message = f"Unsupported channel: {notif.channel}"

        return {"notification_id": notification_id, "status": "sent"}

    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(_run())
    finally:
        loop.close()

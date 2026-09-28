"""
JANASEVA OS — AI Tasks (Celery)
Async AI classification and embedding jobs.
"""
from __future__ import annotations
from app.workers.celery_app import celery_app
from app.core.logging import get_logger

logger = get_logger(__name__)


@celery_app.task(name="app.workers.tasks.ai_tasks.classify_complaint_async", queue="ai")
def classify_complaint_async(complaint_id: str) -> dict:
    """
    Async AI classification for a submitted complaint.
    Calls Gemini, stores prediction, updates complaint category suggestion.
    """
    import asyncio
    from app.core.database import get_db_context
    from sqlalchemy import select
    from app.models.complaint import Complaint, ComplaintStatus

    async def _run():
        async with get_db_context() as db:
            import uuid
            stmt = select(Complaint).where(Complaint.id == uuid.UUID(complaint_id))
            result = await db.execute(stmt)
            complaint = result.scalar_one_or_none()
            if not complaint:
                return {"error": "Complaint not found"}

            # Import AI service (lazy to avoid loading on worker startup)
            from app.services.ai_service import AIClassificationService
            ai = AIClassificationService()
            prediction = await ai.classify(
                text=complaint.description,
                category_hint=complaint.category_code,
            )

            complaint.ai_category_suggestion = prediction.get("category")
            complaint.ai_confidence = prediction.get("confidence", 0.0)
            if complaint.status == ComplaintStatus.REPORTED:
                complaint.status = ComplaintStatus.AI_CLASSIFIED

            logger.info(
                "ai.classification.complete",
                complaint_id=complaint_id,
                category=prediction.get("category"),
                confidence=prediction.get("confidence"),
            )
            return prediction

    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(_run())
    finally:
        loop.close()

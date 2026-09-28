"""
JANASEVA OS — Celery Application
Workers: SLA monitoring, escalation, notifications, AI jobs.
"""
from __future__ import annotations

from celery import Celery
from celery.schedules import crontab

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "janaseva",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "app.workers.tasks.sla_tasks",
        "app.workers.tasks.notification_tasks",
        "app.workers.tasks.ai_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    # Queues
    task_default_queue="default",
    task_queues={
        "default": {"exchange": "default", "routing_key": "default"},
        "sla": {"exchange": "sla", "routing_key": "sla"},
        "notifications": {"exchange": "notifications", "routing_key": "notifications"},
        "ai": {"exchange": "ai", "routing_key": "ai"},
    },
    # Beat schedule (periodic tasks)
    beat_schedule={
        "check-sla-every-5-minutes": {
            "task": "app.workers.tasks.sla_tasks.check_sla_breaches",
            "schedule": crontab(minute="*/5"),
            "options": {"queue": "sla"},
        },
        "run-escalation-checks-every-15-minutes": {
            "task": "app.workers.tasks.sla_tasks.run_escalation_checks",
            "schedule": crontab(minute="*/15"),
            "options": {"queue": "sla"},
        },
    },
)

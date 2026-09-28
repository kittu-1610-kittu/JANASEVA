"""
JANASEVA OS — v1 API Router Registry
"""
from fastapi import APIRouter

from app.api.v1 import admin_ops, ai, auth, complaints, emergency, health, map, police, welfare

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(complaints.router)
api_router.include_router(emergency.router)
api_router.include_router(map.router)
api_router.include_router(ai.router)
api_router.include_router(welfare.router)
api_router.include_router(health.router)
api_router.include_router(police.router)
api_router.include_router(admin_ops.router)


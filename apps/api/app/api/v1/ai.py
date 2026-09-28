"""
JANASEVA OS — AI API Router  /api/v1/ai
Controlled AI endpoints — no unrestricted DB access.
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user
from app.core.database import get_db
from app.models.user import User
from app.services.ai_service import AIClassificationService

router = APIRouter(prefix="/ai", tags=["AI Services"])


class ClassifyRequest(BaseModel):
    text: str = Field(min_length=5, max_length=5000)
    category_hint: str | None = None
    image_url: str | None = None


class ClassifyResponse(BaseModel):
    category: str
    subcategory: str | None
    department: str
    summary: str
    urgency_suggestion: str
    confidence: float


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    context: str | None = None


class ChatResponse(BaseModel):
    response: str
    sources: list[str] = []
    tool_used: str | None = None


@router.post("/classify", response_model=ClassifyResponse)
async def classify_complaint(
    data: ClassifyRequest,
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    AI-assisted complaint classification.
    Returns a suggestion — citizen is not required to accept it.
    """
    service = AIClassificationService()
    result = await service.classify(
        text=data.text,
        category_hint=data.category_hint,
    )
    return ClassifyResponse(
        category=result["category"],
        subcategory=result.get("subcategory"),
        department=result["department"],
        summary=result["summary"],
        urgency_suggestion=result["urgency_suggestion"],
        confidence=result["confidence"],
    )


@router.post("/chat", response_model=ChatResponse)
async def ai_chat(
    data: ChatRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    AI Command Assistant with controlled analytics tools.
    Does NOT give the LLM unrestricted DB access.
    """
    from app.services.ai_chat_service import AIChatService
    service = AIChatService(db, current_user)
    result = await service.chat(data.message)
    return ChatResponse(**result)

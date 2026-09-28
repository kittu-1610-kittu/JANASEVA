"""
JANASEVA OS — Auth Router  /api/v1/auth
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user
from app.core.database import get_db
from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: RegisterRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Register a new citizen account."""
    service = AuthService(db)
    user = await service.register(data)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Authenticate and receive access + refresh tokens."""
    service = AuthService(db)
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    return await service.login(data, ip=ip, user_agent=ua)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    data: RefreshRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Rotate refresh token and receive a new access token."""
    service = AuthService(db)
    return await service.refresh(data.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    data: RefreshRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Revoke the provided refresh token."""
    service = AuthService(db)
    await service.logout(data.refresh_token)


@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT)
async def logout_all(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Revoke ALL refresh tokens for the authenticated user (logout all devices)."""
    service = AuthService(db)
    await service.logout_all(current_user.id)


@router.get("/me", response_model=UserResponse)
async def me(current_user: CurrentUser):
    """Get the currently authenticated user's profile."""
    return UserResponse.model_validate(current_user)

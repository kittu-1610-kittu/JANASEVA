"""
JANASEVA OS — FastAPI Auth Dependencies
Extracts and validates the current user from JWT bearer tokens.
All protected endpoints must use these dependencies.
"""
from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import decode_access_token
from app.models.user import User, UserRole
from app.repositories.user_repo import UserRepository

bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    if credentials is None:
        raise UnauthorizedException("Authentication credentials not provided.")
    payload = decode_access_token(credentials.credentials)
    user_id_str: str | None = payload.get("sub")
    if not user_id_str:
        raise UnauthorizedException("Token missing subject.")
    try:
        user_id = UUID(user_id_str)
    except ValueError:
        raise UnauthorizedException("Malformed token subject.")
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if user is None or user.is_deleted:
        raise UnauthorizedException("User not found.")
    status_str = user.status.value if hasattr(user.status, "value") else str(user.status)
    if status_str.upper() != "ACTIVE":
        raise ForbiddenException(f"Account is {status_str.lower()}.")
    return user


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    return current_user


def require_roles(*roles: UserRole):
    """Dependency factory: enforces that the current user has one of the required roles."""
    async def _check(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        user_roles = {
            (r.role.value if hasattr(r.role, "value") else str(r.role)).upper()
            for r in current_user.roles
        }
        primary = current_user.primary_role
        primary_str = (primary.value if hasattr(primary, "value") else str(primary)).upper()
        user_roles.add(primary_str)

        allowed_roles = {
            (r.value if hasattr(r, "value") else str(r)).upper()
            for r in roles
        }
        if not any(r in user_roles for r in allowed_roles):
            raise ForbiddenException(
                f"This action requires one of: {[r.value if hasattr(r, 'value') else str(r) for r in roles]}"
            )
        return current_user
    return _check


# Convenience role-checked dependencies
RequireCitizen = Depends(require_roles(
    UserRole.CITIZEN, UserRole.DISTRICT_ADMIN, UserRole.SUPER_ADMIN
))
RequireOfficer = Depends(require_roles(
    UserRole.DEPARTMENT_OFFICER, UserRole.POLICE_OFFICER, UserRole.HEALTH_OFFICER,
    UserRole.DISTRICT_ADMIN, UserRole.SUPER_ADMIN,
))
RequireFieldWorker = Depends(require_roles(
    UserRole.FIELD_WORKER, UserRole.DEPARTMENT_OFFICER, UserRole.DISTRICT_ADMIN, UserRole.SUPER_ADMIN
))
RequireAdmin = Depends(require_roles(UserRole.DISTRICT_ADMIN, UserRole.SUPER_ADMIN))
RequireSuperAdmin = Depends(require_roles(UserRole.SUPER_ADMIN))
CurrentUser = Annotated[User, Depends(get_current_user)]

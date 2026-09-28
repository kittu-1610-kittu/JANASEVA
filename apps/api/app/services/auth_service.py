"""
JANASEVA OS — Auth Service
Business logic for registration, login, token refresh, logout.
"""
from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import ConflictException, UnauthorizedException
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)
from app.models.user import RefreshToken, User, UserRole, UserRoleAssignment
from app.repositories.user_repo import UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse

settings = get_settings()


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = UserRepository(db)

    async def register(self, data: RegisterRequest) -> User:
        existing = await self.repo.get_by_email(data.email)
        if existing:
            raise ConflictException(
                "An account with this email already exists.",
                error_code="EMAIL_TAKEN",
            )
        if data.phone:
            existing_phone = await self.repo.get_by_phone(data.phone)
            if existing_phone:
                raise ConflictException(
                    "An account with this phone number already exists.",
                    error_code="PHONE_TAKEN",
                )
        now_dt = datetime.now(tz=timezone.utc)
        user = User(
            id=uuid.uuid4(),
            email=data.email,
            phone=data.phone,
            password_hash=hash_password(data.password),
            full_name=data.full_name,
            status="ACTIVE",
            created_at=now_dt,
            updated_at=now_dt,
        )
        user = await self.repo.create(user)
        # Assign default CITIZEN role
        role_assignment = UserRoleAssignment(
            user_id=user.id,
            role="CITIZEN",
            is_primary=True,
        )
        user.roles = [role_assignment]
        try:
            self.db.add(role_assignment)
            await self.db.flush()
            await self.db.refresh(user, ["roles"])
        except Exception:
            pass
        return user

    async def login(
        self, data: LoginRequest, ip: str | None = None, user_agent: str | None = None
    ) -> TokenResponse:
        user = await self.repo.get_by_email(data.email)
        if user is None or not verify_password(data.password, user.password_hash):
            raise UnauthorizedException("Incorrect email or password.")
        if user.deleted_at is not None:
            raise UnauthorizedException("Account does not exist.")
        if user.status != "ACTIVE":
            raise UnauthorizedException(f"Account is {user.status.lower()}.")

        roles = [r.role if isinstance(r.role, str) else r.role.value for r in user.roles]
        primary_role = user.primary_role if isinstance(user.primary_role, str) else getattr(user.primary_role, "value", str(user.primary_role))
        access_token = create_access_token(
            subject=str(user.id),
            extra_claims={"role": primary_role, "roles": roles},
        )
        raw_refresh = create_refresh_token(subject=str(user.id))

        payload = decode_refresh_token(raw_refresh)
        expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)

        refresh_token_record = RefreshToken(
            user_id=user.id,
            token_hash=_token_hash(raw_refresh),
            expires_at=expires_at,
            ip_address=ip,
            user_agent=user_agent,
            is_revoked=False,
        )
        await self.repo.save_refresh_token(refresh_token_record)

        return TokenResponse(
            access_token=access_token,
            refresh_token=raw_refresh,
            expires_in=settings.jwt_access_token_expire_minutes * 60,
        )

    async def refresh(self, raw_refresh_token: str) -> TokenResponse:
        payload = decode_refresh_token(raw_refresh_token)
        user_id_str = payload.get("sub")

        token_hash = _token_hash(raw_refresh_token)
        stored = await self.repo.get_refresh_token_by_hash(token_hash)
        if stored is None or stored.is_revoked:
            raise UnauthorizedException("Refresh token has been revoked or is invalid.")

        if stored.expires_at < datetime.now(tz=timezone.utc):
            raise UnauthorizedException("Refresh token has expired.")

        # Rotate: revoke old, issue new
        await self.repo.revoke_refresh_token(stored)

        user = await self.repo.get_by_id(uuid.UUID(user_id_str))
        if user is None:
            raise UnauthorizedException("User not found.")

        roles = [r.role if isinstance(r.role, str) else r.role.value for r in user.roles]
        primary_role = user.primary_role if isinstance(user.primary_role, str) else getattr(user.primary_role, "value", str(user.primary_role))
        new_access = create_access_token(
            subject=str(user.id),
            extra_claims={"role": primary_role, "roles": roles},
        )
        new_refresh_raw = create_refresh_token(subject=str(user.id))
        new_payload = decode_refresh_token(new_refresh_raw)
        new_expires = datetime.fromtimestamp(new_payload["exp"], tz=timezone.utc)

        new_record = RefreshToken(
            user_id=user.id,
            token_hash=_token_hash(new_refresh_raw),
            expires_at=new_expires,
            is_revoked=False,
        )
        await self.repo.save_refresh_token(new_record)

        return TokenResponse(
            access_token=new_access,
            refresh_token=new_refresh_raw,
            expires_in=settings.jwt_access_token_expire_minutes * 60,
        )

    async def logout(self, raw_refresh_token: str | None = None, user_id: uuid.UUID | None = None) -> None:
        if raw_refresh_token:
            token_hash = _token_hash(raw_refresh_token)
            stored = await self.repo.get_refresh_token_by_hash(token_hash)
            if stored:
                await self.repo.revoke_refresh_token(stored)
        elif user_id:
            await self.repo.revoke_all_user_tokens(user_id)

    async def logout_all(self, user_id: uuid.UUID) -> None:
        await self.repo.revoke_all_user_tokens(user_id)

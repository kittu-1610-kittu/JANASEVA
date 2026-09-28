"""
JANASEVA OS — User Repository
Data access layer for users.
"""
from __future__ import annotations

from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.user import RefreshToken, User


class UserRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, user_id: UUID) -> User | None:
        try:
            stmt = (
                select(User)
                .options(selectinload(User.roles))
                .where(User.id == user_id, User.deleted_at.is_(None))
            )
            result = await self.db.execute(stmt)
            user = result.scalar_one_or_none()
            if user:
                return user
        except Exception:
            try:
                await self.db.rollback()
            except Exception:
                pass
        from app.services.demo_store import get_demo_user_by_id
        return get_demo_user_by_id(user_id)

    async def get_by_email(self, email: str) -> User | None:
        try:
            stmt = (
                select(User)
                .options(selectinload(User.roles))
                .where(User.email == email.lower(), User.deleted_at.is_(None))
            )
            result = await self.db.execute(stmt)
            user = result.scalar_one_or_none()
            if user:
                return user
        except Exception:
            try:
                await self.db.rollback()
            except Exception:
                pass
        from app.services.demo_store import get_demo_user_by_email
        return get_demo_user_by_email(email)

    async def get_by_phone(self, phone: str) -> User | None:
        try:
            stmt = (
                select(User)
                .where(User.phone == phone, User.deleted_at.is_(None))
            )
            result = await self.db.execute(stmt)
            user = result.scalar_one_or_none()
            if user:
                return user
        except Exception:
            try:
                await self.db.rollback()
            except Exception:
                pass
        from app.services.demo_store import DEMO_USERS
        for u in DEMO_USERS.values():
            if u.phone == phone:
                return u
        return None

    async def create(self, user: User) -> User:
        try:
            self.db.add(user)
            await self.db.flush()
            await self.db.refresh(user, ["roles"])
            return user
        except Exception:
            try:
                await self.db.rollback()
            except Exception:
                pass
            from app.services.demo_store import add_demo_user
            return add_demo_user(user)

    async def save_refresh_token(self, token: RefreshToken) -> RefreshToken:
        try:
            self.db.add(token)
            await self.db.flush()
            return token
        except Exception:
            try:
                await self.db.rollback()
            except Exception:
                pass
            from app.services.demo_store import save_demo_refresh_token
            return save_demo_refresh_token(token)

    async def get_refresh_token_by_hash(self, token_hash: str) -> RefreshToken | None:
        try:
            stmt = select(RefreshToken).where(
                RefreshToken.token_hash == token_hash,
                RefreshToken.is_revoked.is_(False),
            )
            result = await self.db.execute(stmt)
            t = result.scalar_one_or_none()
            if t:
                return t
        except Exception:
            try:
                await self.db.rollback()
            except Exception:
                pass
        from app.services.demo_store import get_demo_refresh_token_by_hash
        return get_demo_refresh_token_by_hash(token_hash)

    async def revoke_refresh_token(self, token: RefreshToken) -> None:
        try:
            token.is_revoked = True
            await self.db.flush()
        except Exception:
            try:
                await self.db.rollback()
            except Exception:
                pass
            token.is_revoked = True

    async def revoke_all_user_tokens(self, user_id: UUID) -> None:
        try:
            await self.db.execute(
                update(RefreshToken)
                .where(RefreshToken.user_id == user_id, RefreshToken.is_revoked.is_(False))
                .values(is_revoked=True)
            )
        except Exception:
            try:
                await self.db.rollback()
            except Exception:
                pass

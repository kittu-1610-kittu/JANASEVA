"""
JANASEVA OS — Auth & User Models
Tables: users, user_role_assignments, refresh_tokens
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class UserRole(str, enum.Enum):
    CITIZEN = "CITIZEN"
    FIELD_WORKER = "FIELD_WORKER"
    DEPARTMENT_OFFICER = "DEPARTMENT_OFFICER"
    OFFICER = "OFFICER"
    POLICE_OFFICER = "POLICE_OFFICER"
    HEALTH_OFFICER = "HEALTH_OFFICER"
    NGO = "NGO"
    NGO_COORDINATOR = "NGO_COORDINATOR"
    VOLUNTEER = "VOLUNTEER"
    DISTRICT_ADMIN = "DISTRICT_ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"
    EMERGENCY_COMMANDER = "EMERGENCY_COMMANDER"


class UserStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    SUSPENDED = "SUSPENDED"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "users"

    # Identity
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    # Profile
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="ACTIVE")
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # District & Ward links
    district_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("districts.id", ondelete="SET NULL"),
        nullable=True,
    )
    ward_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wards.id", ondelete="SET NULL"),
        nullable=True,
    )
    department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
    )

    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    roles: Mapped[list[UserRoleAssignment]] = relationship(
        "UserRoleAssignment", back_populates="user", cascade="all, delete-orphan", lazy="selectin"
    )
    refresh_tokens: Mapped[list[RefreshToken]] = relationship(
        "RefreshToken", back_populates="user", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_users_district_id", "district_id"),
        Index("ix_users_department_id", "department_id"),
        Index("ix_users_deleted_at", "deleted_at"),
    )

    @property
    def hashed_password(self) -> str:
        return self.password_hash

    @hashed_password.setter
    def hashed_password(self, val: str) -> None:
        self.password_hash = val

    @property
    def display_name(self) -> str:
        return self.full_name

    @property
    def email_verified(self) -> bool:
        return True

    @property
    def preferred_language(self) -> str:
        return "en"

    @property
    def primary_role(self) -> str:
        if self.roles:
            for r in self.roles:
                if getattr(r, "is_primary", False):
                    return r.role if isinstance(r.role, str) else r.role.value
            first_role = self.roles[0].role
            return first_role if isinstance(first_role, str) else first_role.value
        return "CITIZEN"

    def __repr__(self) -> str:
        return f"<User {self.email} [{self.primary_role}]>"


class UserRoleAssignment(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "user_role_assignments"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped[User] = relationship("User", back_populates="roles")


class RefreshToken(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "refresh_tokens"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    replaced_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped[User] = relationship("User", back_populates="refresh_tokens")

    @property
    def revoked(self) -> bool:
        return self.is_revoked

    @revoked.setter
    def revoked(self, val: bool) -> None:
        self.is_revoked = val

    __table_args__ = (
        Index("ix_refresh_tokens_user_id", "user_id"),
    )

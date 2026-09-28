"""
JANASEVA OS — Geographic / Administrative Models
Tables: districts, wards, departments, offices
Uses PostGIS geometry/geography types.
"""
from __future__ import annotations

import uuid

from geoalchemy2 import Geography, Geometry
from sqlalchemy import (
    Boolean,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class District(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "districts"

    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    state: Mapped[str] = mapped_column(String(200), nullable=False)
    country: Mapped[str] = mapped_column(String(100), default="India", nullable=False)
    population: Mapped[int | None] = mapped_column(Integer, nullable=True)
    area_sq_km: Mapped[float | None] = mapped_column(nullable=True)
    headquarters: Mapped[str | None] = mapped_column(String(200), nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # PostGIS: geographic boundary
    boundary: Mapped[bytes | None] = mapped_column(
        Geometry(geometry_type="MULTIPOLYGON", srid=4326), nullable=True
    )
    centroid: Mapped[bytes | None] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=True
    )

    wards: Mapped[list[Ward]] = relationship("Ward", back_populates="district")
    departments: Mapped[list[Department]] = relationship(
        "Department", back_populates="district"
    )

    def __repr__(self) -> str:
        return f"<District {self.name}>"


class Ward(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "wards"

    district_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("districts.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    ward_number: Mapped[int] = mapped_column(Integer, nullable=False)
    population: Mapped[int | None] = mapped_column(Integer, nullable=True)
    area_sq_km: Mapped[float | None] = mapped_column(nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # PostGIS boundary
    boundary: Mapped[bytes | None] = mapped_column(
        Geometry(geometry_type="MULTIPOLYGON", srid=4326), nullable=True
    )
    centroid: Mapped[bytes | None] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=True
    )

    district: Mapped[District] = relationship("District", back_populates="wards")

    __table_args__ = (
        Index("ix_wards_district_id", "district_id"),
        Index("ix_wards_ward_number", "ward_number"),
    )


class Department(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "departments"

    district_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("districts.id", ondelete="SET NULL"),
        nullable=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    head_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    head_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    district: Mapped[District | None] = relationship("District", back_populates="departments")
    routing_rules: Mapped[list[RoutingRule]] = relationship(
        "RoutingRule", back_populates="department"
    )

    def __repr__(self) -> str:
        return f"<Department {self.code}: {self.name}>"


class RoutingRule(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Maps (category, subcategory) → Department.
    Configurable in the DB — not hard-coded in application logic.
    """
    __tablename__ = "routing_rules"

    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="CASCADE"),
        nullable=False,
    )
    category_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    subcategory_code: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    priority: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    department: Mapped[Department] = relationship("Department", back_populates="routing_rules")

    __table_args__ = (
        Index("ix_routing_category_dept", "category_code", "department_id"),
    )

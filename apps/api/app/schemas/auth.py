"""
JANASEVA OS — Auth Schemas (Pydantic)
Request/response models for authentication endpoints.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    phone: str | None = Field(None, pattern=r"^\+?[1-9]\d{7,14}$")
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=200)
    preferred_language: str = Field(default="en", max_length=10)

    @field_validator("email")
    @classmethod
    def lower_email(cls, v: str) -> str:
        return v.lower().strip()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    display_name: str | None
    primary_role: str
    status: str
    email_verified: bool
    avatar_url: str | None
    preferred_language: str
    district_id: uuid.UUID | None
    department_id: uuid.UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)

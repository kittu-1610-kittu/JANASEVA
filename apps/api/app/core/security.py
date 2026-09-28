"""
JANASEVA OS — Security Utilities
Password hashing, JWT creation/validation, token utilities.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings
from app.core.exceptions import UnauthorizedException

settings = get_settings()

# ---------------------------------------------------------------------------
# Password hashing (using bcrypt directly to avoid passlib-bcrypt 4+ bug)
# ---------------------------------------------------------------------------
import bcrypt


def hash_password(plain: str) -> str:
    pwd_bytes = plain.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        pwd_bytes = plain.encode("utf-8")[:72]
        return bcrypt.checkpw(pwd_bytes, hashed.encode("utf-8"))
    except Exception:
        return False


# ---------------------------------------------------------------------------
# JWT tokens
# ---------------------------------------------------------------------------

def _now_utc() -> datetime:
    return datetime.now(tz=timezone.utc)


def create_access_token(
    subject: str,
    extra_claims: dict[str, Any] | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    expire = _now_utc() + (
        expires_delta
        or timedelta(minutes=settings.jwt_access_token_expire_minutes)
    )
    payload = {
        "sub": subject,
        "exp": expire,
        "iat": _now_utc(),
        "jti": str(uuid4()),
        "type": "access",
        **(extra_claims or {}),
    }
    return jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def create_refresh_token(
    subject: str,
    expires_delta: timedelta | None = None,
) -> str:
    expire = _now_utc() + (
        expires_delta
        or timedelta(days=settings.jwt_refresh_token_expire_days)
    )
    payload = {
        "sub": subject,
        "exp": expire,
        "iat": _now_utc(),
        "jti": str(uuid4()),
        "type": "refresh",
    }
    return jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT. Raises UnauthorizedException on failure."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except JWTError as exc:
        raise UnauthorizedException("Invalid or expired token.") from exc


def decode_access_token(token: str) -> dict[str, Any]:
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise UnauthorizedException("Token is not an access token.")
    return payload


def decode_refresh_token(token: str) -> dict[str, Any]:
    payload = decode_token(token)
    if payload.get("type") != "refresh":
        raise UnauthorizedException("Token is not a refresh token.")
    return payload

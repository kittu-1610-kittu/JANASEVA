"""
JANASEVA OS — Domain Exceptions
Centralized exception hierarchy for clear error handling.
"""
from __future__ import annotations

from http import HTTPStatus


class JanasevaException(Exception):
    """Base class for all JANASEVA domain exceptions."""
    status_code: int = 500
    error_code: str = "INTERNAL_ERROR"

    def __init__(self, message: str, error_code: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        if error_code:
            self.error_code = error_code


class NotFoundException(JanasevaException):
    status_code = 404
    error_code = "NOT_FOUND"


class UnauthorizedException(JanasevaException):
    status_code = 401
    error_code = "UNAUTHORIZED"


class ForbiddenException(JanasevaException):
    status_code = 403
    error_code = "FORBIDDEN"


class ValidationException(JanasevaException):
    status_code = 422
    error_code = "VALIDATION_ERROR"


class ConflictException(JanasevaException):
    status_code = 409
    error_code = "CONFLICT"


class RateLimitException(JanasevaException):
    status_code = 429
    error_code = "RATE_LIMITED"


class ServiceUnavailableException(JanasevaException):
    status_code = 503
    error_code = "SERVICE_UNAVAILABLE"


class AIServiceException(JanasevaException):
    status_code = 502
    error_code = "AI_SERVICE_ERROR"


class StorageException(JanasevaException):
    status_code = 502
    error_code = "STORAGE_ERROR"


class ComplaintNotFoundException(NotFoundException):
    error_code = "COMPLAINT_NOT_FOUND"


class UserNotFoundException(NotFoundException):
    error_code = "USER_NOT_FOUND"


class DepartmentNotFoundException(NotFoundException):
    error_code = "DEPARTMENT_NOT_FOUND"


class EmergencyNotFoundException(NotFoundException):
    error_code = "EMERGENCY_NOT_FOUND"


class TaskNotFoundException(NotFoundException):
    error_code = "TASK_NOT_FOUND"


class InsufficientPermissionsException(ForbiddenException):
    error_code = "INSUFFICIENT_PERMISSIONS"


class DuplicateComplaintException(ConflictException):
    error_code = "DUPLICATE_COMPLAINT"


class InvalidStatusTransitionException(ValidationException):
    error_code = "INVALID_STATUS_TRANSITION"


class SLAPolicyNotFoundException(NotFoundException):
    error_code = "SLA_POLICY_NOT_FOUND"

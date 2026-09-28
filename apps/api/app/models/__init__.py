"""Import all models so Alembic can discover them for autogenerate."""
from app.models.base import *  # noqa: F401, F403
from app.models.user import User, UserRoleAssignment, RefreshToken, UserRole, UserStatus  # noqa: F401
from app.models.geography import District, Ward, Department, RoutingRule  # noqa: F401
from app.models.complaint import (  # noqa: F401
    Complaint,
    ComplaintCategory,
    ComplaintStatusHistory,
    ComplaintEvidence,
    ComplaintAssignment,
    ComplaintStatus,
    ComplaintPriority,
    EvidenceType,
)
from app.models.operational import (  # noqa: F401
    SLAPolicy,
    EscalationRule,
    Task,
    TaskStatus,
    TaskStatusHistory,
    EmergencyIncident,
    EmergencyType,
    EmergencySeverity,
    EmergencyStatus,
    Resource,
    ResourceType,
    ResourceStatus,
    Notification,
    NotificationChannel,
    NotificationStatus,
    AuditLog,
    AIPrediction,
    KnowledgeDocument,
    KnowledgeChunk,
    Scheme,
    FoodListing,
    FoodStatus,
)

"""initial_schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-09-27 15:35:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from geoalchemy2 import Geometry, Geography
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision = '0001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Ensure extensions
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
    op.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # 1. users
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('email', sa.String(255), unique=True, nullable=False, index=True),
        sa.Column('phone', sa.String(20), unique=True, nullable=True, index=True),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, server_default='ACTIVE'),
        sa.Column('department_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('district_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('ward_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('is_demo', sa.Boolean(), default=False, nullable=False),
        sa.Column('avatar_url', sa.Text(), nullable=True),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
    )

    # 2. user_role_assignments
    op.create_table(
        'user_role_assignments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(50), nullable=False),
        sa.Column('is_primary', sa.Boolean(), default=False, nullable=False),
    )

    # 3. refresh_tokens
    op.create_table(
        'refresh_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_hash', sa.String(255), unique=True, nullable=False, index=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_revoked', sa.Boolean(), default=False, nullable=False),
        sa.Column('replaced_by', sa.String(255), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(50), nullable=True),
    )

    # 4. districts
    op.create_table(
        'districts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('name', sa.String(200), nullable=False, index=True),
        sa.Column('code', sa.String(20), unique=True, nullable=False),
        sa.Column('state', sa.String(200), nullable=False),
        sa.Column('country', sa.String(100), default='India', nullable=False),
        sa.Column('population', sa.Integer(), nullable=True),
        sa.Column('area_sq_km', sa.Float(), nullable=True),
        sa.Column('headquarters', sa.String(200), nullable=True),
        sa.Column('is_demo', sa.Boolean(), default=False, nullable=False),
        sa.Column('boundary', Geometry(geometry_type='MULTIPOLYGON', srid=4326), nullable=True),
        sa.Column('centroid', Geography(geometry_type='POINT', srid=4326), nullable=True),
    )

    # 5. wards
    op.create_table(
        'wards',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('district_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('districts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('ward_number', sa.Integer(), nullable=False),
        sa.Column('population', sa.Integer(), nullable=True),
        sa.Column('area_sq_km', sa.Float(), nullable=True),
        sa.Column('is_demo', sa.Boolean(), default=False, nullable=False),
        sa.Column('boundary', Geometry(geometry_type='MULTIPOLYGON', srid=4326), nullable=True),
        sa.Column('centroid', Geography(geometry_type='POINT', srid=4326), nullable=True),
    )

    # 6. departments
    op.create_table(
        'departments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('district_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('districts.id', ondelete='SET NULL'), nullable=True),
        sa.Column('name', sa.String(200), nullable=False, index=True),
        sa.Column('code', sa.String(50), unique=True, nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('head_name', sa.String(200), nullable=True),
        sa.Column('head_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('is_emergency_lead', sa.Boolean(), default=False, nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('color_hex', sa.String(7), nullable=True),
    )

    # Add FKs back from users to departments, districts, wards
    op.create_foreign_key('fk_users_department', 'users', 'departments', ['department_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_users_district', 'users', 'districts', ['district_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_users_ward', 'users', 'wards', ['ward_id'], ['id'], ondelete='SET NULL')

    # 7. routing_rules
    op.create_table(
        'routing_rules',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('category_code', sa.String(50), nullable=False, index=True),
        sa.Column('subcategory_code', sa.String(50), nullable=True),
        sa.Column('primary_department_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('departments.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('escalation_department_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('departments.id', ondelete='SET NULL'), nullable=True),
        sa.Column('ward_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('wards.id', ondelete='SET NULL'), nullable=True),
        sa.Column('priority_override', sa.String(50), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
    )

    # 8. complaint_categories
    op.create_table(
        'complaint_categories',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('code', sa.String(50), unique=True, nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('icon', sa.String(50), nullable=True),
        sa.Column('default_department_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('departments.id', ondelete='SET NULL'), nullable=True),
        sa.Column('base_sla_hours', sa.Integer(), default=72, nullable=False),
        sa.Column('base_priority', sa.String(50), default='MEDIUM', nullable=False),
        sa.Column('is_emergency_eligible', sa.Boolean(), default=False, nullable=False),
        sa.Column('parent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('complaint_categories.id', ondelete='SET NULL'), nullable=True),
        sa.Column('display_order', sa.Integer(), default=0, nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
    )

    # 9. sla_policies
    op.create_table(
        'sla_policies',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('category_code', sa.String(50), nullable=True),
        sa.Column('priority', sa.String(50), nullable=True),
        sa.Column('response_hours', sa.Integer(), default=4, nullable=False),
        sa.Column('field_visit_hours', sa.Integer(), default=24, nullable=False),
        sa.Column('resolution_hours', sa.Integer(), default=72, nullable=False),
        sa.Column('warning_threshold_pct', sa.Integer(), default=75, nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('business_hours_only', sa.Boolean(), default=False, nullable=False),
    )

    # 10. complaints
    op.create_table(
        'complaints',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('complaint_id', sa.String(30), unique=True, nullable=False, index=True),
        sa.Column('citizen_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('is_anonymous', sa.Boolean(), default=False, nullable=False),
        sa.Column('title', sa.String(300), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category_code', sa.String(50), nullable=True, index=True),
        sa.Column('subcategory_code', sa.String(50), nullable=True),
        sa.Column('department_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('departments.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('ward_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('wards.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('district_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('districts.id', ondelete='SET NULL'), nullable=True),
        sa.Column('status', sa.String(50), default='REPORTED', nullable=False, index=True),
        sa.Column('priority', sa.String(50), default='MEDIUM', nullable=False, index=True),
        sa.Column('priority_score', sa.Integer(), default=50, nullable=False),
        sa.Column('is_emergency', sa.Boolean(), default=False, nullable=False, index=True),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('location_text', sa.String(300), nullable=True),
        sa.Column('location', Geography(geometry_type='POINT', srid=4326), nullable=True),
        sa.Column('sla_policy_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('sla_policies.id', ondelete='SET NULL'), nullable=True),
        sa.Column('sla_deadline', sa.DateTime(timezone=True), nullable=True),
        sa.Column('sla_breached', sa.Boolean(), default=False, nullable=False, index=True),
        sa.Column('escalation_level', sa.Integer(), default=0, nullable=False),
        sa.Column('ai_category_suggestion', sa.String(50), nullable=True),
        sa.Column('ai_confidence', sa.Float(), nullable=True),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolved_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('citizen_rating', sa.Integer(), nullable=True),
        sa.Column('citizen_feedback', sa.Text(), nullable=True),
        sa.Column('is_demo', sa.Boolean(), default=False, nullable=False),
    )

    # 11. complaint_status_history
    op.create_table(
        'complaint_status_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('complaint_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('complaints.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('from_status', sa.String(50), nullable=True),
        sa.Column('to_status', sa.String(50), nullable=False),
        sa.Column('changed_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
    )

    # 12. complaint_evidence
    op.create_table(
        'complaint_evidence',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('complaint_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('complaints.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('uploaded_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('evidence_type', sa.String(50), nullable=False),
        sa.Column('file_name', sa.String(255), nullable=False),
        sa.Column('file_size_bytes', sa.Integer(), nullable=False),
        sa.Column('mime_type', sa.String(100), nullable=False),
        sa.Column('storage_key', sa.Text(), nullable=False),
        sa.Column('storage_bucket', sa.String(100), nullable=False),
        sa.Column('caption', sa.Text(), nullable=True),
        sa.Column('is_verified', sa.Boolean(), default=False, nullable=False),
        sa.Column('verified_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
    )

    # 13. complaint_assignments
    op.create_table(
        'complaint_assignments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('complaint_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('complaints.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('assigned_to', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('assigned_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
    )

    # 14. escalation_rules
    op.create_table(
        'escalation_rules',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('policy_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('sla_policies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('level', sa.Integer(), nullable=False),
        sa.Column('trigger_at_hours', sa.Integer(), nullable=False),
        sa.Column('escalate_to_role', sa.String(50), nullable=False),
        sa.Column('notify_channels', postgresql.JSONB(), nullable=False),
    )

    # 15. tasks
    op.create_table(
        'tasks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('task_id', sa.String(30), unique=True, nullable=False, index=True),
        sa.Column('complaint_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('complaints.id', ondelete='CASCADE'), nullable=True),
        sa.Column('title', sa.String(300), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('assigned_to', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('assigned_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('department_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('departments.id', ondelete='SET NULL'), nullable=True),
        sa.Column('status', sa.String(50), default='PENDING', nullable=False),
        sa.Column('priority', sa.String(50), default='MEDIUM', nullable=False),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
    )

    # 16. task_status_history
    op.create_table(
        'task_status_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('task_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False),
        sa.Column('from_status', sa.String(50), nullable=True),
        sa.Column('to_status', sa.String(50), nullable=False),
        sa.Column('changed_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
    )

    # 17. emergency_incidents
    op.create_table(
        'emergency_incidents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('incident_id', sa.String(30), unique=True, nullable=False, index=True),
        sa.Column('title', sa.String(300), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('severity', sa.String(50), nullable=False),
        sa.Column('status', sa.String(50), default='REPORTED', nullable=False),
        sa.Column('lead_agency_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('departments.id', ondelete='SET NULL'), nullable=True),
        sa.Column('ward_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('wards.id', ondelete='SET NULL'), nullable=True),
        sa.Column('reported_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('location', Geography(geometry_type='POINT', srid=4326), nullable=True),
        sa.Column('affected_people_count', sa.Integer(), default=0, nullable=False),
        sa.Column('casualties_count', sa.Integer(), default=0, nullable=False),
        sa.Column('response_notes', sa.Text(), nullable=True),
        sa.Column('is_demo', sa.Boolean(), default=False, nullable=False),
    )

    # 18. resources
    op.create_table(
        'resources',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('status', sa.String(50), default='AVAILABLE', nullable=False),
        sa.Column('department_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('departments.id', ondelete='SET NULL'), nullable=True),
        sa.Column('ward_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('wards.id', ondelete='SET NULL'), nullable=True),
        sa.Column('capacity', sa.Integer(), nullable=True),
        sa.Column('current_occupancy', sa.Integer(), default=0, nullable=False),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('location', Geography(geometry_type='POINT', srid=4326), nullable=True),
        sa.Column('contact_name', sa.String(200), nullable=True),
        sa.Column('contact_phone', sa.String(50), nullable=True),
        sa.Column('is_demo', sa.Boolean(), default=False, nullable=False),
    )

    # 19. notifications
    op.create_table(
        'notifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('recipient_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(300), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('channel', sa.String(50), default='IN_APP', nullable=False),
        sa.Column('status', sa.String(50), default='PENDING', nullable=False),
        sa.Column('complaint_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('complaints.id', ondelete='SET NULL'), nullable=True),
        sa.Column('emergency_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('emergency_incidents.id', ondelete='SET NULL'), nullable=True),
    )

    # 20. audit_logs
    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('actor_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('actor_role', sa.String(50), nullable=True),
        sa.Column('actor_email', sa.String(255), nullable=True),
        sa.Column('action', sa.String(100), nullable=False, index=True),
        sa.Column('resource_type', sa.String(50), nullable=False, index=True),
        sa.Column('resource_id', sa.String(100), nullable=False, index=True),
        sa.Column('before_state', postgresql.JSONB(), nullable=True),
        sa.Column('after_state', postgresql.JSONB(), nullable=True),
        sa.Column('ip_address', sa.String(50), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
    )

    # 21. ai_predictions
    op.create_table(
        'ai_predictions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('complaint_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('complaints.id', ondelete='CASCADE'), nullable=True),
        sa.Column('model_name', sa.String(100), nullable=False),
        sa.Column('task_type', sa.String(50), nullable=False),
        sa.Column('predicted_category', sa.String(50), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('was_accepted', sa.Boolean(), nullable=True),
        sa.Column('actual_category', sa.String(50), nullable=True),
        sa.Column('latency_ms', sa.Float(), nullable=True),
    )

    # 22. knowledge_documents
    op.create_table(
        'knowledge_documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('title', sa.String(300), nullable=False),
        sa.Column('doc_type', sa.String(50), nullable=False),
        sa.Column('source_url', sa.Text(), nullable=True),
        sa.Column('department_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('departments.id', ondelete='SET NULL'), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
    )

    # 23. knowledge_chunks
    op.create_table(
        'knowledge_chunks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('knowledge_documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('embedding', Vector(768), nullable=True),
    )

    # 24. schemes
    op.create_table(
        'schemes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('name', sa.String(300), nullable=False),
        sa.Column('code', sa.String(50), unique=True, nullable=False),
        sa.Column('category', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('benefits', sa.Text(), nullable=False),
        sa.Column('department_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('departments.id', ondelete='SET NULL'), nullable=True),
        sa.Column('eligibility_rules', postgresql.JSONB(), nullable=False),
        sa.Column('required_documents', postgresql.JSONB(), nullable=False),
        sa.Column('application_url', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
    )

    # 25. food_listings
    op.create_table(
        'food_listings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('provider_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('provider_name', sa.String(200), nullable=False),
        sa.Column('meal_type', sa.String(100), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('serves', sa.Integer(), nullable=False),
        sa.Column('available_from', sa.String(50), nullable=False),
        sa.Column('available_until', sa.String(50), nullable=False),
        sa.Column('status', sa.String(50), default='AVAILABLE', nullable=False),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('address', sa.Text(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('location', Geography(geometry_type='POINT', srid=4326), nullable=True),
        sa.Column('is_demo', sa.Boolean(), default=False, nullable=False),
    )


def downgrade() -> None:
    op.drop_table('food_listings')
    op.drop_table('schemes')
    op.drop_table('knowledge_chunks')
    op.drop_table('knowledge_documents')
    op.drop_table('ai_predictions')
    op.drop_table('audit_logs')
    op.drop_table('notifications')
    op.drop_table('resources')
    op.drop_table('emergency_incidents')
    op.drop_table('task_status_history')
    op.drop_table('tasks')
    op.drop_table('escalation_rules')
    op.drop_table('complaint_assignments')
    op.drop_table('complaint_evidence')
    op.drop_table('complaint_status_history')
    op.drop_table('complaints')
    op.drop_table('sla_policies')
    op.drop_table('complaint_categories')
    op.drop_table('routing_rules')
    op.drop_table('departments')
    op.drop_table('wards')
    op.drop_table('districts')
    op.drop_table('refresh_tokens')
    op.drop_table('user_role_assignments')
    op.drop_table('users')

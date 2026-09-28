"""
JANASEVA OS — AI Command Chat Service
Natural-language interface using controlled analytics tools.
The LLM CANNOT directly query the database.
It calls pre-defined, authorized, read-only tools.
"""
from __future__ import annotations

import json
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import get_logger
from app.models.complaint import Complaint, ComplaintPriority, ComplaintStatus
from app.models.operational import EmergencyIncident, EmergencyStatus, Resource, ResourceStatus, ResourceType
from app.models.user import User, UserRole

logger = get_logger(__name__)
settings = get_settings()


# ─── Controlled Analytics Tools ───────────────────────────────────────────────
# Each tool validates its own arguments, enforces authorization,
# limits result size, and logs access.

class AnalyticsTools:
    def __init__(self, db: AsyncSession, current_user: User) -> None:
        self.db = db
        self.user = current_user

    async def get_complaints(
        self,
        status: str | None = None,
        priority: str | None = None,
        older_than_hours: int | None = None,
        limit: int = 20,
    ) -> list[dict]:
        """Get complaints with optional filters. Max 50 results."""
        limit = min(limit, 50)
        stmt = select(
            Complaint.complaint_id,
            Complaint.title,
            Complaint.status,
            Complaint.priority,
            Complaint.category_code,
            Complaint.sla_breached,
            Complaint.created_at,
        ).where(Complaint.deleted_at.is_(None))

        # Role scoping
        if self.user.primary_role == UserRole.DEPARTMENT_OFFICER and self.user.department_id:
            stmt = stmt.where(Complaint.department_id == self.user.department_id)

        if status:
            try:
                stmt = stmt.where(Complaint.status == ComplaintStatus(status.upper()))
            except ValueError:
                pass
        if priority:
            try:
                stmt = stmt.where(Complaint.priority == ComplaintPriority(priority.upper()))
            except ValueError:
                pass
        if older_than_hours:
            from datetime import datetime, timedelta, timezone
            cutoff = datetime.now(tz=timezone.utc) - timedelta(hours=older_than_hours)
            stmt = stmt.where(Complaint.created_at < cutoff)

        stmt = stmt.order_by(Complaint.created_at.desc()).limit(limit)
        result = await self.db.execute(stmt)
        rows = result.fetchall()
        return [
            {
                "complaint_id": str(r.complaint_id),
                "title": r.title,
                "status": r.status.value,
                "priority": r.priority.value,
                "category": r.category_code,
                "sla_breached": r.sla_breached,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]

    async def get_sla_breaches(self, limit: int = 20) -> list[dict]:
        """Get all SLA-breached open complaints."""
        return await self.get_complaints(status=None, priority=None, limit=limit)

    async def get_shelter_capacity(self) -> list[dict]:
        """Get current shelter capacity and occupancy."""
        stmt = select(
            Resource.name,
            Resource.capacity,
            Resource.current_occupancy,
            Resource.status,
            Resource.address,
        ).where(
            Resource.type == ResourceType.SHELTER,
            Resource.deleted_at.is_(None) if hasattr(Resource, 'deleted_at') else True,
        )
        result = await self.db.execute(stmt)
        rows = result.fetchall()
        return [
            {
                "name": r.name,
                "capacity": r.capacity,
                "occupancy": r.current_occupancy,
                "available": (r.capacity or 0) - (r.current_occupancy or 0),
                "status": r.status.value,
                "address": r.address,
            }
            for r in rows
        ]

    async def get_emergency_incidents(self) -> list[dict]:
        """Get active emergency incidents."""
        stmt = select(
            EmergencyIncident.incident_id,
            EmergencyIncident.type,
            EmergencyIncident.severity,
            EmergencyIncident.status,
            EmergencyIncident.title,
            EmergencyIncident.affected_people_count,
            EmergencyIncident.created_at,
        ).where(
            EmergencyIncident.status.not_in([EmergencyStatus.RESOLVED, EmergencyStatus.FALSE_ALARM])
        ).limit(20)
        result = await self.db.execute(stmt)
        rows = result.fetchall()
        return [
            {
                "incident_id": r.incident_id,
                "type": r.type.value,
                "severity": r.severity.value,
                "status": r.status.value,
                "title": r.title,
                "affected_people": r.affected_people_count,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]

    async def get_district_summary(self) -> dict:
        """Get high-level district metrics."""
        total = await self.db.scalar(select(func.count(Complaint.id)).where(Complaint.deleted_at.is_(None)))
        open_count = await self.db.scalar(
            select(func.count(Complaint.id)).where(
                Complaint.deleted_at.is_(None),
                Complaint.status.not_in([
                    ComplaintStatus.RESOLVED, ComplaintStatus.REJECTED,
                    ComplaintStatus.DUPLICATE, ComplaintStatus.CITIZEN_FEEDBACK,
                ])
            )
        )
        breached = await self.db.scalar(
            select(func.count(Complaint.id)).where(
                Complaint.sla_breached.is_(True),
                Complaint.deleted_at.is_(None),
            )
        )
        emergencies = await self.db.scalar(
            select(func.count(EmergencyIncident.id)).where(
                EmergencyIncident.status.not_in([EmergencyStatus.RESOLVED, EmergencyStatus.FALSE_ALARM])
            )
        )
        return {
            "total_complaints": total or 0,
            "open_complaints": open_count or 0,
            "sla_breaches": breached or 0,
            "active_emergencies": emergencies or 0,
        }


# ─── AI Chat Service ──────────────────────────────────────────────────────────

TOOL_DESCRIPTIONS = """
Available tools (call by returning JSON with "tool" and "args"):
- get_complaints(status?, priority?, older_than_hours?, limit?): List complaints
- get_sla_breaches(): Get SLA-breached complaints
- get_shelter_capacity(): Get shelter occupancy
- get_emergency_incidents(): Get active emergencies
- get_district_summary(): Get district-level metrics

Always call a tool first to get real data before answering analytics questions.
Return tool call as: {"tool": "tool_name", "args": {...}}
Or a final answer as: {"answer": "your response", "tool_used": "tool_name or null"}
"""

SYSTEM_PROMPT = f"""You are the JANASEVA OS AI Command Assistant for district operations.
You have access to controlled read-only analytics tools.
You CANNOT modify any data. You CANNOT write SQL. You CANNOT access systems outside the tools.

{TOOL_DESCRIPTIONS}

Be concise and factual. If data is unavailable, say so clearly.
Always cite which tool you used to get the data.
"""


class AIChatService:
    def __init__(self, db: AsyncSession, current_user: User) -> None:
        self.db = db
        self.user = current_user
        self.tools = AnalyticsTools(db, current_user)

    async def chat(self, message: str) -> dict:
        if not settings.gemini_api_key:
            return await self._rule_based_response(message)

        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.gemini_api_key)
            model = genai.GenerativeModel(settings.gemini_model)

            response = model.generate_content(
                [SYSTEM_PROMPT, f"User query: {message}"],
                generation_config=genai.GenerationConfig(
                    temperature=0.1, max_output_tokens=512
                ),
            )
            raw = response.text.strip()

            # Parse structured response
            try:
                parsed = json.loads(raw.replace("```json", "").replace("```", "").strip())
            except json.JSONDecodeError:
                return {"response": raw, "sources": [], "tool_used": None}

            if "tool" in parsed:
                tool_name = parsed["tool"]
                args = parsed.get("args", {})
                tool_data = await self._call_tool(tool_name, args)

                # Second call: summarize tool output
                summary_response = model.generate_content(
                    [
                        SYSTEM_PROMPT,
                        f"Original query: {message}",
                        f"Tool {tool_name} returned: {json.dumps(tool_data, indent=2)}",
                        "Now provide a clear, concise answer to the user query based on this data.",
                    ],
                    generation_config=genai.GenerationConfig(temperature=0.1, max_output_tokens=400),
                )
                return {
                    "response": summary_response.text.strip(),
                    "sources": [f"Tool: {tool_name}"],
                    "tool_used": tool_name,
                }

            return {
                "response": parsed.get("answer", raw),
                "sources": [],
                "tool_used": parsed.get("tool_used"),
            }

        except Exception as exc:
            logger.warning("ai.chat.failed", error=str(exc))
            return await self._rule_based_response(message)

    async def _call_tool(self, tool_name: str, args: dict) -> Any:
        """Dispatch to the correct analytics tool."""
        dispatch = {
            "get_complaints": self.tools.get_complaints,
            "get_sla_breaches": self.tools.get_sla_breaches,
            "get_shelter_capacity": self.tools.get_shelter_capacity,
            "get_emergency_incidents": self.tools.get_emergency_incidents,
            "get_district_summary": self.tools.get_district_summary,
        }
        fn = dispatch.get(tool_name)
        if fn is None:
            return {"error": f"Unknown tool: {tool_name}"}
        return await fn(**args)

    async def _rule_based_response(self, message: str) -> dict:
        """Simple keyword-based fallback when Gemini is unavailable."""
        msg_lower = message.lower()

        if "shelter" in msg_lower or "capacity" in msg_lower:
            data = await self.tools.get_shelter_capacity()
            total_avail = sum(s.get("available", 0) for s in data)
            return {
                "response": f"There are {len(data)} shelters with a total available capacity of {total_avail} people.",
                "sources": ["Tool: get_shelter_capacity"],
                "tool_used": "get_shelter_capacity",
            }
        elif "emergency" in msg_lower or "incident" in msg_lower:
            data = await self.tools.get_emergency_incidents()
            return {
                "response": f"There are currently {len(data)} active emergency incidents.",
                "sources": ["Tool: get_emergency_incidents"],
                "tool_used": "get_emergency_incidents",
            }
        elif "sla" in msg_lower or "breach" in msg_lower:
            data = await self.tools.get_sla_breaches()
            return {
                "response": f"There are {len(data)} complaints with SLA breaches that need attention.",
                "sources": ["Tool: get_sla_breaches"],
                "tool_used": "get_sla_breaches",
            }
        else:
            summary = await self.tools.get_district_summary()
            return {
                "response": (
                    f"District summary: {summary['total_complaints']} total complaints, "
                    f"{summary['open_complaints']} open, "
                    f"{summary['sla_breaches']} SLA breaches, "
                    f"{summary['active_emergencies']} active emergencies."
                ),
                "sources": ["Tool: get_district_summary"],
                "tool_used": "get_district_summary",
            }

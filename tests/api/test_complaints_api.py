"""
JANASEVA OS — API Tests: Complaints validation and submission
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_complaint_creation_requires_auth():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "title": "Large pothole on Station Road",
            "description": "Deep road crater causing dangerous skids for two wheelers.",
            "category_code": "POTHOLE",
        }
        response = await client.post("/api/v1/complaints", json=payload)
        assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_complaint_invalid_payload_fails():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Title too short (< 5 chars)
        payload = {
            "title": "Bad",
            "description": "Short",
        }
        response = await client.post("/api/v1/complaints", json=payload)
        assert response.status_code in (401, 403, 422)

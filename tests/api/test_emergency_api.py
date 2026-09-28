"""
JANASEVA OS — API Tests: Emergency endpoints
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_emergency_list_requires_auth():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/emergency")
        assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_emergency_report_validation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Invalid payload without required fields
        response = await client.post("/api/v1/emergency", json={"type": "INVALID"})
        assert response.status_code in (401, 403, 422)

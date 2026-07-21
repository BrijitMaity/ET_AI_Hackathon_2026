import os
import asyncio
import pytest
from httpx import AsyncClient, ASGITransport
import importlib


@pytest.mark.asyncio
async def test_incident_created_on_high_risk(monkeypatch):
    # Use SQLite for tests to avoid external DB connectivity
    monkeypatch.setenv("USE_SQLITE", "1")
    # lower threshold so our test event triggers escalation
    monkeypatch.setenv("EMERGENCY_THRESHOLD", "0.3")

    # import app after setting env vars so db uses SQLite fallback
    from backend.app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # send a vision event with PPE missing
        payload = {
            "source": "vision",
            "payload": {
                "detections": [{"label": "person", "confidence": 0.99}],
                "camera": "camera-1",
            },
        }
        r = await ac.post("/risk/evaluate", json=payload)
        assert r.status_code == 200

        # allow background orchestrator to run
        await asyncio.sleep(0.2)

        # list incidents
        r2 = await ac.get("/incidents")
        assert r2.status_code == 200
        data = r2.json()
        assert len(data) >= 1

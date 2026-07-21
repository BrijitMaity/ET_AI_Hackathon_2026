import pytest
from httpx import AsyncClient, ASGITransport

from backend.app.main import app


@pytest.mark.asyncio
async def test_health():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/health")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"


@pytest.mark.asyncio
async def test_heatmap():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/heatmap")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"
        assert isinstance(data.get("data"), list)
        if len(data.get("data")) > 0:
            assert "lat" in data["data"][0]


@pytest.mark.asyncio
async def test_export_data():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/export/data")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"
        assert "incidents" in data.get("data", {})
        assert "sensor_readings" in data.get("data", {})

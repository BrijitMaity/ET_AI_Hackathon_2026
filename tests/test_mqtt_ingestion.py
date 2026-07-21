import pytest
import asyncio
import pytest_asyncio
import json
import os
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy import select

# Set environment before any imports
os.environ["USE_SQLITE"] = "1"
os.environ["DISABLE_NEO4J"] = "1"

from backend.app.mqtt_ingest import handle_message
from backend.app.models import SensorReading, Base
from backend.app.db import AsyncSessionLocal, engine


@pytest_asyncio.fixture(scope="function")
async def db_setup():
    """Set up SQLite test database and clean up after each test."""
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield
    
    # Clean up
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_handle_message_stores_sensor_reading(db_setup):
    """Test that handle_message stores a sensor reading in the database."""
    payload = json.dumps({"sensor_id": "gas_sensor_1", "value": 75.5}).encode()
    
    # Mock the HTTP client to avoid actual network calls
    with patch("httpx.AsyncClient") as mock_client_ctx:
        mock_client = MagicMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_client.post = AsyncMock()
        mock_client_ctx.return_value = mock_client
        
        await handle_message("sensors/gas/1", payload)
    
    # Verify reading was stored
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(SensorReading).where(SensorReading.sensor_id == "gas_sensor_1"))
        reading = result.scalars().first()
        assert reading is not None
        assert reading.value == 75.5


@pytest.mark.asyncio
async def test_handle_message_forwards_to_backend(db_setup):
    """Test that handle_message forwards sensor events to the backend risk endpoint."""
    os.environ["BACKEND_URL"] = "http://test-backend:8000"
    
    payload = json.dumps({"sensor_id": "temp_sensor_1", "value": 45.0}).encode()
    
    with patch("httpx.AsyncClient") as mock_client_ctx:
        mock_client = MagicMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_client.post = AsyncMock()
        mock_client_ctx.return_value = mock_client
        
        await handle_message("sensors/temp/1", payload)
        
        # Verify the POST call was made with correct payload structure
        assert mock_client.post.called
        call_args = mock_client.post.call_args
        assert "http://test-backend:8000/risk/evaluate" in call_args[0]
        posted_data = call_args[1]["json"]
        assert posted_data["source"] == "sensor"
        assert posted_data["payload"]["sensor_id"] == "temp_sensor_1"


@pytest.mark.asyncio
async def test_handle_message_non_json_payload(db_setup):
    """Test that handle_message handles non-JSON payloads gracefully."""
    payload = b"raw_sensor_data_xyz"
    
    with patch("httpx.AsyncClient") as mock_client_ctx:
        mock_client = MagicMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_client.post = AsyncMock()
        mock_client_ctx.return_value = mock_client
        
        # Should not raise
        await handle_message("sensors/raw", payload)
    
    # Verify reading was still stored
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(SensorReading))
        readings = result.scalars().all()
        assert len(readings) > 0


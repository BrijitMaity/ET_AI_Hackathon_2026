import asyncio
import json
import logging
import os
import random

from sqlalchemy import insert
from .db import AsyncSessionLocal, engine
from .models import SensorReading

logging.basicConfig(level=logging.INFO)

async def ensure_tables():
    """Create DB tables if they don't exist (same as backend lifespan)."""
    from .models import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logging.info("Database tables ensured.")

async def handle_message(topic: str, payload: bytes):
    try:
        text = payload.decode()
        data = json.loads(text)
    except Exception:
        data = {"raw": payload.decode(errors="ignore")}

    sensor_id = data.get("sensor_id") or topic
    try:
        value = float(data.get("value")) if isinstance(data, dict) and data.get("value") is not None else None
    except Exception:
        value = None

    # Write to DB (non-fatal)
    try:
        async with AsyncSessionLocal() as session:
            stmt = insert(SensorReading).values(sensor_id=sensor_id, value=value, sensor_metadata_json=data)
            await session.execute(stmt)
            await session.commit()
    except Exception as e:
        logging.warning(f"DB write failed (non-fatal): {e}")

    # Forward to backend risk evaluator (best-effort)
    try:
        import httpx
        backend = os.getenv("BACKEND_URL", "http://localhost:8000")
        async with httpx.AsyncClient() as client:
            event = {"sensor_id": sensor_id, "value": value, "metadata": data}
            await client.post(f"{backend}/risk/evaluate", json={"source": "sensor", "payload": event}, timeout=5.0)
    except Exception as e:
        logging.warning(f"Could not forward sensor data. Is the backend running? (Error: {e})")

async def mock_sensor_data():
    logging.info("Running in Mock Mode. Generating simulated sensor data every 3 seconds...")
    sensor_types = [
        {"sensor_id": "gas_detector_zone_a", "type": "gas", "normal": (10, 40), "anomaly": (55, 90)},
        {"sensor_id": "temperature_furnace_b1", "type": "temperature", "normal": (25, 40), "anomaly": (50, 85)},
        {"sensor_id": "pressure_valve_c3", "type": "pressure", "normal": (50, 90), "anomaly": (110, 160)},
        {"sensor_id": "gas_monitor_confined_space", "type": "gas", "normal": (5, 30), "anomaly": (60, 100)},
        {"sensor_id": "temperature_boiler_d2", "type": "temperature", "normal": (30, 44), "anomaly": (48, 75)},
    ]
    while True:
        sensor = random.choice(sensor_types)
        # 30% chance of anomaly reading to make dashboard interesting
        if random.random() < 0.3:
            value = random.uniform(*sensor["anomaly"])
            is_anomaly = True
        else:
            value = random.uniform(*sensor["normal"])
            is_anomaly = False
        data = {
            "sensor_id": sensor["sensor_id"],
            "type": sensor["type"],
            "value": round(value, 2),
            "status": "active",
            "zone": random.choice(["zone_a", "zone_b", "zone_c"]),
        }
        
        # 10% chance overall to simulate a critical compound risk (Hot Work + Gas)
        if is_anomaly and sensor["type"] == "gas" and random.random() < 0.33:
            data["permit_type"] = "hot work"
            data["asset"] = "furnace_b"
        payload_bytes = json.dumps(data).encode()
        await handle_message(f"sensors/{sensor['sensor_id']}", payload_bytes)
        logging.info(f"Ingested: {sensor['sensor_id']} ({sensor['type']}) = {value:.2f}")
        await asyncio.sleep(3)

async def run():
    # Create DB tables if they don't exist
    await ensure_tables()
    # Run simulated ingestion loop
    await mock_sensor_data()

if __name__ == "__main__":
    import sys
    if sys.platform.startswith('win'):
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run())

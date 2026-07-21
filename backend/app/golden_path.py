import asyncio
import datetime
import random
import json
from .db import AsyncSessionLocal
from .models import Event, Incident, SensorReading
from sqlalchemy import insert, select
from .risk_engine import evaluate_composite_risk

# Global state that the frontend can poll
state = {
    "phase": 1,
    "gas_ppm": 0.0,
    "temp_c": 35.0,
    "permit": "None",
    "risk_score": 0.15,
    "auto_triggered": False
}

async def run_golden_path(manager):
    """
    3-Phase State Machine replicating the Visakhapatnam scenario.
    Acts as the 'Brain' generating specific compound risks over time.
    """
    global state
    
    # Needs a brief startup delay to ensure DB tables are ready
    await asyncio.sleep(5)
    
    while True:
        try:
            # --- PHASE 1: Normal Operations (30 seconds) ---
            state["phase"] = 1
            state["permit"] = "None"
            state["auto_triggered"] = False
            
            # Clear previous incidents to reset dashboard stats
            from sqlalchemy import update
            async with AsyncSessionLocal() as session:
                async with session.begin():
                    await session.execute(update(Incident).where(Incident.status == "active").values(status="resolved"))

            
            for _ in range(15): # 15 iterations * 2s = 30s
                state["gas_ppm"] = random.uniform(0.0, 8.0) # Green, safe
                state["temp_c"] = random.uniform(35.0, 42.0)
                await _evaluate_and_push_state()
                await asyncio.sleep(2)
                
            # --- PHASE 2: Escalation (30 seconds) ---
            state["phase"] = 2
            state["permit"] = "HW-492 (Hot Work)"
            
            gas_base = 8.0
            temp_base = 42.0
            for _ in range(15): # 15 iterations * 2s = 30s
                gas_base += random.uniform(1.0, 3.5) # Slowly rising
                temp_base += random.uniform(0.5, 1.5)
                state["gas_ppm"] = gas_base
                state["temp_c"] = temp_base
                await _evaluate_and_push_state()
                await asyncio.sleep(2)
                
            # --- PHASE 3: Crisis & Auto-Trigger (Until resolved) ---
            state["phase"] = 3
            state["gas_ppm"] = random.uniform(55.0, 75.0) # Breach LEL!
            state["temp_c"] = random.uniform(65.0, 80.0)
            await _evaluate_and_push_state()
            
            # The UI will poll this and auto-click the trigger button
            state["auto_triggered"] = True
            
            # We also automatically call the orchestrator script
            from .main import run_orchestration_simulation
            asyncio.create_task(run_orchestration_simulation())
            
            # Wait a bit before resetting to loop the demo
            await asyncio.sleep(20)
            
        except Exception as e:
            print(f"Golden path error: {e}")
            await asyncio.sleep(5)

async def _evaluate_and_push_state():
    """Generates sensor payloads, evaluates risk, and pushes to DB."""
    payload = {
        "source": "golden_path",
        "detections": [],
        "permit_type": "hot work" if state["phase"] > 1 else "",
        "sensor_id": "CH4-Sensor-B12",
        "value": state["gas_ppm"],
        "metadata": {"type": "gas"}
    }
    
    # Evaluate using the exact same logic as normal sensors
    risk_result = evaluate_composite_risk("sensor", payload)
    state["risk_score"] = risk_result["risk_score"]
    
    async with AsyncSessionLocal() as session:
        async with session.begin():
            # Log the sensor readings
            session.add(SensorReading(
                sensor_id="CH4-Sensor-B12",
                value=state["gas_ppm"],
                sensor_metadata_json={"type": "gas"}
            ))
            session.add(SensorReading(
                sensor_id="TEMP-Sensor-B12",
                value=state["temp_c"],
                sensor_metadata_json={"type": "temperature"}
            ))
            
            # Log the risk event
            session.add(Event(
                source="golden_path",
                payload=payload,
                risk_score=state["risk_score"],
                timestamp=datetime.datetime.utcnow()
            ))
            
            # If critical, ensure there is an incident for the orchestrator to resolve
            if state["phase"] == 3:
                res = await session.execute(select(Incident).where(Incident.title == "Gas Leak Detected - Zone B", Incident.status == "active"))
                existing = res.scalars().first()
                if not existing:
                    session.add(Incident(
                        title="Gas Leak Detected - Zone B",
                        description={"location": "Zone B", "detail": "CRITICAL: CH4 breached LEL during active hot work."},
                        severity="critical",
                        status="active",
                        created_at=datetime.datetime.utcnow()
                    ))

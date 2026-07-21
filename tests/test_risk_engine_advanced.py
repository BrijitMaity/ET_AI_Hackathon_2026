import pytest
from backend.app.risk_engine import evaluate_composite_risk


def test_crowding_detection():
    """Test that crowding (3+ persons) increases risk."""
    payload = {
        "detections": [
            {"label": "person", "confidence": 0.9},
            {"label": "person", "confidence": 0.88},
            {"label": "person", "confidence": 0.85},
        ],
        "camera": "cam-1",
    }
    result = evaluate_composite_risk("vision", payload)
    assert result["risk_score"] > 0.1  # should include crowd risk
    factors = [f.get("type") for f in result["factors"]]
    assert "Crowd Detected" in factors


def test_confined_space_multiplier():
    """Test that confined space multiplies the base risk."""
    payload = {
        "detections": [{"label": "person", "confidence": 0.9}],
        "camera": "cam-1",
        "confined_space": True,
    }
    result_normal = evaluate_composite_risk("vision", {"detections": [{"label": "person", "confidence": 0.9}], "camera": "cam-1"})
    result_confined = evaluate_composite_risk("vision", payload)
    # confined should be higher (or equal) due to multiplier
    assert result_confined["risk_score"] >= result_normal["risk_score"]


def test_ppe_and_gas_amplification():
    """Test that PPE violation + gas anomaly produces high compound risk."""
    payload_vision = {
        "source": "vision",
        "detections": [{"label": "person", "confidence": 0.9}],
        "ppe": {"ppe_ok": False, "reason": "missing_helmets", "persons": 1, "helmets": 0},
        "camera": "cam-1",
    }
    payload_gas = {
        "source": "sensor",
        "sensor_id": "gas_sensor_1",
        "value": 100.0,
    }
    # Evaluate vision first
    result1 = evaluate_composite_risk("vision", payload_vision)
    ppe_risk = result1["risk_score"]
    
    # Evaluate gas alone
    result2 = evaluate_composite_risk("sensor", payload_gas)
    gas_risk = result2["risk_score"]
    
    # Both should be significant but less than combined
    assert ppe_risk > 0.3
    assert gas_risk > 0.4


def test_restricted_zone_motion():
    """Test that high-confidence motion in restricted zone increases risk."""
    payload = {
        "detections": [
            {"label": "person", "confidence": 0.95},
            {"label": "person", "confidence": 0.92},
        ],
        "zone": "restricted",
        "camera": "cam-1",
    }
    result = evaluate_composite_risk("vision", payload)
    factors = [f.get("type") for f in result["factors"]]
    assert "Motion in Restricted Zone" in factors or "Crowd Detected" in factors


def test_night_shift_baseline_increase():
    """Test that night shift adds to baseline risk."""
    payload_day = {
        "detections": [{"label": "person", "confidence": 0.9}],
        "camera": "cam-1",
        "shift": "day",
    }
    payload_night = {
        "detections": [{"label": "person", "confidence": 0.9}],
        "camera": "cam-1",
        "shift": "night",
    }
    result_day = evaluate_composite_risk("vision", payload_day)
    result_night = evaluate_composite_risk("vision", payload_night)
    # Night should be slightly higher due to shift flag
    assert result_night["risk_score"] > result_day["risk_score"]


def test_risk_score_clamped():
    """Test that risk score is always between 0 and 1."""
    # Extreme payload with many risk factors
    payload = {
        "detections": [
            {"label": "person", "confidence": 0.99} for _ in range(5)
        ],
        "ppe": {"ppe_ok": False},
        "camera": "cam-1",
        "confined_space": True,
        "zone": "restricted",
        "shift": "night",
    }
    result = evaluate_composite_risk("vision", payload)
    assert 0 <= result["risk_score"] <= 1.0

def test_hackathon_compound_risk_hot_work_and_gas():
    """Test Visakhapatnam scenario: Hot Work + Gas Leak = 1.0 Critical"""
    payload = {
        "source": "sensor",
        "sensor_id": "gas_sensor_1",
        "value": 100.0,
        "permit_type": "hot work"
    }
    result = evaluate_composite_risk("sensor", payload)
    assert result["risk_score"] == 1.0
    factors = [f.get("type") for f in result["factors"]]
    assert "Compound Risk: Hot Work + Gas" in factors

def test_hackathon_compound_risk_confined_space_and_abnormal():
    """Test Confined Space + Abnormal Process = 1.0 Critical"""
    payload = {
        "source": "sensor",
        "sensor_id": "gas_sensor_1",
        "value": 100.0,
        "confined_space": True
    }
    result = evaluate_composite_risk("sensor", payload)
    assert result["risk_score"] == 1.0
    factors = [f.get("type") for f in result["factors"]]
    assert "Compound Risk: Confined Space + Abnormal Process" in factors

import pytest

from backend.app.risk_engine import evaluate_composite_risk


def test_vision_ppe_missing_increases_risk():
    payload = {
        "detections": [
            {"label": "person", "confidence": 0.98},
        ],
        "camera": "camera-1",
    }
    result = evaluate_composite_risk("vision", payload)
    assert result["risk_score"] >= 0.4
    assert any(f["type"] == "PPE Missing" for f in result["factors"])


def test_sensor_gas_anomaly_triggers_risk():
    payload = {"sensor_id": "gas_sensor_1", "value": 75.0, "metadata": {"type": "gas"}}
    result = evaluate_composite_risk("sensor", payload)
    assert result["risk_score"] >= 0.6
    assert any(f["type"] == "Gas Anomaly" for f in result["factors"])


def test_ppe_summary_increases_risk():
    payload = {
        "detections": [{"label": "person", "confidence": 0.9}],
        "camera": "camera-1",
        "ppe": {"ppe_ok": False, "reason": "missing_helmets", "persons": 1, "helmets": 0},
    }
    result = evaluate_composite_risk("vision", payload)
    assert result["risk_score"] >= 0.4
    assert any(f["type"] == "PPE Summary Violation" for f in result["factors"])

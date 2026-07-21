from backend.app.regulatory import check_compliance


def test_regulatory_matches_gas_event():
    event = {
        "payload": {
            "sensor_id": "gas_sensor_a",
            "source": "sensor",
            "value": 120,
            "metadata": {"type": "gas"}
        },
        "risk": {"risk_score": 0.95}
    }
    result = check_compliance(event)
    assert result["matches"]
    assert result["violations"]

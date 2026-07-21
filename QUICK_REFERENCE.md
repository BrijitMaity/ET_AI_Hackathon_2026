# Developer Quick Reference

## 🚀 Start All Services (3 Terminal Windows)

### Terminal 1: Backend API
```bash
cd d:\hackathon1
set USE_SQLITE=1 && set DISABLE_NEO4J=1
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
✓ Available at: http://localhost:8000
✓ API Docs at: http://localhost:8000/docs

### Terminal 2: MQTT Ingest (Optional)
```bash
cd d:\hackathon1
set USE_SQLITE=1 && set DISABLE_NEO4J=1 && set BACKEND_URL=http://localhost:8000
python -m backend.app.mqtt_ingest
```
✓ Listens on: localhost:1883 (if broker running)

### Terminal 3: Frontend Dashboard
```bash
cd d:\hackathon1\frontend
pip install -r requirements.txt
set BACKEND_URL=http://localhost:8000
streamlit run app.py
```
✓ Available at: http://localhost:8501

## 🧪 Run Tests

```bash
# All tests
cd d:\hackathon1
set USE_SQLITE=1 && set DISABLE_NEO4J=1
python -m pytest tests/ -q

# Specific test file
python -m pytest tests/test_mqtt_ingestion.py -q

# With verbose output
python -m pytest tests/ -v

# With coverage
python -m pytest tests/ --cov=backend --cov-report=html
```

## 📊 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Health check |
| POST | `/risk/evaluate` | Evaluate risk for event |
| GET | `/incidents` | List active incidents |
| GET | `/sensors/recent` | Recent sensor readings |
| GET | `/risk/history` | Risk evaluation history |
| POST | `/ingest/sensor` | Direct sensor ingestion |
| POST | `/ingest/permit` | Permit-to-work data |
| POST | `/regulatory/check` | Check compliance |

## 🔧 Common Tasks

### Test with Sample Data

```bash
# Using curl to POST a risk evaluation
curl -X POST "http://localhost:8000/risk/evaluate" \
  -H "Content-Type: application/json" \
  -d '{"source": "sensor", "payload": {"sensor_id": "temp_1", "value": 85}}'

# Or using Python
python -m backend.app.mqtt_ingest
# Then send MQTT message to sensors/temp/1 with payload: {"sensor_id": "temp_1", "value": 85}
```

### View API Documentation
```
http://localhost:8000/docs
```

### Check Recent Events
```bash
curl "http://localhost:8000/events/recent?limit=10" | python -m json.tool
```

### Check Active Incidents
```bash
curl "http://localhost:8000/incidents?limit=10" | python -m json.tool
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `backend/app/main.py` | FastAPI application with endpoints |
| `backend/app/mqtt_ingest.py` | MQTT client and sensor ingestion |
| `backend/app/risk_engine.py` | Risk evaluation logic |
| `backend/app/orchestrator.py` | Event orchestration and incident generation |
| `frontend/app.py` | Streamlit dashboard |
| `tests/test_mqtt_ingestion.py` | MQTT ingestion tests |
| `tests/test_risk_engine.py` | Risk engine tests |

## 🐛 Debugging

### Check Backend Logs
```bash
# Terminal 1 shows uvicorn logs
# Look for ERROR, WARNING, INFO messages
```

### Check MQTT Connection
```bash
# Verify MQTT broker running:
# mosquitto_sub -t "sensors/#" -h localhost -p 1883
```

### Check Frontend Console
```
Browser Console → F12 → Console tab → Look for 404 or connection errors
```

### Clear Database (SQLite)
```bash
# Delete local.db to reset
rm d:\hackathon1\local.db
```

## 📚 Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `USE_SQLITE` | 0 | Use SQLite (1) or PostgreSQL (0) |
| `DISABLE_NEO4J` | 0 | Disable Neo4j (1) for local dev |
| `BACKEND_URL` | http://localhost:8000 | Backend API URL |
| `MQTT_BROKER` | localhost | MQTT broker hostname |
| `MQTT_PORT` | 1883 | MQTT broker port |
| `MQTT_TOPIC` | sensors/# | MQTT topic pattern |
| `BACKEND_HOST` | 0.0.0.0 | API bind address |
| `BACKEND_PORT` | 8000 | API listen port |

## 🔗 Integration Flow

```
MQTT Message
    ↓
mqtt_ingest.py (stores + forwards)
    ↓
POST /risk/evaluate
    ↓
risk_engine.py (evaluates)
    ↓
Event stored + Orchestrator triggered
    ↓
Incident generated (if risk > threshold)
    ↓
Frontend displays incident
    ↓
User can view details and take actions
```

## 💡 Tips

1. **Use SQLite for development** - No DB setup needed
2. **Check /docs endpoint** - Interactive API documentation
3. **Monitor logs** - First place to look for issues
4. **Test with curl** - Quick way to verify endpoints
5. **Reload browser** - Clear Streamlit cache with Ctrl+R
6. **Check ports** - Make sure 8000 and 8501 are free

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| Port already in use | Kill process: `netstat -ano \| findstr :8000` |
| No data in dashboard | Run a test: `curl -X POST http://localhost:8000/risk/evaluate ...` |
| MQTT not connecting | Check broker running: `mosquitto -v` |
| Database locked | Delete `local.db` and restart |
| Module not found | Activate venv: `.\.venv\Scripts\activate` |
| Streamlit won't start | Try: `pip install --upgrade streamlit` |

## 📞 Support

1. Check `INTEGRATION_GUIDE.md` for full documentation
2. Review `DELIVERY_SUMMARY.md` for architecture overview
3. Check test files for usage examples
4. Review logs for error details

---
**Last Updated**: Hackathon 1 - All Systems Operational ✓

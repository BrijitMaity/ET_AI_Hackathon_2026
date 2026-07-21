# Industrial Safety Intelligence System - Integration Guide

## System Architecture

The system consists of three main components:

1. **MQTT Ingest**: Receives sensor data from IoT devices
2. **Backend API**: Risk evaluation engine and incident management
3. **Frontend Dashboard**: Streamlit-based monitoring UI

## Component Overview

### 1. MQTT Ingest (`backend/app/mqtt_ingest.py`)

Ingests sensor data from MQTT broker and forwards events to risk evaluator.

**Features:**
- Connects to MQTT broker (configurable via env vars)
- Parses JSON sensor payloads
- Stores readings in TimescaleDB/SQLite
- Forwards events to `/risk/evaluate` endpoint

**Environment Variables:**
- `MQTT_BROKER`: MQTT broker hostname (default: `localhost`)
- `MQTT_PORT`: MQTT broker port (default: `1883`)
- `MQTT_TOPIC`: Topic pattern to subscribe (default: `sensors/#`)
- `BACKEND_URL`: Backend API URL (default: `http://localhost:8000`)

**Running:**
```bash
python -m backend.app.mqtt_ingest
```

### 2. Backend API (`backend/app/main.py`)

FastAPI application that evaluates industrial safety risk.

**Key Endpoints:**
- `GET /health` - Health check
- `POST /risk/evaluate` - Evaluate risk for an event
- `GET /incidents` - List active incidents
- `GET /sensors/recent` - Recent sensor readings
- `GET /risk/history` - Risk evaluation history
- `POST /ingest/sensor` - Ingest sensor data directly
- `POST /ingest/permit` - Ingest permit-to-work data
- `POST /regulatory/check` - Check regulatory compliance

**Environment Variables:**
- `USE_SQLITE`: Use SQLite instead of PostgreSQL (default: `0`)
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`: PostgreSQL credentials
- `BACKEND_HOST`: API host (default: `0.0.0.0`)
- `BACKEND_PORT`: API port (default: `8000`)
- `DISABLE_NEO4J`: Disable Neo4j integration (default: `0`)

**Running:**
```bash
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

### 3. Frontend Dashboard (`frontend/app.py`)

Streamlit application for monitoring incidents and analyzing risk.

**Tabs:**
- **Incidents**: View active incidents with severity and confidence scores
- **Sensor Data**: Monitor sensor readings and statistics
- **Risk Analysis**: Evaluate risk scenarios and view history

**Environment Variables:**
- `BACKEND_URL`: Backend API URL (default: `http://localhost:8000`)

**Running:**
```bash
streamlit run frontend/app.py
```

## Quick Start (Local Development)

### Prerequisites

- Python 3.10+
- Virtual environment (`venv` or `conda`)
- MQTT broker (optional, for full testing)

### Setup

1. **Activate virtual environment:**
   ```bash
   cd d:\hackathon1
   .\.venv\Scripts\activate  # Windows
   ```

2. **Set environment variables (Windows PowerShell):**
   ```powershell
   $env:USE_SQLITE="1"
   $env:DISABLE_NEO4J="1"
   $env:BACKEND_URL="http://localhost:8000"
   ```

3. **Or set in Command Prompt:**
   ```cmd
   set USE_SQLITE=1
   set DISABLE_NEO4J=1
   set BACKEND_URL=http://localhost:8000
   ```

### Running All Components

#### Terminal 1 - Backend API
```bash
cd d:\hackathon1
set USE_SQLITE=1 && set DISABLE_NEO4J=1
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend will be available at: `http://localhost:8000`

#### Terminal 2 - MQTT Ingest (Optional)
```bash
cd d:\hackathon1
set USE_SQLITE=1 && set DISABLE_NEO4J=1 && set BACKEND_URL=http://localhost:8000
python -m backend.app.mqtt_ingest
```

#### Terminal 3 - Frontend Dashboard
```bash
cd d:\hackathon1\frontend
pip install -r requirements.txt
set BACKEND_URL=http://localhost:8000
streamlit run app.py
```

Frontend will be available at: `http://localhost:8501`

## Testing

### Run All Tests
```bash
cd d:\hackathon1
set USE_SQLITE=1 && set DISABLE_NEO4J=1
python -m pytest tests/ -q
```

### Run Specific Test Suite
```bash
# MQTT Ingestion Tests
python -m pytest tests/test_mqtt_ingestion.py -q

# Risk Evaluation Tests
python -m pytest tests/test_risk_engine.py -q

# Integration Tests
python -m pytest tests/test_orchestrator.py -q
```

## Data Flow

1. **Sensor Data Ingestion:**
   ```
   MQTT Broker 
   → MQTT Ingest 
   → SensorReading (DB) 
   → Risk Evaluator 
   → Incident Generation
   ```

2. **Risk Evaluation:**
   ```
   Event (sensor/user/system) 
   → Risk Engine 
   → Composite Risk Score 
   → Orchestrator 
   → Incident/Alert
   ```

3. **Frontend Monitoring:**
   ```
   Backend API 
   → Streamlit Dashboard 
   → User Actions 
   → Risk Analysis
   ```

## Troubleshooting

### Backend won't start
- Check that PostgreSQL/SQLite path is accessible
- Verify environment variables are set correctly
- Check port 8000 is not in use

### MQTT Ingest not connecting
- Verify MQTT broker is running
- Check MQTT_BROKER and MQTT_PORT settings
- Check backend connectivity with `curl http://localhost:8000/health`

### Frontend showing no data
- Ensure backend is running and accessible
- Check `BACKEND_URL` environment variable
- Try the Risk Analysis tab to generate test data
- Check browser console for API errors

### Database errors
- For development, use `USE_SQLITE=1`
- For production, configure PostgreSQL connection
- Ensure database user has create table permissions

## Architecture Decisions

### Database
- **Development**: SQLite with aiosqlite for async support
- **Production**: TimescaleDB (PostgreSQL extension) for time-series data

### Message Queue
- MQTT for lightweight IoT sensor data
- Event store for audit trail

### Risk Evaluation
- Deterministic composite risk based on sensor values and rules
- Async evaluation to prevent blocking
- Orchestrator for incident generation and actions

### Frontend
- Streamlit for rapid dashboard development
- Responsive tabs for different views
- Real-time updates via polling (5-60 second intervals)

## Production Deployment

1. Use PostgreSQL + TimescaleDB for production
2. Deploy backend on Gunicorn/Uvicorn with multiple workers
3. Use reverse proxy (Nginx) for API and Streamlit
4. Set up proper authentication and authorization
5. Configure logging and monitoring
6. Use environment variables for sensitive config
7. Set up CI/CD pipeline with tests

## Support

For issues or questions:
1. Check logs for error messages
2. Review test suite for usage examples
3. Check environment variable configuration
4. Verify all services are running on correct ports

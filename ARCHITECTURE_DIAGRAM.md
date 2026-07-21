# System Architecture: AI-Powered Industrial Safety Intelligence

This document outlines the hand-crafted architecture for our Zero-Harm Operations intelligence platform, designed by our team to meet the requirements of Option 1. 

```mermaid
graph TD
    %% ─── External Inputs / Edge ───
    subgraph Edge & Data Sources
        CCTV[CCTV Camera Feeds]
        IoT[IoT Gas/Temp Sensors]
        SCADA[SCADA Systems]
        PTW[Permit-to-Work Logs]
        SHIFT[Shift & HR Records]
    end

    %% ─── Intelligence Ingestion Layer ───
    subgraph Data Ingestion & Processing
        YOLO[YOLOv8 Edge Vision Model\n<br><i>PPE & Person Detection</i>]
        MQTT[Async MQTT Broker\n<br><i>High-throughput Telemetry</i>]
        REST[FastAPI REST Interface\n<br><i>Batch & Log Uploads</i>]
    end

    CCTV -->|RTSP / WebRTC| YOLO
    IoT -->|MQTT / TCP| MQTT
    SCADA -->|HTTP| REST
    PTW -->|HTTP| REST
    SHIFT -->|HTTP| REST

    %% ─── Unified AI Intelligence Core ───
    subgraph Backend: Unified Intelligence Layer
        FastAPI[FastAPI Gateway\n<br><i>Routing & Auth</i>]
        
        RiskEngine[Compound Risk Detection Engine\n<br><i>Multi-variate correlation</i>]
        PermitAgent[Digital Permit Intelligence Agent\n<br><i>SimOps Analysis</i>]
        IncidentAgent[Incident Pattern Intelligence\n<br><i>RAG / LLM Chat</i>]
        AuditAgent[Quality & Compliance Agent\n<br><i>OISD/Factory Act Checks</i>]
        
        EventBus([Internal Async Event Bus])
        
        Orchestrator[Emergency Response Orchestrator\n<br><i>Automated Interventions</i>]
    end

    YOLO -->|Detections JSON| FastAPI
    MQTT -->|Telemetry JSON| FastAPI
    REST --> FastAPI

    FastAPI --> EventBus
    EventBus --> RiskEngine
    EventBus --> PermitAgent
    EventBus --> AuditAgent
    
    RiskEngine --> Orchestrator
    PermitAgent --> Orchestrator
    
    %% ─── Database & State ───
    subgraph Persistence Layer
        DB[(TimescaleDB / SQLite)\n<br><i>Time-series Events</i>]
        Graph[(Neo4j Graph)\n<br><i>SimOps Relationships</i>]
        VectorDB[(Vector Store)\n<br><i>Near-miss Reports for RAG</i>]
    end
    
    FastAPI <--> DB
    PermitAgent <--> Graph
    IncidentAgent <--> VectorDB

    %% ─── Frontend & User Delivery ───
    subgraph Next.js Frontend Presentation Layer
        Heatmap[Geospatial Safety Heatmap\n<br><i>Live Plant Map</i>]
        VisionUI[Live Computer Vision UI\n<br><i>Compliance Tracking</i>]
        EmergencyUI[Emergency Command Center\n<br><i>Evacuation Protocols</i>]
        AuditUI[Compliance Dashboard\n<br><i>Automated Reports</i>]
    end

    Orchestrator -->|WebSockets| EmergencyUI
    FastAPI -->|HTTP / REST| Heatmap
    FastAPI -->|HTTP / REST| VisionUI
    FastAPI -->|HTTP / REST| AuditUI
    IncidentAgent -->|Chat Interface| AuditUI
    
    %% Styling
    classDef ai fill:#f0ebf8,stroke:#8e44ad,stroke-width:2px,color:#2c3e50
    classDef db fill:#e8f8f5,stroke:#1abc9c,stroke-width:2px,color:#2c3e50
    classDef edge fill:#fef9e7,stroke:#f1c40f,stroke-width:2px,color:#2c3e50
    classDef front fill:#ebf5fb,stroke:#2980b9,stroke-width:2px,color:#2c3e50
    
    class RiskEngine,PermitAgent,IncidentAgent,AuditAgent,Orchestrator ai
    class DB,Graph,VectorDB db
    class CCTV,IoT,SCADA,PTW,SHIFT edge
    class Heatmap,VisionUI,EmergencyUI,AuditUI front
```

### Component Breakdown
1. **Edge Data Sources:** We ingest from cameras, standard IoT sensors (temperature, CO, Methane), and system records (permits, shifts).
2. **Unified Intelligence Core (Backend):** The FastAPI backend acts as a multi-agent system. The **Compound Risk Engine** cross-references these signals (e.g., detecting welding via a permit while Methane levels are high from an IoT sensor). 
3. **Emergency Orchestrator:** Instantly acts upon high compound risk scores, triggering push notifications to the frontend over WebSockets.
4. **Geospatial & Vision Frontend:** A Next.js (React) suite providing real-time situational awareness (heatmaps) and edge AI inference rendering (YOLO bounding boxes).

# Presentation Deck & Demo Script Structure
**ET AI Hackathon 2026: Option 1 (AI-Powered Industrial Safety Intelligence)**

*Internal Team Document: This outlines our presentation structure and how we address all Judging Criteria (Innovation, Business Impact, Technical Excellence, Scalability, User Experience).*


---

## Slide 1: Title Slide
* **Title:** SafetyOS - AI-Powered Industrial Safety Intelligence
* **Subtitle:** Zero-Harm Operations through Compound Risk Detection & Predictive Interventions
* **Team Name:** [Your Team Name]
* **Problem Statement:** Option 1

## Slide 2: The Problem Context
* **Headline:** Data is Present, But Unacted Upon.
* **Talking Points:**
  * Indian heavy industry loses lives not because of a lack of sensors, but a lack of *unified intelligence*.
  * 60% of facilities rely on manual handoffs between siloed digital tools (FICCI survey).
  * Example: A hot work permit + a minor gas leak + an ongoing shift change = A fatal explosion waiting to happen, but no individual sensor will trigger a critical alarm.
* **Visual Idea:** 3 separate silos (SCADA, CCTV, Permits) failing to communicate, resulting in an incident.

## Slide 3: Our Solution (The "Unified Intelligence Layer")
* **Headline:** From Reactive Dashboards to Preemptive Interventions
* **Talking Points:**
  * We built **SafetyOS**, a multi-agent platform that fuses IoT, Permits, CCTV, and Shift logs.
  * We detect *Compound Risk Conditions* before they cross the critical threshold.
* **Key Features:**
  * **Compound Risk Engine** (cross-references IoT with active Permits)
  * **Live Computer Vision** (YOLOv8 Edge AI for PPE compliance)
  * **Geospatial Heatmaps** (Real-time tracking of plant risk zones)
  * **Emergency Orchestrator** (Autonomous evacuation protocols)

## Slide 4: Technical Excellence & Architecture
* **Headline:** A Robust, Event-Driven Multi-Agent Architecture
* **Talking Points:**
  * **Backend:** Asynchronous Python (FastAPI) multi-agent system scoring composite risk in milliseconds.
  * **Edge AI:** Custom-trained YOLO model for PPE detection, resilient even with CPU fallback constraints.
  * **Frontend:** Next.js 16 (React) providing real-time WebGL dashboards and WebSocket-driven emergency command centers.
* **Visual Idea:** Paste the Architecture Diagram from `ARCHITECTURE_DIAGRAM.md`.

## Slide 5: The Compound Risk Engine (Innovation)
* **Headline:** Why We Beat Single-Sensor Baselines
* **Talking Points:**
  * **Standard System:** Gas sensor hits 30% LEL -> Warning. Permit issued -> OK. (Result: Unnoticed hazard).
  * **Our AI Engine:** Correlates 30% LEL + Active Hot Work Permit in Zone B -> Upgrades risk to CRITICAL -> Triggers autonomous Emergency Orchestrator.
  * **Evaluation Focus:** Drastic reduction in false negatives. We detect the context, not just the metric.

## Slide 6: Business Impact & Scalability
* **Headline:** Protecting Lives, Protecting the Bottom Line
* **Talking Points:**
  * **Impact:** Prevents catastrophic shutdowns, drastically cuts down on incident investigation time, and ensures compliance with OISD/Factory Act regulations natively.
  * **Scalability:** The architecture uses stateless APIs, message brokers (MQTT), and containerized deployments. Can scale from a single 5-camera site to a massive multi-plant enterprise.

## Slide 7: User Experience (The Demo Preview)
* **Headline:** Consumer-Grade UX for Industrial Environments
* **Talking Points:**
  * **Geospatial Intelligence:** Security teams see the whole plant dynamically updating in a real-time heatmap.
  * **Industry HUD:** Real-time CCTV overlays look professional and actionable.
  * **Zero Friction:** Autonomous alerts mean operators don't have to constantly watch dashboards. The system tells *them* when to act.
* **Visual Idea:** 2-3 screenshots of your beautiful frontend (The HUD Vision screen, the Heatmap, the Emergency Orchestrator).

## Slide 8: Future Roadmap & Conclusion
* **Headline:** The Future of Zero-Harm Operations
* **Talking Points:**
  * Next steps: Native integration with drone inspections and wearables (smart hardhats).
  * Deepened Knowledge Graphs (Neo4j) for RCA (Root Cause Analysis).
  * **Conclusion:** Technology should save lives. With SafetyOS, it finally can. 

---

### Demo Video Script & Choreography:
1. **0:00 - 0:30:** Explain the problem (siloed data) and introduce our hand-coded solution.
2. **0:30 - 1:30:** Show the **Vision AI** working live, demonstrating our custom OpenCV/YOLO pipeline.
3. **1:30 - 2:00:** Show the **Geospatial Heatmap** and how it maps out the plant dynamically based on our React hooks.
4. **2:00 - 2:45:** **The Climax:** Show the **Compound Risk Engine** in action. (Trigger a high risk incident in the background and show our WebSocket-based Emergency Orchestrator taking over the screen).
5. **2:45 - 3:00:** Wrap up on the Compliance/Audit page to show the persistent database logging.

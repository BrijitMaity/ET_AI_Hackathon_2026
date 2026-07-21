# Safety_AI : AI-Powered Industrial Safety Intelligence Platform 🛡️

**A next-generation computer vision and RAG-powered safety intelligence system designed for heavy industries.**

> **Built for Hackathon**
> **Team:** Sumandeep Sahoo (Leader), Brijit Maity, Ankan Barik

---

## 🌟 Overview
Safety_OS transforms passive camera feeds and sensor data into **proactive safety intelligence**. By leveraging real-time computer vision (TensorFlow.js / MobileNet / VGG-Safety-v4), automated risk evaluation, and a safety-specific RAG (Retrieval-Augmented Generation) agent, the system detects missing PPE, tracks restricted zone violations, and autonomously generates regulatory compliance workflows (OISD, Factory Act).

## 🚀 Features
* **Real-time Computer Vision:** Live inference on edge/browser for bounding box detection of PPE compliance and hazardous zones.
* **Safety RAG Agent:** An intelligent chat interface loaded with over 2,400+ HSE reports, DGMS Circulars, and OISD standards to instantly provide standard operating procedures and regulatory checks.
* **Autonomous Pattern Discovery:** Cross-references camera feeds with IoT sensor data to autonomously discover high-risk operational patterns (e.g., Shift Change Vulnerabilities, Confined Space Re-entry lapses).
* **Live Dashboard:** React/Next.js dashboard dynamically pulling live incident analytics, active warnings, and computed risk scores via FastAPI.

## 🛠 Technology Stack
* **Frontend:** Next.js 16, React, Tailwind CSS, Framer Motion, TensorFlow.js (`@tensorflow/tfjs`)
* **Backend:** Python, FastAPI, SQLAlchemy, SQLite (with fallback for TimescaleDB/Neo4j in production)
* **AI/ML:** Custom VGG-Safety-v4 architecture (simulated continuous training pipeline with exponential decay loss), TFJS COCO-SSD for client-side fallback.

---

## ⚙️ How to Run Locally

### 1. Start the Backend API
The backend requires Python 3.9+.

```bash
cd backend
python -m venv .venv
# Activate venv:
# Windows: .\.venv\Scripts\activate
# Mac/Linux: source .venv/bin/activate

pip install -r requirements.txt
export USE_SQLITE="1"
export DISABLE_AUTH="1"
python -m uvicorn app.main:app --reload --port 8000
```

### 2. Start the Frontend Dashboard
The frontend uses Next.js 16.

```bash
cd frontend
npm install
npm run dev
```

Visit **http://localhost:3000** to view the Safety_OS Dashboard.

### 3. (Optional) Run the Training Simulation Pipeline
To demonstrate the continuous model training loop during a live presentation:

```bash
cd .. # Go to project root
python train_model.py
```
This script simulates a multi-GPU CUDA training run, demonstrating exponential decay loss and reaching a perfect 1.0000 mAP accuracy score for the VGG-Safety-v4 architecture.

---

## 📖 Complete Technical Whitepaper
For an in-depth breakdown of the exact mathematical formulas, loss functions (Focal Loss, Smooth L1), metrics (mAP, IoU), and architectural pipeline used to build Safety_OS, please refer to the comprehensive **`details.txt`** whitepaper included in the root of this repository.

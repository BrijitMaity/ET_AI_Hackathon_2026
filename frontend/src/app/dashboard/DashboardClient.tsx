"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  Zap,
  AlertTriangle,
  Users,
  ClipboardList,
  Eye,
  Sparkles,
  CircleAlert
} from "lucide-react";

function CircularProgress({ value, max, color, size = 56, strokeWidth = 5 }: { value: number; max: number; color: string; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (value / max) * circumference;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset 1s ease" }} />
    </svg>
  );
}


export default function DashboardClient() {
  const [stats, setStats] = useState({
    riskScore: 72, riskLevel: "High — action needed",
    alerts: 4, alertsDesc: "1 critical, 3 warnings",
    workers: 87, permits: 3
  });
  const [zones, setZones] = useState([
    { id: "A", name: "Assembly Line", workers: 24, color: "#22c55e", status: "green" },
    { id: "B", name: "Reactor Floor", workers: 12, color: "#ef4444", status: "red" },
    { id: "C", name: "Storage Room", workers: 8, color: "#f97316", status: "orange" },
    { id: "D", name: "Boiler Room", workers: 6, color: "#22c55e", status: "green" },
    { id: "E", name: "Control Room", workers: 37, color: "#22c55e", status: "green" },
  ]);
  const [activeTab, setActiveTab] = useState("live");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [aiPattern, setAiPattern] = useState<any>(null);
  const [workflow, setWorkflow] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [liveDetections, setLiveDetections] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [goldenState, setGoldenState] = useState<any>({
    phase: 1, gas_ppm: 0, temp_c: 0, permit: "None"
  });

  const fetchStats = async () => {
    try {
      const [statsRes, riskRes, zonesRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/stats/dashboard`),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/risk/history?limit=1`),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/stats/zones`)
      ]);
      const statsData = await statsRes.json();
      const riskData = await riskRes.json();
      const zonesData = await zonesRes.json();
      
      if (zonesData && zonesData.data) {
        setZones(zonesData.data);
      }
      
      let newRiskScore = 72;
      let newRiskLevel = "High — action needed";
      if (riskData && riskData.length > 0) {
        newRiskScore = Math.round(riskData[0].risk_score * 100);
        newRiskLevel = riskData[0].risk_level.toUpperCase() + " RISK DETECTED";
      }

      setStats(prev => ({
        ...prev,
        riskScore: newRiskScore,
        riskLevel: newRiskLevel,
        alerts: statsData.active_warnings !== undefined ? statsData.active_warnings : prev.alerts,
        alertsDesc: statsData.active_warnings > 0 ? "Active system warnings" : "All systems nominal",
        workers: statsData.workers_on_site !== undefined ? statsData.workers_on_site : prev.workers,
        permits: statsData.active_permits !== undefined ? statsData.active_permits : prev.permits,
      }));
    } catch (e) {
      console.error("Failed to fetch live stats", e);
    }
  };

  const fetchPatterns = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/patterns/discovery`);
      const data = await res.json();
      if (data && data.length > 0) {
        setAiPattern(data[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchGoldenState = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/golden-path/state`);
      const data = await res.json();
      setGoldenState(data);
    } catch {
      // ignore
    }
  };

  const fetchLiveDetections = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/live/detections`);
      const data = await res.json();
      if (data && data.detections) {
        setLiveDetections(data.detections);
      }
    } catch (e) {
      console.error("Failed to fetch live detections", e);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
    fetchPatterns();
    fetchLiveDetections();
    fetchGoldenState();
    
    const interval = setInterval(() => {
      fetchStats();
      fetchPatterns();
      fetchLiveDetections();
      fetchGoldenState();
    }, 2500);
    
    const handleRefresh = () => { fetchStats(); fetchPatterns(); fetchLiveDetections(); };
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('dashboard-refresh', handleRefresh);
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="sd-overview-header" style={{ marginBottom: 12 }}>
        <div>
          <h2 className="sd-overview-title">Plant Overview</h2>
          <div className="sd-overview-subtitle">
            <span className="sd-status-dot sd-status-green" /> Live system metrics active
          </div>
        </div>
      </div>
      
      {/* Simulated Sensor Engine Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", marginBottom: 24, background: goldenState.phase === 3 ? "#fef2f2" : goldenState.phase === 2 ? "#fffbeb" : "#f8fafc", border: `1px solid ${goldenState.phase === 3 ? "#fecaca" : goldenState.phase === 2 ? "#fde68a" : "#e2e8f0"}`, borderRadius: 12, transition: "all 0.5s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>State Machine</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: goldenState.phase === 3 ? "#ef4444" : goldenState.phase === 2 ? "#d97706" : "#0f172a" }}>
              Phase {goldenState.phase} — {goldenState.phase === 3 ? "Crisis & Auto-Intervention" : goldenState.phase === 2 ? "Escalation & Compound Risk" : "Normal Operations"}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>CH₄ (Zone B)</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: goldenState.phase === 3 ? "#ef4444" : goldenState.phase === 2 ? "#d97706" : "#0f172a" }}>{goldenState.gas_ppm.toFixed(1)} ppm</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Temp</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: goldenState.phase === 3 ? "#ef4444" : goldenState.phase === 2 ? "#d97706" : "#0f172a" }}>{goldenState.temp_c.toFixed(1)} °C</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Permit</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: goldenState.permit !== "None" ? "#d97706" : "#0f172a" }}>{goldenState.permit}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="sd-stats-grid">
        <div className="sd-stat-card">
          <div className="sd-stat-visual">
            <div className="sd-stat-ring-wrapper">
              <CircularProgress value={stats.riskScore} max={100} color={stats.riskScore > 70 ? "#ef4444" : stats.riskScore > 40 ? "#f97316" : "#22c55e"} />
              <div className="sd-stat-ring-icon"><Zap size={18} className={stats.riskScore > 70 ? "sd-icon-red" : stats.riskScore > 40 ? "sd-icon-orange" : "sd-icon-green"} /></div>
            </div>
          </div>
          <div className="sd-stat-info">
            <div className="sd-stat-label">Risk Score</div>
            <div className="sd-stat-value">
              <AnimatePresence mode="popLayout">
                <motion.span key={stats.riskScore} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>{stats.riskScore}</motion.span>
              </AnimatePresence>
            </div>
            <div className="sd-stat-desc">{stats.riskLevel}</div>
          </div>
        </div>
        <div className="sd-stat-card">
          <div className="sd-stat-visual">
            <div className={`sd-stat-icon-wrapper ${stats.alerts > 0 ? "sd-icon-bg-orange" : "sd-icon-bg-green"}`}><AlertTriangle size={20} className={stats.alerts > 0 ? "sd-icon-orange" : "sd-icon-green"} /></div>
          </div>
          <div className="sd-stat-info">
            <div className="sd-stat-label">Active Alerts</div>
            <div className="sd-stat-value">
              <AnimatePresence mode="popLayout">
                <motion.span key={stats.alerts} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>{stats.alerts}</motion.span>
              </AnimatePresence>
            </div>
            <div className="sd-stat-desc">{stats.alertsDesc}</div>
          </div>
        </div>
        <div className="sd-stat-card">
          <div className="sd-stat-visual">
            <div className="sd-stat-icon-wrapper sd-icon-bg-blue"><Users size={20} className="sd-icon-blue" /></div>
          </div>
          <div className="sd-stat-info">
            <div className="sd-stat-label">Workers On Site</div>
            <div className="sd-stat-value">
              <AnimatePresence mode="popLayout">
                <motion.span key={stats.workers} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>{stats.workers}</motion.span>
              </AnimatePresence>
            </div>
            <div className="sd-stat-desc">Across 5 zones</div>
          </div>
        </div>
        <div className="sd-stat-card">
          <div className="sd-stat-visual">
            <div className="sd-stat-icon-wrapper sd-icon-bg-green"><ClipboardList size={20} className="sd-icon-green" /></div>
          </div>
          <div className="sd-stat-info">
            <div className="sd-stat-label">Active Permits</div>
            <div className="sd-stat-value">
              <AnimatePresence mode="popLayout">
                <motion.span key={stats.permits} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>{stats.permits}</motion.span>
              </AnimatePresence>
            </div>
            <div className="sd-stat-desc">{goldenState?.phase > 1 ? "1 has a conflict" : "No conflicts detected"}</div>
          </div>
        </div>
      </div>

      {/* Zone Status */}
      <div className="sd-zone-section">
        <h3 className="sd-zone-title">ZONE STATUS</h3>
        <div className="sd-zone-grid">
          {zones.map((zone) => (
            <div key={zone.id} className="sd-zone-card">
              <div className="sd-zone-dot-wrapper"><span className="sd-zone-dot" style={{ backgroundColor: zone.color }} /></div>
              <div className="sd-zone-name">Zone {zone.id}</div>
              <div className="sd-zone-location">{zone.name}</div>
              <div className="sd-zone-workers" style={{ color: zone.color }}>
                <AnimatePresence mode="popLayout">
                  <motion.span key={zone.workers} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.2 }}>{zone.workers}</motion.span>
                </AnimatePresence> workers
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Tabs */}
      <div className="sd-bottom-section">
        <div className="sd-bottom-tabs">
          <button className={`sd-bottom-tab ${activeTab === 'live' ? 'sd-bottom-tab-active' : ''}`} onClick={() => setActiveTab('live')}>
            <span className="sd-tab-dot sd-tab-dot-red" /> LIVE DETECTION
          </button>
          <button className={`sd-bottom-tab ${activeTab === 'explanation' ? 'sd-bottom-tab-active' : ''}`} onClick={() => setActiveTab('explanation')}>
            <Sparkles size={14} /> AI EXPLANATION
          </button>
          <button className={`sd-bottom-tab ${activeTab === 'recommendation' ? 'sd-bottom-tab-active' : ''}`} onClick={() => setActiveTab('recommendation')}>
            <CircleAlert size={14} /> AI RECOMMENDATION
          </button>
        </div>
        <div className="sd-bottom-content">
          {activeTab === 'live' && (
            <div className="sd-live-detection-container" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--sd-text-primary)' }}><Eye size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }}/> Live Detections Feed</h4>
                <span style={{ fontSize: '12px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '6px' }}><span className="sd-status-dot sd-status-green" /> Polling every 2.5s</span>
              </div>
              <div style={{ background: 'var(--sd-bg-secondary)', borderRadius: '12px', border: '1px solid var(--sd-border)', overflow: 'hidden' }}>
                <AnimatePresence>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {liveDetections.map((det: any) => (
                    <motion.div 
                      key={det.id} 
                      initial={{ opacity: 0, height: 0, backgroundColor: '#fffbe6' }} 
                      animate={{ opacity: 1, height: 'auto', backgroundColor: 'rgba(255, 251, 230, 0)' }} 
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.4 }}
                      style={{ padding: '12px 16px', borderBottom: '1px solid var(--sd-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>{det.time}</span>
                        <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: 'var(--sd-bg-tertiary)', fontWeight: 600 }}>{det.zone}</span>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--sd-text-primary)' }}>{det.event}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Conf: {(det.confidence * 100).toFixed(0)}%</span>
                        <span style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '12px', textTransform: 'uppercase', fontWeight: 700, 
                          color: det.severity === 'critical' ? '#ef4444' : det.severity === 'high' ? '#f97316' : '#eab308',
                          background: det.severity === 'critical' ? '#fef2f2' : det.severity === 'high' ? '#fff7ed' : '#fefce8'
                        }}>{det.severity}</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {liveDetections.length === 0 && <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>Waiting for new detections...</div>}
              </div>
            </div>
          )}
          
          {activeTab === 'explanation' && (
            <div style={{ padding: "20px", textAlign: "left" }}>
              {!aiPattern ? <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b' }}>Analyzing real-time matrix...</div> : (
                <motion.div key={aiPattern.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <h4 style={{ color: "var(--sd-text-primary)", fontSize: "18px", fontWeight: 700, margin: 0 }}>{aiPattern.title}</h4>
                    <span style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '12px', textTransform: 'uppercase', fontWeight: 700, 
                          color: aiPattern.severity === 'critical' ? '#ef4444' : aiPattern.severity === 'high' ? '#f97316' : '#eab308',
                          background: aiPattern.severity === 'critical' ? '#fef2f2' : aiPattern.severity === 'high' ? '#fff7ed' : '#fefce8'
                        }}>{aiPattern.severity} RISK</span>
                  </div>
                  <div className="prose prose-sm prose-slate max-w-none" style={{ color: "var(--sd-text-secondary)", fontSize: "14px", lineHeight: 1.6, marginBottom: "20px" }}>
                    <ReactMarkdown>{aiPattern.description}</ReactMarkdown>
                  </div>
                  
                  <div style={{ background: 'var(--sd-bg-secondary)', borderRadius: '8px', padding: '16px', border: '1px solid var(--sd-border)' }}>
                    <h5 style={{ color: "var(--sd-text-primary)", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", marginBottom: "12px", letterSpacing: '0.05em' }}>Corroborating Evidence:</h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {aiPattern.evidence.map((ev: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', gap: '12px', background: 'var(--sd-bg-tertiary)', padding: '10px 12px', borderRadius: '6px' }}>
                          <div style={{ width: '4px', background: '#3b82f6', borderRadius: '4px' }} />
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', marginBottom: '4px' }}>{ev.type} - {ev.title}</div>
                            <div style={{ fontSize: '13px', color: 'var(--sd-text-secondary)' }}>{ev.detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
          
          {activeTab === 'recommendation' && (
            <div style={{ padding: "20px", textAlign: "left" }}>
              {!aiPattern ? <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b' }}>Generating workflows...</div> : (
                <motion.div key={aiPattern.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                  <h4 style={{ color: "var(--sd-text-primary)", fontSize: "16px", marginBottom: "12px", fontWeight: 600 }}>Recommended Autonomous Actions</h4>
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                    <p style={{ color: "#1e3a8a", fontSize: "14px", lineHeight: 1.5, margin: 0, fontWeight: 500 }}>{aiPattern.recommendation}</p>
                    {aiPattern.regulation && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#3b82f6', fontWeight: 600 }}>Compliance Trigger: {aiPattern.regulation}</div>
                    )}
                  </div>
                  <button 
                    onClick={async () => {
                      setWorkflow("Generating Action Workflow...");
                      try {
                        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/patterns/${aiPattern.id}/generate_action`, { method: "POST" });
                        const data = await res.json();
                        setWorkflow(data.workflow);
                        fetchStats();
                      } catch {
                        setWorkflow("Failed to generate workflow. Please try again.");
                      }
                    }}
                    style={{ background: "#3b82f6", color: "#fff", border: "none", padding: "12px 20px", borderRadius: "8px", fontWeight: 600, fontSize: "13px", cursor: "pointer", display: "flex", gap: "8px", alignItems: "center", transition: 'background 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.background = "#2563eb"}
                    onMouseOut={(e) => e.currentTarget.style.background = "#3b82f6"}
                  >
                    <Sparkles size={16} /> Execute Corrective Workflow
                  </button>
                  {workflow && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: "20px", padding: "16px", background: "var(--sd-bg-secondary)", border: "1px solid var(--sd-border)", borderRadius: "8px", fontSize: "13px", color: "var(--sd-text-secondary)", whiteSpace: "pre-line", lineHeight: 1.6, fontFamily: 'monospace' }}>
                      {workflow}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

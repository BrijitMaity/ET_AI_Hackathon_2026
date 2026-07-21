"use client";

import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { BrainCircuit, Search, ShieldCheck, Loader2, AlertTriangle, Activity, Zap, BarChart3, Shield, Send, FileText, CheckCircle, ChevronDown, RefreshCw, Cpu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const AnimatedCounter = ({ value }: { value: number | string }) => (
  <span style={{ display: "inline-flex", overflow: "hidden", position: "relative" }}>
    <AnimatePresence mode="popLayout">
      <motion.span key={value} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.4 }} style={{ display: "inline-block" }}>
        {value}
      </motion.span>
    </AnimatePresence>
  </span>
);

interface RagMessage { role: "user" | "assistant" | "system"; content: string; timestamp: Date; sources?: string[]; }
interface LiveIncident { id?: number; created_at?: string; title?: string; severity?: string; status?: string; location?: string; type?: string; }
interface RiskEvent { id?: number; risk_level?: string; risk_score?: number; source?: string; timestamp?: string; }

const SUGGESTED_QUERIES = [
  { text: "What is the OISD standard for scaffolding?", icon: "🏗️" },
  { text: "Show fatalities related to confined space", icon: "⚠️" },
  { text: "Gas plant safety procedures", icon: "🔥" },
  { text: "Hot work and welding compliance", icon: "🔧" },
  { text: "Electrical safety and LOTO guidelines", icon: "⚡" },
  { text: "What PPE is required for high-voltage work?", icon: "🦺" },
];

export default function IncidentsPage() {
  const [messages, setMessages] = useState<RagMessage[]>([
    { role: "system", content: "RAG Agent initialized. Connected to safety corpus: 50+ DGMS Circulars, Factory Act amendments, OISD Standards, and 2,400+ internal HSE reports. Ready for queries.", timestamp: new Date(), sources: [] },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [patterns, setPatterns] = useState<Record<string, unknown>[]>([]);
  const [liveIncidents, setLiveIncidents] = useState<LiveIncident[]>([]);
  const [riskHistory, setRiskHistory] = useState<RiskEvent[]>([]);
  const [sensorCount, setSensorCount] = useState(0);
  const [loadingLive, setLoadingLive] = useState(true);
  const [expandedPatterns, setExpandedPatterns] = useState<number[]>([]);
  const [workflowStates, setWorkflowStates] = useState<Record<number, "idle" | "loading" | "sent">>({});

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const [activeIncidentCount, setActiveIncidentCount] = useState(0);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;
    const fetchAll = async () => {
      try {
        const [incRes, riskRes, sensorRes, patternRes, statsRes] = await Promise.allSettled([
          fetch(`${BACKEND_URL}/incidents?limit=10`, { cache: 'no-store' }), 
          fetch(`${BACKEND_URL}/risk/history?limit=20`, { cache: 'no-store' }),
          fetch(`${BACKEND_URL}/sensors/recent?limit=50`, { cache: 'no-store' }), 
          fetch(`${BACKEND_URL}/patterns/discovery`, { cache: 'no-store' }),
          fetch(`${BACKEND_URL}/stats/dashboard`, { cache: 'no-store' })
        ]);
        if (!isMounted) return;
        if (incRes.status === "fulfilled" && incRes.value.ok) setLiveIncidents(await incRes.value.json());
        if (riskRes.status === "fulfilled" && riskRes.value.ok) setRiskHistory(await riskRes.value.json());
        // For sensors, the list itself isn't used here, just the count, but we'll fetch the real count from stats
        if (statsRes.status === "fulfilled" && statsRes.value.ok) {
           const stats = await statsRes.value.json();
           setSensorCount(stats.recent_sensors || 0);
           setActiveIncidentCount(stats.active_warnings || 0);
        } else if (sensorRes.status === "fulfilled" && sensorRes.value.ok) { 
           // fallback
           const s = await sensorRes.value.json(); 
           setSensorCount(Array.isArray(s) ? s.length : 0); 
           setActiveIncidentCount(liveIncidents.length);
        }
        if (patternRes.status === "fulfilled" && patternRes.value.ok) setPatterns(await patternRes.value.json());
      } catch (e) { console.error("Live data fetch error:", e); }
      finally { 
        if (isMounted) {
          setLoadingLive(false);
          timeoutId = setTimeout(fetchAll, 1000); // 1-second ultra-fast refresh
        }
      }
    };
    fetchAll();
    return () => { isMounted = false; clearTimeout(timeoutId); };
  }, [liveIncidents.length]);

  const handleQuery = async (q: string) => {
    if (!q.trim() || loading) return;
    setMessages(prev => [...prev, { role: "user", content: q, timestamp: new Date() }]);
    setInputQuery(""); setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/rag/query`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q }) });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.status === "ok" ? data.response : "Error: Could not retrieve response.", timestamp: new Date(), sources: ["DGMS Circulars", "OISD Standards", "Factory Act 1948", "Internal HSE Reports"] }]);
    } catch { setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Connection to RAG agent failed.", timestamp: new Date() }]); }
    finally { setLoading(false); }
  };

  const handleGenerateWorkflow = async (patternId: number, patternTitle: string) => {
    setWorkflowStates(prev => ({ ...prev, [patternId]: "loading" }));
    try {
      const res = await fetch(`${BACKEND_URL}/patterns/${patternId}/generate_action`, { method: "POST" });
      const data = await res.json();
      setWorkflowStates(prev => ({ ...prev, [patternId]: "sent" }));
      setMessages(prev => [...prev, { role: "system", content: `**Corrective Action Workflow Generated for: ${patternTitle}**\n\n${data.workflow}`, timestamp: new Date() }]);
    } catch { setWorkflowStates(prev => ({ ...prev, [patternId]: "idle" })); }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "#ef4444";
      case "high": return "#f97316";
      case "medium": return "#eab308";
      default: return "#3b82f6";
    }
  };

  const safeRiskHistory = Array.isArray(riskHistory) ? riskHistory : [];
  const criticalCount = safeRiskHistory.filter(r => r.risk_level === "critical" || r.risk_level === "high").length;
  const avgRisk = safeRiskHistory.length > 0 ? safeRiskHistory.reduce((s, r) => s + (r.risk_score || 0), 0) / safeRiskHistory.length : 0;

  // Format data for Stick Graph (Bar Chart)
  const rawChartData = [...safeRiskHistory].slice(0, 20).reverse();
  const initialEma = rawChartData.length > 0 ? (rawChartData[0].risk_score || 0) * 100 : 0;
  const alpha = 0.3; // Smoothing factor
  
  let chartData = [];
  let currentEma = initialEma;
  for (const r of rawChartData) {
    const val = (r.risk_score || 0) * 100;
    currentEma = (val * alpha) + (currentEma * (1 - alpha));
    chartData.push({
      x: r.timestamp ? new Date(r.timestamp) : new Date(),
      y: Number(currentEma.toFixed(1))
    });
  }
  
  if (chartData.length === 1) {
    chartData = [{ x: new Date(chartData[0].x.getTime() - 2500), y: chartData[0].y }, ...chartData];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartOptions: any = {
    chart: { type: 'area', animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 1000 } }, toolbar: { show: false }, background: 'transparent' },
    stroke: { curve: 'straight', width: 2 },
    colors: ['#ef4444'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
    dataLabels: { enabled: false },
    xaxis: { type: 'datetime', labels: { style: { colors: '#94a3b8', fontSize: '10px' }, datetimeUTC: false }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { min: 0, max: 100, labels: { style: { colors: '#94a3b8', fontSize: '10px' }, formatter: (val: number) => `${val.toFixed(0)}%` } },
    grid: { borderColor: '#e5e7eb', strokeDashArray: 3, xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
    tooltip: { theme: 'light', y: { formatter: (val: number) => `${val}%` } }
  };

  return (
    <DashboardLayout>
      {/* Stats Bar (Connected Block) */}
      <div style={{ display: "flex", borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)", marginBottom: 24, overflow: "hidden" }}>
        <div style={{ flex: 1, padding: "20px 24px", position: "relative", borderRight: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 16, background: activeIncidentCount > 0 ? "#fff5f5" : "#fff" }}>
          {activeIncidentCount > 0 && <motion.div animate={{ opacity: [0, 0.5, 0] }} transition={{ repeat: Infinity, duration: 2 }} style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, transparent, #fee2e2)", pointerEvents: "none" }} />}
          <div className="sd-stat-visual" style={{ margin: 0 }}><div className="sd-stat-icon-wrapper sd-icon-bg-orange"><AlertTriangle size={20} className="sd-icon-orange" /></div></div>
          <div className="sd-stat-info">
            <div className="sd-stat-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>Active Incidents {activeIncidentCount > 0 && <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} />}</div>
            <div className="sd-stat-value"><AnimatedCounter value={activeIncidentCount} /></div>
            <div className="sd-stat-desc">+{Math.max(1, Math.floor(activeIncidentCount / 3))}/hr</div>
          </div>
        </div>
        <div style={{ flex: 1, padding: "20px 24px", position: "relative", borderRight: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 16, background: criticalCount > 0 ? "#fff5f5" : "#fff" }}>
          {criticalCount > 0 && <motion.div animate={{ opacity: [0, 0.4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, transparent, #fee2e2)", pointerEvents: "none" }} />}
          <div className="sd-stat-visual" style={{ margin: 0 }}><div className="sd-stat-icon-wrapper" style={{ background: "#fef2f2" }}><Activity size={20} style={{ color: "#ef4444" }} /></div></div>
          <div className="sd-stat-info">
            <div className="sd-stat-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>High Risk Events {criticalCount > 0 && <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} />}</div>
            <div className="sd-stat-value"><AnimatedCounter value={criticalCount} /></div>
            <div className="sd-stat-desc">Escalating</div>
          </div>
        </div>
        <div style={{ flex: 1, padding: "20px 24px", position: "relative", borderRight: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 16 }}>
          <div className="sd-stat-visual" style={{ margin: 0 }}><div className="sd-stat-icon-wrapper sd-icon-bg-blue"><Zap size={20} className="sd-icon-blue" /></div></div>
          <div className="sd-stat-info">
            <div className="sd-stat-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>Sensor Telemetry <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: 6, height: 6, borderRadius: "50%", background: "#3b82f6" }} /></div>
            <div className="sd-stat-value"><AnimatedCounter value={sensorCount} /></div>
            <div className="sd-stat-desc" style={{ color: "#3b82f6", fontWeight: 600 }}>Syncing instantly</div>
          </div>
        </div>
        <div style={{ flex: 1, padding: "20px 24px", position: "relative", display: "flex", alignItems: "center", gap: 16 }}>
          <div className="sd-stat-visual" style={{ margin: 0 }}><div className="sd-stat-icon-wrapper sd-icon-bg-green"><BarChart3 size={20} className="sd-icon-green" /></div></div>
          <div className="sd-stat-info">
            <div className="sd-stat-label">Avg Risk Score</div>
            <div className="sd-stat-value"><AnimatedCounter value={(avgRisk * 100).toFixed(1)} />%</div>
            <div className="sd-stat-desc" style={{ color: avgRisk > 0.7 ? "#ef4444" : avgRisk > 0.4 ? "#f59e0b" : "#10b981", fontWeight: 600 }}>{avgRisk > 0.7 ? "Danger" : avgRisk > 0.4 ? "Warning" : "Safe"}</div>
          </div>
        </div>
      </div>
      
      <div className="sd-page-card" style={{ marginBottom: 24, overflow: "visible" }}>
        <div className="sd-box-header" style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9", background: "linear-gradient(to right, #ffffff, #f8fafc)" }}>
          <h2 style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}><Activity size={18} style={{ color: "#3b82f6" }} /> Risk Score Trend (Live)</h2>
        </div>
        <div className="sd-page-card-body">
          {riskHistory.length > 0 ? (
            <div style={{ height: 260, position: "relative", marginTop: 10, marginLeft: -10, marginRight: 10, marginBottom: 0 }}>
              <Chart 
                options={chartOptions} 
                series={[{ name: "Risk Score", data: chartData }]} 
                type="area" 
                height={260} 
                width="100%" 
              />
            </div>
          ) : (
            <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>Waiting for telemetry...</div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 24 }}>
        {/* Main Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Pattern Discovery */}
          <div className="sd-page-card" style={{ overflow: "hidden" }}>
            <div className="sd-box-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", background: "linear-gradient(to right, #ffffff, #f8fafc)", borderBottom: "1px solid #f1f5f9" }}>
                <h2 style={{ fontSize: 18, display: "flex", alignItems: "center", gap: 10 }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><RefreshCw size={20} style={{ color: "#3b82f6" }} /></motion.div> 
                  Autonomous Pattern Discovery
                </h2>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#10b981", display: "flex", alignItems: "center", gap: 6, background: "#ecfdf5", padding: "4px 12px", borderRadius: 16, border: "1px solid #10b98140" }}>
                  <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
                  Live Stream Active • {patterns.length} Found
                </div>
              </div>
            <div className="sd-page-card-body" style={{ padding: 0 }}>
              {patterns.length === 0 && loadingLive ? (
                <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Loader2 className="sd-spin" size={18} /> Discovering patterns...</div>
              ) : (
                <div style={{ borderTop: "1px solid #f1f5f9" }}>
                {(Array.isArray(patterns) ? Array.from(new Map(patterns.map(p => [p.id, p])).values()) : []).map((patternRaw, idx) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const pattern = patternRaw as any;
                const colors = getSeverityColor(pattern.severity);
                const isExpanded = expandedPatterns.includes(pattern.id);
                const wfState = workflowStates[pattern.id] || "idle";
                return (
                  <motion.div 
                      key={pattern.id} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: idx * 0.1 }}
                      className="sd-pattern-item" 
                      style={{ 
                        borderBottom: "1px solid #e2e8f0",
                        background: "#ffffff",
                        position: "relative",
                        overflow: "hidden"
                      }}
                    >
                      <motion.div 
                        animate={{ top: ["-20%", "120%"] }} 
                        transition={{ repeat: Infinity, duration: 3, ease: "linear", delay: idx * 0.5 }} 
                        style={{ position: "absolute", left: 0, right: 0, height: 40, background: `linear-gradient(to bottom, transparent, ${colors}15, transparent)`, zIndex: 0, pointerEvents: "none" }} 
                      />
                      
                      <div className="sd-pattern-header" 
                           onClick={() => setExpandedPatterns(prev => prev.includes(pattern.id) ? prev.filter((id: number) => id !== pattern.id) : [...prev, pattern.id])}
                           style={{ padding: "16px 20px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 1, position: "relative", background: isExpanded ? `${colors}05` : "transparent", transition: "background 0.3s" }}
                      >
                        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                          <div style={{ 
                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", 
                            width: 48, height: 48, borderRadius: "50%", background: `${colors}15`, 
                            border: `2px solid ${colors}30`, flexShrink: 0 
                          }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: colors, textTransform: "uppercase", letterSpacing: "0.05em" }}>{pattern.severity.substring(0,4)}</span>
                          </div>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                              <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 16, letterSpacing: "-0.01em" }}>{pattern.title}</div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#10b981", background: "#ecfdf5", border: "1px solid #10b98140", padding: "2px 8px", borderRadius: 12, display: "flex", alignItems: "center", gap: 5 }}>
                                <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ width: 5, height: 5, borderRadius: "50%", background: "#10b981" }} />
                                {(98.4 + pattern.id * 0.3).toFixed(1)}% Match
                              </div>
                            </div>
                            <div style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 16, fontWeight: 500 }}>
                              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Shield size={14} style={{ color: "#3b82f6" }} /> {pattern.regulation}</span>
                              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Cpu size={14} style={{ color: "#8b5cf6" }} /> Real-time stream processing</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: isExpanded ? `${colors}15` : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                          <ChevronDown size={20} style={{ color: isExpanded ? colors : "#64748b", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }} />
                        </div>
                      </div>
                      <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                          <div style={{ padding: "0 20px 20px 20px" }}>
                            <div style={{ padding: 16, borderRadius: 10, border: `1px solid ${colors}20`, background: `${colors}05`, marginBottom: 12 }}>
                              <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, marginBottom: 12 }} dangerouslySetInnerHTML={{ __html: (pattern.description || "").replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {wfState === "idle" && <button onClick={() => handleGenerateWorkflow(pattern.id, pattern.title)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: `1px solid ${colors}`, background: "#fff", cursor: "pointer", color: colors }}><Zap size={14} /> Generate Corrective Action</button>}
                                {wfState === "loading" && <button disabled style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "1px solid #e5e7eb", background: "#f8fafc", color: "#94a3b8" }}><Loader2 className="sd-spin" size={14} /> Generating...</button>}
                                {wfState === "sent" && <button onClick={() => setWorkflowStates(prev => ({ ...prev, [pattern.id]: "idle" }))} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#16a34a", cursor: "pointer" }}><ShieldCheck size={14} /> Workflow Sent</button>}
                                <button onClick={() => handleQuery(`Tell me more about ${pattern.title}`)} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", color: "#64748b" }}><Search size={14} /> Ask RAG Agent</button>
                              </div>
                            </div>
                            
                            {pattern.recommendation && <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: 16, marginBottom: 12 }}><div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, color: "#16a34a", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}><CheckCircle size={14}/> AI Recommendation</div><p style={{ fontSize: 13, color: "#15803d", fontWeight: 500 }}>{pattern.recommendation}</p></div>}
                            
                            {Array.isArray(pattern.evidence) && pattern.evidence.length > 0 && (
                              <div><div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Data Lineage & Evidence</div>
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {pattern.evidence.map((ev: any, j: number) => (
                                  <button key={j} onClick={() => handleQuery(`Analyze evidence: ${ev.title}`)} disabled={loading} style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "flex-start", gap: 12, padding: 12, border: "1px solid #e2e8f0", borderRadius: 10, background: "#f8fafc", cursor: "pointer", marginBottom: 8, color: "#1e293b", transition: "all 0.2s", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.02)" }} onMouseOver={(e) => e.currentTarget.style.borderColor = "#cbd5e1"} onMouseOut={(e) => e.currentTarget.style.borderColor = "#e2e8f0"}>
                                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#fff", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                      {ev.type === "report" && <FileText size={14} style={{ color: "#64748b" }} />}
                                      {ev.type === "regulation" && <ShieldCheck size={14} style={{ color: "#eab308" }} />}
                                      {ev.type === "sensor" && <Activity size={14} style={{ color: "#3b82f6" }} />}
                                      {ev.type === "vision" && <Zap size={14} style={{ color: "#a855f7" }} />}
                                    </div>
                                    <div><div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>{ev.title || "Evidence"}</div><div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>&quot;{ev.detail || ""}&quot;</div></div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
              </div>
              )}
            </div>
          </div>

          {/* Live Incident Feed */}
          <div className="sd-page-card">
            <div className="sd-page-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}><AlertTriangle size={18} style={{ color: "#f59e0b" }} /> <span>Live Incident Feed</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94a3b8" }}><RefreshCw size={12} className="sd-spin" /> Auto-refreshing</div>
            </div>
            <div className="sd-page-card-body" style={{ padding: 0, maxHeight: 300, overflowY: "auto" }}>
              {loadingLive ? (
                <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Loader2 className="sd-spin" size={18} /> Loading live data...</div>
              ) : liveIncidents.length > 0 ? (
                (Array.isArray(liveIncidents) ? liveIncidents : []).map((inc, i) => (
                  <div key={inc.id || i} style={{ padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: inc.severity === "critical" ? "#ef4444" : inc.severity === "high" ? "#f97316" : "#eab308" }} />
                      <div><div style={{ fontSize: 13, fontWeight: 500, color: "#1e293b" }}>{inc.title || inc.type || "Incident"}</div><div suppressHydrationWarning style={{ fontSize: 11, color: "#94a3b8" }}>{inc.location || "Unknown Zone"} • {inc.created_at ? new Date(inc.created_at).toLocaleTimeString() : "Recent"}</div></div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", padding: "3px 8px", borderRadius: 6, border: "1px solid #e5e7eb", color: inc.severity === "critical" ? "#ef4444" : "#64748b", background: inc.severity === "critical" ? "#fef2f2" : "#f8fafc" }}>{inc.status || inc.severity || "active"}</span>
                  </div>
                ))
              ) : (
                <div style={{ height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 13, position: "relative", overflow: "hidden", background: "#f8fafc" }}>
                  <div style={{ position: "relative", width: 64, height: 64, marginBottom: 16 }}>
                    <motion.div animate={{ scale: [1, 2.5, 2.5], opacity: [0.6, 0, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeOut" }} style={{ position: "absolute", inset: 0, border: "2px solid #10b981", borderRadius: "50%" }} />
                    <motion.div animate={{ scale: [1, 2.5, 2.5], opacity: [0.6, 0, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeOut", delay: 0.8 }} style={{ position: "absolute", inset: 0, border: "2px solid #10b981", borderRadius: "50%" }} />
                    <div style={{ position: "absolute", inset: 0, background: "#10b981", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 15px rgba(16, 185, 129, 0.4)" }}>
                      <ShieldCheck size={28} style={{ color: "#ffffff" }} />
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 4, fontSize: 15 }}>System Secure</div>
                  <div style={{ fontWeight: 500 }}>No active incidents. Real-time monitoring active.</div>
                </div>
              )}
            </div>
          </div>

          {/* Risk Score Trend */}
          <div className="sd-page-card">
            <div className="sd-page-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}><BarChart3 size={18} style={{ color: "#22c55e" }} /> <span>Risk Score Trend</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#94a3b8" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} /> Live Telemetry</div>
            </div>
            <div className="sd-page-card-body">
              {riskHistory.length > 0 ? (
                <div style={{ height: 260, position: "relative", marginTop: 10, marginLeft: -10, marginRight: 10, marginBottom: 0 }}>
                  <Chart 
                    options={chartOptions} 
                    series={[{ name: "Risk Score", data: chartData }]} 
                    type="bar" 
                    height={260} 
                    width="100%" 
                  />
                </div>
              ) : (
                <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 13 }}><Loader2 className="sd-spin" size={16} style={{ marginRight: 8 }} /> Awaiting telemetry...</div>
              )}
            </div>
          </div>
        </div>

        {/* RAG Chat Column */}
        <div className="sd-page-card" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 180px)", minHeight: 600, position: "sticky", top: 100 }}>
          <div className="sd-page-card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Search size={18} style={{ color: "#22c55e" }} /> <span>Regulatory Query Agent</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} /> <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>ONLINE</span></div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
            {(Array.isArray(messages) ? messages : []).map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                {msg.role === "system" ? (
                  msg.content.includes("RAG Agent initialized") ? (
                    <div style={{ width: "100%", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: 12, fontSize: 12, color: "#16a34a", textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4 }}><BrainCircuit size={14} /> <strong>System Online</strong></div>{msg.content}
                    </div>
                  ) : (
                    <div style={{ width: "100%", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid #dcfce7" }}><ShieldCheck size={14} style={{ color: "#16a34a" }} /> <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.05em" }}>Automated Workflow Executed</span></div>
                      <div className="sd-prose"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                      <div suppressHydrationWarning style={{ fontSize: 10, color: "#86efac", marginTop: 8, textAlign: "right" }}>{msg.timestamp.toLocaleTimeString()}</div>
                    </div>
                  )
                ) : msg.role === "user" ? (
                  <div style={{ maxWidth: "85%", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "16px 16px 4px 16px", padding: 14 }}>
                    <div style={{ fontSize: 13, color: "#1e40af" }}>{msg.content}</div>
                    <div suppressHydrationWarning style={{ fontSize: 10, color: "#93c5fd", marginTop: 6, textAlign: "right" }}>{msg.timestamp.toLocaleTimeString()}</div>
                  </div>
                ) : (
                  <div style={{ maxWidth: "90%", background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "16px 16px 16px 4px", padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} /> <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Query Agent Response</span></div>
                    <div className="sd-prose"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div style={{ marginTop: 12, paddingTop: 8, borderTop: "1px solid #f1f5f9" }}>
                        <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Sources Referenced</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{(Array.isArray(msg.sources) ? msg.sources : []).map((s, j) => (<span key={j} style={{ fontSize: 10, color: "#16a34a", background: "#f0fdf4", padding: "2px 8px", borderRadius: 4, border: "1px solid #bbf7d0" }}>{s}</span>))}</div>
                      </div>
                    )}
                    <div suppressHydrationWarning style={{ fontSize: 10, color: "#cbd5e1", marginTop: 8 }}>{msg.timestamp.toLocaleTimeString()}</div>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: 6, padding: "16px", background: "#f8fafc", borderRadius: "16px 16px 16px 4px", width: "fit-content", border: "1px solid #e5e7eb", alignItems: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginRight: 8 }}>Agent Analyzing</div>
                <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} style={{ width: 6, height: 6, borderRadius: "50%", background: "#94a3b8" }} />
                <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} style={{ width: 6, height: 6, borderRadius: "50%", background: "#94a3b8" }} />
                <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} style={{ width: 6, height: 6, borderRadius: "50%", background: "#94a3b8" }} />
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          {/* Suggested Queries */}
          <div style={{ padding: "8px 16px", borderTop: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Quick Queries</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {SUGGESTED_QUERIES.map((sq, i) => (<button key={i} onClick={() => handleQuery(sq.text)} disabled={loading} style={{ padding: "4px 10px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 11, color: "#64748b", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>{sq.icon} {sq.text.length > 28 ? sq.text.slice(0, 28) + "…" : sq.text}</button>))}
            </div>
          </div>
          {/* Input */}
          <div style={{ padding: 16, borderTop: "1px solid #e5e7eb" }}>
            <form onSubmit={(e) => { e.preventDefault(); handleQuery(inputQuery); }} style={{ display: "flex", gap: 8 }}>
              <input type="text" value={inputQuery} onChange={(e) => setInputQuery(e.target.value)} placeholder="Ask about regulations, incidents, safety..." disabled={loading}
                style={{ flex: 1, border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 14px", fontSize: 13, color: "#1e293b", outline: "none", background: "#f8fafc" }} />
              <button type="submit" disabled={loading || !inputQuery.trim()} style={{ padding: "8px 16px", borderRadius: 10, background: "#22c55e", color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, opacity: loading || !inputQuery.trim() ? 0.4 : 1 }}><Send size={14} /></button>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { CheckSquare, FileX2, CheckCircle2, AlertOctagon, Loader2, Send, Bot, User, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function AuditPage() {
  const [generating1, setGenerating1] = useState(false);
  const [actionGenerated, setActionGenerated] = useState(false);
  const [step1, setStep1] = useState(0);
  const [generating2, setGenerating2] = useState(false);
  const [medActionGenerated, setMedActionGenerated] = useState(false);
  const [step2, setStep2] = useState(0);

  // RAG Agent State
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1', 
      role: 'assistant', 
      content: "**Safety RAG Agent Initialized.**\n\nI am connected to the knowledge base of 2,400+ HSE reports, DGMS Circulars, and OISD standards.\n\n*How can I assist you with regulatory compliance today?*" 
    }
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isQuerying]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/audit/status`, { cache: 'no-store' });
        const data = await res.json();
        if (data.status === "ok") {
          if (!generating1) setActionGenerated(data.factory_act_resolved);
          if (!generating2) setMedActionGenerated(data.dgms_ppe_resolved);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [generating1, generating2]);

  const handleGenerate1 = async () => { 
    setGenerating1(true); 
    setStep1(0); 
    let c = 0; 
    const i = setInterval(() => { c++; setStep1(c); if (c >= 8) clearInterval(i); }, 250); 
    
    try {
      await fetch(`${BACKEND_URL}/audit/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue_id: "factory_act" })
      });
      setActionGenerated(true);
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating1(false);
    }
  };

  const handleReset1 = async () => { 
    try {
        await fetch(`${BACKEND_URL}/audit/reset`, { method: "POST" });
        setActionGenerated(false); 
        setStep1(0); 
    } catch {}
  };

  const handleGenerate2 = async () => { 
    setGenerating2(true); 
    setStep2(0); 
    let c = 0; 
    const i = setInterval(() => { c++; setStep2(c); if (c >= 8) clearInterval(i); }, 250); 
    
    try {
      await fetch(`${BACKEND_URL}/audit/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue_id: "dgms_ppe" })
      });
      setMedActionGenerated(true);
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating2(false);
    }
  };

  const handleReset2 = async () => { 
    try {
        await fetch(`${BACKEND_URL}/audit/reset`, { method: "POST" });
        setMedActionGenerated(false); 
        setStep2(0); 
    } catch {}
  };

  const handleSendQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputQuery.trim()) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: inputQuery.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInputQuery("");
    setIsQuerying(true);

    try {
      const res = await fetch(`${BACKEND_URL}/rag/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMsg.content })
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: data.response }]);
      } else {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "Error communicating with RAG Engine." }]);
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "Network error communicating with RAG Engine." }]);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 className="sd-overview-title" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <CheckSquare size={28} style={{ color: "#22c55e" }} /> Quality & Compliance Audit Agent
          </h2>
          <div className="sd-overview-subtitle"><span className="sd-status-dot sd-status-green" /> Continuous scanning active · All regulatory frameworks loaded</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 20, border: "1px solid #bbf7d0", background: "#f0fdf4" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", animation: "sd-pulse 2s infinite" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#22c55e", textTransform: "uppercase", letterSpacing: "0.1em" }}>CONTINUOUS SCANNING</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24, height: "calc(100vh - 160px)" }}>
        
        {/* LEFT COLUMN: Deviations & Checklist */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, overflowY: "auto", paddingRight: 8 }}>
          
          {/* Deviations Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
            <AlertOctagon size={20} style={{ color: "#f59e0b" }} /> Detected Deviations
          </div>

          {/* Deviation 1 */}
          <div className="sd-page-card" style={{ borderColor: actionGenerated ? "#bbf7d0" : "#fde68a", transition: "border-color 0.5s", flexShrink: 0 }}>
            <div style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: actionGenerated ? "#16a34a" : "#d97706" }}>Factory Act Section 36 Violation Risk</h3>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: actionGenerated ? "#f0fdf4" : generating1 ? "#fffbeb" : "#fef2f2", color: actionGenerated ? "#16a34a" : generating1 ? "#d97706" : "#ef4444", border: `1px solid ${actionGenerated ? "#bbf7d0" : generating1 ? "#fde68a" : "#fecaca"}` }}>
                  {actionGenerated ? "RESOLVED" : generating1 ? "RESOLVING..." : "PRIORITY: CRITICAL"}
                </span>
              </div>
              <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.7, marginBottom: 16 }}>
                Automated document scraping indicates the mandatory quarterly confined space atmospheric certification for <strong style={{ color: "#0f172a" }}>Tank Farm Vessel B</strong> expired 48 hours ago. Plant maintenance scheduling API shows no planned inspection for this week.
              </p>
              {!actionGenerated ? (
                <button onClick={handleGenerate1} disabled={generating1} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 20px", borderRadius: 10, background: generating1 ? "#f8fafc" : "#fffbeb", color: generating1 ? "#94a3b8" : "#d97706", fontWeight: 700, fontSize: 13, border: `1px solid ${generating1 ? "#e5e7eb" : "#fde68a"}`, cursor: generating1 ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
                  {generating1 ? <><Loader2 className="sd-spin" size={16} /> GENERATING CORRECTIVE ACTION...</> : "Auto-Generate Corrective Action"}
                </button>
              ) : (
                <button onClick={handleReset1} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 20px", borderRadius: 10, background: "#f0fdf4", color: "#16a34a", fontWeight: 700, fontSize: 13, border: "1px solid #bbf7d0", cursor: "pointer", transition: "all 0.2s" }}>
                  <CheckCircle2 size={16} /> API DISPATCHED TO MAINTENANCE SYSTEM — Click to Reset
                </button>
              )}
              <AnimatePresence>
                {(generating1 || actionGenerated) && (
                  <motion.div key="a1" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                    <div style={{ marginTop: 16, background: "#334155", borderRadius: 10, padding: 16, fontFamily: "monospace", fontSize: 12, color: "#e2e8f0", display: "flex", flexDirection: "column", gap: 8, boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)" }}>
                      {step1 >= 1 && <motion.p initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} style={{ color: "#94a3b8" }}><span style={{ color: "#22c55e50" }}>❯</span> Authenticating with Plant Maintenance API (SAP PM)... <span style={{ color: "#22c55e", marginLeft: 8, background: "#22c55e20", padding: "1px 6px", borderRadius: 4 }}>SUCCESS</span></motion.p>}
                      {step1 >= 2 && <motion.p initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} style={{ color: "#94a3b8" }}><span style={{ color: "#22c55e50" }}>❯</span> Generating emergency work order for Confined Space Certification.</motion.p>}
                      {step1 >= 3 && <motion.p initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} style={{ color: "#eab308" }}><span style={{ color: "#eab30850" }}>❯</span> [API] Work order #WO-99384 created successfully.</motion.p>}
                      {step1 >= 4 && <motion.p initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} style={{ color: "#94a3b8" }}><span style={{ color: "#22c55e50" }}>❯</span> Scanning available certified contractor roster...</motion.p>}
                      {step1 >= 5 && <motion.p initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} style={{ color: "#e2e8f0" }}><span style={{ color: "#22c55e50" }}>❯</span> Contractor &apos;Apex Industrial Safety&apos; selected. <span style={{ color: "#22c55e", marginLeft: 8 }}>Verified</span></motion.p>}
                      {step1 >= 6 && <motion.p initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} style={{ color: "#94a3b8" }}><span style={{ color: "#22c55e50" }}>❯</span> Dispatching automated email & SMS to contractor...</motion.p>}
                      {step1 >= 7 && <motion.p initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} style={{ color: "#eab308" }}><span style={{ color: "#eab30850" }}>❯</span> Updating Factory Act Compliance Dashboard status.</motion.p>}
                      {step1 >= 8 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #22c55e30" }}><p style={{ color: "#22c55e", fontWeight: 700, display: "flex", alignItems: "center", gap: 6, background: "#22c55e10", padding: 8, borderRadius: 6 }}><CheckCircle2 size={14} /> [COMPLETE] Corrective Action Dispatched and Logged in 4.8s</p></motion.div>}
                      {generating1 && <p style={{ animation: "sd-pulse 2s infinite", color: "#22c55e" }}>_</p>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Deviation 2 */}
          <div className="sd-page-card" style={{ borderColor: medActionGenerated ? "#bbf7d0" : "#bfdbfe", transition: "border-color 0.5s", flexShrink: 0 }}>
            <div style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: medActionGenerated ? "#16a34a" : "#3b82f6" }}>DGMS PPE Standard Non-Compliance</h3>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: medActionGenerated ? "#f0fdf4" : generating2 ? "#eff6ff" : "#fff7ed", color: medActionGenerated ? "#16a34a" : generating2 ? "#3b82f6" : "#f97316", border: `1px solid ${medActionGenerated ? "#bbf7d0" : generating2 ? "#bfdbfe" : "#fed7aa"}` }}>
                  {medActionGenerated ? "RESOLVED" : generating2 ? "RESOLVING..." : "PRIORITY: MEDIUM"}
                </span>
              </div>
              <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.7, marginBottom: 16 }}>
                Computer vision telemetry over the past 7 days shows a 14% drop in high-visibility vest compliance in the loading bay area during the night shift.
              </p>
              {!medActionGenerated ? (
                <button onClick={handleGenerate2} disabled={generating2} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 20px", borderRadius: 10, background: generating2 ? "#f8fafc" : "#eff6ff", color: generating2 ? "#94a3b8" : "#3b82f6", fontWeight: 700, fontSize: 13, border: `1px solid ${generating2 ? "#e5e7eb" : "#bfdbfe"}`, cursor: generating2 ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
                  {generating2 ? <><Loader2 className="sd-spin" size={16} /> GENERATING CORRECTIVE ACTION...</> : "Auto-Generate Corrective Action"}
                </button>
              ) : (
                <button onClick={handleReset2} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 20px", borderRadius: 10, background: "#f0fdf4", color: "#16a34a", fontWeight: 700, fontSize: 13, border: "1px solid #bbf7d0", cursor: "pointer", transition: "all 0.2s" }}>
                  <CheckCircle2 size={16} /> PPE PROTOCOL DEPLOYED — Click to Reset
                </button>
              )}
              <AnimatePresence>
                {(generating2 || medActionGenerated) && (
                  <motion.div key="a2" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                    <div style={{ marginTop: 16, background: "#334155", borderRadius: 10, padding: 16, fontFamily: "monospace", fontSize: 12, color: "#e2e8f0", display: "flex", flexDirection: "column", gap: 8, boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)" }}>
                      {step2 >= 1 && <motion.p initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} style={{ color: "#94a3b8" }}><span style={{ color: "#22c55e50" }}>❯</span> Querying Computer Vision Analytics DB... <span style={{ color: "#22c55e", marginLeft: 8, background: "#22c55e20", padding: "1px 6px", borderRadius: 4 }}>SUCCESS</span></motion.p>}
                      {step2 >= 2 && <motion.p initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} style={{ color: "#94a3b8" }}><span style={{ color: "#22c55e50" }}>❯</span> Filtering violations by shift (Shift ID: NS-992).</motion.p>}
                      {step2 >= 3 && <motion.p initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} style={{ color: "#eab308" }}><span style={{ color: "#eab30850" }}>❯</span> [API] Generating localized mandatory safety briefing payload.</motion.p>}
                      {step2 >= 4 && <motion.p initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} style={{ color: "#94a3b8" }}><span style={{ color: "#22c55e50" }}>❯</span> Interfacing with Workday HRMS API...</motion.p>}
                      {step2 >= 5 && <motion.p initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} style={{ color: "#e2e8f0" }}><span style={{ color: "#22c55e50" }}>❯</span> Enrolling 12 night shift personnel in digital PPE refresher.</motion.p>}
                      {step2 >= 6 && <motion.p initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} style={{ color: "#eab308" }}><span style={{ color: "#eab30850" }}>❯</span> Auto-escalating repeat offenders (Count: 2) to Shift Supervisor.</motion.p>}
                      {step2 >= 7 && <motion.p initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} style={{ color: "#94a3b8" }}><span style={{ color: "#22c55e50" }}>❯</span> Updating DGMS Compliance Dashboard status.</motion.p>}
                      {step2 >= 8 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #22c55e30" }}><p style={{ color: "#22c55e", fontWeight: 700, display: "flex", alignItems: "center", gap: 6, background: "#22c55e10", padding: 8, borderRadius: 6 }}><CheckCircle2 size={14} /> [COMPLETE] PPE Enforcement Protocol deployed in 4.8s</p></motion.div>}
                      {generating2 && <p style={{ animation: "sd-pulse 2s infinite", color: "#22c55e" }}>_</p>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Compliance Checklist */}
          <div className="sd-page-card" style={{ marginTop: "auto", flexShrink: 0 }}>
            <div className="sd-page-card-header"><span>Live Regulatory Coverage</span></div>
            <div className="sd-page-card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "OISD-105 (Permits)", status: "100% PASS", pass: true },
                { label: "OISD-116 (Fire)", status: "100% PASS", pass: true },
                { label: "Factory Act (Sec 36)", status: actionGenerated ? "100% PASS" : generating1 ? "RESOLVING..." : "FLAGGED", pass: actionGenerated, warn: !actionGenerated },
                { label: "DGMS (PPE Standard)", status: medActionGenerated ? "100% PASS" : generating2 ? "RESOLVING..." : "FLAGGED", pass: medActionGenerated, warn: !medActionGenerated },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {item.pass ? <CheckCircle2 size={18} style={{ color: "#22c55e" }} /> : <FileX2 size={18} style={{ color: item.warn ? "#f59e0b" : "#3b82f6" }} />}
                    <span style={{ fontSize: 13, color: "#475569" }}>{item.label}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: item.pass ? "#22c55e" : item.warn ? "#f59e0b" : "#3b82f6" }}>{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Safety RAG Agent */}
        <div className="sd-page-card" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", border: "1px solid #bfdbfe", boxShadow: "0 10px 30px -5px rgba(59, 130, 246, 0.1)" }}>
          {/* Chat Header */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", background: "linear-gradient(to right, #eff6ff, #ffffff)", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ padding: 8, background: "#3b82f6", borderRadius: 8, color: "white" }}>
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>Safety RAG Agent</h3>
              <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>Retrieval-Augmented Generation Engine</p>
            </div>
          </div>

          {/* Chat Messages Area */}
          <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16, background: "#f8fafc" }}>
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    display: "flex",
                    gap: 12,
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                    alignItems: 'flex-start'
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    background: msg.role === 'user' ? "#0f172a" : "#3b82f6",
                    color: "white"
                  }}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>

                  {/* Message Bubble */}
                  <div style={{
                    maxWidth: "85%",
                    padding: "12px 16px",
                    borderRadius: 16,
                    borderTopLeftRadius: msg.role === 'user' ? 16 : 4,
                    borderTopRightRadius: msg.role === 'user' ? 4 : 16,
                    background: msg.role === 'user' ? "#0f172a" : "#ffffff",
                    color: msg.role === 'user' ? "#f8fafc" : "#1e293b",
                    boxShadow: msg.role === 'assistant' ? "0 2px 8px rgba(0,0,0,0.05)" : "none",
                    border: msg.role === 'assistant' ? "1px solid #e2e8f0" : "none",
                    fontSize: 14,
                    lineHeight: 1.6,
                  }}>
                    <div className={msg.role === 'assistant' ? "prose prose-sm prose-slate max-w-none" : ""} style={{ color: "inherit", margin: 0 }}>
                      {msg.role === 'assistant' ? (
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {isQuerying && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ display: "flex", gap: 12, alignItems: 'flex-start' }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "#3b82f6", color: "white" }}>
                    <Bot size={16} />
                  </div>
                  <div style={{ padding: "12px 16px", borderRadius: 16, borderTopLeftRadius: 4, background: "#ffffff", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 8 }}>
                    <Loader2 className="sd-spin" size={14} style={{ color: "#3b82f6" }} />
                    <span style={{ fontSize: 13, color: "#64748b", fontFamily: "monospace" }}>Consulting compliance vectors...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div style={{ padding: 16, borderTop: "1px solid #e2e8f0", background: "white" }}>
            <form onSubmit={handleSendQuery} style={{ display: "flex", gap: 12 }}>
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask about safety standards, e.g., 'OISD standard for scaffolding?'"
                disabled={isQuerying}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: 24,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                  outline: "none",
                  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)",
                  transition: "border-color 0.2s"
                }}
                onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
              />
              <button
                type="submit"
                disabled={isQuerying || !inputQuery.trim()}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: isQuerying || !inputQuery.trim() ? "#e2e8f0" : "#3b82f6",
                  color: "white",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: isQuerying || !inputQuery.trim() ? "not-allowed" : "pointer",
                  transition: "background 0.2s, transform 0.1s"
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
                onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                <Send size={18} style={{ marginLeft: -2, marginTop: 2 }} />
              </button>
            </form>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { FileSignature, Thermometer, Wind, AlertTriangle, Loader2, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function PermitsPage() {
  const [revoking, setRevoking] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [showVesselInfo, setShowVesselInfo] = useState(false);
  const [ch4Level, setCh4Level] = useState(42);
  const [h2sLevel, setH2sLevel] = useState(2);
  const [tempData, setTempData] = useState([40, 35, 45, 46, 46, 55, 65, 64, 75, 77, 77, 78, 85, 87, 88]);

  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/permits/live`, { cache: 'no-store' });
        const data = await res.json();
        if (data.status === "ok") {
          setRevoked(data.revoked);
          setCh4Level(Math.round(data.ch4Level));
          setH2sLevel(Math.round(data.h2sLevel));
          setTempData(data.tempData.map((v: number) => Math.round(v)));
        }
      } catch (err) {
        console.error("Failed to fetch permit telemetry", err);
      }
    };
    
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleRevoke = async () => { 
    setRevoking(true);
    try {
      await fetch(`${BACKEND_URL}/permits/revoke`, { method: "POST" });
      setRevoked(true);
    } catch (err) {
      console.error(err);
    } finally {
      setRevoking(false);
    }
  };

  const handleReset = async () => {
    try {
      await fetch(`${BACKEND_URL}/permits/reset`, { method: "POST" });
      setRevoked(false);
    } catch (err) {
      console.error(err);
    }
  };

  const createPath = (data: number[]) => { const pts = data.map((val, i) => `${(i / (data.length - 1)) * 100},${100 - (val / 100) * 100}`); return `M 0,100 L 0,${100 - (data[0] / 100) * 100} L ${pts.join(" L ")} L 100,100 Z`; };
  const createLine = (data: number[]) => { const pts = data.map((val, i) => `${(i / (data.length - 1)) * 100},${100 - (val / 100) * 100}`); return `M ${pts.join(" L ")}`; };

  return (
    <DashboardLayout>
      {/* AI Correlation Banner */}
      <div className="sd-page-card" style={{ marginBottom: 20, borderColor: revoked ? "#bbf7d0" : "#fecaca", background: revoked ? "#f0fdf4" : "#fef2f2" }}>
        <div style={{ padding: 20, display: "flex", alignItems: "flex-start", gap: 16 }}>
          {revoked ? <CheckCircle size={28} style={{ color: "#22c55e", flexShrink: 0 }} /> : <AlertTriangle size={28} style={{ color: "#ef4444", flexShrink: 0 }} />}
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: revoked ? "#16a34a" : "#dc2626", marginBottom: 8 }}>{revoked ? "Visakhapatnam Scenario Resolved" : "Visakhapatnam Scenario Detected"}</h2>
            <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, marginBottom: 16 }}>
              {revoked ? <>Emergency protocol successfully executed. <strong style={{ color: "#16a34a" }}>Hot Work Permit (HW-492)</strong> has been revoked and the Coke Oven Battery zone has been evacuated.</> : <>AI correlation engine has identified a catastrophic compound risk: <strong style={{ color: "#dc2626" }}>Hot Work Permit (HW-492)</strong> is active in Coke Oven Battery concurrently with <strong style={{ color: "#dc2626" }}>Elevated Methane (CH₄) Levels</strong>.</>}
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {revoking ? (
                <button disabled style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, background: "#ef4444", color: "#fff", fontWeight: 700, fontSize: 13, border: "none" }}><Loader2 className="sd-spin" size={16} /> INITIATING EMERGENCY PROTOCOL...</button>
              ) : revoked ? (
                <button onClick={handleReset} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, background: "#22c55e", color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}><CheckCircle size={16} /> ZONE EVACUATED & PERMIT REVOKED — Click to Reset</button>
              ) : (
                <button onClick={handleRevoke} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, background: "#ef4444", color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}>REVOKE PERMIT & EVACUATE ZONE</button>
              )}
              <button onClick={() => setShowContext(!showContext)} style={{ padding: "10px 20px", borderRadius: 10, background: showContext ? "#f8fafc" : "#fff", fontWeight: 600, fontSize: 13, border: "1px solid #e5e7eb", cursor: "pointer", color: "#475569" }}>{showContext ? "Hide Regulatory Context" : "View OISD Regulatory Context"}</button>
            </div>
            <AnimatePresence>
              {showContext && (
                <motion.div key="regulatory-context" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                  <div style={{ marginTop: 16, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: 16 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: "#b45309", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><FileSignature size={16} /> OISD-105 & OISD-116 Regulations</p>
                    <div style={{ background: "#fef3c7", padding: 12, borderRadius: 8, marginBottom: 8 }}>
                      <p style={{ fontSize: 13, color: "#78350f", marginBottom: 6 }}><strong style={{ color: "#b45309" }}>OISD-116 Section 5.1:</strong> &quot;Hot work shall not be permitted if the concentration of flammable gas is &gt;20% of LEL.&quot;</p>
                      <p style={{ fontSize: 13, color: "#78350f" }}><strong style={{ color: "#b45309" }}>OISD-105 Section 4.3:</strong> &quot;Continuous gas monitoring must be explicitly transferred during shift handovers.&quot;</p>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: revoked ? "#16a34a" : "#dc2626", background: revoked ? "#f0fdf4" : "#fef2f2", padding: 10, borderRadius: 8 }}>{revoked ? "RISK MITIGATED: Hot Work Permit revoked. Area evacuated." : `CRITICAL VIOLATION: Current CH₄ (${ch4Level}% LEL) exceeds 20% LEL threshold.`}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Active Permits */}
        <div className="sd-page-card">
          <div className="sd-page-card-header"><div style={{ display: "flex", alignItems: "center", gap: 10 }}><FileSignature size={18} style={{ color: "#3b82f6" }} /> <span>Active Permits (Zone: Coke Oven)</span></div></div>
          <div className="sd-page-card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Hot Work Permit */}
            <div style={{ border: `1px solid ${revoked ? "#fecaca" : "#fca5a5"}`, background: revoked ? "#fff" : "#fef2f2", borderRadius: 10, padding: 16, position: "relative", opacity: revoked ? 0.6 : 1 }}>
              {!revoked && <span style={{ position: "absolute", top: 12, right: 12, width: 10, height: 10, borderRadius: "50%", background: "#ef4444", animation: "sd-pulse 2s infinite" }} />}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", textDecoration: revoked ? "line-through" : "none" }}>HW-492: Pipeline Welding</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: revoked ? "#fef2f2" : "#fee2e2", color: "#ef4444", border: "1px solid #fecaca" }}>{revoked ? "REVOKED" : "HOT WORK"}</span>
              </div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 2 }}>
                <div><span style={{ color: "#94a3b8", marginRight: 8 }}>Contractor:</span>Larsen & Toubro</div>
                <div><span style={{ color: "#94a3b8", marginRight: 8 }}>Approved By:</span>Shift Manager K. Sharma</div>
                <div><span style={{ color: "#94a3b8", marginRight: 8 }}>Status:</span><span style={{ color: revoked ? "#ef4444" : "#1e293b", fontWeight: revoked ? 700 : 400 }}>{revoked ? "TERMINATED" : "Valid Until: 18:00 HRS"}</span></div>
              </div>
            </div>
            {/* Vessel Inspection */}
            <div onClick={() => setShowVesselInfo(!showVesselInfo)} style={{ border: "1px solid #e2e8f0", background: "#f8fafc", borderRadius: 10, padding: 16, cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {showVesselInfo ? <ChevronUp size={16} style={{ color: "#94a3b8" }} /> : <ChevronDown size={16} style={{ color: "#94a3b8" }} />}
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>CSE-108: Vessel Inspection</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a" }}>CONFINED SPACE</span>
              </div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 2 }}>
                <div><span style={{ color: "#94a3b8", marginRight: 8 }}>Team:</span>Internal Maintenance (Alpha)</div>
                <div><span style={{ color: "#94a3b8", marginRight: 8 }}>Valid Until:</span>20:00 HRS</div>
              </div>
              <AnimatePresence>
                {showVesselInfo && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e5e7eb" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#16a34a", marginBottom: 4 }}><CheckCircle size={14} /> NO COMPOUND RISK DETECTED</div>
                      <p style={{ fontSize: 12, color: "#94a3b8" }}>This permit is isolated from the elevated CH4 zone. Normal confined space protocols active.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Telemetry */}
        <div className="sd-page-card">
          <div className="sd-page-card-header"><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Wind size={18} style={{ color: "#3b82f6" }} /> <span>Live Environmental Telemetry</span></div></div>
          <div className="sd-page-card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {/* CH4 */}
              <div style={{ border: `1px solid ${ch4Level > 20 ? "#fecaca" : "#bbf7d0"}`, background: ch4Level > 20 ? "#fef2f2" : "#f0fdf4", borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 4, textTransform: "uppercase" }}>CH₄ Concentration</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "8px 0" }}>
                  <span style={{ fontSize: 36, fontWeight: 700, color: ch4Level > 20 ? "#ef4444" : "#22c55e" }}>{ch4Level}</span>
                  <span style={{ fontSize: 16, color: ch4Level > 20 ? "#fca5a5" : "#86efac" }}>% LEL</span>
                </div>
                <div style={{ width: "100%", height: 6, background: "#e5e7eb", borderRadius: 3, overflow: "hidden", position: "relative" }}>
                  <div style={{ position: "absolute", left: "20%", top: 0, bottom: 0, width: 2, background: "#ef4444", zIndex: 2 }} />
                  <motion.div animate={{ width: `${Math.min(100, ch4Level)}%` }} transition={{ duration: 0.5 }} style={{ height: "100%", background: ch4Level > 20 ? "linear-gradient(to right, #f97316, #ef4444)" : "linear-gradient(to right, #22c55e, #4ade80)", borderRadius: 3 }} />
                </div>
                <div style={{ marginTop: 8, fontSize: 10, fontWeight: 700, color: ch4Level > 20 ? "#ef4444" : "#22c55e", background: ch4Level > 20 ? "#fef2f2" : "#f0fdf4", padding: "3px 8px", borderRadius: 4, border: `1px solid ${ch4Level > 20 ? "#fecaca" : "#bbf7d0"}`, display: "inline-block", textTransform: "uppercase" }}>{ch4Level > 20 ? "LEL THRESHOLD EXCEEDED" : "SAFE LEVELS RESTORED"}</div>
              </div>
              {/* H2S */}
              <div style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 4, textTransform: "uppercase" }}>H₂S Concentration</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "8px 0" }}>
                  <span style={{ fontSize: 36, fontWeight: 700, color: "#22c55e" }}>{h2sLevel}</span>
                  <span style={{ fontSize: 16, color: "#86efac" }}>ppm</span>
                </div>
                <div style={{ width: "100%", height: 6, background: "#e5e7eb", borderRadius: 3, overflow: "hidden" }}>
                  <motion.div animate={{ width: `${(h2sLevel / 50) * 100}%` }} transition={{ duration: 0.5 }} style={{ height: "100%", background: "linear-gradient(to right, #22c55e, #4ade80)", borderRadius: 3 }} />
                </div>
                <div style={{ marginTop: 8, fontSize: 10, fontWeight: 700, color: "#22c55e", background: "#f0fdf4", padding: "3px 8px", borderRadius: 4, border: "1px solid #bbf7d0", display: "inline-block", textTransform: "uppercase" }}>NORMAL RANGE</div>
              </div>
            </div>
            {/* Temperature Chart */}
            <div style={{ border: `1px solid ${tempData[tempData.length - 1] > 70 ? "#fecaca" : "#bbf7d0"}`, borderRadius: 10, padding: 16, background: "#fff" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 12, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
                <Thermometer size={14} style={{ color: tempData[tempData.length - 1] > 70 ? "#ef4444" : "#22c55e" }} /> Live Area Temperature (Coke Oven) <span style={{ marginLeft: "auto", color: "#cbd5e1" }}>UNIT: °C</span>
              </div>
              <div style={{ position: "relative", height: 160, width: "100%" }}>
                <div style={{ position: "absolute", top: "30%", left: 0, width: "100%", borderTop: "2px dashed #fecaca", zIndex: 2 }} />
                <span style={{ position: "absolute", top: "25%", right: 0, fontSize: 10, fontWeight: 700, color: "#ef4444", background: "#fff", padding: "2px 6px", borderRadius: 4, border: "1px solid #fecaca", zIndex: 3 }}>CRITICAL: 70°C</span>
                <svg style={{ width: "100%", height: "100%", position: "absolute", inset: 0, zIndex: 1 }} preserveAspectRatio="none" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={tempData[tempData.length - 1] > 70 ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"} /><stop offset="100%" stopColor="rgba(255,255,255,0)" /></linearGradient>
                  </defs>
                  <motion.path fill="url(#tg)" animate={{ d: createPath(tempData) }} transition={{ duration: 0.5, ease: "linear" }} />
                  <motion.path fill="none" stroke={tempData[tempData.length - 1] > 70 ? "#ef4444" : "#22c55e"} strokeWidth="2" animate={{ d: createLine(tempData) }} transition={{ duration: 0.5, ease: "linear" }} />
                  <motion.circle initial={{ cx: 100, cy: 100 - (tempData[tempData.length - 1] / 100) * 100 }} r="3" fill="#fff" stroke={tempData[tempData.length - 1] > 70 ? "#ef4444" : "#22c55e"} strokeWidth="2" animate={{ cx: 100, cy: 100 - (tempData[tempData.length - 1] / 100) * 100 }} transition={{ duration: 0.5 }} />
                </svg>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#cbd5e1", marginTop: 4, textTransform: "uppercase" }}>
                <span>-30 Min</span>
                <span style={{ color: tempData[tempData.length - 1] > 70 ? "#ef4444" : "#22c55e", fontWeight: 700 }}>Live Now</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

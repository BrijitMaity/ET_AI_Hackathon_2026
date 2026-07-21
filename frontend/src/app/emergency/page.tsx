"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Siren, Megaphone, Terminal, Video, Lock, ZapOff } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export default function EmergencyPage() {
  const [triggered, setTriggered] = useState(false);
  const [step, setStep] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [logs, setLogs] = useState<any[]>([]);
  
  // Golden path state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [goldenState, setGoldenState] = useState<any>({
    phase: 1, gas_ppm: 0, temp_c: 0, permit: "None", auto_triggered: false
  });

  useEffect(() => {
    let isMounted = true;
    const fetchState = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/golden-path/state`);
        if (!isMounted) return;
        const data = await res.json();
        setGoldenState(data);
        
        // Auto-trigger orchestration if Phase 3 crisis is reached
        if (data.auto_triggered && !triggered) {
          setTriggered(true);
          setStep(0);
          setLogs([]);
        }
      } catch (e) {
        console.error("Failed to fetch state", e);
      }
    };
    const interval = setInterval(fetchState, 1500);
    return () => { isMounted = false; clearInterval(interval); };
  }, [triggered]);

  useEffect(() => {
    // Dynamically build the WebSocket URL
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    let wsUrl: string;
    if (backendUrl.startsWith("http")) {
      // Direct mode: convert http(s) to ws(s)
      wsUrl = backendUrl.replace(/^http/, "ws") + "/ws/emergency";
    } else {
      // Proxy mode: construct WS URL from current page origin
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = `${proto}//${window.location.host}${backendUrl}/ws/emergency`;
    }

    const websocket = new WebSocket(wsUrl);
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.step) {
        setStep(data.step);
        setLogs((prev) => [...prev, data]);
      }
    };
    return () => {
      websocket.close();
    };
  }, []);

  const handleTrigger = async () => {
    setTriggered(true);
    setStep(0);
    setLogs([]);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/emergency/trigger`, {
        method: "POST"
      });
    } catch (e) {
      console.error("Failed to trigger emergency API", e);
    }
  };

  return (
    <DashboardLayout>
      {/* Live Sensors Top Banner */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, padding: "16px 24px", background: goldenState.phase === 3 ? "#fef2f2" : goldenState.phase === 2 ? "#fffbeb" : "#fff", border: `1px solid ${goldenState.phase === 3 ? "#fecaca" : goldenState.phase === 2 ? "#fde68a" : "#e5e7eb"}`, borderRadius: 12, transition: "all 0.5s" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Gas CH₄ (Zone B)</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: goldenState.phase === 3 ? "#ef4444" : goldenState.phase === 2 ? "#d97706" : "#0f172a" }}>{goldenState.gas_ppm.toFixed(1)} ppm</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Reactor Temp</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: goldenState.phase === 3 ? "#ef4444" : goldenState.phase === 2 ? "#d97706" : "#0f172a" }}>{goldenState.temp_c.toFixed(1)} °C</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Active Permit</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: goldenState.permit !== "None" ? "#d97706" : "#0f172a" }}>{goldenState.permit}</div>
        </div>
      </div>

      {/* Status Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 className="sd-overview-title" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Siren size={28} style={{ color: goldenState.phase === 3 ? "#ef4444" : goldenState.phase === 2 ? "#d97706" : "#22c55e" }} /> Emergency Response Orchestrator
          </h2>
          <div className="sd-overview-subtitle">
            <span className="sd-status-dot" style={{ background: goldenState.phase === 3 ? "#ef4444" : goldenState.phase === 2 ? "#d97706" : "#22c55e" }} />
            {goldenState.phase === 3 ? "Protocol engaged — autonomous intervention active" : goldenState.phase === 2 ? "Warning: Critical escalation detected" : "System standby — monitoring all zones"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8, border: `1px solid ${goldenState.phase === 3 ? "#fecaca" : goldenState.phase === 2 ? "#fde68a" : "#bbf7d0"}`, background: goldenState.phase === 3 ? "#fef2f2" : goldenState.phase === 2 ? "#fffbeb" : "#f0fdf4", transition: "all 0.5s" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: goldenState.phase === 3 ? "#ef4444" : goldenState.phase === 2 ? "#d97706" : "#22c55e", animation: "sd-pulse 2s infinite" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: goldenState.phase === 3 ? "#ef4444" : goldenState.phase === 2 ? "#d97706" : "#22c55e", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {goldenState.phase === 3 ? "EMERGENCY PROTOCOL ACTIVE" : goldenState.phase === 2 ? "ESCALATION WARNING" : "SYSTEM STANDBY"}
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Autonomous Intervention Card */}
          <div className="sd-page-card" style={{ position: "relative", overflow: "hidden" }}>
            {triggered && <div style={{ position: "absolute", inset: 0, background: "rgba(239,68,68,0.03)", animation: "sd-pulse 2s infinite", pointerEvents: "none" }} />}
            <div style={{ padding: 24, position: "relative", zIndex: 1 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Autonomous Intervention</h3>
              <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7, marginBottom: 20 }}>
                This agent bypasses manual human handoffs during critical incidents. It doesn&apos;t just sound alarms—it actively interfaces with SCADA systems to <strong style={{ color: "#0f172a" }}>neutralize the root cause</strong>, reducing the standard 10-minute response delay to under 2 seconds.
              </p>
              {!triggered ? (
                <button onClick={handleTrigger} style={{ width: "100%", padding: "14px 24px", borderRadius: 12, background: "#ef4444", color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer", letterSpacing: "0.05em", boxShadow: "0 4px 16px rgba(239,68,68,0.3)" }}>
                  SIMULATE AI INTERVENTION & FIX ROOT CAUSE
                </button>
              ) : (
                <button onClick={() => { setTriggered(false); setStep(0); setLogs([]); }} style={{ width: "100%", padding: 20, borderRadius: 12, background: step >= 8 ? "#f0fdf4" : "#fef2f2", border: `1px solid ${step >= 8 ? "#bbf7d0" : "#fecaca"}`, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <Siren size={40} style={{ color: step >= 8 ? "#22c55e" : "#ef4444" }} />
                  <span style={{ fontWeight: 700, fontSize: 16, color: step >= 8 ? "#16a34a" : "#ef4444", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {step >= 8 ? "Root Cause Neutralized" : "Executing Protocols..."}
                  </span>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>Click to reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Step Indicators */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { icon: Megaphone, label: "PA System Override", activeAt: 2, danger: false },
              { icon: Video, label: "Preserve CCTV", activeAt: 4, danger: false },
              { icon: Lock, label: "Isolate Gas Valve", activeAt: 5, danger: true },
              { icon: ZapOff, label: "Cut Welder Power", activeAt: 6, danger: true },
            ].map(({ icon: Icon, label, activeAt, danger }) => (
              <div key={label} style={{ border: `1px solid ${step >= activeAt ? (danger ? "#fecaca" : "#bbf7d0") : "#e5e7eb"}`, background: step >= activeAt ? (danger ? "#fef2f2" : "#f0fdf4") : "#fff", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.5s" }}>
                <Icon size={22} style={{ color: step >= activeAt ? (danger ? "#ef4444" : "#22c55e") : "#cbd5e1" }} />
                <span style={{ fontSize: 12, fontWeight: step >= activeAt ? 700 : 500, color: step >= activeAt ? (danger ? "#ef4444" : "#16a34a") : "#94a3b8", textTransform: "uppercase", textAlign: "center" }}>
                  {step >= activeAt && danger ? "ACTIVATED BY AI" : label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Orchestration Log */}
        <div className="sd-page-card" style={{ display: "flex", flexDirection: "column", minHeight: 400 }}>
          <div className="sd-page-card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Terminal size={18} style={{ color: "#22c55e" }} /> <span>Live Orchestration Log</span></div>
          </div>
          <div style={{ flex: 1, padding: 20, fontSize: 13, fontFamily: "monospace", position: "relative", overflow: "hidden", background: "#1a1d23", borderRadius: "0 0 13px 13px", color: "#e2e8f0" }}>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, background: "linear-gradient(transparent, #1a1d23)", zIndex: 10, pointerEvents: "none" }} />
            {!triggered ? (
              <div style={{ color: "#64748b" }}>
                <p>&gt; System nominal. Listening for risk engine events...</p>
                <p style={{ animation: "sd-pulse 2s infinite" }}>_</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {logs.map((logItem, idx) => (
                  <motion.p key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ color: logItem.color, fontWeight: logItem.bold ? 700 : 400 }}>
                    {logItem.log}
                  </motion.p>
                ))}
                {step < 8 && <p style={{ animation: "sd-pulse 2s infinite", color: "#22c55e" }}>_</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

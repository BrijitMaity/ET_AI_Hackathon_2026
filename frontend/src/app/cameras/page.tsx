"use client";

import { useState, useRef, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import Link from "next/link";
import { Video, Maximize2, Camera, Upload } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

function CameraFeed({ src, name, delayOffset }: { src: string, name: string, delayOffset: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [status, setStatus] = useState("Nominal");
  const [ppeMatch, setPpeMatch] = useState("100%");
  const [computedRisk, setComputedRisk] = useState("0.0");
  const [isAlert, setIsAlert] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let timeoutId: any;
    let isActive = true;

    const runInference = async () => {
      if (!isActive) return;
      
      const img = imgRef.current;
      const canvas = canvasRef.current;
      
      if (img && canvas && img.complete) {
        if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
          canvas.width = img.naturalWidth || 800;
          canvas.height = img.naturalHeight || 450;
        }

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const base64Image = canvas.toDataURL("image/jpeg", 0.7);

          try {
            const res = await fetch(`${BACKEND_URL}/vision/detect`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image_base64: base64Image })
            });

            if (res.ok) {
              const result = await res.json();
              if (result && result.status === "ok") {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                let localAlert = false;
                let persons = 0;
                let helmets = 0;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                result.detections.forEach((det: any) => {
                  const [x1, y1, x2, y2] = det.bbox;
                  const w = x2 - x1;
                  const h = y2 - y1;
                  const lbl = (det.label || "").toLowerCase();
                  
                  if (lbl.includes("person")) persons++;
                  if (lbl.includes("helmet") || lbl.includes("hat")) helmets++;

                  const isCompliant = ["helmet", "hat", "vest", "boots", "gloves", "goggles"].some(kw => lbl.includes(kw) && !lbl.includes("no-"));
                  const isNonCompliant = lbl.includes("no-");

                  let color = "#3b82f6";
                  let fillColor = "rgba(59, 130, 246, 0.1)";
                  if (isCompliant) {
                    color = "#22c55e"; fillColor = "rgba(34, 197, 94, 0.1)";
                  } else if (isNonCompliant) {
                    color = "#ef4444"; fillColor = "rgba(239, 68, 68, 0.1)";
                    localAlert = true;
                  }

                  ctx.strokeStyle = color;
                  ctx.lineWidth = 4;
                  ctx.strokeRect(x1, y1, w, h);
                  ctx.fillStyle = fillColor;
                  ctx.fillRect(x1, y1, w, h);

                  ctx.fillStyle = color;
                  ctx.font = "bold 16px monospace";
                  ctx.fillText(`${det.label.toUpperCase()} [${Math.round(det.confidence * 100)}%]`, x1, y1 > 20 ? y1 - 5 : y1 + 20);
                });

                setIsAlert(localAlert);
                if (localAlert) {
                  setStatus("Warning: Missing PPE");
                  setComputedRisk("4.2");
                  setPpeMatch(persons > 0 ? `${Math.round((helmets / persons) * 100)}%` : "0%");
                } else {
                  setStatus("Nominal");
                  setComputedRisk("0.1");
                  setPpeMatch("100%");
                }
              }
            }
          } catch (e) {
            console.error("Inference failed", e);
          }
        }
      }
      timeoutId = setTimeout(runInference, 1000);
    };

    timeoutId = setTimeout(runInference, delayOffset);
    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [src, delayOffset]);

  return (
    <div className="sd-page-card" style={{ padding: 0, overflow: "hidden", borderColor: isAlert ? "#fecaca" : "#e5e7eb", boxShadow: isAlert ? "0 0 15px rgba(239,68,68,0.2)" : "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${isAlert ? "#fecaca" : "#e5e7eb"}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: isAlert ? "#fef2f2" : "#f8fafc" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "monospace", fontSize: 13, fontWeight: 700, textTransform: "uppercase", color: isAlert ? "#ef4444" : "#475569" }}>
          <Video size={16} style={{ color: isAlert ? "#ef4444" : "#94a3b8" }} />
          <span>{name}</span>
        </div>
        <Maximize2 size={16} style={{ color: "#94a3b8", cursor: "pointer" }} />
      </div>
      
      <div style={{ position: "relative", aspectRatio: "16/9", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={imgRef} src={src} crossOrigin="anonymous" style={{ display: "none" }} alt="cam" />
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(20%) contrast(1.1)" }} />
        <div style={{ position: "absolute", top: 16, left: 16, fontFamily: "monospace", fontSize: 10, color: "#fff", textTransform: "uppercase", background: "rgba(0,0,0,0.6)", padding: 8, borderRadius: 6, backdropFilter: "blur(4px)" }}>
          <span style={{ color: "#ef4444", animation: "sd-pulse 2s infinite", display: "inline-block", marginRight: 4 }}>●</span> REC • LIVE <br/>
          MODEL: YOLO (Intel OpenVINO) <br/>
          API: Real-Time
        </div>
        {isAlert && <div style={{ position: "absolute", inset: 0, border: "3px solid #ef4444", animation: "sd-pulse 2s infinite", pointerEvents: "none" }} />}
      </div>

      <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, background: "#fff", fontFamily: "monospace", fontSize: 11, textTransform: "uppercase" }}>
        <div>
          <div style={{ color: "#94a3b8", marginBottom: 4, fontWeight: 700 }}>Status</div>
          <div style={{ color: isAlert ? "#ef4444" : "#16a34a", fontWeight: 700 }}>{status}</div>
        </div>
        <div>
          <div style={{ color: "#94a3b8", marginBottom: 4, fontWeight: 700 }}>PPE Match</div>
          <div style={{ color: "#475569", fontWeight: 700 }}>{ppeMatch}</div>
        </div>
        <div>
          <div style={{ color: "#94a3b8", marginBottom: 4, fontWeight: 700 }}>Computed Risk</div>
          <div style={{ color: isAlert ? "#ef4444" : "#475569", fontWeight: 700 }}>{computedRisk}</div>
        </div>
      </div>
    </div>
  );
}

export default function Cameras() {
  return (
    <DashboardLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <h2 className="sd-overview-title" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Video size={28} style={{ color: "#22c55e" }} /> AI Camera Feeds
          </h2>
          <div className="sd-overview-subtitle">Real-time Computer Vision Inference</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "sd-pulse 2s infinite" }} />
            <span style={{ fontFamily: "monospace", color: "#ef4444", fontSize: 13, fontWeight: 700, textTransform: "uppercase" }}>Live AI Inference Active</span>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/vision?mode=live" style={{ display: "flex", alignItems: "center", gap: 8, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", padding: "8px 16px", borderRadius: 8, fontFamily: "monospace", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
              <Camera size={16} /> LIVE CAMERA
            </Link>
            <Link href="/vision?mode=upload" style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", color: "#64748b", border: "1px solid #e5e7eb", padding: "8px 16px", borderRadius: 8, fontFamily: "monospace", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
              <Upload size={16} /> UPLOAD PHOTO
            </Link>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.0 }}>
          <CameraFeed name="CAM-01: Assembly Line" src="/cam1.png" delayOffset={0} />
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <CameraFeed name="CAM-02: Loading Dock" src="/cam2.png" delayOffset={250} />
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
          <CameraFeed name="CAM-03: Chemical Storage" src="/cam3.png" delayOffset={500} />
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
          <CameraFeed name="CAM-04: Server Room" src="/cam4.png" delayOffset={750} />
        </motion.div>
      </div>
    </DashboardLayout>
  );
}

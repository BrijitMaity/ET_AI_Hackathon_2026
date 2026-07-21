"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Camera, Upload, CheckCircle, ShieldAlert, Eye, ZoomIn, ZoomOut, Shield, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// ── Color constants for compliance categories ──────────────────────────────
const COLORS = {
  compliant: { stroke: "#22c55e", fill: "rgba(34, 197, 94, 0.12)", badge: "#16a34a", text: "#ffffff" },
  violation: { stroke: "#ef4444", fill: "rgba(239, 68, 68, 0.15)", badge: "#dc2626", text: "#ffffff" },
  neutral:   { stroke: "#06b6d4", fill: "rgba(6, 182, 212, 0.08)", badge: "#0891b2", text: "#ffffff" },
};

function VisionContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "live";

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraAccess, setHasCameraAccess] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const [isBackendConnected, setIsBackendConnected] = useState(true);
  const animationRef = useRef<number | null>(null);
  const lastApiCall = useRef<number>(0);
  const isDetectingRef = useRef<boolean>(false);

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ppeStatus, setPpeStatus] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [detectionsList, setDetectionsList] = useState<any[]>([]);
  
  const [zoom, setZoom] = useState(1);

  async function startCamera() {
    setCameraError(null);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setHasCameraAccess(true);
          videoRef.current?.play();
        };
      }
    } catch (err: unknown) {
      console.error(err);
      setCameraError(`Could not access camera. Try switching to Upload Photo mode.`);
    }
  }

  function stopCamera() {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setHasCameraAccess(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (mode === "live") startCamera();
    return () => stopCamera();
  }, [mode]);

  const runInference = async (base64Image: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/vision/detect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: base64Image })
      });
      if (res.ok) {
        setIsBackendConnected(true);
        return await res.json();
      } else {
        setIsBackendConnected(false);
      }
    } catch (e) {
      setIsBackendConnected(false);
      console.error(e);
    }
    return null;
  };

  // ── Industry-grade HUD rendering ─────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function drawDetections(ctx: CanvasRenderingContext2D, detections: any[], scaleX = 1, scaleY = 1, offsetX = 0, offsetY = 0, imgWidth = 0, imgHeight = 0) {
    const useScaling = imgWidth > 0 && imgHeight > 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    detections.forEach((det: any) => {
      const [x1, y1, x2, y2] = det.bbox;
      
      let drawX: number, drawY: number, drawW: number, drawH: number;
      if (useScaling) {
        drawX = offsetX + (x1 / imgWidth) * scaleX;
        drawY = offsetY + (y1 / imgHeight) * scaleY;
        drawW = ((x2 - x1) / imgWidth) * scaleX;
        drawH = ((y2 - y1) / imgHeight) * scaleY;
      } else {
        drawX = x1; drawY = y1;
        drawW = x2 - x1; drawH = y2 - y1;
      }

      // Determine colors based on compliance field from backend
      const compliance = det.compliance || "neutral";
      const colorSet = COLORS[compliance as keyof typeof COLORS] || COLORS.neutral;

      // ── Draw bounding box ──
      ctx.strokeStyle = colorSet.stroke;
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      
      // Rounded rectangle for professional look
      const radius = 4;
      ctx.beginPath();
      ctx.moveTo(drawX + radius, drawY);
      ctx.lineTo(drawX + drawW - radius, drawY);
      ctx.arcTo(drawX + drawW, drawY, drawX + drawW, drawY + radius, radius);
      ctx.lineTo(drawX + drawW, drawY + drawH - radius);
      ctx.arcTo(drawX + drawW, drawY + drawH, drawX + drawW - radius, drawY + drawH, radius);
      ctx.lineTo(drawX + radius, drawY + drawH);
      ctx.arcTo(drawX, drawY + drawH, drawX, drawY + drawH - radius, radius);
      ctx.lineTo(drawX, drawY + radius);
      ctx.arcTo(drawX, drawY, drawX + radius, drawY, radius);
      ctx.closePath();
      ctx.stroke();

      // ── Fill overlay ──
      ctx.fillStyle = colorSet.fill;
      ctx.fill();

      // ── Corner accents (industry HUD style) ──
      const cornerLen = Math.min(20, drawW * 0.3, drawH * 0.3);
      ctx.strokeStyle = colorSet.stroke;
      ctx.lineWidth = 4;
      ctx.setLineDash([]);
      
      // Top-left
      ctx.beginPath();
      ctx.moveTo(drawX, drawY + cornerLen); ctx.lineTo(drawX, drawY); ctx.lineTo(drawX + cornerLen, drawY);
      ctx.stroke();
      // Top-right
      ctx.beginPath();
      ctx.moveTo(drawX + drawW - cornerLen, drawY); ctx.lineTo(drawX + drawW, drawY); ctx.lineTo(drawX + drawW, drawY + cornerLen);
      ctx.stroke();
      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(drawX, drawY + drawH - cornerLen); ctx.lineTo(drawX, drawY + drawH); ctx.lineTo(drawX + cornerLen, drawY + drawH);
      ctx.stroke();
      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(drawX + drawW - cornerLen, drawY + drawH); ctx.lineTo(drawX + drawW, drawY + drawH); ctx.lineTo(drawX + drawW, drawY + drawH - cornerLen);
      ctx.stroke();

      // ── Build label text: [ID:3] HELMET [92%] ──
      const classId = det.class_id !== undefined && det.class_id !== -1 ? det.class_id : "?";
      const label = (det.label || "").toUpperCase();
      const conf = Math.round((det.confidence || 0) * 100);
      const text = `[ID:${classId}] ${label} [${conf}%]`;

      // ── Draw label badge ──
      const fontSize = Math.max(13, Math.min(20, drawW * 0.12));
      ctx.font = `bold ${fontSize}px 'Segoe UI Mono', 'Consolas', monospace`;
      const textMetrics = ctx.measureText(text);
      const textWidth = textMetrics.width;
      const badgeHeight = fontSize + 12;
      const badgePadding = 8;
      const badgeWidth = textWidth + badgePadding * 2;
      const badgeX = drawX;
      const badgeY = drawY - badgeHeight - 2;

      // Badge shadow
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;

      // Badge background (rounded)
      ctx.fillStyle = colorSet.badge;
      const badgeRadius = 4;
      ctx.beginPath();
      ctx.moveTo(badgeX + badgeRadius, badgeY);
      ctx.lineTo(badgeX + badgeWidth - badgeRadius, badgeY);
      ctx.arcTo(badgeX + badgeWidth, badgeY, badgeX + badgeWidth, badgeY + badgeRadius, badgeRadius);
      ctx.lineTo(badgeX + badgeWidth, badgeY + badgeHeight - badgeRadius);
      ctx.arcTo(badgeX + badgeWidth, badgeY + badgeHeight, badgeX + badgeWidth - badgeRadius, badgeY + badgeHeight, badgeRadius);
      ctx.lineTo(badgeX + badgeRadius, badgeY + badgeHeight);
      ctx.arcTo(badgeX, badgeY + badgeHeight, badgeX, badgeY + badgeHeight - badgeRadius, badgeRadius);
      ctx.lineTo(badgeX, badgeY + badgeRadius);
      ctx.arcTo(badgeX, badgeY, badgeX + badgeRadius, badgeY, badgeRadius);
      ctx.closePath();
      ctx.fill();

      // Reset shadow
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Badge text
      ctx.fillStyle = colorSet.text;
      ctx.textBaseline = "middle";
      ctx.fillText(text, badgeX + badgePadding, badgeY + badgeHeight / 2);

      // ── Compliance indicator icon (small colored dot) ──
      const dotRadius = 4;
      const dotX = drawX + drawW - dotRadius - 6;
      const dotY = drawY + dotRadius + 6;
      ctx.beginPath();
      ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = colorSet.stroke;
      ctx.fill();
      
      // Pulsing ring for violations
      if (compliance === "violation") {
        ctx.beginPath();
        ctx.arc(dotX, dotY, dotRadius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = colorSet.stroke;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });
  }

  const detectFrame = async () => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState !== 4) {
       animationRef.current = requestAnimationFrame(detectFrame);
       return;
    }
    const video = videoRef.current;
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    if (now - lastApiCall.current > 100) {
      lastApiCall.current = now;
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      
      if (canvas.width !== video.videoWidth) {
         canvas.width = video.videoWidth;
         canvas.height = video.videoHeight;
      }
      
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext("2d");
      
      if (tempCtx && ctx && !isDetectingRef.current) {
         isDetectingRef.current = true;
         tempCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
         const base64Image = tempCanvas.toDataURL("image/jpeg", 0.7);
         
         runInference(base64Image).then((result) => {
             isDetectingRef.current = false;
             if (result && result.status === "ok") {
                 ctx.clearRect(0, 0, canvas.width, canvas.height);
                 setPpeStatus(result.ppe);
                 setDetectionsList(result.detections || []);
                 drawDetections(ctx, result.detections);
             }
         });
      }
    }
    
    animationRef.current = requestAnimationFrame(detectFrame);
  };

  useEffect(() => {
    if (hasCameraAccess && mode === "live") detectFrame();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCameraAccess, mode]);

  const uploadCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUploadedImage(url);
      runImageScan(url, file);
    }
  };

  const runImageScan = async (url: string, file: File) => {
    setIsScanning(true); setScanComplete(false); setPpeStatus(null); setDetectionsList([]);
    const img = new Image(); img.src = url;
    img.onload = async () => {
      if (!uploadCanvasRef.current) return;
      const canvas = uploadCanvasRef.current;
      const ctx = canvas.getContext("2d");
      
      const containerWidth = canvas.parentElement?.clientWidth || 800;
      const containerHeight = canvas.parentElement?.clientHeight || 600;
      canvas.width = containerWidth; canvas.height = containerHeight;

      if (ctx) {
        const imgRatio = img.width / img.height;
        const containerRatio = containerWidth / containerHeight;
        
        let drawWidth, drawHeight, offsetX, offsetY;
        if (imgRatio > containerRatio) {
          drawWidth = containerWidth; drawHeight = containerWidth / imgRatio;
          offsetX = 0; offsetY = (containerHeight - drawHeight) / 2;
        } else {
          drawHeight = containerHeight; drawWidth = containerHeight * imgRatio;
          offsetX = (containerWidth - drawWidth) / 2; offsetY = 0;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64data = reader.result as string;
            const result = await runInference(base64data);
            
            if (result && result.status === "ok") {
               setPpeStatus(result.ppe);
               setDetectionsList(result.detections || []);
               drawDetections(ctx, result.detections, drawWidth, drawHeight, offsetX, offsetY, img.width, img.height);
            }
            setIsScanning(false); setScanComplete(true);
        };
        reader.readAsDataURL(file);
      }
    };
  };

  // ── Equipment Status Badge Component ──
  const EquipmentBadge = ({ name, present, missing }: { name: string; present: boolean; missing: boolean }) => {
    const status = missing ? "violation" : present ? "compliant" : "unknown";
    const bgColor = status === "violation" ? "#fef2f2" : status === "compliant" ? "#f0fdf4" : "#f8fafc";
    const textColor = status === "violation" ? "#ef4444" : status === "compliant" ? "#16a34a" : "#94a3b8";
    const borderColor = status === "violation" ? "#fecaca" : status === "compliant" ? "#bbf7d0" : "#e2e8f0";
    const icon = status === "violation" ? "✗" : status === "compliant" ? "✓" : "—";
    
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "4px 10px", borderRadius: 6,
        background: bgColor, color: textColor,
        border: `1px solid ${borderColor}`,
        fontFamily: "monospace", fontSize: 11, fontWeight: 700,
        lineHeight: 1,
      }}>
        <span style={{ fontSize: 13 }}>{icon}</span> {name}
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <h2 className="sd-overview-title" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Eye size={28} style={{ color: "#22c55e" }} /> {mode === 'live' ? 'Live WebCam Inference' : 'Static Image Analysis'}
          </h2>
          <div className="sd-overview-subtitle" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            Backend YOLO Inference Active (Models/ppe_best.pt)
            {isBackendConnected ? (
              <span style={{ color: "#16a34a", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><CheckCircle size={14} /> Backend Connected</span>
            ) : (
              <span style={{ color: "#ef4444", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><ShieldAlert size={14} /> Backend Disconnected</span>
            )}
          </div>

          {/* ── PPE Compliance Status Bar ── */}
          {ppeStatus && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ 
                display: "inline-flex", alignItems: "center", gap: 12,
                padding: "10px 20px", borderRadius: 10, 
                fontFamily: "monospace", fontSize: 14, fontWeight: 700, 
                background: ppeStatus.ppe_ok ? "#f0fdf4" : "#fef2f2", 
                color: ppeStatus.ppe_ok ? "#16a34a" : "#ef4444", 
                border: `2px solid ${ppeStatus.ppe_ok ? "#bbf7d0" : "#fecaca"}`,
                boxShadow: ppeStatus.ppe_ok ? "0 0 15px rgba(34,197,94,0.15)" : "0 0 15px rgba(239,68,68,0.15)"
              }}>
                {ppeStatus.ppe_ok ? <Shield size={18} /> : <AlertTriangle size={18} />}
                PPE Status: {ppeStatus.ppe_ok ? '✓ COMPLIANT' : '✗ NON-COMPLIANT'}
                <span style={{ color: "#64748b", fontWeight: 500, fontSize: 12 }}>|</span>
                Persons: {ppeStatus.persons}
              </div>
              
              {/* Equipment Breakdown */}
              {ppeStatus.equipment_status && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {Object.entries(ppeStatus.equipment_status).map(([key, val]) => (
                    <EquipmentBadge 
                      key={key} 
                      name={key.charAt(0).toUpperCase() + key.slice(1)} 
                      present={(val as {present: boolean; missing: boolean}).present} 
                      missing={(val as {present: boolean; missing: boolean}).missing} 
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <Link 
            href="/vision?mode=live" 
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8, fontFamily: "monospace", fontSize: 13, fontWeight: 700, textDecoration: "none", cursor: "pointer", transition: "all 0.2s", background: mode === 'live' ? "#f0fdf4" : "#fff", color: mode === 'live' ? "#16a34a" : "#64748b", border: `1px solid ${mode === 'live' ? "#bbf7d0" : "#e5e7eb"}` }}
            onClick={() => { setUploadedImage(null); setScanComplete(false); setPpeStatus(null); setDetectionsList([]); }}
          >
            <Camera size={16} /> LIVE CAMERA
          </Link>
          <Link 
            href="/vision?mode=upload" 
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8, fontFamily: "monospace", fontSize: 13, fontWeight: 700, textDecoration: "none", cursor: "pointer", transition: "all 0.2s", background: mode === 'upload' ? "#f0fdf4" : "#fff", color: mode === 'upload' ? "#16a34a" : "#64748b", border: `1px solid ${mode === 'upload' ? "#bbf7d0" : "#e5e7eb"}` }}
          >
            <Upload size={16} /> UPLOAD PHOTO
          </Link>
        </div>
      </div>

      <div 
        className="sd-page-card" 
        style={{ position: "relative", aspectRatio: "16/9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", overflow: "hidden", padding: 0, background: "#0a0a0a" }}
        onWheel={(e) => {
          if (mode === 'live' && hasCameraAccess) {
            e.preventDefault();
            if (e.deltaY < 0) {
              setZoom(z => Math.min(3, z + 0.1));
            } else {
              setZoom(z => Math.max(1, z - 0.1));
            }
          }
        }}
      >
        {mode === 'live' && (
          <>
            <div style={{ position: "absolute", inset: 0, transform: `scale(${zoom})`, transformOrigin: "center", transition: "transform 0.2s ease-out" }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 10, pointerEvents: "none" }} />
            </div>

            {hasCameraAccess && (
              <div style={{ position: "absolute", bottom: 24, right: 24, display: "flex", gap: 12, alignItems: "center", zIndex: 30, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(4px)", padding: "8px 16px", borderRadius: 30, border: "1px solid #e5e7eb", boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }}>
                <button onClick={() => setZoom(z => Math.max(1, z - 0.2))} style={{ display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "none", border: "none", color: zoom <= 1 ? "#94a3b8" : "#475569" }} disabled={zoom <= 1}>
                  <ZoomOut size={20} />
                </button>
                <div style={{ width: 44, textAlign: "center", fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
                  {Math.round(zoom * 100)}%
                </div>
                <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} style={{ display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "none", border: "none", color: zoom >= 3 ? "#94a3b8" : "#475569" }} disabled={zoom >= 3}>
                  <ZoomIn size={20} />
                </button>
              </div>
            )}

            {!hasCameraAccess && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.9)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, zIndex: 20 }}>
                {cameraError ? (
                  <>
                    <ShieldAlert size={48} style={{ color: "#ef4444" }} />
                    <p style={{ color: "#ef4444", fontFamily: "monospace", fontSize: 14, textAlign: "center", maxWidth: 400, padding: "0 16px" }}>{cameraError}</p>
                    <button onClick={() => startCamera()} style={{ padding: "8px 16px", background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca", borderRadius: 8, fontFamily: "monospace", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      Retry Camera
                    </button>
                  </>
                ) : (
                  <>
                    <Camera size={48} style={{ color: "#cbd5e1" }} />
                    <p style={{ color: "#64748b", fontFamily: "monospace", fontSize: 16 }}>Requesting camera access...</p>
                  </>
                )}
              </div>
            )}
            
            {hasCameraAccess && (
              <div style={{ position: "absolute", inset: 0, border: "4px solid rgba(34,197,94,0.3)", pointerEvents: "none", zIndex: 20 }}>
                <div style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(4px)", padding: "6px 12px", borderRadius: 6, fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#16a34a", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", animation: "sd-pulse 2s infinite" }} />
                  YOLO INFERENCE ACTIVE
                </div>
              </div>
            )}

            {/* ── Floating Compliance Legend ── */}
            {hasCameraAccess && (
              <div style={{ 
                position: "absolute", bottom: 24, left: 24, zIndex: 30,
                background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
                padding: "12px 16px", borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.15)",
                fontFamily: "monospace", fontSize: 11, color: "#e2e8f0",
                display: "flex", flexDirection: "column", gap: 6,
                boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
              }}>
                <div style={{ fontWeight: 700, fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Detection Legend</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: "#22c55e", border: "2px solid #16a34a" }} />
                  <span>PPE Detected (Compliant)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: "#ef4444", border: "2px solid #dc2626" }} />
                  <span>PPE Missing (Violation)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: "#06b6d4", border: "2px solid #0891b2" }} />
                  <span>Person (Neutral)</span>
                </div>
              </div>
            )}
          </>
        )}

        {mode === 'upload' && (
          <>
            {!uploadedImage ? (
              <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", cursor: "pointer", background: "#f8fafc" }}>
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, border: "1px solid #e5e7eb", transition: "transform 0.2s" }}>
                  <Upload size={32} style={{ color: "#94a3b8" }} />
                </div>
                <h3 style={{ fontSize: 20, fontFamily: "monospace", color: "#475569", marginBottom: 8, fontWeight: 700 }}>Upload Photo for YOLO Inference</h3>
                <p style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: 14 }}>Click to browse your local files</p>
                <input type="file" style={{ display: "none" }} accept="image/*" onChange={handleFileUpload} />
              </label>
            ) : (
              <div style={{ width: "100%", height: "100%", position: "relative" }}>
                <canvas ref={uploadCanvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", background: "#0a0a0a", zIndex: 0 }} />
                
                {isScanning && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.8)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: 300 }} transition={{ duration: 1 }} style={{ height: 4, background: "#22c55e", marginBottom: 24, borderRadius: 2, boxShadow: "0 0 15px rgba(34,197,94,0.5)" }} />
                    <p style={{ fontFamily: "monospace", color: "#16a34a", fontSize: 14, fontWeight: 700, animation: "sd-pulse 2s infinite" }}>Sending to YOLO Backend...</p>
                  </div>
                )}
                
                {scanComplete && (
                  <>
                    <label style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(4px)", color: "#1e293b", border: "1px solid #e5e7eb", padding: "12px 24px", fontFamily: "monospace", fontSize: 14, fontWeight: 700, borderRadius: 8, cursor: "pointer", pointerEvents: "auto", boxShadow: "0 4px 15px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: 8, zIndex: 20 }}>
                      <Upload size={16} /> UPLOAD DIFFERENT PHOTO
                      <input type="file" style={{ display: "none" }} accept="image/*" onChange={handleFileUpload} />
                    </label>

                    {/* Legend for upload mode */}
                    <div style={{ 
                      position: "absolute", bottom: 24, left: 24, zIndex: 30,
                      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
                      padding: "12px 16px", borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.15)",
                      fontFamily: "monospace", fontSize: 11, color: "#e2e8f0",
                      display: "flex", flexDirection: "column", gap: 6,
                      boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
                    }}>
                      <div style={{ fontWeight: 700, fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Detection Legend</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 12, height: 12, borderRadius: 3, background: "#22c55e", border: "2px solid #16a34a" }} />
                        <span>PPE Detected (Compliant)</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 12, height: 12, borderRadius: 3, background: "#ef4444", border: "2px solid #dc2626" }} />
                        <span>PPE Missing (Violation)</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 12, height: 12, borderRadius: 3, background: "#06b6d4", border: "2px solid #0891b2" }} />
                        <span>Person (Neutral)</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Live Detection Log (below the video) ── */}
      {detectionsList.length > 0 && (
        <div className="sd-page-card" style={{ marginTop: 16, padding: "16px 20px" }}>
          <h3 style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <Eye size={16} style={{ color: "#06b6d4" }} /> Detection Log ({detectionsList.length} objects)
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {detectionsList.map((det: any, idx: number) => {
              const compliance = det.compliance || "neutral";
              const bgColor = compliance === "violation" ? "#fef2f2" : compliance === "compliant" ? "#f0fdf4" : "#f0f9ff";
              const textColor = compliance === "violation" ? "#ef4444" : compliance === "compliant" ? "#16a34a" : "#0891b2";
              const borderColor = compliance === "violation" ? "#fecaca" : compliance === "compliant" ? "#bbf7d0" : "#bae6fd";
              return (
                <span key={idx} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 8,
                  background: bgColor, color: textColor,
                  border: `1px solid ${borderColor}`,
                  fontFamily: "monospace", fontSize: 12, fontWeight: 700,
                }}>
                  <span style={{ 
                    width: 8, height: 8, borderRadius: "50%", 
                    background: textColor,
                  }} />
                  [ID:{det.class_id !== undefined ? det.class_id : "?"}] {(det.label || "").toUpperCase()} [{Math.round((det.confidence || 0) * 100)}%]
                </span>
              );
            })}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function VisionPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", color: "#94a3b8" }}>Loading Vision Engine...</div>}>
      <VisionContent />
    </Suspense>
  );
}

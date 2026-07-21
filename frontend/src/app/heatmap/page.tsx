"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Map as MapIcon, AlertTriangle, Navigation } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";

// Dynamically import MapComponent to disable SSR for Leaflet
const MapComponent = dynamic(() => import("@/components/MapComponent"), { 
  ssr: false,
  loading: () => <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontFamily: "monospace" }}>Loading Leaflet Engine...</div>
});

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface ZoneData { name: string; lat: number; lon: number; risk_score: number; incident_count: number; }
interface GpsPosition { lat: number; lon: number; accuracy: number; heading: number | null; speed: number | null; timestamp: number; }

export default function Heatmap() {
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [activeAlert, setActiveAlert] = useState<string | null>(null);
  
  const [center, setCenter] = useState<[number, number]>([17.6868, 83.2185]);
  const [zoom, setZoom] = useState(16);

  const [userPosition, setUserPosition] = useState<GpsPosition | null>(null);
  const userPosRef = useRef<GpsPosition | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string>("Acquiring GPS...");
  const [gpsActive, setGpsActive] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const initialCenterDone = useRef(false);

  useEffect(() => { userPosRef.current = userPosition; }, [userPosition]);

  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setTimeout(() => setGpsStatus("GPS not available"), 0);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGpsStatus("Acquiring GPS...");
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, heading, speed } = position.coords;
        const newPos: GpsPosition = { lat: latitude, lon: longitude, accuracy, heading, speed, timestamp: position.timestamp };
        setUserPosition(newPos); setGpsActive(true); setGpsStatus(`Live GPS Active • Accuracy: ${accuracy.toFixed(0)}m`);
        if (!initialCenterDone.current) { initialCenterDone.current = true; }
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED: setGpsStatus("GPS Permission Denied"); break;
          case error.POSITION_UNAVAILABLE: setGpsStatus("GPS Unavailable"); break;
          case error.TIMEOUT: setGpsStatus("GPS Timeout - Retrying..."); break;
          default: setGpsStatus("GPS Error");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
    watchIdRef.current = watchId;
    return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, []);

  useEffect(() => {
    const fetchHeatmap = async () => {
      try {
        let url = `${BACKEND_URL}/heatmap`;
        if (userPosRef.current) url += `?lat=${userPosRef.current.lat}&lon=${userPosRef.current.lon}`;
        const res = await fetch(url);
        if (res.ok) {
          const result = await res.json();
          if (result.status === "ok") {
            setZones(result.data);
            const criticalZones = result.data.filter((z: ZoneData) => z.risk_score > 0.7);
            if (criticalZones.length > 0) setActiveAlert(`CRITICAL: High risk detected in ${criticalZones.map((z: ZoneData) => z.name).join(", ")}.`);
            else setActiveAlert(null);
          }
        }
      } catch (e) { console.error("Failed to fetch heatmap", e); }
    };
    fetchHeatmap();
    const interval = setInterval(fetchHeatmap, 1500);
    return () => clearInterval(interval);
  }, []);

  const recenterOnUser = () => {
    if (userPosition) {
      setCenter([userPosition.lat, userPosition.lon]);
      setZoom(17);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <h2 className="sd-overview-title" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <MapIcon size={28} style={{ color: "#22c55e" }} /> Geospatial Safety Heatmap
          </h2>
          <div className="sd-overview-subtitle">Dynamic Risk Mapping (KDE) | Live Data Stream</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8, border: `1px solid ${gpsActive ? "#bbf7d0" : "#fde68a"}`, background: gpsActive ? "#f0fdf4" : "#fffbeb", fontSize: 13, fontWeight: 600, color: gpsActive ? "#16a34a" : "#d97706" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: gpsActive ? "#22c55e" : "#eab308", animation: "sd-pulse 2s infinite" }} />
            {gpsStatus}
          </div>
          {userPosition && (
            <button onClick={recenterOnUser} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <Navigation size={14} /> My Location
            </button>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f8fafc", fontSize: 13, fontWeight: 600, color: "#64748b" }}>
            Live Leaflet/KDE Layer Active
          </div>
        </div>
      </div>

      {activeAlert && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: 16, borderRadius: 12, marginBottom: 24, display: "flex", alignItems: "flex-start", gap: 12 }}>
          <AlertTriangle style={{ color: "#ef4444", marginTop: 2, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, textTransform: "uppercase", color: "#dc2626", letterSpacing: "0.05em", fontSize: 13, marginBottom: 4 }}>Compound Risk Detected</div>
            <div style={{ color: "#7f1d1d", fontSize: 14 }}>{activeAlert}</div>
          </div>
        </motion.div>
      )}

      {userPosition && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "12px 20px", fontSize: 12, fontFamily: "monospace", color: "#64748b" }}>
          <span>📍 LAT: <span style={{ color: "#2563eb", fontWeight: 700 }}>{userPosition.lat.toFixed(6)}</span></span>
          <span>LON: <span style={{ color: "#2563eb", fontWeight: 700 }}>{userPosition.lon.toFixed(6)}</span></span>
          <span>ACC: <span style={{ color: "#16a34a", fontWeight: 700 }}>{userPosition.accuracy.toFixed(0)}m</span></span>
          {userPosition.speed !== null && userPosition.speed > 0 && (
            <span>SPD: <span style={{ color: "#d97706", fontWeight: 700 }}>{(userPosition.speed * 3.6).toFixed(1)} km/h</span></span>
          )}
          <span style={{ marginLeft: "auto", color: "#94a3b8" }}>Updated: {new Date(userPosition.timestamp).toLocaleTimeString()}</span>
        </motion.div>
      )}

      {/* Map Legend */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 16, fontSize: 12, fontFamily: "monospace", color: "#475569" }}>
        <strong>KDE Density Scale:</strong>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 12, height: 12, borderRadius: 2, background: "blue" }}></span> Low
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 12, height: 12, borderRadius: 2, background: "cyan" }}></span> Moderate
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 12, height: 12, borderRadius: 2, background: "lime" }}></span> Elevated
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 12, height: 12, borderRadius: 2, background: "yellow" }}></span> High
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 12, height: 12, borderRadius: 2, background: "red" }}></span> Critical
        </div>
      </div>

      <div className="sd-page-card" style={{ padding: 0, overflow: "hidden", height: "calc(100vh - 320px)", minHeight: 500, position: "relative" }}>
        <MapComponent 
          zones={zones} 
          userPosition={userPosition} 
          center={center} 
          zoom={zoom} 
        />
      </div>
    </DashboardLayout>
  );
}

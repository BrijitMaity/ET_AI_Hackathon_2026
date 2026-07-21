"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { renderToString } from "react-dom/server";

interface ZoneData { name: string; lat: number; lon: number; risk_score: number; incident_count: number; }
interface GpsPosition { lat: number; lon: number; accuracy: number; heading: number | null; speed: number | null; timestamp: number; }

// --- Custom Hook to add the Heatmap Layer ---
function HeatmapLayer({ data }: { data: ZoneData[] }) {
  const map = useMap();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const heatLayerRef = useRef<any>(null);

  useEffect(() => {
    // Generate data points for KDE heatmap. 
    // Format: [lat, lng, intensity]
    // To make it look "industry level" and continuous, we use the risk_score as intensity
    const heatData = data.filter(z => z.incident_count > 0).map(z => [
      z.lat,
      z.lon,
      z.risk_score * 1.5 // boost intensity for better visualization
    ]);

    if (!heatLayerRef.current) {
      // @ts-expect-error - leaflet.heat adds L.heatLayer
      heatLayerRef.current = L.heatLayer(heatData, {
        radius: 65,      // Size of the influence of each point
        blur: 40,        // Amount of blur (makes it continuous rather than dotted)
        maxZoom: 17,
        max: 1.0,        // Max intensity
        gradient: {
          0.1: 'blue',
          0.3: 'cyan',
          0.5: 'lime',
          0.7: 'yellow',
          1.0: 'red'
        }
      }).addTo(map);
    } else {
      heatLayerRef.current.setLatLngs(heatData);
    }
  }, [data, map]);

  return null;
}

// --- Component to auto-recenter map ---
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// --- Main Map Component ---
export default function MapComponent({ 
  zones, 
  userPosition, 
  center, 
  zoom
}: { 
  zones: ZoneData[]; 
  userPosition: GpsPosition | null; 
  center: [number, number]; 
  zoom: number;
}) {
  
  // Custom Leaflet Icons for Zones
  const createZoneIcon = (isCritical: boolean, isMedium: boolean, radius: number) => {
    const color = isCritical ? "#ef4444" : isMedium ? "#f59e0b" : "#22c55e";
    const borderCol = isCritical ? "#dc2626" : isMedium ? "#d97706" : "#16a34a";
    
    // Use renderToString to render Lucide icons into the HTML marker
    const iconHtml = renderToString(
      isCritical ? <AlertTriangle size={Math.max(16, radius * 0.4)} color="white" /> : <ShieldCheck size={Math.max(16, radius * 0.4)} color="white" />
    );

    return L.divIcon({
      className: "custom-leaflet-marker",
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: ${radius}px; height: ${radius}px;">
          <div style="position: absolute; border-radius: 50%; background: ${color}; opacity: 0.6; width: 100%; height: 100%; animation: sd-pulse 2s infinite"></div>
          <div style="position: relative; z-index: 10; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2px solid white; background: ${borderCol}; width: ${radius * 0.7}px; height: ${radius * 0.7}px; box-shadow: 0 4px 15px ${color};">
            ${iconHtml}
          </div>
        </div>
      `,
      iconSize: [radius, radius],
      iconAnchor: [radius / 2, radius / 2],
    });
  };

  // Custom Leaflet Icon for User Position
  const userIcon = L.divIcon({
    className: "custom-leaflet-user-marker",
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;">
        <div style="position: absolute; border-radius: 50%; background: #22c55e; opacity: 0.3; width: 100%; height: 100%; animation: sd-pulse 1.5s infinite"></div>
        <div style="position: relative; z-index: 10; border-radius: 50%; background: #22c55e; border: 3px solid white; width: 16px; height: 16px; box-shadow: 0 4px 10px rgba(34,197,94,0.5);"></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

  return (
    <MapContainer 
      center={center} 
      zoom={zoom} 
      style={{ width: "100%", height: "100%", zIndex: 0 }}
      zoomControl={false}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* The actual continuous KDE Heatmap Layer */}
      <HeatmapLayer data={zones} />
      
      {/* Auto-recenter map when coordinates change */}
      <MapController center={center} zoom={zoom} />

      {/* User Position Marker */}
      {userPosition && (
        <Marker position={[userPosition.lat, userPosition.lon]} icon={userIcon}>
          <Popup>
            <div style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#16a34a" }}>
              📍 YOU ARE HERE
              <br/>
              <span style={{color: "#64748b", fontWeight: 400}}>Accuracy: {Math.round(userPosition.accuracy)}m</span>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Zone Markers */}
      {zones.map((zone, i) => {
        const isCritical = zone.risk_score > 0.7;
        const isMedium = zone.risk_score > 0.4 && !isCritical;
        
        // Capped radius for the physical marker (independent of the heatmap layer which uses radius 65)
        const cappedIncidentCount = Math.min(zone.incident_count, 10);
        const radius = 40 + (cappedIncidentCount * 4);

        return (
          <Marker key={zone.name + i} position={[zone.lat, zone.lon]} icon={createZoneIcon(isCritical, isMedium, radius)}>
            <Popup>
              <div style={{ fontFamily: "monospace" }}>
                <strong style={{ fontSize: 14, color: isCritical ? "#dc2626" : isMedium ? "#d97706" : "#16a34a" }}>
                  {zone.name}
                </strong>
                <div style={{ marginTop: 8, fontSize: 12, color: "#475569" }}>
                  <div>Active Incidents: <strong>{zone.incident_count}</strong></div>
                  <div>Risk Score: <strong>{zone.risk_score.toFixed(2)}</strong></div>
                  {isCritical && <div style={{ color: "#ef4444", fontWeight: 700, marginTop: 4 }}>⚠️ CRITICAL RISK LEVEL</div>}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

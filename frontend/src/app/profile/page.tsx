"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Mail, Briefcase, Phone, MapPin, ShieldCheck, FileText, Activity } from "lucide-react";

export default function ProfilePage() {
  const [user, setUser] = useState<{username: string, role: string, email?: string, phone?: string, employee_id?: string, assigned_zone?: string} | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const savedUser = localStorage.getItem('safety_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        // ignore error
      }
    }
  }, []);

  if (!mounted) return null;

  return (
    <DashboardLayout>
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>My Profile</h2>
        <div style={{ fontSize: "13px", color: "#64748b" }}>Manage your personal information and safety credentials.</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
        
        {/* Left Col - Card */}
        <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0, 0, 0, 0.04)", padding: "32px 24px", textAlign: "center" }}>
          <div style={{ width: "96px", height: "96px", background: "#1e293b", color: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", fontWeight: 700, margin: "0 auto 20px" }}>
            {user ? user.username.substring(0, 2).toUpperCase() : "KH"}
          </div>
          <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", margin: "0 0 4px", textTransform: "capitalize" }}>{user ? user.username : "Kyle Hudson"}</h3>
          <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 16px" }}>{user ? user.role : "Safety Supervisor"}</p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#f0fdf4", color: "#22c55e", padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 600 }}>
            <ShieldCheck size={14} /> Level 4 Clearance
          </div>
        </div>

        {/* Right Col - Details */}
        <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0, 0, 0, 0.04)", padding: "24px" }}>
          <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 20px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>Contact Information</h4>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "32px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Email Address</label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#0f172a", fontWeight: 500 }}>
                <Mail size={16} color="#94a3b8" /> {user?.email || "Not Provided"}
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Phone Number</label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#0f172a", fontWeight: 500 }}>
                <Phone size={16} color="#94a3b8" /> {user?.phone || "Not Provided"}
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Employee ID</label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#0f172a", fontWeight: 500 }}>
                <Briefcase size={16} color="#94a3b8" /> {user?.employee_id || "Not Provided"}
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Assigned Zone</label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#0f172a", fontWeight: 500 }}>
                <MapPin size={16} color="#94a3b8" /> {user?.assigned_zone || "Not Provided"}
              </div>
            </div>
          </div>

          <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 20px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>Recent Activity</h4>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileText size={18} color="#3b82f6" />
              </div>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 500, color: "#0f172a", margin: "0 0 2px" }}>Approved Hot Work Permit #4092</p>
                <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>2 hours ago</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Activity size={18} color="#f97316" />
              </div>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 500, color: "#0f172a", margin: "0 0 2px" }}>Acknowledged Gas Leak Warning in Zone B</p>
                <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>Yesterday</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}

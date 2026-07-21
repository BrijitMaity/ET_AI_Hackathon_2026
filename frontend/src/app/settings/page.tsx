"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Bell, Lock, Monitor, ShieldAlert } from "lucide-react";

export default function SettingsPage() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  useEffect(() => {
    // Load preferences from backend
    const loadPreferences = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/settings/preferences`);
        if (res.ok) {
          const data = await res.json();
          setPushEnabled(data.pushEnabled);
          setEmailEnabled(data.emailEnabled);
          
          if (data.darkMode !== undefined) {
            setDarkMode(data.darkMode);
            localStorage.setItem("theme", data.darkMode ? "dark" : "light");
            window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme: data.darkMode ? "dark" : "light" } }));
          }
        }
      } catch (e) {
        console.error("Failed to load preferences", e);
        // Fallback to local
        const isDark = localStorage.getItem("theme") === "dark";
        setDarkMode(isDark);
      }
    };
    
    loadPreferences();
    
    // Listen for theme changes from other components
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      setDarkMode(customEvent.detail.theme === 'dark');
    };
    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, [BACKEND_URL]);

  const savePreference = async (key: string, value: boolean) => {
    try {
      await fetch(`${BACKEND_URL}/api/settings/preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value })
      });
    } catch (e) {
      console.error("Failed to save preference", e);
    }
  };

  const handlePushToggle = async () => {
    const newState = !pushEnabled;
    if (newState) {
      if ('Notification' in window) {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification("Notifications Enabled", { body: "You will now receive critical safety alerts." });
          setPushEnabled(true);
          await savePreference("pushEnabled", true);
        } else {
          alert("Notification permission denied.");
        }
      } else {
        alert("Desktop notifications not supported.");
      }
    } else {
      setPushEnabled(false);
      await savePreference("pushEnabled", false);
    }
  };

  const handleDarkModeToggle = async () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem("theme", newDarkMode ? "dark" : "light");
    window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme: newDarkMode ? "dark" : "light" } }));
    await savePreference("darkMode", newDarkMode);
  };

  const handleEmailToggle = async () => {
    const newState = !emailEnabled;
    setEmailEnabled(newState);
    await savePreference("emailEnabled", newState);
    if (newState) {
      // Mock notification
      alert("Daily digest subscribed for your account");
    }
  };

  const handlePasswordSubmit = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      alert("New passwords do not match!");
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/settings/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: passwordForm.current, new: passwordForm.new })
      });
      if (res.ok) {
        alert("Password updated successfully!");
        setShowPasswordModal(false);
        setPasswordForm({current: "", new: "", confirm: ""});
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to update password");
    }
  };

  return (
    <DashboardLayout>
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>Preferences</h2>
        <div style={{ fontSize: "13px", color: "#64748b" }}>Customize your dashboard experience and notification settings.</div>
      </div>

      <div className="sd-settings-card" style={{ borderRadius: "14px", padding: "24px", maxWidth: "800px" }}>
        
        {/* Notifications Section */}
        <div style={{ marginBottom: "32px" }}>
          <h4 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 16px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
            <Bell size={16} /> Notification Settings
          </h4>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", margin: "0 0 4px" }}>Push Notifications</p>
                <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>Receive instant alerts on your desktop for critical incidents.</p>
              </div>
              <button className="sd-toggle" onClick={handlePushToggle} style={{ width: "44px", height: "24px", borderRadius: "12px", background: pushEnabled ? "#3b82f6" : "#cbd5e1", border: "none", position: "relative", cursor: "pointer", transition: "background 0.2s" }}>
                <div style={{ width: "20px", height: "20px", background: "#fff", borderRadius: "50%", position: "absolute", top: "2px", left: pushEnabled ? "22px" : "2px", transition: "left 0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }} />
              </button>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", margin: "0 0 4px" }}>Email Digest</p>
                <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>Receive a daily email summary of all safety events.</p>
              </div>
              <button className="sd-toggle" onClick={handleEmailToggle} style={{ width: "44px", height: "24px", borderRadius: "12px", background: emailEnabled ? "#3b82f6" : "#cbd5e1", border: "none", position: "relative", cursor: "pointer", transition: "background 0.2s" }}>
                <div style={{ width: "20px", height: "20px", background: "#fff", borderRadius: "50%", position: "absolute", top: "2px", left: emailEnabled ? "22px" : "2px", transition: "left 0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }} />
              </button>
            </div>
          </div>
        </div>

        {/* Display Section */}
        <div style={{ marginBottom: "32px" }}>
          <h4 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 16px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
            <Monitor size={16} /> Display & Theme
          </h4>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", margin: "0 0 4px" }}>Dark Mode</p>
                <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>Toggle the dashboard appearance.</p>
              </div>
              <button className="sd-toggle" onClick={handleDarkModeToggle} style={{ width: "44px", height: "24px", borderRadius: "12px", background: darkMode ? "#3b82f6" : "#cbd5e1", border: "none", position: "relative", cursor: "pointer", transition: "background 0.2s" }}>
                <div style={{ width: "20px", height: "20px", background: "#fff", borderRadius: "50%", position: "absolute", top: "2px", left: darkMode ? "22px" : "2px", transition: "left 0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }} />
              </button>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div>
          <h4 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 16px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
            <ShieldAlert size={16} /> Security
          </h4>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <button onClick={() => setShowPasswordModal(true)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "13px", fontWeight: 600, color: "#475569", cursor: "pointer", width: "fit-content", transition: "background 0.2s" }} onMouseOver={(e) => e.currentTarget.style.background = "#e2e8f0"} onMouseOut={(e) => e.currentTarget.style.background = "#f8fafc"}>
              <Lock size={16} /> Change Password
            </button>
          </div>
        </div>

      </div>

      {/* Password Modal Overlay */}
      {showPasswordModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", width: "100%", maxWidth: "400px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a", margin: "0 0 16px" }}>Change Password</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Current Password</label>
                <input type="password" value={passwordForm.current} onChange={(e) => setPasswordForm({...passwordForm, current: e.target.value})} style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #e5e7eb", fontSize: "14px", boxSizing: "border-box", color: "#1e293b", outline: "none" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>New Password</label>
                <input type="password" value={passwordForm.new} onChange={(e) => setPasswordForm({...passwordForm, new: e.target.value})} style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #e5e7eb", fontSize: "14px", boxSizing: "border-box", color: "#1e293b", outline: "none" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Confirm New Password</label>
                <input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({...passwordForm, confirm: e.target.value})} style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #e5e7eb", fontSize: "14px", boxSizing: "border-box", color: "#1e293b", outline: "none" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button onClick={() => setShowPasswordModal(false)} style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #e5e7eb", background: "#fff", color: "#475569", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>Cancel</button>
              <button onClick={handlePasswordSubmit} style={{ padding: "8px 16px", borderRadius: "6px", border: "none", background: "#3b82f6", color: "#fff", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

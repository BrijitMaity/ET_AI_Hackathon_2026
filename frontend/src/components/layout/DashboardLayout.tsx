"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  AlertTriangle,
  FileText,
  Bot,
  Bell,
  Clock,
  Map,
  Camera,
  Siren,
  Eye,
  RefreshCw,
  User,
  Settings,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Risk Alerts", icon: AlertTriangle, href: "/incidents", badge: 4 },
  { label: "Permits", icon: FileText, href: "/permits" },
  { label: "Safety AI", icon: Bot, href: "/audit" },
  { label: "Heatmap", icon: Map, href: "/heatmap" },
  { label: "Cameras", icon: Camera, href: "/cameras" },
  { label: "Vision", icon: Eye, href: "/vision" },
  { label: "Emergency", icon: Siren, href: "/emergency" },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [user, setUser] = useState<{username: string, role: string} | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === 'dark') setIsDark(true);

    const savedUser = localStorage.getItem('safety_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        // ignore error
      }
    }
    
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsDark(customEvent.detail.theme === 'dark');
    };
    window.addEventListener('theme-change', handleThemeChange);

    setMounted(true);
    const updateTime = () => {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-GB', {
        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false
      });
      setCurrentTime(formatter.format(now).replace(',', ' -'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('theme-change', handleThemeChange);
    };
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    window.dispatchEvent(new Event('dashboard-refresh'));
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Derive page title from pathname
  const getPageTitle = () => {
    const item = NAV_ITEMS.find((n) => n.href === pathname);
    return item?.label || "Dashboard";
  };

  return (
    <div className={`safety-dashboard ${isDark ? "dark" : ""}`}>
      {/* ========================= SIDEBAR ========================= */}
      <aside className="sd-sidebar">
        <div className="sd-sidebar-logo">
          <div className="sd-logo-icon">
            <Clock size={20} strokeWidth={2.5} />
          </div>
          <div>
            <div className="sd-logo-title">SafetyAI</div>
            <div className="sd-logo-subtitle">Industrial Platform</div>
          </div>
        </div>

        <div className="sd-sidebar-nav">
          <div className="sd-nav-label">NAVIGATION</div>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`sd-nav-item ${isActive ? "sd-nav-active" : ""}`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="sd-nav-badge">{item.badge}</span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="sd-sidebar-alert">
          <div className="sd-alert-header">
            <span className="sd-alert-dot" />
            <span className="sd-alert-title">ALERT ACTIVE</span>
          </div>
          <div className="sd-alert-body">
            Gas Leak · Zone B<br />
            Evacuating 12 workers
          </div>
        </div>
      </aside>

      {/* ========================= MAIN CONTENT ========================= */}
      <div className="sd-main">
        <header className="sd-header">
          <h1 className="sd-header-title">{getPageTitle()}</h1>
          <div className="sd-header-right">
            <div className="sd-header-time">
              <Clock size={14} />
              <span style={{ minWidth: "165px" }}>{mounted ? currentTime : "Syncing clock..."}</span>
            </div>
            <button className="sd-refresh-btn" onClick={handleRefresh}>
              <RefreshCw size={14} className={isRefreshing ? "sd-spin" : ""} />
              Refresh
            </button>
            
            <button className="sd-header-bell" onClick={() => {
              const newTheme = !isDark;
              setIsDark(newTheme);
              localStorage.setItem('theme', newTheme ? 'dark' : 'light');
              window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme: newTheme ? 'dark' : 'light' } }));
            }} title="Toggle Theme">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            
            {/* Notifications Popover */}
            <div style={{ position: "relative" }} ref={notifRef}>
              <button className="sd-header-bell" onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}>
                <Bell size={18} />
                <span className="sd-bell-badge" />
              </button>
              
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    style={{ position: "absolute", top: "48px", right: "-10px", width: "320px", background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04)", zIndex: 100, overflow: "hidden" }}
                  >
                    <div style={{ padding: "16px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", margin: 0 }}>Notifications</h3>
                      <span style={{ fontSize: "12px", color: "#3b82f6", cursor: "pointer", fontWeight: 500 }} onClick={() => setShowNotifications(false)}>Mark all as read</span>
                    </div>
                    <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                      <div style={{ padding: "16px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: "12px", background: "#f8fafc" }}>
                        <div style={{ width: "8px", height: "8px", background: "#ef4444", borderRadius: "50%", marginTop: "6px", flexShrink: 0 }} />
                        <div>
                          <p style={{ fontSize: "13px", color: "#0f172a", margin: "0 0 4px 0", fontWeight: 500 }}>Gas Leak Detected</p>
                          <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>Zone B - Evacuating 12 workers.</p>
                          <p style={{ fontSize: "11px", color: "#94a3b8", margin: "6px 0 0 0" }}>Just now</p>
                        </div>
                      </div>
                      <div style={{ padding: "16px", display: "flex", gap: "12px" }}>
                        <div style={{ width: "8px", height: "8px", background: "#22c55e", borderRadius: "50%", marginTop: "6px", flexShrink: 0 }} />
                        <div>
                          <p style={{ fontSize: "13px", color: "#0f172a", margin: "0 0 4px 0", fontWeight: 500 }}>Permit Approved</p>
                          <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>Hot work permit #4092 approved.</p>
                          <p style={{ fontSize: "11px", color: "#94a3b8", margin: "6px 0 0 0" }}>2 hours ago</p>
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: "12px", borderTop: "1px solid #e5e7eb", textAlign: "center" }}>
                      <Link href="/incidents" onClick={() => setShowNotifications(false)} style={{ fontSize: "13px", color: "#64748b", textDecoration: "none", fontWeight: 500 }}>View all alerts</Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Popover */}
            <div style={{ position: "relative" }} ref={profileRef}>
              <div className="sd-header-avatar" onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }} style={{ cursor: "pointer" }}>{user ? user.username.substring(0, 2).toUpperCase() : "KH"}</div>
              
              <AnimatePresence>
                {showProfile && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    style={{ position: "absolute", top: "48px", right: "0", width: "240px", background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04)", zIndex: 100, overflow: "hidden", padding: "8px" }}
                  >
                    <div style={{ padding: "12px 12px 16px", borderBottom: "1px solid #f1f5f9", marginBottom: "8px" }}>
                      <p style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", margin: "0 0 2px 0", textTransform: "capitalize" }}>{user ? user.username : "Kyle Hudson"}</p>
                      <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>{user ? user.role : "Safety Supervisor"}</p>
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <button style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", fontSize: "13px", color: "#475569", background: "transparent", border: "none", borderRadius: "6px", cursor: "pointer", textAlign: "left", width: "100%" }} onMouseOver={(e) => e.currentTarget.style.background = "#f8fafc"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"} onClick={() => { setShowProfile(false); router.push('/profile'); }}>
                        <User size={16} /> My Profile
                      </button>
                      <button style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", fontSize: "13px", color: "#475569", background: "transparent", border: "none", borderRadius: "6px", cursor: "pointer", textAlign: "left", width: "100%" }} onMouseOver={(e) => e.currentTarget.style.background = "#f8fafc"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"} onClick={() => { setShowProfile(false); router.push('/settings'); }}>
                        <Settings size={16} /> Preferences
                      </button>
                      <button style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", fontSize: "13px", color: "#ef4444", background: "transparent", border: "none", borderRadius: "6px", cursor: "pointer", textAlign: "left", width: "100%", marginTop: "4px" }} onMouseOver={(e) => e.currentTarget.style.background = "#fef2f2"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"} onClick={() => { setShowProfile(false); router.push('/login'); }}>
                        <LogOut size={16} /> Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <div className="sd-content">
          {children}
        </div>
      </div>
    </div>
  );
}

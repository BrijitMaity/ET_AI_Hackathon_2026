"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, Eye, EyeOff, ShieldAlert, Users, HardHat, Search, X, Mail, Phone, Briefcase, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

type Role = "Worker" | "Admin" | "Supervisor";

export default function LoginPage() {
  const router = useRouter();
  const [activeModal, setActiveModal] = useState<Role | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [assignedZone, setAssignedZone] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModal) return;
    setLoading(true);
    setError(null);

    const endpoint = isRegistering ? "/auth/register" : "/auth/login";
    
    try {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username, 
          password, 
          role: activeModal,
          email: isRegistering ? email : undefined,
          phone: isRegistering ? phone : undefined,
          employee_id: isRegistering ? employeeId : undefined,
          assigned_zone: isRegistering ? assignedZone : undefined
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setError(data.detail || "Authentication failed");
        setLoading(false);
        return;
      }

      if (isRegistering) {
        // Auto-login after register
        setIsRegistering(false);
        setError("Registration successful. Please log in.");
        setLoading(false);
      } else {
        localStorage.setItem("safety_user", JSON.stringify(data));
        router.push("/dashboard");
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const openModal = (role: Role) => {
    setActiveModal(role);
    setIsRegistering(false);
    setError(null);
    setUsername("");
    setPassword("");
    setEmail("");
    setPhone("");
    setEmployeeId("");
    setAssignedZone("");
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#e2e8f0", fontFamily: "var(--font-inter), sans-serif" }}>
      
      {/* Top Header */}
      <header style={{ backgroundColor: "#ffffff", padding: "16px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "4px solid #94a3b8" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #16a34a, #059669)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <ShieldAlert size={20} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#1e293b", letterSpacing: "0.05em" }}>SAFETY OS</h1>
            <p style={{ margin: 0, fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Industrial Platform</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#475569", letterSpacing: "0.05em" }}>AUTHENTICATION SYSTEM</span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#94a3b8", fontSize: "12px" }}>
            <Search size={14} /> Light mode
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
        
        {/* Portal Cards Row */}
        <div style={{ display: "flex", gap: "24px", marginBottom: "40px" }}>
          
          {/* Worker Portal */}
          <div onClick={() => openModal("Worker")} style={{ flex: 1, backgroundColor: "#1e293b", borderRadius: "12px", padding: "24px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", transition: "transform 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
            <div style={{ backgroundColor: "rgba(255,255,255,0.1)", padding: "12px", borderRadius: "8px" }}>
              <HardHat size={32} />
            </div>
            <div>
              <h2 style={{ margin: "0 0 4px 0", fontSize: "18px", fontWeight: 700 }}>Worker Portal</h2>
              <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>Click to continue as Worker</p>
            </div>
          </div>

          {/* Admin Portal */}
          <div onClick={() => openModal("Admin")} style={{ flex: 1, backgroundColor: "#dc2626", borderRadius: "12px", padding: "24px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", transition: "transform 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
            <div style={{ backgroundColor: "rgba(255,255,255,0.2)", padding: "12px", borderRadius: "8px" }}>
              <ShieldAlert size={32} />
            </div>
            <div>
              <h2 style={{ margin: "0 0 4px 0", fontSize: "18px", fontWeight: 700 }}>Admin Portal</h2>
              <p style={{ margin: 0, fontSize: "12px", color: "#fca5a5" }}>Click to continue as Admin</p>
            </div>
          </div>

          {/* Supervisor Portal */}
          <div onClick={() => openModal("Supervisor")} style={{ flex: 1, backgroundColor: "#16a34a", borderRadius: "12px", padding: "24px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", transition: "transform 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
            <div style={{ backgroundColor: "rgba(255,255,255,0.2)", padding: "12px", borderRadius: "8px" }}>
              <Users size={32} />
            </div>
            <div>
              <h2 style={{ margin: "0 0 4px 0", fontSize: "18px", fontWeight: 700 }}>Supervisor Portal</h2>
              <p style={{ margin: 0, fontSize: "12px", color: "#86efac" }}>Click to continue as Supervisor</p>
            </div>
          </div>
          
        </div>

        {/* Lower Info Area (Decorative) */}
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#334155", margin: "0 0 8px 0" }}>Important Information & updates</h3>
          <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 24px 0" }}>Instructions, Helpline details, and latest news in one place.</p>
          
          <div style={{ backgroundColor: "#f8fafc", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", margin: "0 0 4px 0" }}>Technical Helpline Details</h4>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 16px 0" }}>Contact information for technical support.</p>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#334155", margin: 0 }}>TECHNICAL HELPDESK: 1800-419-7100 | EMAIL: SUPPORT@SAFETY.OS</p>
          </div>
        </div>

      </div>

      {/* Modal Overlay */}
      <AnimatePresence>
        {activeModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "20px" }}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              style={{ backgroundColor: "#ffffff", borderRadius: "12px", width: "100%", maxWidth: "500px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden" }}
            >
              
              {/* Modal Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid #e2e8f0" }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>
                  {isRegistering ? "Register As" : "Sign In As"} {activeModal}
                </h3>
                <button onClick={() => setActiveModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={20} /></button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: "32px 40px" }}>
                
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "32px" }}>
                  <div style={{ width: "56px", height: "56px", borderRadius: "16px", backgroundColor: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6", marginBottom: "16px" }}>
                    <Lock size={28} />
                  </div>
                  <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
                    {isRegistering ? "Create your credentials to register." : "Enter your credentials to sign in."}
                  </p>
                </div>

                {error && (
                  <div style={{ padding: "12px", borderRadius: "8px", backgroundColor: error.includes("successful") ? "#f0fdf4" : "#fef2f2", color: error.includes("successful") ? "#16a34a" : "#dc2626", fontSize: "13px", fontWeight: 600, marginBottom: "20px", textAlign: "center" }}>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ position: "relative" }}>
                      <User size={18} style={{ position: "absolute", left: "14px", top: "13px", color: "#94a3b8" }} />
                      <input 
                        type="text" 
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        minLength={3}
                        style={{ width: "100%", padding: "12px 14px 12px 42px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none", boxSizing: "border-box", color: "#1e293b", transition: "border-color 0.2s" }} 
                        onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                        onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                      />
                    </div>
                  </div>

                  {isRegistering && (
                    <>
                      <div style={{ marginBottom: "16px" }}>
                        <div style={{ position: "relative" }}>
                          <Mail size={18} style={{ position: "absolute", left: "14px", top: "13px", color: "#94a3b8" }} />
                          <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: "100%", padding: "12px 14px 12px 42px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none", boxSizing: "border-box", color: "#1e293b", transition: "border-color 0.2s" }} onFocus={(e) => e.target.style.borderColor = "#3b82f6"} onBlur={(e) => e.target.style.borderColor = "#cbd5e1"} />
                        </div>
                      </div>
                      <div style={{ marginBottom: "16px" }}>
                        <div style={{ position: "relative" }}>
                          <Phone size={18} style={{ position: "absolute", left: "14px", top: "13px", color: "#94a3b8" }} />
                          <input type="text" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} required style={{ width: "100%", padding: "12px 14px 12px 42px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none", boxSizing: "border-box", color: "#1e293b", transition: "border-color 0.2s" }} onFocus={(e) => e.target.style.borderColor = "#3b82f6"} onBlur={(e) => e.target.style.borderColor = "#cbd5e1"} />
                        </div>
                      </div>
                      <div style={{ marginBottom: "16px", display: "flex", gap: "16px" }}>
                        <div style={{ position: "relative", flex: 1 }}>
                          <Briefcase size={18} style={{ position: "absolute", left: "14px", top: "13px", color: "#94a3b8" }} />
                          <input type="text" placeholder="Employee ID" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required style={{ width: "100%", padding: "12px 14px 12px 42px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none", boxSizing: "border-box", color: "#1e293b", transition: "border-color 0.2s" }} onFocus={(e) => e.target.style.borderColor = "#3b82f6"} onBlur={(e) => e.target.style.borderColor = "#cbd5e1"} />
                        </div>
                        <div style={{ position: "relative", flex: 1 }}>
                          <MapPin size={18} style={{ position: "absolute", left: "14px", top: "13px", color: "#94a3b8" }} />
                          <input type="text" placeholder="Assigned Zone" value={assignedZone} onChange={(e) => setAssignedZone(e.target.value)} required style={{ width: "100%", padding: "12px 14px 12px 42px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none", boxSizing: "border-box", color: "#1e293b", transition: "border-color 0.2s" }} onFocus={(e) => e.target.style.borderColor = "#3b82f6"} onBlur={(e) => e.target.style.borderColor = "#cbd5e1"} />
                        </div>
                      </div>
                    </>
                  )}

                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ position: "relative" }}>
                      <Lock size={18} style={{ position: "absolute", left: "14px", top: "13px", color: "#94a3b8" }} />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={4}
                        style={{ width: "100%", padding: "12px 42px 12px 42px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none", boxSizing: "border-box", color: "#1e293b", transition: "border-color 0.2s" }}
                        onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                        onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "14px", top: "13px", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", fontSize: "13px" }}>
                    {!isRegistering && (
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748b", cursor: "pointer" }}>
                        <input type="checkbox" style={{ cursor: "pointer" }} /> Remember me
                      </label>
                    )}
                    <button type="button" onClick={() => setIsRegistering(!isRegistering)} style={{ background: "none", border: "none", color: "#3b82f6", fontWeight: 600, cursor: "pointer", marginLeft: isRegistering ? "auto" : "0" }}>
                      {isRegistering ? "Already have an account? Sign In" : "Need an account? Sign Up"}
                    </button>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "24px" }}>
                    <button type="button" onClick={() => setActiveModal(null)} style={{ padding: "10px 24px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#fff", color: "#475569", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                      Close
                    </button>
                    <button type="submit" disabled={loading} style={{ padding: "10px 24px", borderRadius: "8px", border: "none", background: "#3b82f6", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
                      {loading ? "Processing..." : isRegistering ? "Register" : "Sign In"}
                    </button>
                  </div>

                </form>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

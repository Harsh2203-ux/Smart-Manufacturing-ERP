import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { NOTIFICATIONS } from "../../data/dashboardData";
import { DEMO_MODE, isDemoSessionActive } from "../../demo/demoSession";

// ─── Breadcrumb helpers ───────────────────────────────────────────────────────
const ROUTE_LABELS: Record<string, string> = {
  "dashboard":      "Dashboard",
  "production":     "Manufacturing Orders",
  "work-orders":    "Work Orders",
  "bom":            "Bill of Materials",
  "planning":       "Production Planning",
  "inventory":      "Inventory",
  "products":       "Products",
  "warehouse":      "Warehouse",
  "machines":       "Machines",
  "purchase":       "Purchase",
  "suppliers":      "Suppliers",
  "orders":         "Orders",
  "customers":      "Customers",
  "employees":      "Employees",
  "attendance":     "Attendance",
  "quality":        "Quality Control",
  "maintenance":    "Maintenance",
  "reports":        "Reports",
  "analytics":      "Analytics",
  "notifications":  "Notifications",
  "settings":       "Settings",
  "users":          "Users",
  "profile":        "Profile",
};

function buildCrumbs(pathname: string): { label: string; path: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; path: string }[] = [];
  let currentPath = "";
  for (const seg of segments) {
    currentPath += `/${seg}`;
    const label = ROUTE_LABELS[seg] ?? seg.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    crumbs.push({ label, path: currentPath });
  }
  return crumbs;
}

// ─── Role badge colours (extended for all 12 roles) ──────────────────────────
const ROLE_META: Record<string, { bg: string; color: string }> = {
  super_admin:          { bg: "rgba(139,92,246,0.13)", color: "#7c3aed" },
  admin:                { bg: "rgba(79,70,229,0.12)",  color: "#4f46e5" },
  production_manager:   { bg: "rgba(6,182,212,0.12)",  color: "#0891b2" },
  inventory_manager:    { bg: "rgba(16,185,129,0.12)", color: "#065f46" },
  purchase_manager:     { bg: "rgba(245,158,11,0.12)", color: "#b45309" },
  sales_manager:        { bg: "rgba(239,68,68,0.12)",  color: "#b91c1c" },
  quality_manager:      { bg: "rgba(16,185,129,0.12)", color: "#065f46" },
  maintenance_manager:  { bg: "rgba(99,102,241,0.12)", color: "#4338ca" },
  hr_manager:           { bg: "rgba(236,72,153,0.12)", color: "#be185d" },
  finance_manager:      { bg: "rgba(59,130,246,0.12)", color: "#1d4ed8" },
  operator:             { bg: "rgba(217,119,6,0.12)",  color: "#d97706" },
  employee:             { bg: "rgba(100,116,139,0.12)",color: "#475569" },
};

const NOTIF_LEVEL_ICON: Record<string, string> = {
  error:   "⛔",
  warning: "⚠️",
  success: "✅",
  info:    "ℹ️",
};

const NOTIF_LEVEL_COLOR: Record<string, string> = {
  error:   "var(--error-text)",
  warning: "var(--warning-text)",
  success: "var(--success-text)",
  info:    "#3b82f6",
};

// ─── Dark / Light mode toggle ─────────────────────────────────────────────────
function useColorScheme() {
  const [dark, setDark] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
      // Inject overriding CSS custom-props so we can switch independent of OS
      const existing = document.getElementById("__erp-theme");
      if (next) {
        applyDark(existing);
      } else {
        applyLight(existing);
      }
      return next;
    });
  }, []);

  return { dark, toggle };
}

function applyDark(el: HTMLElement | null) {
  const style = el ?? document.createElement("style");
  style.id = "__erp-theme";
  style.textContent = `
    :root {
      --accent:#60a5fa;--accent-muted:#3b82f6;--accent-light:rgba(96,165,250,.12);
      --text:#94a3b8;--text-h:#f1f5f9;
      --main-bg:#0a0f1e;--bg:#0f172a;--card-bg:#1e293b;--card-border:#334155;
      --sidebar-bg:#07090f;--sidebar-border:#1e293b;--sidebar-text:#64748b;--sidebar-text-active:#e2e8f0;--sidebar-active-bg:rgba(96,165,250,.14);
      --topbar-bg:#1e293b;--topbar-border:#334155;--topbar-text:#f1f5f9;--topbar-muted:#64748b;
      --border:#334155;--input-bg:#0f172a;
      --table-head-bg:#0f172a;--table-stripe-bg:#162032;
      --success-bg:rgba(6,95,70,.22);--success-text:#6ee7b7;
      --warning-bg:rgba(146,64,14,.22);--warning-text:#fcd34d;
      --error-bg:rgba(153,27,27,.22);--error-border:rgba(252,165,165,.28);--error-text:#fca5a5;
      --code-bg:#1e293b;
      --shadow-sm:0 1px 3px 0 rgba(0,0,0,.35);
      --shadow:0 4px 6px -1px rgba(0,0,0,.45);
      --shadow-lg:0 10px 15px -3px rgba(0,0,0,.55);
    }
  `;
  if (!el) document.head.appendChild(style);
}

function applyLight(el: HTMLElement | null) {
  const style = el ?? document.createElement("style");
  style.id = "__erp-theme";
  style.textContent = `
    :root {
      --accent:#1d4ed8;--accent-muted:#3b82f6;--accent-light:#eff6ff;
      --text:#4b5563;--text-h:#0f172a;
      --main-bg:#f1f5f9;--bg:#ffffff;--card-bg:#ffffff;--card-border:#e2e8f0;
      --sidebar-bg:#0f172a;--sidebar-border:#1e293b;--sidebar-text:#94a3b8;--sidebar-text-active:#f8fafc;--sidebar-active-bg:rgba(59,130,246,.18);
      --topbar-bg:#ffffff;--topbar-border:#e2e8f0;--topbar-text:#0f172a;--topbar-muted:#94a3b8;
      --border:#cbd5e1;--input-bg:#f8fafc;
      --table-head-bg:#f8fafc;--table-stripe-bg:#f8fafc;
      --success-bg:#d1fae5;--success-text:#065f46;
      --warning-bg:#fef3c7;--warning-text:#92400e;
      --error-bg:#fee2e2;--error-border:#fca5a5;--error-text:#991b1b;
      --code-bg:#f1f5f9;
      --shadow-sm:0 1px 3px 0 rgba(15,23,42,.07);
      --shadow:0 4px 6px -1px rgba(15,23,42,.08);
      --shadow-lg:0 10px 15px -3px rgba(15,23,42,.10);
    }
  `;
  if (!el) document.head.appendChild(style);
}

// ─── Small icon button ────────────────────────────────────────────────────────
function IconBtn({
  children, onClick, title, badge,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        position:     "relative",
        background:   "none",
        border:       "1px solid var(--topbar-border)",
        borderRadius: "8px",
        width:        "34px",
        height:       "34px",
        display:      "flex",
        alignItems:   "center",
        justifyContent:"center",
        cursor:       "pointer",
        color:        "var(--topbar-text)",
        fontSize:     "15px",
        flexShrink:   0,
        transition:   "background 0.12s",
      }}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span style={{
          position:      "absolute",
          top:           "-4px",
          right:         "-4px",
          background:    "#ef4444",
          color:         "#fff",
          borderRadius:  "999px",
          fontSize:      "9px",
          fontWeight:    700,
          minWidth:      "16px",
          height:        "16px",
          display:       "flex",
          alignItems:    "center",
          justifyContent:"center",
          padding:       "0 3px",
          lineHeight:    1,
        }}>
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

export default function TopBar() {
  const { user, logout } = useAuth();
  // Recompute on every render — sessionStorage is synchronous so this is fine.
  const inDemoMode = DEMO_MODE && isDemoSessionActive();
  const navigate     = useNavigate();
  const location     = useLocation();
  const { dark, toggle: toggleTheme } = useColorScheme();

  const [searchVal,   setSearchVal]   = useState("");
  const [showNotifs,  setShowNotifs]  = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const notifsRef  = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadCount  = NOTIFICATIONS.filter((n) => !n.read).length;
  const crumbs       = buildCrumbs(location.pathname);
  const badge        = user ? (ROLE_META[user.role] ?? { bg: "var(--code-bg)", color: "var(--text)" }) : null;
  const roleLabel    = user?.role?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? "";

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifsRef.current  && !notifsRef.current.contains(e.target as Node))  setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header style={{
      height:       "60px",
      background:   "var(--topbar-bg)",
      borderBottom: "1px solid var(--topbar-border)",
      display:      "flex",
      alignItems:   "center",
      justifyContent: "space-between",
      padding:      "0 20px",
      flexShrink:   0,
      gap:          "12px",
    }}>

      {/* ── Left: Breadcrumb ─────────────────────────────────────────────── */}
      <nav aria-label="breadcrumb" style={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0, flex: 1 }}>
        {crumbs.map((crumb, i) => (
          <span key={crumb.path} style={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0 }}>
            {i > 0 && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--topbar-muted)" strokeWidth="1.5">
                <path d="M4 2l4 4-4 4"/>
              </svg>
            )}
            <button
              onClick={() => navigate(crumb.path)}
              style={{
                background:   "none",
                border:       "none",
                cursor:       "pointer",
                padding:      "2px 4px",
                borderRadius: "4px",
                fontSize:     "13px",
                fontWeight:   i === crumbs.length - 1 ? 600 : 400,
                color:        i === crumbs.length - 1 ? "var(--topbar-text)" : "var(--topbar-muted)",
                whiteSpace:   "nowrap",
                overflow:     "hidden",
                textOverflow: "ellipsis",
                maxWidth:     "140px",
              }}
            >
              {crumb.label}
            </button>
          </span>
        ))}
      </nav>

      {/* ── Centre: Search bar ───────────────────────────────────────────── */}
      <div style={{
        position:   "relative",
        flex:       "0 1 300px",
        flexShrink: 1,
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--topbar-muted)"
          strokeWidth="1.75" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
          <circle cx="6" cy="6" r="4"/><path d="M10 10l2.5 2.5"/>
        </svg>
        <input
          type="search"
          placeholder="Search modules, orders, products…"
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          style={{
            width:        "100%",
            padding:      "7px 12px 7px 30px",
            fontSize:     "13px",
            borderRadius: "8px",
            border:       "1px solid var(--topbar-border)",
            background:   "var(--input-bg)",
            color:        "var(--topbar-text)",
            outline:      "none",
            boxSizing:    "border-box",
          }}
        />
      </div>

      {/* ── Right: Actions ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>

        {/* ── Demo Mode badge ─────────────────────────────────────────────── */}
        {inDemoMode && (
          <div style={{
            display:      "flex",
            alignItems:   "center",
            gap:          "6px",
            padding:      "4px 10px",
            borderRadius: "6px",
            background:   "rgba(217,119,6,0.12)",
            border:       "1.5px solid #d97706",
            flexShrink:   0,
          }}>
            <span style={{ fontSize: "9px", lineHeight: 1, opacity: 0.7 }}>⬤</span>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#d97706", letterSpacing: "0.6px", textTransform: "uppercase" }}>
              Demo Mode
            </span>
          </div>
        )}

        {/* Dark/Light toggle */}
        <IconBtn onClick={toggleTheme} title={dark ? "Switch to light mode" : "Switch to dark mode"}>
          {dark ? "☀️" : "🌙"}
        </IconBtn>

        {/* Notifications */}
        <div ref={notifsRef} style={{ position: "relative" }}>
          <IconBtn onClick={() => setShowNotifs((p) => !p)} title="Notifications" badge={unreadCount}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
          </IconBtn>

          {/* Notifications dropdown */}
          {showNotifs && (
            <div style={{
              position:   "absolute",
              right:      0,
              top:        "42px",
              width:      "340px",
              background: "var(--card-bg)",
              border:     "1px solid var(--card-border)",
              borderRadius:"12px",
              boxShadow:  "var(--shadow-lg)",
              zIndex:     1000,
              overflow:   "hidden",
            }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--card-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-h)" }}>Notifications</span>
                <span style={{ fontSize: "11px", color: "var(--accent)" }}>Mark all read</span>
              </div>
              <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                {NOTIFICATIONS.map((n) => (
                  <div key={n.id} style={{
                    padding:    "12px 16px",
                    borderBottom:"1px solid var(--card-border)",
                    display:    "flex",
                    gap:        "10px",
                    alignItems: "flex-start",
                    background: n.read ? "transparent" : "var(--accent-light)",
                  }}>
                    <span style={{ fontSize: "16px", flexShrink: 0, lineHeight: 1.4 }}>{NOTIF_LEVEL_ICON[n.level]}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: NOTIF_LEVEL_COLOR[n.level] }}>{n.title}</div>
                      <div style={{ fontSize: "12px", color: "var(--text)", lineHeight: 1.5, marginTop: "2px" }}>{n.body}</div>
                      <div style={{ fontSize: "11px", color: "var(--topbar-muted)", marginTop: "4px" }}>{n.time}</div>
                    </div>
                    {!n.read && (
                      <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: "5px" }} />
                    )}
                  </div>
                ))}
              </div>
              <div style={{ padding: "10px 16px", borderTop: "1px solid var(--card-border)" }}>
                <button
                  onClick={() => { navigate("/dashboard/notifications"); setShowNotifs(false); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "var(--accent)", fontWeight: 500 }}
                >
                  View all notifications →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: "1px", height: "22px", background: "var(--topbar-border)" }} />

        {/* Company label */}
        <span style={{ fontSize: "11px", color: "var(--topbar-muted)", whiteSpace: "nowrap", display: "none" }}
          className="topbar-company">
          Smart Manufacturing ERP
        </span>

        {/* Profile dropdown */}
        {user && badge && (
          <div ref={profileRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowProfile((p) => !p)}
              style={{
                display:      "flex",
                alignItems:   "center",
                gap:          "8px",
                background:   "none",
                border:       "1px solid var(--topbar-border)",
                borderRadius: "8px",
                padding:      "4px 10px 4px 5px",
                cursor:       "pointer",
              }}
            >
              <div style={{
                width:          "28px", height: "28px", borderRadius: "50%",
                background:     "var(--accent)", display: "flex",
                alignItems:     "center", justifyContent: "center",
                color:          "#fff", fontSize: "11px", fontWeight: 700,
              }}>
                {user.avatarInitials}
              </div>
              <div style={{ textAlign: "left", lineHeight: 1.2 }}>
                <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--topbar-text)", whiteSpace: "nowrap" }}>
                  {user.name}
                </div>
                <div style={{ fontSize: "10px", color: "var(--topbar-muted)" }}>
                  <span style={{ padding: "1px 5px", borderRadius: "4px", background: badge.bg, color: badge.color, fontWeight: 700 }}>
                    {roleLabel}
                  </span>
                </div>
              </div>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--topbar-muted)" strokeWidth="1.75">
                <path d="M2 3l3 3 3-3"/>
              </svg>
            </button>

            {/* Profile dropdown menu */}
            {showProfile && (
              <div style={{
                position:     "absolute",
                right:        0,
                top:          "46px",
                width:        "210px",
                background:   "var(--card-bg)",
                border:       "1px solid var(--card-border)",
                borderRadius: "10px",
                boxShadow:    "var(--shadow-lg)",
                zIndex:       1000,
                overflow:     "hidden",
              }}>
                {/* User header */}
                <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--card-border)" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-h)" }}>{user.name}</div>
                  <div style={{ fontSize: "11px", color: "var(--text)", marginTop: "2px" }}>{user.email}</div>
                  {user.department && (
                    <div style={{ fontSize: "11px", color: "var(--topbar-muted)", marginTop: "2px" }}>{user.department}</div>
                  )}
                </div>
                {/* Menu items */}
                {[
                  { label: "Profile Settings", icon: "👤", path: "/profile"     },
                  { label: "Change Password",  icon: "🔒", path: "/change-password" },
                  { label: "2FA Settings",     icon: "🔐", path: "/2fa-setup"   },
                ].map((item) => (
                  <button key={item.path}
                    onClick={() => { navigate(item.path); setShowProfile(false); }}
                    style={{
                      display:     "flex",
                      alignItems:  "center",
                      gap:         "9px",
                      width:       "100%",
                      padding:     "10px 16px",
                      background:  "none",
                      border:      "none",
                      borderBottom:"1px solid var(--card-border)",
                      cursor:      "pointer",
                      fontSize:    "13px",
                      color:       "var(--text-h)",
                      textAlign:   "left",
                    }}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
                <button
                  onClick={async () => {
                    await logout();
                    navigate("/login", { replace: true });
                    setShowProfile(false);
                  }}
                  style={{
                    display:     "flex",
                    alignItems:  "center",
                    gap:         "9px",
                    width:       "100%",
                    padding:     "10px 16px",
                    background:  "none",
                    border:      "none",
                    cursor:      "pointer",
                    fontSize:    "13px",
                    color:       "var(--error-text)",
                    textAlign:   "left",
                  }}
                >
                  <span>🚪</span>Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

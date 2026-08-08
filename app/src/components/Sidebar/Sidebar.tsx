import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import type { SidebarProps } from "../../types";
import { NAV_GROUPS, renderIcon } from "./navItems";
import { usePermissions } from "../../hooks/usePermissions";

// ─── Logo mark (identical to TopBar for consistency) ─────────────────────────
function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#1d4ed8"/>
      <rect x="4"  y="15" width="24" height="13" rx="1.5" fill="#fff" opacity=".95"/>
      <polygon points="3,15 16,7 29,15" fill="#93c5fd"/>
      <rect x="7"   y="9"  width="3.5" height="7"  rx="1" fill="#93c5fd"/>
      <rect x="12.5"y="11" width="3.5" height="5"  rx="1" fill="#93c5fd"/>
      <rect x="13.5"y="20" width="5"   height="8"  rx="1" fill="#1d4ed8"/>
      <rect x="6"   y="19" width="5"   height="4"  rx=".75" fill="#bfdbfe"/>
      <rect x="21"  y="19" width="5"   height="4"  rx=".75" fill="#bfdbfe"/>
    </svg>
  );
}

// ─── Inline SVG icon renderer ─────────────────────────────────────────────────
function NavIcon({ name }: { name: string }) {
  return (
    <span
      style={{ width: 16, height: 16, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
      dangerouslySetInnerHTML={{ __html: renderIcon(name) }}
    />
  );
}

// ─── Group separator label ────────────────────────────────────────────────────
function GroupLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) {
    return (
      <div style={{
        height: "1px", background: "var(--sidebar-border)",
        margin: "8px 10px",
      }} />
    );
  }
  return (
    <div style={{
      padding: "12px 20px 4px",
      fontSize: "9.5px",
      fontWeight: 700,
      letterSpacing: "1px",
      textTransform: "uppercase",
      color: "var(--sidebar-text)",
      opacity: 0.7,
      userSelect: "none",
    }}>
      {label}
    </div>
  );
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { can }    = usePermissions();
  const { user, logout } = useAuth();
  const navigate   = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const roleLabel = user?.role?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) ?? "";

  return (
    <aside style={{
      width:      collapsed ? "62px" : "242px",
      minHeight:  "100vh",
      maxHeight:  "100vh",
      background: "var(--sidebar-bg)",
      borderRight:"1px solid var(--sidebar-border)",
      display:    "flex",
      flexDirection: "column",
      transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)",
      overflow:   "hidden",
      flexShrink: 0,
      position:   "sticky",
      top:        0,
    }}>

      {/* ── Logo / brand row ────────────────────────────────────────────── */}
      <div style={{
        height:        "60px",
        display:       "flex",
        alignItems:    "center",
        justifyContent:collapsed ? "center" : "space-between",
        padding:       collapsed ? "0 17px" : "0 16px 0 18px",
        borderBottom:  "1px solid var(--sidebar-border)",
        flexShrink:    0,
      }}>
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <LogoMark size={26} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--sidebar-text-active)", whiteSpace: "nowrap", letterSpacing: "-0.2px" }}>
                Smart Manufacturing
              </div>
              <div style={{ fontSize: "9.5px", fontWeight: 600, color: "var(--sidebar-text)", letterSpacing: "0.8px", textTransform: "uppercase" }}>
                ERP Platform
              </div>
            </div>
          </div>
        )}
        {collapsed && <LogoMark size={26} />}
        <button
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            background:   "none",
            border:       "none",
            cursor:       "pointer",
            padding:      "5px",
            borderRadius: "6px",
            color:        "var(--sidebar-text)",
            display:      "flex",
            alignItems:   "center",
            flexShrink:   0,
            marginLeft:   collapsed ? "-4px" : "0",
          }}
        >
          {/* chevron icon */}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {collapsed
              ? <><path d="M5 2l5 5-5 5"/></>
              : <><path d="M9 2L4 7l5 5"/></>
            }
          </svg>
        </button>
      </div>

      {/* ── Nav groups (scrollable) ──────────────────────────────────────── */}
      <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: "8px" }}>
        {NAV_GROUPS.map((group) => {
          const visible = group.items.filter((item) =>
            item.requiredPermission ? can(item.requiredPermission) : true
          );
          if (visible.length === 0) return null;
          return (
            <div key={group.label}>
              <GroupLabel label={group.label} collapsed={collapsed} />
              {visible.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/dashboard"}
                  title={collapsed ? item.label : undefined}
                  style={({ isActive }) => ({
                    display:        "flex",
                    alignItems:     "center",
                    gap:            "11px",
                    padding:        collapsed ? "10px 0" : "9px 20px",
                    justifyContent: collapsed ? "center" : "flex-start",
                    textDecoration: "none",
                    fontSize:       "13px",
                    fontWeight:     isActive ? 600 : 400,
                    color:          isActive ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
                    background:     isActive ? "var(--sidebar-active-bg)" : "transparent",
                    borderLeft:     isActive ? "3px solid var(--accent)" : "3px solid transparent",
                    transition:     "background 0.12s, color 0.12s",
                    borderRadius:   "0",
                    whiteSpace:     "nowrap",
                  })}
                >
                  <NavIcon name={item.icon} />
                  {!collapsed && <span style={{ lineHeight: 1.3 }}>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* ── User / bottom section ─────────────────────────────────────────── */}
      <div style={{
        borderTop:  "1px solid var(--sidebar-border)",
        flexShrink: 0,
      }}>
        {/* Profile link */}
        <NavLink
          to="/profile"
          title={collapsed ? user?.name ?? "Profile" : undefined}
          style={({ isActive }) => ({
            display:        "flex",
            alignItems:     "center",
            gap:            "10px",
            padding:        collapsed ? "12px 0" : "11px 16px",
            justifyContent: collapsed ? "center" : "flex-start",
            textDecoration: "none",
            background:     isActive ? "var(--sidebar-active-bg)" : "transparent",
            borderLeft:     isActive ? "3px solid var(--accent)" : "3px solid transparent",
            transition:     "background 0.12s",
          })}
        >
          <div style={{
            width:          "28px",
            height:         "28px",
            borderRadius:   "50%",
            background:     "var(--accent)",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            color:          "#fff",
            fontSize:       "11px",
            fontWeight:     700,
            flexShrink:     0,
          }}>
            {user?.avatarInitials ?? "?"}
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--sidebar-text-active)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.name ?? "User"}
              </div>
              <div style={{ fontSize: "10px", color: "var(--sidebar-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {roleLabel}
              </div>
            </div>
          )}
        </NavLink>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title={collapsed ? "Sign out" : undefined}
          style={{
            display:        "flex",
            alignItems:     "center",
            gap:            "11px",
            width:          "100%",
            padding:        collapsed ? "11px 0" : "10px 20px",
            justifyContent: collapsed ? "center" : "flex-start",
            background:     "none",
            border:         "none",
            borderTop:      "1px solid var(--sidebar-border)",
            cursor:         "pointer",
            color:          "var(--sidebar-text)",
            fontSize:       "13px",
            fontWeight:     400,
            transition:     "color 0.12s",
          }}
        >
          <NavIcon name="logout" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}

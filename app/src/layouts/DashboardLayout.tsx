import type { ReactNode } from "react";
import { useSidebar } from "../hooks/useSidebar";
import Sidebar from "../components/Sidebar/Sidebar";
import TopBar from "../components/TopBar/TopBar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { collapsed, toggle } = useSidebar(false);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--main-bg)",
      }}
    >
      <Sidebar collapsed={collapsed} onToggle={toggle} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar />

        <main
          style={{
            flex: 1,
            padding: "32px",
            overflowY: "auto",
          }}
        >
          {children}
        </main>

        {/* ── App footer ──────────────────────────────────────────────────── */}
        <footer
          style={{
            borderTop: "1px solid var(--card-border)",
            background: "var(--card-bg)",
            padding: "12px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "12px", color: "var(--topbar-muted)" }}>
            © 2026 Smart Manufacturing ERP
          </span>
          <span
            style={{
              fontSize: "11px",
              color: "var(--topbar-muted)",
              letterSpacing: "0.3px",
              textTransform: "uppercase",
            }}
          >
            Enterprise Edition
          </span>
        </footer>
      </div>
    </div>
  );
}

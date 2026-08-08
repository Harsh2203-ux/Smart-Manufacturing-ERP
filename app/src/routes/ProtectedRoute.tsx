import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { ReactNode } from "react";
import type { UserRole } from "../types/auth";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: UserRole[];
}

export default function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, sessionStatus, user } = useAuth();
  const location = useLocation();

  // ── Session rehydration in progress ──────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: "16px", background: "var(--main-bg)" }}>
        <style>{`@keyframes erp-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: "36px", height: "36px", border: "3px solid var(--card-border)",
          borderTopColor: "var(--accent)", borderRadius: "50%", animation: "erp-spin .75s linear infinite" }} />
        <span style={{ fontSize: "13px", color: "var(--text)" }}>Verifying session…</span>
      </div>
    );
  }

  // ── Session expired → dedicated page ──────────────────────────────────────
  if (sessionStatus === "expired" || sessionStatus === "revoked") {
    return <Navigate to="/session-expired" replace />;
  }

  // ── Not authenticated → Login (preserves the intended destination) ────────
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ── Wrong role → Unauthorized ─────────────────────────────────────────────
  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

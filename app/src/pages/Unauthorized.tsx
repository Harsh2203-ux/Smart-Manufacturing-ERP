import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Unauthorized() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const roleMeta: Record<string, { color: string; bg: string }> = {
    admin:    { color: "#1d4ed8", bg: "rgba(29,78,216,0.1)"  },
    manager:  { color: "#059669", bg: "rgba(5,150,105,0.1)"  },
    operator: { color: "#d97706", bg: "rgba(217,119,6,0.1)"  },
  };
  const badge = user ? (roleMeta[user.role] ?? { color: "var(--text)", bg: "var(--code-bg)" }) : null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--main-bg)", padding: "24px" }}>
      <div style={{ maxWidth: "480px", width: "100%", background: "var(--card-bg)",
        border: "1px solid var(--card-border)", borderRadius: "14px",
        padding: "48px 40px", boxShadow: "var(--shadow-lg)", textAlign: "center" }}>

        {/* 403 code */}
        <div style={{ fontSize: "80px", fontWeight: 800, color: "var(--accent)",
          lineHeight: 1, marginBottom: "8px", letterSpacing: "-3px" }}>
          403
        </div>

        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-h)", marginBottom: "14px" }}>
          Access Denied
        </h1>

        {user && badge && (
          <div style={{ marginBottom: "20px" }}>
            <p style={{ fontSize: "14px", color: "var(--text)", lineHeight: 1.6 }}>
              Your account (<strong style={{ color: "var(--text-h)" }}>{user.email}</strong>) is signed in as{" "}
              <span style={{ padding: "2px 9px", borderRadius: "999px", fontSize: "12px",
                fontWeight: 700, background: badge.bg, color: badge.color, letterSpacing: "0.3px" }}>
                {user.role}
              </span>.
              This role does not have access to the requested page.
            </p>
          </div>
        )}

        <p style={{ fontSize: "13px", color: "var(--text)", marginBottom: "32px", lineHeight: 1.6 }}>
          Contact your system administrator if you believe this is an error.
        </p>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button onClick={() => navigate(-1)} style={primaryBtn}>← Go Back</button>
          <button onClick={() => navigate("/dashboard", { replace: true })} style={secondaryBtn}>Go to Dashboard</button>
          <button onClick={handleLogout} style={ghostBtn}>Sign out and switch account</button>
        </div>
      </div>
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: "11px 20px", fontSize: "14px", fontWeight: 600, borderRadius: "8px",
  border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer",
};
const secondaryBtn: React.CSSProperties = {
  padding: "11px 20px", fontSize: "14px", fontWeight: 500, borderRadius: "8px",
  border: "1px solid var(--border)", background: "transparent", color: "var(--text-h)", cursor: "pointer",
};
const ghostBtn: React.CSSProperties = {
  padding: "11px 20px", fontSize: "13px", borderRadius: "8px", border: "none",
  background: "transparent", color: "var(--text)", cursor: "pointer", textDecoration: "underline",
};

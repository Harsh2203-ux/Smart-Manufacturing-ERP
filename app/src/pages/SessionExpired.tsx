import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { AuthCard, AuthLogo, AuthButton } from "../components/auth";

export default function SessionExpired() {
  const { logout } = useAuth();
  const navigate   = useNavigate();

  const handleSignInAgain = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <AuthCard>
      <AuthLogo subtitle="Your session has expired" />

      <div style={{ textAlign: "center" }}>
        {/* Clock icon */}
        <div style={{ marginBottom: "20px" }}>
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style={{ margin: "0 auto" }}>
            <circle cx="28" cy="28" r="26" stroke="var(--card-border)" strokeWidth="2"/>
            <circle cx="28" cy="28" r="22" fill="var(--accent-light, rgba(29,78,216,0.06))" stroke="var(--accent)" strokeWidth="1.5"/>
            <line x1="28" y1="14" x2="28" y2="28" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="28" y1="28" x2="38" y2="34" stroke="var(--text)" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="28" cy="28" r="2.5" fill="var(--accent)"/>
          </svg>
        </div>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-h)", marginBottom: "12px" }}>
          Session Expired
        </h2>

        <p style={{ fontSize: "14px", color: "var(--text)", lineHeight: 1.7, marginBottom: "8px" }}>
          Your session has timed out for security. Please sign in again to continue.
        </p>

        <p style={{ fontSize: "13px", color: "var(--text)", marginBottom: "28px" }}>
          Any unsaved work may have been lost.
        </p>

        <AuthButton onClick={handleSignInAgain}>Sign in again</AuthButton>

        <div style={{ marginTop: "20px", padding: "12px 14px", borderRadius: "8px",
          background: "var(--code-bg)", border: "1px solid var(--card-border)",
          textAlign: "left" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-h)", marginBottom: "4px" }}>
            Why did this happen?
          </div>
          <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "var(--text)", lineHeight: 1.7 }}>
            <li>Sessions expire after a period of inactivity.</li>
            <li>Using "Remember me" extends sessions to 30 days.</li>
            <li>Signing in from a new device invalidates old sessions.</li>
          </ul>
        </div>
      </div>
    </AuthCard>
  );
}

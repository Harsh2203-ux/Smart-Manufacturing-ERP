import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { AuthCard, AuthLogo, AuthButton, AuthError, AuthSuccess, AuthLink } from "../components/auth";

export default function VerifyEmail() {
  const { verifyEmail, resendVerificationEmail, isLoading, error, clearError } = useAuth();
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const location       = useLocation();

  const token = searchParams.get("token");
  const email = (location.state as { email?: string } | null)?.email ?? "";

  const [status, setStatus]         = useState<"pending" | "verifying" | "success" | "error">("pending");
  const [resendCooldown, setResendCooldown] = useState(0);

  // If a token is in the URL, verify automatically
  useEffect(() => {
    if (!token) return;
    setStatus("verifying");
    // Use the returned boolean — never rely on the stale `error` closure
    verifyEmail({ token }).then((ok) => {
      setStatus(ok ? "success" : "error");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(n => n - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (!email || resendCooldown > 0) return;
    clearError();
    await resendVerificationEmail(email);
    setResendCooldown(60);
  };

  // ── Auto-verifying state ──────────────────────────────────────────────────
  if (status === "verifying" || isLoading) {
    return (
      <AuthCard>
        <AuthLogo subtitle="Verifying your email…" />
        <div style={{ textAlign: "center" }}>
          <style>{`@keyframes erp-spin{to{transform:rotate(360deg)}}`}</style>
          <div style={{ width: "40px", height: "40px", border: "3px solid var(--card-border)",
            borderTopColor: "var(--accent)", borderRadius: "50%", animation: "erp-spin .75s linear infinite",
            margin: "0 auto 16px" }} />
          <p style={{ fontSize: "14px", color: "var(--text)" }}>Verifying your email address…</p>
        </div>
      </AuthCard>
    );
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (status === "success") {
    return (
      <AuthCard>
        <AuthLogo subtitle="Email verified" />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-h)", marginBottom: "10px" }}>
            Email verified successfully
          </h2>
          <AuthSuccess message="Your email has been verified. You can now sign in to your account." />
          <AuthButton onClick={() => navigate("/login")}>Sign in now</AuthButton>
        </div>
      </AuthCard>
    );
  }

  // ── Pending (waiting for user to click the email link) ────────────────────
  return (
    <AuthCard>
      <AuthLogo subtitle="Verify your email" />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "56px", marginBottom: "16px" }}>📧</div>

        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-h)", marginBottom: "10px" }}>
          Check your inbox
        </h2>

        {email && (
          <p style={{ fontSize: "14px", color: "var(--text)", lineHeight: 1.6, marginBottom: "8px" }}>
            We sent a verification link to<br />
            <strong style={{ color: "var(--text-h)" }}>{email}</strong>
          </p>
        )}

        <p style={{ fontSize: "13px", color: "var(--text)", lineHeight: 1.6, marginBottom: "28px" }}>
          Click the link in the email to verify your account. Check your spam folder if you don't see it.
        </p>

        {error && <AuthError message={error.message} />}

        <AuthButton loading={isLoading || resendCooldown > 0}
          onClick={handleResend}
          disabled={resendCooldown > 0}>
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend verification email"}
        </AuthButton>

        <div style={{ marginTop: "16px" }}>
          <AuthLink onClick={() => navigate("/login")}>← Back to sign in</AuthLink>
        </div>
      </div>
    </AuthCard>
  );
}

import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { AuthCard, AuthLogo, AuthInput, AuthButton, AuthError, AuthSuccess } from "../components/auth";

// Password strength
function getStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password))    score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return { score, label: "Weak",   color: "#ef4444" };
  if (score <= 4) return { score, label: "Fair",   color: "#f97316" };
  if (score <= 5) return { score, label: "Good",   color: "#22c55e" };
  return               { score, label: "Strong", color: "#15803d" };
}

export default function ChangePassword() {
  const { changePassword, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [fieldErr, setFieldErr]   = useState<Partial<Record<keyof typeof form, string>>>({});
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success,     setSuccess]     = useState(false);

  const strength = getStrength(form.newPassword);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setFieldErr(prev => ({ ...prev, [e.target.name]: undefined }));
    clearError();
  };

  const validate = (): boolean => {
    const errs: typeof fieldErr = {};
    if (!form.currentPassword)             errs.currentPassword = "Current password is required.";
    if (form.newPassword.length < 8)       errs.newPassword     = "Must be at least 8 characters.";
    if (!/[A-Z]/.test(form.newPassword))   errs.newPassword     = "Must include an uppercase letter.";
    if (!/[a-z]/.test(form.newPassword))   errs.newPassword     = "Must include a lowercase letter.";
    if (!/\d/.test(form.newPassword))      errs.newPassword     = "Must include a number.";
    if (form.newPassword === form.currentPassword) errs.newPassword = "New password must differ from current.";
    if (form.newPassword !== form.confirmPassword) errs.confirmPassword = "Passwords do not match.";
    setFieldErr(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const ok = await changePassword(form.currentPassword, form.newPassword);
    if (ok) setSuccess(true);
  };

  if (success) {
    return (
      <AuthCard>
        <AuthLogo subtitle="Password changed" />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-h)", marginBottom: "10px" }}>
            Password updated
          </h2>
          <AuthSuccess message="Your password has been changed. Please sign in again with your new password." />
          <AuthButton onClick={() => navigate("/login")}>Sign in</AuthButton>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <AuthLogo subtitle="Change your password" />

      <form onSubmit={onSubmit} noValidate>
        <p style={{ fontSize: "14px", color: "var(--text)", marginBottom: "24px", lineHeight: 1.6 }}>
          Choose a new strong password. After changing, all active sessions will be signed out.
        </p>

        {/* Current password */}
        <div style={{ position: "relative" }}>
          <AuthInput id="currentPassword" name="currentPassword"
            type={showCurrent ? "text" : "password"}
            label="Current password" placeholder="••••••••"
            value={form.currentPassword} onChange={onChange}
            autoComplete="current-password" disabled={isLoading}
            error={fieldErr.currentPassword} />
          <button type="button" onClick={() => setShowCurrent(p => !p)}
            style={{ position: "absolute", right: "12px", top: "34px", background: "none",
              border: "none", cursor: "pointer", fontSize: "12px", color: "var(--text)", padding: 0 }}>
            {showCurrent ? "Hide" : "Show"}
          </button>
        </div>

        {/* New password */}
        <div style={{ position: "relative", marginBottom: 0 }}>
          <AuthInput id="newPassword" name="newPassword"
            type={showNew ? "text" : "password"}
            label="New password" placeholder="Min. 8 characters"
            value={form.newPassword} onChange={onChange}
            autoComplete="new-password" disabled={isLoading}
            error={fieldErr.newPassword} />
          <button type="button" onClick={() => setShowNew(p => !p)}
            style={{ position: "absolute", right: "12px", top: "34px", background: "none",
              border: "none", cursor: "pointer", fontSize: "12px", color: "var(--text)", padding: 0 }}>
            {showNew ? "Hide" : "Show"}
          </button>
        </div>

        {/* Password strength */}
        {form.newPassword && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{ height: "4px", borderRadius: "2px", background: "var(--border)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: "2px",
                width: `${(strength.score / 6) * 100}%`,
                background: strength.color,
                transition: "width 0.3s, background 0.3s",
              }} />
            </div>
            <div style={{ fontSize: "11px", color: strength.color, fontWeight: 600, marginTop: "4px" }}>
              {strength.label} password
            </div>
          </div>
        )}

        {/* Confirm new password */}
        <div style={{ position: "relative" }}>
          <AuthInput id="confirmPassword" name="confirmPassword"
            type={showConfirm ? "text" : "password"}
            label="Confirm new password" placeholder="••••••••"
            value={form.confirmPassword} onChange={onChange}
            disabled={isLoading} error={fieldErr.confirmPassword} />
          <button type="button" onClick={() => setShowConfirm(p => !p)}
            style={{ position: "absolute", right: "12px", top: "34px", background: "none",
              border: "none", cursor: "pointer", fontSize: "12px", color: "var(--text)", padding: 0 }}>
            {showConfirm ? "Hide" : "Show"}
          </button>
        </div>

        {error && <AuthError message={error.message} />}

        <AuthButton type="submit" loading={isLoading}>Change password</AuthButton>

        <div style={{ marginTop: "16px", textAlign: "center" }}>
          <button type="button" onClick={() => navigate(-1)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px",
              color: "var(--accent)", textDecoration: "underline", textDecorationColor: "transparent" }}>
            ← Back
          </button>
        </div>
      </form>
    </AuthCard>
  );
}

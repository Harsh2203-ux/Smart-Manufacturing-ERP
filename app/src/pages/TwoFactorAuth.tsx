import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { AuthCard, AuthLogo, AuthButton, AuthError, AuthLink } from "../components/auth";

const CODE_LENGTH = 6;

export default function TwoFactorAuth() {
  const { verify2fa, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as { email?: string; pendingToken?: string } | null;
  const email        = state?.email        ?? "";
  const pendingToken = state?.pendingToken ?? "";

  const [digits, setDigits]     = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [fieldErr, setFieldErr] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) navigate("/login", { replace: true });
  }, [email, navigate]);

  useEffect(() => { if (error) setFieldErr(error.message); }, [error]);

  const onChange = (idx: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...digits]; next[idx] = val;
    setDigits(next);
    setFieldErr(""); clearError();
    if (val && idx < CODE_LENGTH - 1) inputRefs.current[idx + 1]?.focus();
  };

  const onKeyDown = (idx: number) => (e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) inputRefs.current[idx - 1]?.focus();
  };

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (pasted.length > 0) {
      setDigits([...pasted.split(""), ...Array(CODE_LENGTH - pasted.length).fill("")]);
      inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
    }
  };

  const handleSubmit = async () => {
    const code = digits.join("");
    if (code.length < CODE_LENGTH) { setFieldErr("Please enter all 6 digits."); return; }
    await verify2fa({ email, code, pendingToken });
  };

  const inputBoxStyle = (filled: boolean): React.CSSProperties => ({
    width: "44px", height: "52px", textAlign: "center", fontSize: "22px", fontWeight: 700,
    borderRadius: "8px", border: `1.5px solid ${filled ? "var(--accent)" : "var(--border)"}`,
    background: "var(--input-bg)", color: "var(--text-h)", outline: "none",
  });

  return (
    <AuthCard>
      <AuthLogo subtitle="Two-factor authentication" />

      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔐</div>
        <p style={{ fontSize: "14px", color: "var(--text)", lineHeight: 1.6 }}>
          A 6-digit verification code has been sent to<br />
          <strong style={{ color: "var(--text-h)" }}>{email}</strong>
        </p>
        <p style={{ fontSize: "13px", color: "var(--text)", marginTop: "6px" }}>
          Enter the code to complete sign-in.
        </p>
      </div>

      {/* Code input boxes */}
      <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "24px" }} onPaste={onPaste}>
        {digits.map((d, i) => (
          <input key={i} ref={el => { inputRefs.current[i] = el; }}
            type="text" inputMode="numeric" maxLength={1} value={d}
            onChange={onChange(i)} onKeyDown={onKeyDown(i)}
            style={inputBoxStyle(!!d)} disabled={isLoading} autoFocus={i === 0} />
        ))}
      </div>

      {fieldErr && <AuthError message={fieldErr} />}

      <AuthButton loading={isLoading} onClick={handleSubmit}>Verify</AuthButton>

      <div style={{ marginTop: "24px", padding: "12px 14px", borderRadius: "8px",
        background: "var(--code-bg)", border: "1px solid var(--card-border)" }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-h)", marginBottom: "4px" }}>
          Can't access your email?
        </div>
        <div style={{ fontSize: "12px", color: "var(--text)", lineHeight: 1.5 }}>
          Contact your system administrator to disable 2FA on your account.
        </div>
      </div>

      <div style={{ marginTop: "16px", textAlign: "center" }}>
        <AuthLink onClick={() => navigate("/login")}>← Back to sign in</AuthLink>
      </div>
    </AuthCard>
  );
}

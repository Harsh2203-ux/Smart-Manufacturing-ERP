import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { AuthCard, AuthLogo, AuthButton, AuthError, AuthLink } from "../components/auth";

const CODE_LENGTH = 6;

export default function OtpVerification() {
  const { verifyOtp, resendOtp, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as { email?: string; pendingToken?: string } | null;
  const email        = state?.email ?? "";
  const pendingToken = state?.pendingToken ?? "";

  const [digits, setDigits]       = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [fieldErr, setFieldErr]   = useState("");
  const [cooldown, setCooldown]   = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if no email
  useEffect(() => {
    if (!email) navigate("/login", { replace: true });
  }, [email, navigate]);

  // Surface context error
  useEffect(() => { if (error) setFieldErr(error.message); }, [error]);

  // Cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(n => n - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const onChange = (idx: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = val;
    setDigits(next);
    setFieldErr(""); clearError();
    if (val && idx < CODE_LENGTH - 1) inputRefs.current[idx + 1]?.focus();
  };

  const onKeyDown = (idx: number) => (e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0)
      inputRefs.current[idx - 1]?.focus();
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
    await verifyOtp({ email, code, pendingToken });
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    clearError(); setFieldErr("");
    await resendOtp(email);
    setCooldown(60);
  };

  const inputBoxStyle = (filled: boolean): React.CSSProperties => ({
    width: "44px", height: "52px", textAlign: "center", fontSize: "22px", fontWeight: 700,
    borderRadius: "8px", border: `1.5px solid ${filled ? "var(--accent)" : "var(--border)"}`,
    background: "var(--input-bg)", color: "var(--text-h)", outline: "none",
  });

  return (
    <AuthCard>
      <AuthLogo subtitle="Enter verification code" />

      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <p style={{ fontSize: "14px", color: "var(--text)", lineHeight: 1.6 }}>
          We sent a 6-digit code to<br />
          <strong style={{ color: "var(--text-h)" }}>{email}</strong>
        </p>
      </div>

      {/* OTP digit boxes */}
      <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "24px" }} onPaste={onPaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={el => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={onChange(i)}
            onKeyDown={onKeyDown(i)}
            style={inputBoxStyle(!!d)}
            disabled={isLoading}
            autoFocus={i === 0}
          />
        ))}
      </div>

      {fieldErr && <AuthError message={fieldErr} />}

      <AuthButton loading={isLoading} onClick={handleSubmit}>Verify code</AuthButton>

      <div style={{ marginTop: "20px", textAlign: "center", fontSize: "13px", color: "var(--text)" }}>
        Didn't receive it?{" "}
        <AuthLink onClick={handleResend}>
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </AuthLink>
      </div>

      <div style={{ marginTop: "8px", textAlign: "center" }}>
        <AuthLink onClick={() => navigate("/login")}>← Back to sign in</AuthLink>
      </div>
    </AuthCard>
  );
}

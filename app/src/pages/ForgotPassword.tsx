import { useState, useRef, type FormEvent, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AuthCard, AuthLogo, AuthInput, AuthButton, AuthError, AuthSuccess, AuthLink } from "../components/auth";
import {
  forgotPasswordRequest,
  forgotPasswordVerifyOtpRequest,
  resetPasswordRequest,
} from "../api/authApi";

const CODE_LEN = 6;

function pwdStrength(p: string): { score: number; label: string; color: string } {
  let s = 0;
  if (p.length >= 8)           s++;
  if (p.length >= 12)          s++;
  if (/[A-Z]/.test(p))         s++;
  if (/[a-z]/.test(p))         s++;
  if (/\d/.test(p))            s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  if (s <= 2) return { score: s, label: "Weak",   color: "#ef4444" };
  if (s <= 4) return { score: s, label: "Fair",   color: "#f97316" };
  if (s <= 5) return { score: s, label: "Good",   color: "#22c55e" };
  return               { score: s, label: "Strong", color: "#15803d" };
}

type Phase = "email" | "otp" | "password" | "done";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [phase, setPhase]     = useState<Phase>("email");
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");

  // Step 1
  const [email, setEmail]     = useState("");

  // Step 2
  const [digits, setDigits]   = useState<string[]>(Array(CODE_LEN).fill(""));
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 3
  const [resetToken, setResetToken] = useState("");
  const [password, setPwd]          = useState("");
  const [confirm, setConfirm]       = useState("");
  const [showPwd, setShowPwd]       = useState(false);
  const [showConf, setShowConf]     = useState(false);

  const clearErr = () => setErr("");
  const strength = pwdStrength(password);

  // ── Step 1: send OTP ─────────────────────────────────────────────────────────
  const onSubmitEmail = async (e: FormEvent) => {
    e.preventDefault();
    clearErr();
    if (!email.trim())            { setErr("Email address is required."); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setErr("Enter a valid email address."); return; }

    setLoading(true);
    await forgotPasswordRequest({ email: email.trim().toLowerCase() });
    setLoading(false);

    // Always advance (anti-enumeration: we don't reveal if email exists)
    setDigits(Array(CODE_LEN).fill(""));
    setPhase("otp");
    setCooldown(60);
  };

  // ── Step 2: verify OTP ───────────────────────────────────────────────────────
  const onSubmitOtp = async () => {
    clearErr();
    const code = digits.join("");
    if (code.length < CODE_LEN) { setErr("Please enter all 6 digits."); return; }

    setLoading(true);
    const res = await forgotPasswordVerifyOtpRequest(email.trim().toLowerCase(), code);
    setLoading(false);

    if (res.error) { setErr(res.error.message); return; }

    setResetToken(res.data!.resetToken);
    setPhase("password");
  };

  const onResendOtp = async () => {
    if (cooldown > 0) return;
    clearErr();
    setLoading(true);
    await forgotPasswordRequest({ email: email.trim().toLowerCase() });
    setLoading(false);
    setCooldown(60);
    setDigits(Array(CODE_LEN).fill(""));
  };

  const onOtpChange = (idx: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...digits]; next[idx] = val;
    setDigits(next); clearErr();
    if (val && idx < CODE_LEN - 1) inputRefs.current[idx + 1]?.focus();
  };
  const onOtpKeyDown = (idx: number) => (e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) inputRefs.current[idx - 1]?.focus();
  };
  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LEN);
    if (pasted) {
      setDigits([...pasted.split(""), ...Array(CODE_LEN - pasted.length).fill("")]);
      inputRefs.current[Math.min(pasted.length, CODE_LEN - 1)]?.focus();
    }
  };

  // ── Step 3: reset password ───────────────────────────────────────────────────
  const onSubmitPassword = async (e: FormEvent) => {
    e.preventDefault();
    clearErr();
    if (password.length < 8)            { setErr("Password must be at least 8 characters."); return; }
    if (!/[A-Z]/.test(password))        { setErr("Must include an uppercase letter."); return; }
    if (!/[a-z]/.test(password))        { setErr("Must include a lowercase letter."); return; }
    if (!/\d/.test(password))           { setErr("Must include a number."); return; }
    if (!/[^A-Za-z0-9]/.test(password)) { setErr("Must include a special character."); return; }
    if (password !== confirm)            { setErr("Passwords do not match."); return; }

    setLoading(true);
    const res = await resetPasswordRequest({ token: resetToken, password, confirmPassword: confirm });
    setLoading(false);

    if (res.error) { setErr(res.error.message); return; }

    setPhase("done");
  };

  // ── Progress bar ──────────────────────────────────────────────────────────────
  const stepIndex = { email: 0, otp: 1, password: 2, done: 3 };
  const ProgressBar = () => (
    <div style={{ display: "flex", gap: "6px", marginBottom: "28px" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          flex: 1, height: "4px", borderRadius: "2px",
          background: (stepIndex[phase] > i) || (stepIndex[phase] === i)
            ? "var(--accent)" : "var(--card-border)",
          transition: "background 0.3s",
        }} />
      ))}
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────────

  if (phase === "done") {
    return (
      <AuthCard>
        <AuthLogo subtitle="Password reset" />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "52px", marginBottom: "16px" }}>✅</div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-h)", marginBottom: "12px" }}>
            Password changed successfully
          </h2>
          <AuthSuccess message="Your password has been updated. You can now sign in with your new password." />
          <AuthButton onClick={() => navigate("/login")}>Sign in</AuthButton>
        </div>
      </AuthCard>
    );
  }

  if (phase === "otp") {
    return (
      <AuthCard>
        <AuthLogo subtitle="Verify your identity" />
        <ProgressBar />

        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔐</div>
          <p style={{ fontSize: "14px", color: "var(--text)", lineHeight: 1.6 }}>
            If <strong style={{ color: "var(--text-h)" }}>{email}</strong> is registered,
            we sent a 6-digit verification code.
          </p>
          <p style={{ fontSize: "12px", color: "var(--text)", marginTop: "8px" }}>
            Enter it below. It expires in 10 minutes.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "24px" }} onPaste={onPaste}>
          {digits.map((d, i) => (
            <input key={i}
              ref={el => { inputRefs.current[i] = el; }}
              type="text" inputMode="numeric" maxLength={1} value={d}
              onChange={onOtpChange(i)} onKeyDown={onOtpKeyDown(i)}
              disabled={loading} autoFocus={i === 0}
              style={{
                width: "44px", height: "52px", textAlign: "center",
                fontSize: "22px", fontWeight: 700, borderRadius: "8px",
                border: `1.5px solid ${d ? "var(--accent)" : "var(--border)"}`,
                background: "var(--input-bg)", color: "var(--text-h)", outline: "none",
              }}
            />
          ))}
        </div>

        {err && <AuthError message={err} />}

        <AuthButton loading={loading} onClick={onSubmitOtp}>Verify Code</AuthButton>

        <div style={{ marginTop: "16px", textAlign: "center", fontSize: "13px", color: "var(--text)" }}>
          Didn't receive it?{" "}
          <AuthLink onClick={onResendOtp}>
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </AuthLink>
        </div>
        <div style={{ marginTop: "8px", textAlign: "center" }}>
          <AuthLink onClick={() => { setPhase("email"); clearErr(); }}>← Change email</AuthLink>
        </div>
      </AuthCard>
    );
  }

  if (phase === "password") {
    return (
      <AuthCard>
        <AuthLogo subtitle="Set a new password" />
        <ProgressBar />

        <p style={{ fontSize: "14px", color: "var(--text)", marginBottom: "24px", lineHeight: 1.6 }}>
          Choose a strong password with at least 8 characters, uppercase, lowercase,
          a number, and a special character.
        </p>

        <form onSubmit={onSubmitPassword} noValidate>
          <div style={{ position: "relative", marginBottom: 0 }}>
            <AuthInput id="password" name="password" type={showPwd ? "text" : "password"}
              label="New password" placeholder="Min. 8 characters with special char" value={password}
              onChange={e => { setPwd(e.target.value); clearErr(); }}
              autoComplete="new-password" disabled={loading} />
            <button type="button" onClick={() => setShowPwd(p => !p)}
              style={{ position: "absolute", right: "12px", top: "34px",
                background: "none", border: "none", cursor: "pointer",
                fontSize: "12px", color: "var(--text)", padding: 0 }}>
              {showPwd ? "Hide" : "Show"}
            </button>
          </div>

          {password && (
            <div style={{ marginBottom: "12px" }}>
              <div style={{ height: "4px", borderRadius: "2px", background: "var(--border)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(strength.score / 6) * 100}%`,
                  background: strength.color, transition: "width 0.3s" }} />
              </div>
              <div style={{ fontSize: "11px", color: strength.color, fontWeight: 600, marginTop: "3px" }}>
                {strength.label} password
              </div>
            </div>
          )}

          <div style={{ position: "relative" }}>
            <AuthInput id="confirm" name="confirm" type={showConf ? "text" : "password"}
              label="Confirm new password" placeholder="••••••••" value={confirm}
              onChange={e => { setConfirm(e.target.value); clearErr(); }}
              disabled={loading} />
            <button type="button" onClick={() => setShowConf(p => !p)}
              style={{ position: "absolute", right: "12px", top: "34px",
                background: "none", border: "none", cursor: "pointer",
                fontSize: "12px", color: "var(--text)", padding: 0 }}>
              {showConf ? "Hide" : "Show"}
            </button>
          </div>

          {err && <AuthError message={err} />}

          <AuthButton type="submit" loading={loading}>Set New Password</AuthButton>
        </form>
      </AuthCard>
    );
  }

  // ── Phase: email ──────────────────────────────────────────────────────────────
  return (
    <AuthCard>
      <AuthLogo subtitle="Reset your password" />
      <ProgressBar />

      <p style={{ fontSize: "14px", color: "var(--text)", marginBottom: "24px", lineHeight: 1.6 }}>
        Enter your registered email address. We'll send you a verification code to reset your password.
      </p>

      <form onSubmit={onSubmitEmail} noValidate>
        <AuthInput id="email" name="email" type="email" label="Email address"
          placeholder="you@company.com" value={email}
          onChange={e => { setEmail(e.target.value); clearErr(); }}
          autoComplete="email" disabled={loading} />

        {err && <AuthError message={err} />}

        <AuthButton type="submit" loading={loading}>Send Verification Code</AuthButton>

        <div style={{ marginTop: "16px", textAlign: "center" }}>
          <AuthLink onClick={() => navigate("/login")}>← Back to sign in</AuthLink>
        </div>
      </form>
    </AuthCard>
  );
}

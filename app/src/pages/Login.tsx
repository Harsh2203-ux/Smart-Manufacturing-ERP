import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { AuthCard, AuthLogo, AuthInput, AuthButton, AuthLink, AuthError } from "../components/auth";
import { DEMO_MODE } from "../demo/demoSession";
import {
  loginInitRequest,
  loginVerifyOtpRequest,
  loginCompleteRequest,
} from "../api/authApi";

// ─── Constants ─────────────────────────────────────────────────────────────────

const CODE_LEN = 6;

// ─── OTP digit boxes ───────────────────────────────────────────────────────────

function OtpBoxes({ digits, onChange, onKeyDown, onPaste, inputRefs, disabled }: {
  digits: string[];
  onChange: (i: number) => (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (i: number) => (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  disabled: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }} onPaste={onPaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => { inputRefs.current[i] = el; }}
          type="text" inputMode="numeric" maxLength={1} value={d}
          onChange={onChange(i)} onKeyDown={onKeyDown(i)}
          disabled={disabled} autoFocus={i === 0}
          style={{
            width: "44px", height: "52px", textAlign: "center",
            fontSize: "22px", fontWeight: 700, borderRadius: "8px",
            border: `1.5px solid ${d ? "var(--accent)" : "var(--border)"}`,
            background: "var(--input-bg)", color: "var(--text-h)", outline: "none",
            transition: "border-color 0.15s",
          }}
        />
      ))}
    </div>
  );
}

// ─── Step progress bar ─────────────────────────────────────────────────────────

const STEPS = ["email", "otp", "password"] as const;
type Phase = typeof STEPS[number];

function StepBar({ phase }: { phase: Phase }) {
  const idx = STEPS.indexOf(phase);
  return (
    <div style={{ display: "flex", gap: "6px", marginBottom: "28px" }}>
      {STEPS.map((_, i) => (
        <div key={i} style={{
          flex: 1, height: "4px", borderRadius: "2px",
          background: i <= idx ? "var(--accent)" : "var(--card-border)",
          transition: "background 0.3s",
        }} />
      ))}
    </div>
  );
}

// ─── Password strength ─────────────────────────────────────────────────────────

function pwdStrength(p: string): { score: number; label: string; color: string } {
  let s = 0;
  if (p.length >= 8)            s++;
  if (p.length >= 12)           s++;
  if (/[A-Z]/.test(p))          s++;
  if (/[a-z]/.test(p))          s++;
  if (/\d/.test(p))             s++;
  if (/[^A-Za-z0-9]/.test(p))  s++;
  if (s <= 2) return { score: s, label: "Weak",   color: "#ef4444" };
  if (s <= 4) return { score: s, label: "Fair",   color: "#f97316" };
  if (s <= 5) return { score: s, label: "Good",   color: "#22c55e" };
  return               { score: s, label: "Strong", color: "#15803d" };
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function Login() {
  const { isAuthenticated, loginDemo } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const intendedPath =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/dashboard";

  useEffect(() => {
    if (isAuthenticated) navigate(intendedPath, { replace: true });
  }, [isAuthenticated, navigate, intendedPath]);

  // ── Shared state ──────────────────────────────────────────────────────────────
  const [phase,    setPhase]   = useState<Phase>("email");
  const [loading,  setLoading] = useState(false);
  const [err,      setErr]     = useState("");
  const clearErr = () => setErr("");

  // ── Step 1: email ─────────────────────────────────────────────────────────────
  const [email, setEmail] = useState("");

  // ── Step 2: OTP ──────────────────────────────────────────────────────────────
  const [digits,   setDigits]   = useState<string[]>(Array(CODE_LEN).fill(""));
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(n => n - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // ── Step 3: password ──────────────────────────────────────────────────────────
  const [loginToken, setLoginToken] = useState("");
  const [password,   setPassword]   = useState("");
  const [showPwd,    setShowPwd]    = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const strength = pwdStrength(password);

  // ──────────────────────────────────────────────────────────────────────────────
  // STEP 1: submit email → receive OTP
  // ──────────────────────────────────────────────────────────────────────────────

  const onSubmitEmail = async (e: FormEvent) => {
    e.preventDefault();
    clearErr();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setErr("Email address is required."); return; }
    if (!/\S+@\S+\.\S+/.test(trimmed)) { setErr("Enter a valid email address."); return; }

    setLoading(true);
    const res = await loginInitRequest(trimmed);
    setLoading(false);

    if (res.error) { setErr(res.error.message); return; }

    // Always advance to OTP step (anti-enumeration: success even if email unknown)
    setDigits(Array(CODE_LEN).fill(""));
    setPhase("otp");
    setCooldown(60);
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // STEP 2: submit OTP → receive loginToken
  // ──────────────────────────────────────────────────────────────────────────────

  const onSubmitOtp = async () => {
    clearErr();
    const code = digits.join("");
    if (code.length < CODE_LEN) { setErr("Please enter all 6 digits."); return; }

    setLoading(true);
    const res = await loginVerifyOtpRequest(email.trim().toLowerCase(), code);
    setLoading(false);

    if (res.error) { setErr(res.error.message); return; }

    setLoginToken(res.data!.loginToken);
    setPassword("");
    setPhase("password");
  };

  const onOtpChange = (idx: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...digits]; next[idx] = val;
    setDigits(next); clearErr();
    if (val && idx < CODE_LEN - 1) inputRefs.current[idx + 1]?.focus();
  };
  const onOtpKeyDown = (idx: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
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

  const onResendOtp = async () => {
    if (cooldown > 0) return;
    clearErr();
    setLoading(true);
    const res = await loginInitRequest(email.trim().toLowerCase());
    setLoading(false);
    if (res.error) { setErr(res.error.message); return; }
    setCooldown(60);
    setDigits(Array(CODE_LEN).fill(""));
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // STEP 3: submit password → receive JWT + navigate
  // ──────────────────────────────────────────────────────────────────────────────

  const onSubmitPassword = async (e: FormEvent) => {
    e.preventDefault();
    clearErr();
    if (!password) { setErr("Password is required."); return; }

    setLoading(true);
    const res = await loginCompleteRequest({
      email: email.trim().toLowerCase(),
      loginToken,
      password,
      rememberMe,
    });
    setLoading(false);

    if (res.error) { setErr(res.error.message); return; }

    const { user, token } = res.data!;

    // Persist session for AuthContext rehydration
    sessionStorage.setItem("erp_user_session", JSON.stringify(user));
    if (rememberMe) localStorage.setItem("erp_user_remember", JSON.stringify(user));

    // Reload to re-initialise AuthContext with the new cookies + access token
    // (token is already set inside loginCompleteRequest via setAccessToken)
    void token; // token.accessToken already applied by loginCompleteRequest
    navigate(intendedPath, { replace: true });
    window.location.reload();
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────────

  // ── Phase: OTP ────────────────────────────────────────────────────────────────
  if (phase === "otp") {
    return (
      <AuthCard>
        <AuthLogo subtitle="Check your email" />
        <StepBar phase="otp" />

        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>📨</div>
          <p style={{ fontSize: "14px", color: "var(--text)", lineHeight: 1.6 }}>
            We sent a 6-digit code to
          </p>
          <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-h)", marginTop: "4px" }}>
            {email.trim().toLowerCase()}
          </p>
          <p style={{ fontSize: "12px", color: "var(--text)", marginTop: "8px" }}>
            Enter it below. It expires in <strong>5 minutes</strong>.
          </p>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <OtpBoxes
            digits={digits} onChange={onOtpChange} onKeyDown={onOtpKeyDown}
            onPaste={onPaste} inputRefs={inputRefs} disabled={loading}
          />
        </div>

        {err && <AuthError message={err} />}

        <AuthButton loading={loading} onClick={onSubmitOtp}>
          Verify Code
        </AuthButton>

        <div style={{ marginTop: "18px", textAlign: "center", fontSize: "13px", color: "var(--text)" }}>
          Didn't receive it?{" "}
          <AuthLink onClick={onResendOtp}>
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </AuthLink>
        </div>

        <div style={{ marginTop: "10px", textAlign: "center" }}>
          <AuthLink onClick={() => { setPhase("email"); clearErr(); setDigits(Array(CODE_LEN).fill("")); }}>
            ← Change email
          </AuthLink>
        </div>
      </AuthCard>
    );
  }

  // ── Phase: password ───────────────────────────────────────────────────────────
  if (phase === "password") {
    return (
      <AuthCard>
        <AuthLogo subtitle="Enter your password" />
        <StepBar phase="password" />

        <div style={{ marginBottom: "20px", padding: "10px 14px", borderRadius: "8px",
          background: "var(--code-bg)", border: "1px solid var(--card-border)" }}>
          <div style={{ fontSize: "12px", color: "var(--text)" }}>Signing in as</div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-h)", marginTop: "2px" }}>
            {email.trim().toLowerCase()}
          </div>
        </div>

        <form onSubmit={onSubmitPassword} noValidate>
          {/* Password with show/hide */}
          <div style={{ position: "relative", marginBottom: password ? 0 : "8px" }}>
            <AuthInput
              id="password" name="password"
              type={showPwd ? "text" : "password"}
              label="Password" placeholder="••••••••"
              value={password}
              onChange={e => { setPassword(e.target.value); clearErr(); }}
              autoComplete="current-password"
              disabled={loading}
              autoFocus
            />
            <button type="button" onClick={() => setShowPwd(p => !p)}
              style={{ position: "absolute", right: "12px", top: "34px",
                background: "none", border: "none", cursor: "pointer",
                fontSize: "12px", color: "var(--text)", padding: 0 }}>
              {showPwd ? "Hide" : "Show"}
            </button>
          </div>

          {/* Strength bar while typing */}
          {password && (
            <div style={{ marginBottom: "12px" }}>
              <div style={{ height: "3px", borderRadius: "2px", background: "var(--border)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(strength.score / 6) * 100}%`,
                  background: strength.color, transition: "width 0.3s" }} />
              </div>
              <div style={{ fontSize: "11px", color: strength.color, fontWeight: 600, marginTop: "3px" }}>
                {strength.label} password
              </div>
            </div>
          )}

          {/* Remember me + Forgot */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "7px",
              fontSize: "13px", color: "var(--text)", cursor: "pointer" }}>
              <input type="checkbox" checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                style={{ width: "14px", height: "14px", accentColor: "var(--accent)", cursor: "pointer" }} />
              Remember me
            </label>
            <AuthLink onClick={() => navigate("/forgot-password")}>Forgot password?</AuthLink>
          </div>

          {err && <AuthError message={err} />}

          <AuthButton type="submit" loading={loading}>
            Sign In
          </AuthButton>
        </form>

        <div style={{ marginTop: "14px", textAlign: "center" }}>
          <AuthLink onClick={() => { setPhase("otp"); clearErr(); setPassword(""); setDigits(Array(CODE_LEN).fill("")); }}>
            ← Re-enter verification code
          </AuthLink>
        </div>
      </AuthCard>
    );
  }

  // ── Phase: email (default) ────────────────────────────────────────────────────
  return (
    <AuthCard>
      <AuthLogo subtitle="Sign in to your workspace" />
      <StepBar phase="email" />

      <p style={{ fontSize: "14px", color: "var(--text)", marginBottom: "24px", lineHeight: 1.6 }}>
        Enter your work email. We'll send a one-time verification code before asking for your password.
      </p>

      <form onSubmit={onSubmitEmail} noValidate>
        <AuthInput
          id="email" name="email" type="email"
          label="Work email address" placeholder="you@company.com"
          value={email}
          onChange={e => { setEmail(e.target.value); clearErr(); }}
          autoComplete="email" disabled={loading}
        />

        {err && <AuthError message={err} />}

        <AuthButton type="submit" loading={loading}>
          Continue with email
        </AuthButton>
      </form>

      {/* Demo Mode button — dev only, dead-code-eliminated in production */}
      {DEMO_MODE && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "20px 0 0" }}>
            <div style={{ flex: 1, height: "1px", background: "var(--card-border)" }} />
            <span style={{ fontSize: "11px", color: "var(--text)", textTransform: "uppercase",
              letterSpacing: "0.6px", whiteSpace: "nowrap" }}>Development</span>
            <div style={{ flex: 1, height: "1px", background: "var(--card-border)" }} />
          </div>
          <button
            type="button"
            onClick={() => { loginDemo?.(); navigate("/dashboard", { replace: true }); }}
            style={{
              marginTop: "12px", width: "100%", padding: "11px 20px",
              fontSize: "14px", fontWeight: 600, borderRadius: "8px",
              border: "2px solid #d97706", background: "rgba(217,119,6,0.08)",
              color: "#d97706", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}
          >
            🚀 Enter Demo Mode
          </button>
          <p style={{ marginTop: "8px", fontSize: "11px", color: "var(--text)", textAlign: "center" }}>
            Demo Super Admin · All modules accessible · Dev only
          </p>
        </>
      )}

      <div style={{ marginTop: "20px", textAlign: "center", fontSize: "13px", color: "var(--text)" }}>
        No account?{" "}
        <AuthLink onClick={() => navigate("/register")}>Create one</AuthLink>
      </div>
    </AuthCard>
  );
}

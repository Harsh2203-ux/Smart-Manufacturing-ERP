import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  AuthCard, AuthLogo, AuthInput, AuthButton,
  AuthError, AuthSuccess, AuthDivider, AuthLink,
} from "../components/auth";
import {
  registerInitRequest,
  registerVerifyOtpRequest,
  registerCompleteRequest,
} from "../api/authApi";
import type { UserRole } from "../types/auth";

// ─── Constants ─────────────────────────────────────────────────────────────────

const CODE_LEN = 6;

const DEPARTMENTS = [
  "Administration", "Production", "Inventory & Warehouse", "Quality Control",
  "Maintenance", "Procurement", "Sales & Marketing", "Finance & Accounting",
  "Human Resources", "IT & Operations", "Logistics & Supply Chain", "Other",
];

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: "employee",            label: "Employee",             description: "Basic read-only access"               },
  { value: "operator",            label: "Operator",             description: "Floor-level production access"        },
  { value: "production_manager",  label: "Production Manager",   description: "Manage production & quality"          },
  { value: "inventory_manager",   label: "Inventory Manager",    description: "Manage stock & warehouse"             },
  { value: "purchase_manager",    label: "Purchase Manager",     description: "Manage procurement & orders"          },
  { value: "sales_manager",       label: "Sales Manager",        description: "Manage orders & customers"            },
  { value: "quality_manager",     label: "Quality Manager",      description: "Quality control & audits"             },
  { value: "maintenance_manager", label: "Maintenance Manager",  description: "Manage equipment & maintenance"       },
  { value: "hr_manager",          label: "HR Manager",           description: "Manage users & HR operations"         },
  { value: "finance_manager",     label: "Finance Manager",      description: "Financial reports & approvals"        },
  { value: "admin",               label: "Admin",                description: "Full system access"                   },
];

// ─── Password strength ─────────────────────────────────────────────────────────

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

// ─── Password requirement row ─────────────────────────────────────────────────

function Req({ met, text }: { met: boolean; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px",
      color: met ? "var(--success-text)" : "var(--text)" }}>
      <span style={{ fontWeight: 700 }}>{met ? "✓" : "○"}</span>
      {text}
    </div>
  );
}

// ─── Phase types ──────────────────────────────────────────────────────────────

type Phase = "email" | "otp" | "profile" | "done";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreateAccount() {
  const navigate = useNavigate();

  const [phase, setPhase]   = useState<Phase>("email");
  const [loading, setLoading] = useState(false);
  const [err, setErr]       = useState("");

  // Step 1 state
  const [email, setEmail]   = useState("");

  // Step 2 state
  const [digits, setDigits] = useState<string[]>(Array(CODE_LEN).fill(""));
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 3 state
  const [regToken, setRegToken] = useState("");
  const [name, setName]         = useState("");
  const [password, setPwd]      = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [role, setRole]         = useState<UserRole>("employee");
  const [department, setDept]   = useState(DEPARTMENTS[0]);
  const [designation, setDesig] = useState("");
  const [phone, setPhone]       = useState("");
  const [employeeId, setEmpId]  = useState("");
  const [acceptTerms, setTerms] = useState(false);

  const clearErr = () => setErr("");

  // Cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(n => n - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // ── Step 1: send OTP ─────────────────────────────────────────────────────────
  const onSubmitEmail = async (e: FormEvent) => {
    e.preventDefault();
    clearErr();
    if (!email.trim()) { setErr("Email address is required."); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setErr("Enter a valid email address."); return; }

    setLoading(true);
    const res = await registerInitRequest(email.trim().toLowerCase());
    setLoading(false);

    if (res.error) { setErr(res.error.message); return; }

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
    const res = await registerVerifyOtpRequest(email.trim().toLowerCase(), code);
    setLoading(false);

    if (res.error) { setErr(res.error.message); return; }

    setRegToken(res.data!.regToken);
    setPhase("profile");
  };

  const onResendOtp = async () => {
    if (cooldown > 0) return;
    clearErr();
    setLoading(true);
    await registerInitRequest(email.trim().toLowerCase());
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

  // ── Step 3: complete registration ────────────────────────────────────────────
  const onSubmitProfile = async (e: FormEvent) => {
    e.preventDefault();
    clearErr();
    if (!name.trim())                        { setErr("Full name is required."); return; }
    if (password.length < 8)                 { setErr("Password must be at least 8 characters."); return; }
    if (!/[A-Z]/.test(password))             { setErr("Password must include an uppercase letter."); return; }
    if (!/[a-z]/.test(password))             { setErr("Password must include a lowercase letter."); return; }
    if (!/\d/.test(password))                { setErr("Password must include a number."); return; }
    if (!/[^A-Za-z0-9]/.test(password))      { setErr("Password must include a special character."); return; }
    if (password !== confirm)                 { setErr("Passwords do not match."); return; }
    if (!acceptTerms)                         { setErr("You must accept the Terms of Service."); return; }

    setLoading(true);
    const res = await registerCompleteRequest({
      regToken, email: email.trim().toLowerCase(),
      name: name.trim(), password, confirmPassword: confirm,
      role, department, designation, phone, employeeId,
    });
    setLoading(false);

    if (res.error) { setErr(res.error.message); return; }

    setPhase("done");
  };

  const strength = pwdStrength(password);

  // ──────────────────────────────────────────────────────────────────────────────
  // RENDER: Done
  // ──────────────────────────────────────────────────────────────────────────────

  if (phase === "done") {
    return (
      <AuthCard>
        <AuthLogo subtitle="Account created" />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "52px", marginBottom: "16px" }}>🎉</div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-h)", marginBottom: "12px" }}>
            Welcome to Smart Manufacturing ERP
          </h2>
          <AuthSuccess message="Your account has been created and verified. You can now sign in." />
          <AuthButton onClick={() => navigate("/login")}>Sign in now</AuthButton>
        </div>
      </AuthCard>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // RENDER: OTP phase
  // ──────────────────────────────────────────────────────────────────────────────

  if (phase === "otp") {
    return (
      <AuthCard>
        <AuthLogo subtitle="Verify your email" />

        {/* Progress */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "28px" }}>
          {(["email", "otp", "profile"] as const).map((p, i) => (
            <div key={p} style={{
              flex: 1, height: "4px", borderRadius: "2px",
              background: (["email","otp","profile"].indexOf(phase) >= i)
                ? "var(--accent)" : "var(--card-border)",
              transition: "background 0.3s",
            }} />
          ))}
        </div>

        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>📧</div>
          <p style={{ fontSize: "14px", color: "var(--text)", lineHeight: 1.6 }}>
            We sent a 6-digit verification code to
          </p>
          <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-h)", marginTop: "4px" }}>
            {email}
          </p>
          <p style={{ fontSize: "12px", color: "var(--text)", marginTop: "8px" }}>
            Enter the code below. It expires in 10 minutes.
          </p>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", gap: "8px", justifyContent: "center" }} onPaste={onPaste}>
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
        </div>

        {err && <AuthError message={err} />}

        <AuthButton loading={loading} onClick={onSubmitOtp}>Verify Email</AuthButton>

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

  // ──────────────────────────────────────────────────────────────────────────────
  // RENDER: Profile / password phase
  // ──────────────────────────────────────────────────────────────────────────────

  if (phase === "profile") {
    return (
      <AuthCard>
        <AuthLogo subtitle="Set up your account" />

        {/* Progress */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "28px" }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              flex: 1, height: "4px", borderRadius: "2px",
              background: i <= 2 ? "var(--accent)" : "var(--card-border)",
            }} />
          ))}
        </div>

        <form onSubmit={onSubmitProfile} noValidate>
          <AuthInput id="name" name="name" type="text" label="Full name"
            placeholder="Alex Johnson" value={name}
            onChange={e => { setName(e.target.value); clearErr(); }}
            autoComplete="name" disabled={loading} />

          <AuthInput id="phone" name="phone" type="tel" label="Phone number (optional)"
            placeholder="+1 555 000 0000" value={phone}
            onChange={e => { setPhone(e.target.value); clearErr(); }}
            autoComplete="tel" disabled={loading} />

          <AuthInput id="employeeId" name="employeeId" type="text" label="Employee ID (optional)"
            placeholder="EMP-001" value={employeeId}
            onChange={e => { setEmpId(e.target.value); clearErr(); }}
            disabled={loading} />

          {/* Password */}
          <div style={{ position: "relative", marginBottom: 0 }}>
            <AuthInput id="password" name="password" type={showPwd ? "text" : "password"}
              label="Password" placeholder="Min. 8 characters with special char" value={password}
              onChange={e => { setPwd(e.target.value); clearErr(); }}
              autoComplete="new-password" disabled={loading} />
            <button type="button" onClick={() => setShowPwd(p => !p)}
              style={{ position: "absolute", right: "12px", top: "34px",
                background: "none", border: "none", cursor: "pointer",
                fontSize: "12px", color: "var(--text)", padding: 0 }}>
              {showPwd ? "Hide" : "Show"}
            </button>
          </div>

          {/* Strength bar */}
          {password && (
            <div style={{ marginBottom: "8px" }}>
              <div style={{ height: "4px", borderRadius: "2px", background: "var(--border)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(strength.score / 6) * 100}%`,
                  background: strength.color, transition: "width 0.3s" }} />
              </div>
              <div style={{ fontSize: "11px", color: strength.color, fontWeight: 600, marginTop: "3px" }}>
                {strength.label} password
              </div>
            </div>
          )}

          {/* Requirements */}
          {password && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginBottom: "16px" }}>
              <Req met={password.length >= 8}           text="8+ characters" />
              <Req met={/[A-Z]/.test(password)}         text="Uppercase letter" />
              <Req met={/[a-z]/.test(password)}         text="Lowercase letter" />
              <Req met={/\d/.test(password)}            text="Number" />
              <Req met={/[^A-Za-z0-9]/.test(password)} text="Special character" />
              <Req met={password === confirm && confirm.length > 0} text="Passwords match" />
            </div>
          )}

          {/* Confirm password */}
          <div style={{ position: "relative" }}>
            <AuthInput id="confirm" name="confirm" type={showConf ? "text" : "password"}
              label="Confirm password" placeholder="••••••••" value={confirm}
              onChange={e => { setConfirm(e.target.value); clearErr(); }}
              disabled={loading} />
            <button type="button" onClick={() => setShowConf(p => !p)}
              style={{ position: "absolute", right: "12px", top: "34px",
                background: "none", border: "none", cursor: "pointer",
                fontSize: "12px", color: "var(--text)", padding: 0 }}>
              {showConf ? "Hide" : "Show"}
            </button>
          </div>

          {/* Department */}
          <div style={{ marginBottom: "16px" }}>
            <label htmlFor="department" style={{ display: "block", fontSize: "13px",
              fontWeight: 500, color: "var(--text-h)", marginBottom: "6px" }}>
              Department
            </label>
            <select id="department" value={department} onChange={e => setDept(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", fontSize: "14px", borderRadius: "8px",
                border: "1px solid var(--border)", background: "var(--input-bg)",
                color: "var(--text-h)", outline: "none", boxSizing: "border-box" }}>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Designation */}
          <AuthInput id="designation" name="designation" type="text" label="Designation (optional)"
            placeholder="e.g. Senior Engineer" value={designation}
            onChange={e => { setDesig(e.target.value); clearErr(); }}
            disabled={loading} />

          {/* Role */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500,
              color: "var(--text-h)", marginBottom: "8px" }}>Role</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              {ROLES.map(r => (
                <label key={r.value} style={{
                  display: "flex", alignItems: "flex-start", gap: "8px",
                  padding: "8px 10px", borderRadius: "8px",
                  border: `1px solid ${role === r.value ? "var(--accent)" : "var(--border)"}`,
                  background: role === r.value ? "rgba(29,78,216,0.06)" : "transparent",
                  cursor: "pointer",
                }}>
                  <input type="radio" name="role" value={r.value} checked={role === r.value}
                    onChange={() => setRole(r.value)}
                    style={{ accentColor: "var(--accent)", marginTop: "2px", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-h)" }}>{r.label}</div>
                    <div style={{ fontSize: "10px", color: "var(--text)" }}>{r.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Terms */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "8px",
              fontSize: "13px", color: "var(--text)", cursor: "pointer" }}>
              <input type="checkbox" checked={acceptTerms}
                onChange={e => { setTerms(e.target.checked); clearErr(); }}
                style={{ marginTop: "2px", accentColor: "var(--accent)" }} />
              I agree to the Terms of Service and Privacy Policy
            </label>
          </div>

          {err && <AuthError message={err} />}

          <AuthButton type="submit" loading={loading}>Create Account</AuthButton>
        </form>

        <div style={{ marginTop: "12px", textAlign: "center" }}>
          <AuthLink onClick={() => { setPhase("otp"); clearErr(); }}>← Back to OTP</AuthLink>
        </div>
      </AuthCard>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // RENDER: Email phase (Step 1)
  // ──────────────────────────────────────────────────────────────────────────────

  return (
    <AuthCard>
      <AuthLogo subtitle="Create your account" />

      {/* Progress */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "28px" }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            flex: 1, height: "4px", borderRadius: "2px",
            background: i === 0 ? "var(--accent)" : "var(--card-border)",
          }} />
        ))}
      </div>

      <p style={{ fontSize: "14px", color: "var(--text)", marginBottom: "24px", lineHeight: 1.6 }}>
        Enter your work email to get started. We'll send you a verification code.
      </p>

      <form onSubmit={onSubmitEmail} noValidate>
        <AuthInput id="email" name="email" type="email" label="Work email address"
          placeholder="you@company.com" value={email}
          onChange={e => { setEmail(e.target.value); clearErr(); }}
          autoComplete="email" disabled={loading} />

        {err && <AuthError message={err} />}

        <AuthButton type="submit" loading={loading}>Send Verification Code</AuthButton>
      </form>

      <AuthDivider />

      <div style={{ textAlign: "center", fontSize: "13px", color: "var(--text)" }}>
        Already have an account?{" "}
        <AuthLink onClick={() => navigate("/login")}>Sign in</AuthLink>
      </div>
    </AuthCard>
  );
}

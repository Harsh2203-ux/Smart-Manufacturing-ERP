import { useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { AuthCard, AuthLogo, AuthButton, AuthError, AuthSuccess, AuthLink } from "../components/auth";

const CODE_LENGTH = 6;

export default function TwoFactorSetup() {
  const { user, setup2fa, enable2fa, disable2fa, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]         = useState<"info" | "setup" | "verify" | "disable">(
    user?.twoFactorEnabled ? "disable" : "info"
  );
  const [secret,   setSecret]   = useState("");
  const [qrUri,    setQrUri]    = useState("");
  const [digits,   setDigits]   = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [password, setPassword] = useState("");
  const [success,  setSuccess]  = useState("");
  const [localErr, setLocalErr] = useState("");

  const handleStartSetup = async () => {
    clearError(); setLocalErr("");
    const data = await setup2fa();
    if (data) {
      setSecret(data.secret);
      setQrUri(data.otpauthUrl ?? "");
      setStep("setup");
    }
  };

  const handleVerifyEnable = async () => {
    const code = digits.join("");
    if (code.length < CODE_LENGTH) { setLocalErr("Please enter all 6 digits."); return; }
    clearError(); setLocalErr("");
    await enable2fa(code);
    if (!error) {
      setSuccess("Two-factor authentication has been enabled on your account.");
      setStep("info");
    }
  };

  const handleDisable = async () => {
    if (!password) { setLocalErr("Password is required to disable 2FA."); return; }
    clearError(); setLocalErr("");
    await disable2fa(password);
    if (!error) {
      setSuccess("Two-factor authentication has been disabled.");
      setStep("info");
    }
  };

  const onDigitChange = (idx: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...digits]; next[idx] = val;
    setDigits(next);
    setLocalErr(""); clearError();
    if (val && idx < CODE_LENGTH - 1) {
      (document.getElementById(`d2fa-${idx + 1}`) as HTMLInputElement | null)?.focus();
    }
  };

  const displayErr = localErr || error?.message || "";

  const inputBoxStyle = (filled: boolean): React.CSSProperties => ({
    width: "44px", height: "52px", textAlign: "center", fontSize: "22px", fontWeight: 700,
    borderRadius: "8px", border: `1.5px solid ${filled ? "var(--accent)" : "var(--border)"}`,
    background: "var(--input-bg)", color: "var(--text-h)", outline: "none",
  });

  return (
    <AuthCard>
      <AuthLogo subtitle="Two-factor authentication" />

      {success && <AuthSuccess message={success} />}

      {/* ── Info / status ────────────────────────────────────────────── */}
      {step === "info" && (
        <div>
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔐</div>
            {user?.twoFactorEnabled ? (
              <>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--success-text)", marginBottom: "8px" }}>
                  ✅ Two-factor authentication is enabled
                </div>
                <p style={{ fontSize: "13px", color: "var(--text)", lineHeight: 1.6 }}>
                  Your account is protected with 2FA. A 6-digit code will be emailed to you each time you sign in.
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-h)", marginBottom: "8px" }}>
                  Two-factor authentication is off
                </div>
                <p style={{ fontSize: "13px", color: "var(--text)", lineHeight: 1.6 }}>
                  Add an extra layer of security to your account. When enabled, you'll receive a verification code by email each time you sign in.
                </p>
              </>
            )}
          </div>

          {user?.twoFactorEnabled ? (
            <AuthButton onClick={() => { setStep("disable"); setPassword(""); clearError(); setLocalErr(""); }} variant="ghost">
              Disable 2FA
            </AuthButton>
          ) : (
            <AuthButton onClick={handleStartSetup} loading={isLoading}>
              Enable two-factor authentication
            </AuthButton>
          )}

          <div style={{ marginTop: "12px", textAlign: "center" }}>
            <AuthLink onClick={() => navigate("/profile")}>← Back to profile</AuthLink>
          </div>
        </div>
      )}

      {/* ── Setup instructions ───────────────────────────────────────── */}
      {step === "setup" && (
        <div>
          <p style={{ fontSize: "14px", color: "var(--text)", marginBottom: "20px", lineHeight: 1.6 }}>
            Scan the QR code or enter the secret into your authenticator app, then confirm with a code below.
          </p>

          {/* QR placeholder — deep-link to authenticator */}
          {qrUri && (
            <div style={{ marginBottom: "16px", padding: "12px", borderRadius: "8px",
              background: "var(--code-bg)", border: "1px solid var(--card-border)", wordBreak: "break-all" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-h)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                Authenticator setup URI
              </div>
              <div style={{ fontSize: "11px", color: "var(--text)" }}>{qrUri}</div>
            </div>
          )}

          <div style={{ marginBottom: "20px", padding: "12px 14px", borderRadius: "8px",
            background: "var(--code-bg)", border: "1px solid var(--card-border)" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-h)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
              Manual entry secret
            </div>
            <code style={{ fontSize: "15px", fontWeight: 700, color: "var(--accent)", letterSpacing: "3px" }}>
              {secret}
            </code>
          </div>

          <p style={{ fontSize: "13px", color: "var(--text-h)", fontWeight: 600, marginBottom: "12px" }}>
            Enter the 6-digit code from your app to verify:
          </p>

          <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "20px" }}>
            {digits.map((d, i) => (
              <input key={i} id={`d2fa-${i}`}
                type="text" inputMode="numeric" maxLength={1} value={d}
                onChange={onDigitChange(i)}
                style={inputBoxStyle(!!d)} disabled={isLoading} autoFocus={i === 0} />
            ))}
          </div>

          {displayErr && <AuthError message={displayErr} />}

          <AuthButton onClick={handleVerifyEnable} loading={isLoading}>Confirm & enable 2FA</AuthButton>

          <div style={{ marginTop: "12px", textAlign: "center" }}>
            <AuthLink onClick={() => setStep("info")}>← Cancel</AuthLink>
          </div>
        </div>
      )}

      {/* ── Disable confirmation ─────────────────────────────────────── */}
      {step === "disable" && (
        <div>
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>⚠️</div>
            <p style={{ fontSize: "14px", color: "var(--text)", lineHeight: 1.6 }}>
              Disabling 2FA will remove the extra security from your account.
              Enter your password to confirm.
            </p>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--text-h)", marginBottom: "6px" }}>
              Password
            </label>
            <input
              type="password" value={password}
              onChange={e => { setPassword(e.target.value); setLocalErr(""); clearError(); }}
              placeholder="Enter your password"
              style={{ width: "100%", padding: "10px 12px", fontSize: "14px", borderRadius: "8px",
                border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text-h)",
                outline: "none", boxSizing: "border-box" as const }}
            />
          </div>

          {displayErr && <AuthError message={displayErr} />}

          <AuthButton onClick={handleDisable} loading={isLoading} variant="ghost">
            Disable 2FA
          </AuthButton>

          <div style={{ marginTop: "12px", textAlign: "center" }}>
            <AuthLink onClick={() => setStep("info")}>← Cancel</AuthLink>
          </div>
        </div>
      )}
    </AuthCard>
  );
}

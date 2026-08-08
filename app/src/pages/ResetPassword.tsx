import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { AuthCard, AuthLogo, AuthInput, AuthButton, AuthError, AuthSuccess, AuthLink } from "../components/auth";

export default function ResetPassword() {
  const { resetPassword, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token") ?? "";

  const [form, setForm]     = useState({ password: "", confirmPassword: "" });
  const [fieldErr, setFieldErr] = useState("");
  const [success, setSuccess]   = useState(false);

  useEffect(() => {
    if (!token) {
      // No token in URL — send user to forgot-password to request one
      navigate("/forgot-password", { replace: true });
    }
  }, [token, navigate]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setFieldErr(""); clearError();
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) { setFieldErr("Password must be at least 8 characters."); return; }
    if (form.password !== form.confirmPassword) { setFieldErr("Passwords do not match."); return; }
    const ok = await resetPassword({ token, password: form.password, confirmPassword: form.confirmPassword });
    if (ok) setSuccess(true);
  };

  if (success) {
    return (
      <AuthCard>
        <AuthLogo subtitle="Password updated" />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-h)", marginBottom: "10px" }}>
            Password changed successfully
          </h2>
          <AuthSuccess message="Your password has been updated. You can now sign in with your new password." />
          <AuthButton onClick={() => navigate("/login")}>Sign in</AuthButton>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <AuthLogo subtitle="Set a new password" />

      <form onSubmit={onSubmit} noValidate>
        <p style={{ fontSize: "14px", color: "var(--text)", marginBottom: "24px", lineHeight: 1.6 }}>
          Choose a strong password. It must be at least 8 characters.
        </p>

        <AuthInput id="password" name="password" type="password" label="New password"
          placeholder="Min. 8 characters" value={form.password}
          onChange={onChange} autoComplete="new-password" disabled={isLoading} />

        <AuthInput id="confirmPassword" name="confirmPassword" type="password"
          label="Confirm new password" placeholder="••••••••" value={form.confirmPassword}
          onChange={onChange} disabled={isLoading} />

        {(fieldErr || error) && <AuthError message={fieldErr || error?.message || ""} />}

        <AuthButton type="submit" loading={isLoading}>Set new password</AuthButton>

        <div style={{ marginTop: "16px", textAlign: "center" }}>
          <AuthLink onClick={() => navigate("/login")}>← Back to sign in</AuthLink>
        </div>
      </form>
    </AuthCard>
  );
}

import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { AuthCard, AuthLogo, AuthInput, AuthButton, AuthError, AuthSuccess } from "../components/auth";

const DEPARTMENTS = [
  "Administration", "Production", "Inventory & Warehouse", "Quality Control",
  "Maintenance", "Procurement", "Sales & Marketing", "Finance & Accounting",
  "Human Resources", "IT & Operations", "Logistics & Supply Chain", "Other",
];

export default function ProfileSettings() {
  const { user, updateProfile, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name:        user?.name        ?? "",
    phone:       user?.phone       ?? "",
    department:  user?.department  ?? "",
    designation: user?.designation ?? "",
  });
  const [fieldErr, setFieldErr] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [success,  setSuccess]  = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setFieldErr(prev => ({ ...prev, [e.target.name]: undefined }));
    clearError();
    setSuccess(false);
  };

  const validate = (): boolean => {
    const errs: typeof fieldErr = {};
    if (!form.name.trim()) errs.name = "Full name is required.";
    if (form.name.length > 100) errs.name = "Name is too long (max 100 characters).";
    setFieldErr(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const ok = await updateProfile({
      name:        form.name.trim(),
      phone:       form.phone.trim(),
      department:  form.department,
      designation: form.designation.trim(),
    });
    if (ok) setSuccess(true);
  };

  const roleLabel = user?.role?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) ?? "—";

  return (
    <AuthCard>
      <AuthLogo subtitle="Profile settings" />

      {/* Avatar */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "28px" }}>
        {user?.profileImage ? (
          <img src={user.profileImage} alt={user.name}
            style={{ width: "72px", height: "72px", borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <div style={{
            width: "72px", height: "72px", borderRadius: "50%",
            background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "24px", fontWeight: 700, color: "#fff", letterSpacing: "0.5px",
          }}>
            {user?.avatarInitials ?? "?"}
          </div>
        )}
        <div style={{ marginTop: "10px", fontSize: "14px", fontWeight: 600, color: "var(--text-h)" }}>{user?.name}</div>
        <div style={{ fontSize: "12px", color: "var(--text)", marginTop: "2px" }}>{user?.email}</div>
        <div style={{
          marginTop: "6px", padding: "2px 10px", borderRadius: "999px",
          background: "rgba(29,78,216,0.1)", color: "#1d4ed8",
          fontSize: "11px", fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase",
        }}>
          {roleLabel}
        </div>
      </div>

      {/* Employee meta */}
      {(user?.employeeId || user?.lastLoginAt) && (
        <div style={{ marginBottom: "20px", padding: "12px 14px", borderRadius: "8px",
          background: "var(--code-bg)", border: "1px solid var(--card-border)" }}>
          {user.employeeId && (
            <div style={{ fontSize: "12px", color: "var(--text)", marginBottom: "4px" }}>
              <strong style={{ color: "var(--text-h)" }}>Employee ID:</strong> {user.employeeId}
            </div>
          )}
          {user.lastLoginAt && (
            <div style={{ fontSize: "12px", color: "var(--text)" }}>
              <strong style={{ color: "var(--text-h)" }}>Last login:</strong>{" "}
              {new Date(user.lastLoginAt).toLocaleString()}
            </div>
          )}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <AuthInput id="name" name="name" type="text" label="Full name"
          value={form.name} onChange={onChange}
          disabled={isLoading} error={fieldErr.name} />

        <AuthInput id="phone" name="phone" type="tel" label="Phone number"
          placeholder="+1 555 000 0000" value={form.phone} onChange={onChange}
          disabled={isLoading} />

        <AuthInput id="designation" name="designation" type="text" label="Designation"
          placeholder="e.g. Senior Engineer" value={form.designation} onChange={onChange}
          disabled={isLoading} />

        <div style={{ marginBottom: "16px" }}>
          <label htmlFor="department" style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--text-h)", marginBottom: "6px" }}>
            Department
          </label>
          <select id="department" name="department" value={form.department} onChange={onChange}
            style={{ width: "100%", padding: "10px 12px", fontSize: "14px", borderRadius: "8px",
              border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text-h)",
              outline: "none", boxSizing: "border-box" as const }}>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {success && <AuthSuccess message="Profile updated successfully." />}
        {error   && <AuthError   message={error.message} />}

        <AuthButton type="submit" loading={isLoading}>Save changes</AuthButton>
      </form>

      <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <button type="button" onClick={() => navigate("/change-password")}
          style={{ width: "100%", padding: "10px 16px", borderRadius: "8px",
            border: "1px solid var(--border)", background: "transparent",
            color: "var(--text-h)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
          🔒 Change Password
        </button>
        <button type="button" onClick={() => navigate("/2fa-setup")}
          style={{ width: "100%", padding: "10px 16px", borderRadius: "8px",
            border: "1px solid var(--border)", background: "transparent",
            color: "var(--text-h)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
          {user?.twoFactorEnabled ? "🔐 Manage Two-Factor Authentication" : "🔐 Enable Two-Factor Authentication"}
        </button>
      </div>
    </AuthCard>
  );
}

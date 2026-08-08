/**
 * components/auth/index.tsx
 *
 * Shared primitives used by every auth page:
 *   AuthCard     — the white card container
 *   AuthLogo     — factory SVG mark + app name
 *   AuthInput    — labelled, accessible input
 *   AuthButton   — primary / ghost variants
 *   AuthDivider  — "or" horizontal rule
 *   AuthError    — red error banner
 *   AuthSuccess  — green success banner
 *   Spinner      — inline animated spinner
 */
import type { ReactNode, InputHTMLAttributes } from "react";

// ─── AuthCard ──────────────────────────────────────────────────────────────────

interface AuthCardProps { children: ReactNode }

export function AuthCard({ children }: AuthCardProps) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--main-bg)",
      padding: "24px",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "440px",
        background: "var(--card-bg)",
        borderRadius: "14px",
        border: "1px solid var(--card-border)",
        padding: "48px 40px 40px",
        boxShadow: "var(--shadow-lg)",
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── AuthLogo ──────────────────────────────────────────────────────────────────

interface AuthLogoProps { subtitle?: string }

export function AuthLogo({ subtitle = "Sign in to your workspace" }: AuthLogoProps) {
  return (
    <div style={{ textAlign: "center", marginBottom: "36px" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "14px" }}>
        <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="#1d4ed8"/>
          <rect x="4" y="15" width="24" height="13" rx="1.5" fill="#fff" opacity=".95"/>
          <polygon points="3,15 16,7 29,15" fill="#93c5fd"/>
          <rect x="7" y="9" width="3.5" height="7" rx="1" fill="#93c5fd"/>
          <rect x="12.5" y="11" width="3.5" height="5" rx="1" fill="#93c5fd"/>
          <rect x="13.5" y="20" width="5" height="8" rx="1" fill="#1d4ed8"/>
          <rect x="6" y="19" width="5" height="4" rx=".75" fill="#bfdbfe"/>
          <rect x="21" y="19" width="5" height="4" rx=".75" fill="#bfdbfe"/>
        </svg>
      </div>
      <div style={{ fontSize: "21px", fontWeight: 700, color: "var(--text-h)", letterSpacing: "-0.4px", marginBottom: "5px" }}>
        Smart Manufacturing ERP
      </div>
      <div style={{ fontSize: "13px", color: "var(--text)" }}>{subtitle}</div>
    </div>
  );
}

// ─── AuthInput ─────────────────────────────────────────────────────────────────

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  error?: string;
}

export function AuthInput({ label, id, error, style, ...props }: AuthInputProps) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label htmlFor={id} style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--text-h)", marginBottom: "6px" }}>
        {label}
      </label>
      <input
        id={id}
        {...props}
        style={{
          width: "100%",
          padding: "10px 12px",
          fontSize: "14px",
          borderRadius: "8px",
          border: `1px solid ${error ? "var(--error-text)" : "var(--border)"}`,
          background: "var(--input-bg)",
          color: "var(--text-h)",
          outline: "none",
          boxSizing: "border-box",
          ...style,
        }}
      />
      {error && <div style={{ marginTop: "4px", fontSize: "12px", color: "var(--error-text)" }}>{error}</div>}
    </div>
  );
}

// ─── AuthButton ────────────────────────────────────────────────────────────────

interface AuthButtonProps {
  children: ReactNode;
  type?: "submit" | "button";
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "ghost";
  onClick?: () => void;
  fullWidth?: boolean;
}

export function AuthButton({
  children, type = "button", loading = false, disabled = false,
  variant = "primary", onClick, fullWidth = true,
}: AuthButtonProps) {
  const isPrimary = variant === "primary";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: fullWidth ? "100%" : "auto",
        padding: "11px 20px",
        fontSize: "14px",
        fontWeight: 600,
        borderRadius: "8px",
        border: isPrimary ? "none" : "1px solid var(--border)",
        background: isPrimary
          ? (disabled || loading ? "var(--accent-muted)" : "var(--accent)")
          : "transparent",
        color: isPrimary ? "#fff" : "var(--text-h)",
        cursor: (disabled || loading) ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        letterSpacing: "0.1px",
      }}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

// ─── AuthDivider ───────────────────────────────────────────────────────────────

interface AuthDividerProps { label?: string }

export function AuthDivider({ label = "or" }: AuthDividerProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "20px 0" }}>
      <div style={{ flex: 1, height: "1px", background: "var(--card-border)" }} />
      <span style={{ fontSize: "12px", color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
      <div style={{ flex: 1, height: "1px", background: "var(--card-border)" }} />
    </div>
  );
}

// ─── AuthError ─────────────────────────────────────────────────────────────────

interface AuthErrorProps { message: string }

export function AuthError({ message }: AuthErrorProps) {
  return (
    <div style={{
      marginBottom: "16px",
      padding: "10px 14px",
      borderRadius: "7px",
      background: "var(--error-bg)",
      border: "1px solid var(--error-border)",
      color: "var(--error-text)",
      fontSize: "13px",
      lineHeight: 1.5,
    }}>
      {message}
    </div>
  );
}

// ─── AuthSuccess ───────────────────────────────────────────────────────────────

interface AuthSuccessProps { message: string }

export function AuthSuccess({ message }: AuthSuccessProps) {
  return (
    <div style={{
      marginBottom: "16px",
      padding: "10px 14px",
      borderRadius: "7px",
      background: "var(--success-bg)",
      border: "1px solid var(--success-text)",
      color: "var(--success-text)",
      fontSize: "13px",
      lineHeight: 1.5,
    }}>
      {message}
    </div>
  );
}

// ─── AuthLink ──────────────────────────────────────────────────────────────────

interface AuthLinkProps { children: ReactNode; onClick: () => void }

export function AuthLink({ children, onClick }: AuthLinkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        fontSize: "13px",
        color: "var(--accent)",
        cursor: "pointer",
        fontWeight: 500,
        textDecoration: "underline",
        textDecorationColor: "transparent",
      }}
    >
      {children}
    </button>
  );
}

// ─── Spinner ───────────────────────────────────────────────────────────────────

export function Spinner({ size = 14, light = true }: { size?: number; light?: boolean }) {
  const color = light ? "rgba(255,255,255,0.4)" : "var(--card-border)";
  const topColor = light ? "#fff" : "var(--accent)";
  return (
    <>
      <style>{`@keyframes erp-spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{
        display: "inline-block",
        width: size,
        height: size,
        border: `2px solid ${color}`,
        borderTopColor: topColor,
        borderRadius: "50%",
        animation: "erp-spin 0.65s linear infinite",
        flexShrink: 0,
      }} />
    </>
  );
}

// ─── RoleBadge ─────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  Admin:    { bg: "rgba(29,78,216,0.1)",   color: "#1d4ed8" },
  Manager:  { bg: "rgba(5,150,105,0.1)",   color: "#059669" },
  Operator: { bg: "rgba(217,119,6,0.1)",   color: "#d97706" },
  admin:    { bg: "rgba(29,78,216,0.1)",   color: "#1d4ed8" },
  manager:  { bg: "rgba(5,150,105,0.1)",   color: "#059669" },
  operator: { bg: "rgba(217,119,6,0.1)",   color: "#d97706" },
};

export function RoleBadge({ role }: { role: string }) {
  const c = ROLE_COLORS[role] ?? { bg: "var(--code-bg)", color: "var(--text)" };
  return (
    <span style={{
      padding: "2px 8px",
      borderRadius: "999px",
      fontSize: "10px",
      fontWeight: 700,
      background: c.bg,
      color: c.color,
      letterSpacing: "0.5px",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
      flexShrink: 0,
    }}>
      {role}
    </span>
  );
}

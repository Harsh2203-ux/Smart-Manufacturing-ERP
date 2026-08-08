/**
 * components/ui/Modal.tsx
 * Simple accessible modal overlay used by all ERP module forms.
 */

import type { ReactNode } from "react";
import React from "react";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}

export function Modal({ open, title, onClose, children, width = 560 }: ModalProps) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: "12px",
          width: "100%",
          maxWidth: `${width}px`,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "1px solid var(--card-border)",
          }}
        >
          <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-h)" }}>
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "20px",
              color: "var(--text)",
              lineHeight: 1,
              padding: "0 4px",
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px" }}>{children}</div>
      </div>
    </div>
  );
}

// ── FormField ─────────────────────────────────────────────────────────────────

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  style?: React.CSSProperties;
}

export function FormField({ label, required, error, children, style }: FormFieldProps) {
  return (
    <div style={{ marginBottom: "16px", ...style }}>
      <label
        style={{
          display: "block",
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--text)",
          textTransform: "uppercase",
          letterSpacing: "0.4px",
          marginBottom: "6px",
        }}
      >
        {label}
        {required && <span style={{ color: "var(--error-text)", marginLeft: "3px" }}>*</span>}
      </label>
      {children}
      {error && (
        <span style={{ fontSize: "11px", color: "var(--error-text)", marginTop: "4px", display: "block" }}>
          {error}
        </span>
      )}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────

export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid var(--card-border)",
  borderRadius: "7px",
  fontSize: "13px",
  color: "var(--text-h)",
  background: "var(--card-bg)",
  boxSizing: "border-box",
  outline: "none",
};

// ── Controlled-value components (value: string, onChange: (v:string) => void) ─

interface InputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function Input({ value, onChange, placeholder, type = "text", disabled, style }: InputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{ ...inputStyle, ...style }}
    />
  );
}

interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function Select({ value, onChange, options, disabled, style }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{ ...inputStyle, cursor: "pointer", ...style }}
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

interface TextareaProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function Textarea({ value, onChange, placeholder, rows = 3, disabled, style }: TextareaProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      style={{ ...inputStyle, resize: "vertical", minHeight: "80px", ...style }}
    />
  );
}

// ── Native HTML wrappers (kept for Part 1 pages that use e.target.value) ──────

export function NativeInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...inputStyle, ...props.style }} />;
}

export function NativeSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} style={{ ...inputStyle, cursor: "pointer", ...props.style }}>
      {props.children}
    </select>
  );
}

export function NativeTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{ ...inputStyle, resize: "vertical", minHeight: "80px", ...props.style }}
    />
  );
}

// ── FormGrid ──────────────────────────────────────────────────────────────────

export function FormGrid({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "0 16px",
      }}
    >
      {children}
    </div>
  );
}

// ── FormActions ───────────────────────────────────────────────────────────────

interface FormActionsProps {
  onCancel: () => void;
  onSubmit?: () => void | Promise<void>;
  submitLabel?: string;
  loading?: boolean;
  destructive?: boolean;
  onDestruct?: () => void;
  destructLabel?: string;
}

export function FormActions({
  onCancel,
  onSubmit,
  submitLabel = "Save",
  loading = false,
  destructive = false,
  onDestruct,
  destructLabel = "Delete",
}: FormActionsProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: "24px",
        paddingTop: "16px",
        borderTop: "1px solid var(--card-border)",
      }}
    >
      <div>
        {destructive && onDestruct && (
          <button
            type="button"
            onClick={onDestruct}
            disabled={loading}
            style={{
              background: "var(--error-bg)",
              color: "var(--error-text)",
              border: "1px solid var(--error-text)",
              borderRadius: "7px",
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {destructLabel}
          </button>
        )}
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          style={{
            background: "var(--table-head-bg)",
            color: "var(--text)",
            border: "1px solid var(--card-border)",
            borderRadius: "7px",
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          type={onSubmit ? "button" : "submit"}
          onClick={onSubmit}
          disabled={loading}
          style={{
            background: loading ? "var(--card-border)" : "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: "7px",
            padding: "8px 20px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Saving…" : submitLabel}
        </button>
      </div>
    </div>
  );
}

// ── ErrorBanner ───────────────────────────────────────────────────────────────

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      style={{
        background: "var(--error-bg)",
        color: "var(--error-text)",
        border: "1px solid var(--error-text)",
        borderRadius: "7px",
        padding: "10px 14px",
        fontSize: "13px",
        marginBottom: "16px",
      }}
    >
      {message}
    </div>
  );
}

// ── ConfirmDialog ─────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  danger?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "400px",
          padding: "28px 24px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-h)", marginBottom: "10px" }}>
          {title}
        </div>
        <div style={{ fontSize: "13px", color: "var(--text)", marginBottom: "24px" }}>
          {message}
        </div>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              background: "var(--table-head-bg)",
              color: "var(--text)",
              border: "1px solid var(--card-border)",
              borderRadius: "7px",
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              background: "var(--error-text)",
              color: "#fff",
              border: "none",
              borderRadius: "7px",
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

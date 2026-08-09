/**
 * api/client.ts — Real HTTP transport layer
 *
 * All requests use credentials: "include" so the browser automatically
 * sends / receives HTTP-only cookies (access_token, refresh_token).
 *
 * The access token is also returned in the JSON body on login/OTP/2FA
 * and stored in the Authorization header for subsequent calls.
 *
 * On 401, the client automatically attempts a single silent token refresh
 * before surfacing the error to callers. If the refresh also fails the
 * stored session is cleared so the user is redirected to login.
 */

import type { ApiResponse } from "../types/auth";

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "https://smart-manufacturing-erp-kfa1.onrender.com/api/v1";

// ── In-memory access token ─────────────────────────────────────────────────────
let _accessToken: string | null = null;

// Prevent concurrent refresh attempts — one pending promise shared by all callers
let _refreshPromise: Promise<boolean> | null = null;

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

// ── Silent token refresh ───────────────────────────────────────────────────────
async function silentRefresh(): Promise<boolean> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) { _accessToken = null; return false; }
      const json = await res.json() as { data?: { accessToken?: string }; accessToken?: string };
      const newToken = json?.data?.accessToken ?? (json as Record<string, string>)?.accessToken;
      if (newToken) { _accessToken = newToken; return true; }
      _accessToken = null;
      return false;
    } catch {
      _accessToken = null;
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

// ── Base fetch wrapper ─────────────────────────────────────────────────────────

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  skipAuth?: boolean;
  /** internal — skip 401 retry to avoid infinite loop */
  _isRetry?: boolean;
}

export async function apiRequest<T>(
  path: string,
  { method = "GET", body, skipAuth = false, _isRetry = false }: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (!skipAuth && _accessToken) {
    headers["Authorization"] = `Bearer ${_accessToken}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: "include",
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    return {
      data: null,
      error: { code: "NETWORK_ERROR", message: "Cannot connect to the server. Please check your connection." },
      status: 0,
    };
  }

  // ── 401: attempt silent refresh, then retry once ───────────────────────────
  if (res.status === 401 && !skipAuth && !_isRetry) {
    _accessToken = null;
    const refreshed = await silentRefresh();
    if (refreshed) {
      // Retry original request with new token
      return apiRequest<T>(path, { method, body, skipAuth, _isRetry: true });
    }
    // Refresh failed — clear session storage so the guard redirects to login
    sessionStorage.removeItem("erp_user_session");
    localStorage.removeItem("erp_user_remember");
    return {
      data: null,
      error: { code: "UNAUTHORIZED", message: "Your session has expired. Please sign in again." },
      status: 401,
    };
  }

  let json: Record<string, unknown>;
  try {
    json = await res.json();
  } catch {
    return {
      data: null,
      error: { code: "PARSE_ERROR", message: "Server returned an unexpected response." },
      status: res.status,
    };
  }

  if (!res.ok) {
    const fieldErrors = buildFieldErrors(json);
    const message = (json.message as string | undefined) ?? "An error occurred.";
    const code = resolveCode(res.status, message);
    return { data: null, error: { code, message, fieldErrors }, status: res.status };
  }

  return { data: (json.data ?? json) as T, error: null, status: res.status };
}

// ── Convenience methods ────────────────────────────────────────────────────────

export const apiGet    = <T>(path: string) => apiRequest<T>(path);
export const apiPost   = <T>(path: string, body: unknown) => apiRequest<T>(path, { method: "POST", body });
export const apiPut    = <T>(path: string, body: unknown) => apiRequest<T>(path, { method: "PUT", body });
export const apiPatch  = <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PATCH", body });
export const apiDelete = <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "DELETE", body });

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildFieldErrors(json: Record<string, unknown>): Record<string, string> | undefined {
  if (!Array.isArray(json.errors)) return undefined;
  const out: Record<string, string> = {};
  for (const e of json.errors as Array<{ path?: string; field?: string; msg?: string; message?: string }>) {
    const key = e.path ?? e.field;
    const val = e.msg  ?? e.message;
    if (key && val) out[key] = val;
  }
  return Object.keys(out).length ? out : undefined;
}

function resolveCode(status: number, msg: string): string {
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "EMAIL_TAKEN";
  if (status === 422) return "UNPROCESSABLE";
  if (status === 429) return "RATE_LIMITED";
  if (/invalid.*email.*password|email.*password/i.test(msg)) return "INVALID_CREDENTIALS";
  if (/otp.*invalid|invalid.*otp/i.test(msg)) return "INVALID_OTP";
  if (/2fa.*invalid|invalid.*2fa/i.test(msg)) return "INVALID_2FA_CODE";
  if (/token.*invalid|invalid.*token/i.test(msg)) return "INVALID_TOKEN";
  if (/expired/i.test(msg)) return "TOKEN_EXPIRED";
  return "INTERNAL_ERROR";
}

/**
 * api/authApi.ts — Real backend API calls
 *
 * Every function maps 1:1 to a backend endpoint.
 * All requests go to: POST/GET/PUT/DELETE /api/v1/auth/*
 */

import { apiGet, apiPost, apiPut, apiDelete, setAccessToken } from "./client";
import type {
  ApiResponse,
  AuthSession,
  AuthToken,
  ForgotPasswordRequest,
  LoginCredentials,
  OtpVerifyRequest,
  RegisterCredentials,
  ResetPasswordRequest,
  TwoFactorSetupResponse,
  TwoFactorVerifyRequest,
  User,
  VerifyEmailRequest,
} from "../types/auth";

// ── Backend response shapes ────────────────────────────────────────────────────

type LoginResponseData =
  | { session: AuthSession }
  | { requiresOtp: true; pendingToken?: string; email: string }
  | { requires2fa: true; pendingToken: string; email: string }
  | { requiresEmailVerification: true; email: string };

// ── Token helper ───────────────────────────────────────────────────────────────

function makeToken(accessToken: string): AuthToken {
  // Access token expires in 8h — we set expiresAt conservatively to 7h55m
  return {
    accessToken,
    expiresAt: Date.now() + 7 * 60 * 60 * 1000 + 55 * 60 * 1000,
    tokenType: "Bearer",
  };
}

// ── POST /api/v1/auth/register/init — Step 1: email → OTP ─────────────────────
export function registerInitRequest(email: string): Promise<ApiResponse<{ email: string }>> {
  return apiPost("/auth/register/init", { email });
}

// ── POST /api/v1/auth/register/verify-otp — Step 2: verify OTP ────────────────
export function registerVerifyOtpRequest(
  email: string, code: string,
): Promise<ApiResponse<{ email: string; regToken: string }>> {
  return apiPost("/auth/register/verify-otp", { email, code });
}

// ── POST /api/v1/auth/register/complete — Step 3: set password + profile ───────
export function registerCompleteRequest(data: {
  regToken: string; email: string; name: string;
  password: string; confirmPassword: string;
  role?: string; department?: string; designation?: string;
  phone?: string; employeeId?: string;
}): Promise<ApiResponse<{ email: string }>> {
  return apiPost("/auth/register/complete", data);
}

// ── POST /api/v1/auth/register (legacy) ────────────────────────────────────────
export function registerRequest(
  creds: RegisterCredentials,
): Promise<ApiResponse<{ email: string }>> {
  return apiPost("/auth/register", {
    name:            creds.name,
    email:           creds.email,
    password:        creds.password,
    confirmPassword: creds.confirmPassword,
    role:            creds.role,
    department:      creds.department,
  });
}

// ── POST /api/v1/auth/login/init — Step 1: email → OTP ────────────────────────
export function loginInitRequest(
  email: string,
): Promise<ApiResponse<{ requiresOtp: true; email: string }>> {
  return apiPost("/auth/login/init", { email });
}

// ── POST /api/v1/auth/login/verify-otp — Step 2: OTP → loginToken ─────────────
export function loginVerifyOtpRequest(
  email: string,
  code: string,
): Promise<ApiResponse<{ requiresPassword: true; loginToken: string; email: string }>> {
  return apiPost("/auth/login/verify-otp", { email, code });
}

// ── POST /api/v1/auth/login/complete — Step 3: password → JWT ─────────────────
export async function loginCompleteRequest(data: {
  email: string;
  loginToken: string;
  password: string;
  rememberMe?: boolean;
}): Promise<ApiResponse<AuthSession>> {
  const res = await apiPost<{ user: User; accessToken: string }>("/auth/login/complete", data);
  if (res.error || !res.data) return { data: null, error: res.error, status: res.status };
  setAccessToken(res.data.accessToken);
  return {
    data: { user: res.data.user, token: makeToken(res.data.accessToken) },
    error: null, status: res.status,
  };
}

// ── POST /api/v1/auth/login (legacy) ──────────────────────────────────────────
export async function loginRequest(
  creds: LoginCredentials,
): Promise<ApiResponse<LoginResponseData>> {
  const res = await apiPost<{
    user?: User;
    accessToken?: string;
    requiresEmailVerification?: boolean;
    requiresOtp?: boolean;
    requires2fa?: boolean;
    pendingToken?: string;
    email?: string;
    message?: string;
  }>("/auth/login", {
    email:      creds.email,
    password:   creds.password,
    rememberMe: creds.rememberMe,
  });

  if (res.error || !res.data) {
    return { data: null, error: res.error, status: res.status };
  }

  const d = res.data;

  // Email verification required
  if (d.requiresEmailVerification) {
    return {
      data: { requiresEmailVerification: true as const, email: d.email! },
      error: null, status: res.status,
    };
  }

  // OTP required (standard login second factor — every user)
  if (d.requiresOtp) {
    return {
      data: { requiresOtp: true as const, pendingToken: d.pendingToken ?? "", email: d.email! },
      error: null, status: res.status,
    };
  }

  // 2FA required
  if (d.requires2fa) {
    return {
      data: { requires2fa: true as const, pendingToken: d.pendingToken!, email: d.email! },
      error: null, status: res.status,
    };
  }

  // Full session (fallback — direct token issuance)
  if (d.user && d.accessToken) {
    setAccessToken(d.accessToken);
    return {
      data: { session: { user: d.user, token: makeToken(d.accessToken) } },
      error: null, status: res.status,
    };
  }

  return { data: null, error: { code: "UNEXPECTED", message: "Unexpected login response." }, status: res.status };
}

// ── POST /api/v1/auth/logout ───────────────────────────────────────────────────
export function logoutRequest(): Promise<ApiResponse<{ success: boolean }>> {
  return apiPost("/auth/logout", {});
}

// ── GET /api/v1/auth/profile ───────────────────────────────────────────────────
export function getMeRequest(): Promise<ApiResponse<User>> {
  return apiGet("/auth/profile");
}

// ── POST /api/v1/auth/refresh ──────────────────────────────────────────────────
export async function refreshRequest(): Promise<ApiResponse<AuthToken>> {
  const res = await apiPost<{ accessToken: string }>("/auth/refresh", {});
  if (res.error || !res.data) return { data: null, error: res.error, status: res.status };
  setAccessToken(res.data.accessToken);
  return { data: makeToken(res.data.accessToken), error: null, status: res.status };
}

// ── POST /api/v1/auth/forgot-password — Step 1: send OTP ──────────────────────
export function forgotPasswordRequest(
  req: ForgotPasswordRequest,
): Promise<ApiResponse<{ email: string }>> {
  return apiPost("/auth/forgot-password", { email: req.email });
}

// ── POST /api/v1/auth/forgot-password/verify-otp — Step 2: verify OTP ─────────
export function forgotPasswordVerifyOtpRequest(
  email: string, code: string,
): Promise<ApiResponse<{ resetToken: string; email: string }>> {
  return apiPost("/auth/forgot-password/verify-otp", { email, code });
}

// ── PUT /api/v1/auth/reset-password/:token ────────────────────────────────────
export function resetPasswordRequest(
  req: ResetPasswordRequest,
): Promise<ApiResponse<{ success: boolean }>> {
  return apiPut(`/auth/reset-password/${req.token}`, {
    password:        req.password,
    confirmPassword: req.confirmPassword,
  });
}

// ── GET /api/v1/auth/verify-email/:token ──────────────────────────────────────
export function verifyEmailRequest(
  req: VerifyEmailRequest,
): Promise<ApiResponse<{ success: boolean }>> {
  return apiGet(`/auth/verify-email/${req.token}`);
}

// ── POST /api/v1/auth/resend-verification ─────────────────────────────────────
export function resendVerifyRequest(
  email: string,
): Promise<ApiResponse<{ sent: boolean }>> {
  return apiPost("/auth/resend-verification", { email });
}

// ── POST /api/v1/auth/send-otp ────────────────────────────────────────────────
export function sendOtpRequest(
  email: string,
): Promise<ApiResponse<{ sent: boolean }>> {
  return apiPost("/auth/send-otp", { email });
}

// ── POST /api/v1/auth/verify-otp ──────────────────────────────────────────────
export async function verifyOtpRequest(
  req: OtpVerifyRequest,
): Promise<ApiResponse<AuthSession>> {
  const res = await apiPost<{ user: User; accessToken: string }>("/auth/verify-otp", {
    email: req.email,
    code:  req.code,
  });
  if (res.error || !res.data) return { data: null, error: res.error, status: res.status };
  setAccessToken(res.data.accessToken);
  return {
    data: { user: res.data.user, token: makeToken(res.data.accessToken) },
    error: null, status: res.status,
  };
}

// ── POST /api/v1/auth/2fa/setup ───────────────────────────────────────────────
export function setup2faRequest(): Promise<ApiResponse<TwoFactorSetupResponse & { otpauthUrl: string }>> {
  return apiPost("/auth/2fa/setup", {});
}

// ── POST /api/v1/auth/2fa/enable ──────────────────────────────────────────────
export function enable2faRequest(
  code: string,
): Promise<ApiResponse<{ twoFactorEnabled: boolean }>> {
  return apiPost("/auth/2fa/enable", { code });
}

// ── POST /api/v1/auth/2fa/disable ─────────────────────────────────────────────
export function disable2faRequest(
  password: string,
): Promise<ApiResponse<{ success: boolean }>> {
  return apiPost("/auth/2fa/disable", { password });
}

// ── GET /api/v1/auth/profile (alias) ──────────────────────────────────────────
export function getProfileRequest(): Promise<ApiResponse<User>> {
  return apiGet("/auth/profile");
}

// ── PUT /api/v1/auth/profile ──────────────────────────────────────────────────
export function updateProfileRequest(
  data: Partial<Pick<User, "name" | "phone" | "department" | "designation" | "profileImage">>,
): Promise<ApiResponse<User>> {
  return apiPut("/auth/profile", data);
}

// ── PUT /api/v1/auth/change-password ──────────────────────────────────────────
export function changePasswordRequest(
  currentPassword: string,
  newPassword: string,
): Promise<ApiResponse<{ success: boolean }>> {
  return apiPut("/auth/change-password", { currentPassword, newPassword });
}

// ── DELETE /api/v1/auth/account ───────────────────────────────────────────────
export function deleteAccountRequest(
  password: string,
): Promise<ApiResponse<{ success: boolean }>> {
  return apiDelete("/auth/account", { password });
}

// 2FA verify (during login flow — uses verify-otp endpoint since server sends email OTP)
export async function verify2faRequest(
  req: TwoFactorVerifyRequest,
): Promise<ApiResponse<AuthSession>> {
  // During login, 2FA sends an OTP to email — same verify-otp endpoint
  const res = await apiPost<{ user: User; accessToken: string }>("/auth/verify-otp", {
    email: req.email,
    code:  req.code,
  });
  if (res.error || !res.data) return { data: null, error: res.error, status: res.status };
  setAccessToken(res.data.accessToken);
  return {
    data: { user: res.data.user, token: makeToken(res.data.accessToken) },
    error: null, status: res.status,
  };
}

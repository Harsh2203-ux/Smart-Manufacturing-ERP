/**
 * services/authService.ts
 *
 * Orchestrates all authentication flows:
 * - Calls real API endpoints
 * - Manages access token lifecycle (in-memory + Authorization header)
 * - Persists non-sensitive user data for session rehydration
 * - Provides permission/role helpers
 */

import type {
  ApiResponse,
  AuthSession,
  ForgotPasswordRequest,
  LoginCredentials,
  OtpVerifyRequest,
  Permission,
  RegisterCredentials,
  ResetPasswordRequest,
  TwoFactorSetupResponse,
  TwoFactorVerifyRequest,
  User,
  UserRole,
  VerifyEmailRequest,
} from "../types/auth";
import { ROLE_PERMISSIONS } from "../types/auth";
import { setAccessToken } from "../api/client";
import {
  loginRequest,
  logoutRequest,
  getMeRequest,
  refreshRequest,
  registerRequest,
  forgotPasswordRequest,
  resetPasswordRequest,
  verifyEmailRequest,
  resendVerifyRequest,
  verifyOtpRequest,
  sendOtpRequest,
  verify2faRequest,
  setup2faRequest,
  enable2faRequest,
  disable2faRequest,
  updateProfileRequest,
  changePasswordRequest,
  deleteAccountRequest,
} from "../api/authApi";

// ── Session persistence ────────────────────────────────────────────────────────
// We store only the non-sensitive user profile; the access token lives
// in memory (module-level) and HTTP-only cookies (managed by the server).

const STORE = {
  USER_SESSION:  "erp_user_session",  // sessionStorage — wiped when tab closes
  USER_REMEMBER: "erp_user_remember", // localStorage   — persistent (rememberMe)
} as const;

function storeUser(user: User, rememberMe: boolean): void {
  const json = JSON.stringify(user);
  sessionStorage.setItem(STORE.USER_SESSION, json);
  if (rememberMe) localStorage.setItem(STORE.USER_REMEMBER, json);
}

function clearStoredUser(): void {
  sessionStorage.removeItem(STORE.USER_SESSION);
  localStorage.removeItem(STORE.USER_REMEMBER);
}

function readStoredUser(): User | null {
  try {
    const raw =
      sessionStorage.getItem(STORE.USER_SESSION) ??
      localStorage.getItem(STORE.USER_REMEMBER);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

// ── Public service ─────────────────────────────────────────────────────────────

export const authService = {

  // ── Login ─────────────────────────────────────────────────────────────────
  async login(credentials: LoginCredentials): Promise<ApiResponse<
    | { session: AuthSession }
    | { requiresOtp: true;  pendingToken?: string; email: string }
    | { requires2fa: true;  pendingToken: string; email: string }
    | { requiresEmailVerification: true; email: string }
  >> {
    const response = await loginRequest(credentials);
    if (response.data && "session" in response.data) {
      storeUser(response.data.session.user, credentials.rememberMe);
    }
    return response;
  },

  // ── Register ──────────────────────────────────────────────────────────────
  async register(credentials: RegisterCredentials): Promise<ApiResponse<{ email: string }>> {
    return registerRequest(credentials);
  },

  // ── Logout ────────────────────────────────────────────────────────────────
  async logout(): Promise<void> {
    void logoutRequest(); // fire-and-forget — server clears the cookie
    setAccessToken(null);
    clearStoredUser();
  },

  // ── Rehydrate session on page load ────────────────────────────────────────
  // The server's HTTP-only refresh cookie is sent automatically.
  // We ask the server to issue a new access token, then fetch fresh user data.
  async rehydrate(): Promise<AuthSession | null> {
    const storedUser = readStoredUser();
    if (!storedUser) return null;

    const refreshRes = await refreshRequest();
    if (!refreshRes.data) { clearStoredUser(); return null; }

    const meRes = await getMeRequest();
    if (!meRes.data) { setAccessToken(null); clearStoredUser(); return null; }

    const rememberMe = !!localStorage.getItem(STORE.USER_REMEMBER);
    storeUser(meRes.data, rememberMe);
    return { user: meRes.data, token: refreshRes.data };
  },

  // ── Session helpers ────────────────────────────────────────────────────────
  hasStoredSession(): boolean     { return !!readStoredUser(); },
  getStoredUser():    User | null { return readStoredUser(); },

  async refreshSession(): Promise<AuthSession | null> {
    const res = await refreshRequest();
    if (!res.data) return null;
    const meRes = await getMeRequest();
    if (!meRes.data) return null;
    const rememberMe = !!localStorage.getItem(STORE.USER_REMEMBER);
    storeUser(meRes.data, rememberMe);
    return { user: meRes.data, token: res.data };
  },

  // ── Password recovery ──────────────────────────────────────────────────────
  async forgotPassword(req: ForgotPasswordRequest): Promise<ApiResponse<{ email: string }>> {
    return forgotPasswordRequest(req);
  },
  async resetPassword(req: ResetPasswordRequest): Promise<ApiResponse<{ success: boolean }>> {
    return resetPasswordRequest(req);
  },

  // ── Email verification ─────────────────────────────────────────────────────
  async verifyEmail(req: VerifyEmailRequest): Promise<ApiResponse<{ success: boolean }>> {
    return verifyEmailRequest(req);
  },
  async resendVerificationEmail(email: string): Promise<ApiResponse<{ sent: boolean }>> {
    return resendVerifyRequest(email);
  },

  // ── OTP ────────────────────────────────────────────────────────────────────
  async verifyOtp(req: OtpVerifyRequest): Promise<ApiResponse<AuthSession>> {
    const res = await verifyOtpRequest(req);
    if (res.data) { storeUser(res.data.user, false); }
    return res;
  },
  async resendOtp(email: string): Promise<ApiResponse<{ sent: boolean }>> {
    return sendOtpRequest(email);
  },

  // ── 2FA ────────────────────────────────────────────────────────────────────
  async verify2fa(req: TwoFactorVerifyRequest): Promise<ApiResponse<AuthSession>> {
    const res = await verify2faRequest(req);
    if (res.data) { storeUser(res.data.user, false); }
    return res;
  },
  async setup2fa(): Promise<ApiResponse<TwoFactorSetupResponse & { otpauthUrl: string }>> {
    return setup2faRequest();
  },
  async enable2fa(code: string): Promise<ApiResponse<{ twoFactorEnabled: boolean }>> {
    return enable2faRequest(code);
  },
  async disable2fa(password: string): Promise<ApiResponse<{ success: boolean }>> {
    return disable2faRequest(password);
  },

  // ── Profile ────────────────────────────────────────────────────────────────
  async updateProfile(
    data: Partial<Pick<User, "name" | "phone" | "department" | "designation" | "profileImage">>,
  ): Promise<ApiResponse<User>> {
    const res = await updateProfileRequest(data);
    if (res.data) {
      const rememberMe = !!localStorage.getItem(STORE.USER_REMEMBER);
      storeUser(res.data, rememberMe);
    }
    return res;
  },

  // ── Change password ────────────────────────────────────────────────────────
  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<ApiResponse<{ success: boolean }>> {
    const res = await changePasswordRequest(currentPassword, newPassword);
    if (!res.error) {
      setAccessToken(null);
      clearStoredUser();
    }
    return res;
  },

  // ── Delete account ─────────────────────────────────────────────────────────
  async deleteAccount(password: string): Promise<ApiResponse<{ success: boolean }>> {
    const res = await deleteAccountRequest(password);
    if (!res.error) {
      setAccessToken(null);
      clearStoredUser();
    }
    return res;
  },

  // ── Permission helpers (pure, no network) ─────────────────────────────────
  getPermissions(role: UserRole):                       Permission[] {
    return ROLE_PERMISSIONS[role] ?? [];
  },
  hasPermission(role: UserRole, permission: Permission): boolean {
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
  },
  hasRole(userRole: UserRole, required: UserRole | UserRole[]): boolean {
    const roles = Array.isArray(required) ? required : [required];
    return roles.includes(userRole);
  },
};

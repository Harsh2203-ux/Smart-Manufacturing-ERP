// ─── Roles ─────────────────────────────────────────────────────────────────────

export type UserRole =
  | "super_admin"
  | "admin"
  | "production_manager"
  | "inventory_manager"
  | "purchase_manager"
  | "sales_manager"
  | "quality_manager"
  | "maintenance_manager"
  | "hr_manager"
  | "finance_manager"
  | "operator"
  | "employee";

// ─── Granular permissions ───────────────────────────────────────────────────────

export type Permission =
  | "dashboard:view"
  | "production:view" | "production:create" | "production:edit" | "production:delete"
  | "inventory:view"  | "inventory:edit"
  | "orders:view"     | "orders:create"     | "orders:approve"
  | "quality:view"    | "quality:edit"
  | "maintenance:view"| "maintenance:create"
  | "reports:view"    | "reports:export"
  | "settings:view"   | "settings:edit"
  | "users:view"      | "users:create"      | "users:delete";

// ─── Role → permission matrix ───────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    "dashboard:view",
    "production:view","production:create","production:edit","production:delete",
    "inventory:view", "inventory:edit",
    "orders:view",    "orders:create",   "orders:approve",
    "quality:view",   "quality:edit",
    "maintenance:view","maintenance:create",
    "reports:view",   "reports:export",
    "settings:view",  "settings:edit",
    "users:view",     "users:create",    "users:delete",
  ],
  admin: [
    "dashboard:view",
    "production:view","production:create","production:edit","production:delete",
    "inventory:view", "inventory:edit",
    "orders:view",    "orders:create",   "orders:approve",
    "quality:view",   "quality:edit",
    "maintenance:view","maintenance:create",
    "reports:view",   "reports:export",
    "settings:view",  "settings:edit",
    "users:view",     "users:create",    "users:delete",
  ],
  production_manager: [
    "dashboard:view",
    "production:view","production:create","production:edit",
    "inventory:view",
    "orders:view",
    "quality:view",
    "maintenance:view",
    "reports:view",
  ],
  inventory_manager: [
    "dashboard:view",
    "inventory:view", "inventory:edit",
    "orders:view",
    "reports:view",
  ],
  purchase_manager: [
    "dashboard:view",
    "inventory:view",
    "orders:view",    "orders:create",   "orders:approve",
    "reports:view",
  ],
  sales_manager: [
    "dashboard:view",
    "orders:view",    "orders:create",   "orders:approve",
    "reports:view",
  ],
  quality_manager: [
    "dashboard:view",
    "production:view",
    "quality:view",   "quality:edit",
    "reports:view",
  ],
  maintenance_manager: [
    "dashboard:view",
    "maintenance:view","maintenance:create",
    "reports:view",
  ],
  hr_manager: [
    "dashboard:view",
    "users:view",
    "reports:view",
    "settings:view",
  ],
  finance_manager: [
    "dashboard:view",
    "orders:view",
    "reports:view",   "reports:export",
    "settings:view",
  ],
  operator: [
    "dashboard:view",
    "production:view","production:create",
    "inventory:view",
    "orders:view",
    "quality:view",
    "maintenance:view","maintenance:create",
    "reports:view",
  ],
  employee: [
    "dashboard:view",
    "production:view",
    "reports:view",
  ],
};

// ─── User model ─────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  employeeId?: string;
  department: string;
  designation?: string;
  avatarInitials: string;
  profileImage?: string;
  /** ISO-8601 — set server-side on each successful login */
  lastLoginAt?: string;
  /** Whether the user has completed email verification */
  emailVerified: boolean;
  /** Whether 2FA is enabled on this account */
  twoFactorEnabled: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ─── JWT token shapes ───────────────────────────────────────────────────────────

export interface AuthToken {
  /** Opaque JWT string — never parsed client-side */
  accessToken: string;
  /** Unix epoch ms — returned by server so client can show "session expires in…" */
  expiresAt: number;
  tokenType: "Bearer";
}

export interface AuthSession {
  user: User;
  token: AuthToken;
}

// ─── Session status ─────────────────────────────────────────────────────────────

export type SessionStatus =
  | "active"
  | "expired"
  | "revoked"
  | "unauthenticated";

// ─── Auth flow state ────────────────────────────────────────────────────────────

export type AuthFlowStep =
  | "idle"
  | "credentials"
  | "otp"
  | "2fa"
  | "verify-email"
  | "complete";

export interface AuthFlowState {
  step: AuthFlowStep;
  pendingEmail: string | null;
  pendingToken: string | null;
}

// ─── Request bodies ─────────────────────────────────────────────────────────────

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  department: string;
  acceptTerms: boolean;
  phone?: string;
  designation?: string;
  employeeId?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface OtpVerifyRequest {
  email: string;
  code: string;
  pendingToken: string;
}

export interface TwoFactorVerifyRequest {
  email: string;
  code: string;
  pendingToken: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qrCodeUri: string;
  otpauthUrl?: string;
}

// ─── API envelope ───────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  status: number;
}

export interface ApiError {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
}

// ─── Context surface ────────────────────────────────────────────────────────────

export interface AuthState {
  user: User | null;
  token: AuthToken | null;
  sessionStatus: SessionStatus;
  flowState: AuthFlowState;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: ApiError | null;
}

// ── Register result ─────────────────────────────────────────────────────────────
export interface RegisterResult {
  ok: boolean;
  email?: string;
  /** true in dev mode when no SMTP is configured — account is immediately usable */
  autoVerified?: boolean;
  devMode?: boolean;
}

export interface AuthContextValue extends AuthState {
  // ── Primary auth actions ──────────────────────────────────────────────────
  login:        (credentials: LoginCredentials)    => Promise<void>;
  register:     (credentials: RegisterCredentials) => Promise<RegisterResult>;
  logout:       ()                                  => Promise<void>;

  // ── Password recovery ─────────────────────────────────────────────────────
  forgotPassword: (req: ForgotPasswordRequest)  => Promise<boolean>;
  resetPassword:  (req: ResetPasswordRequest)   => Promise<boolean>;

  // ── Email verification ────────────────────────────────────────────────────
  verifyEmail:    (req: VerifyEmailRequest)      => Promise<boolean>;
  resendVerificationEmail: (email: string)       => Promise<void>;

  // ── OTP (one-time password sent to email) ─────────────────────────────────
  verifyOtp:      (req: OtpVerifyRequest)        => Promise<void>;
  resendOtp:      (email: string)                => Promise<void>;

  // ── Two-factor authentication ─────────────────────────────────────────────
  verify2fa:      (req: TwoFactorVerifyRequest)  => Promise<void>;
  setup2fa:       ()                             => Promise<(TwoFactorSetupResponse & { otpauthUrl?: string }) | null>;
  enable2fa:      (code: string)                 => Promise<void>;
  disable2fa:     (password: string)             => Promise<void>;

  // ── Profile ───────────────────────────────────────────────────────────────
  updateProfile:  (data: Partial<Pick<User, "name" | "phone" | "department" | "designation" | "profileImage">>) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  deleteAccount:  (password: string)             => Promise<void>;

  // ── Session ───────────────────────────────────────────────────────────────
  refreshSession: ()                             => Promise<void>;
  markSessionExpired: ()                         => void;

  // ── Utilities ─────────────────────────────────────────────────────────────
  clearError:    ()                              => void;
  hasRole:       (role: UserRole | UserRole[])   => boolean;
  hasPermission: (permission: Permission)        => boolean;

  // ── Demo mode (dev-only, undefined in production) ─────────────────────────
  loginDemo?: () => void;
}

import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type {
  ApiError,
  AuthContextValue,
  AuthFlowState,
  AuthToken,
  ForgotPasswordRequest,
  LoginCredentials,
  OtpVerifyRequest,
  Permission,
  RegisterCredentials,
  ResetPasswordRequest,
  SessionStatus,
  TwoFactorSetupResponse,
  TwoFactorVerifyRequest,
  User,
  UserRole,
  VerifyEmailRequest,
} from "../types/auth";
import { authService } from "../services/authService";
import {
  DEMO_MODE,
  DEMO_TOKEN,
  DEMO_USER,
  activateDemoSession,
  clearDemoSession,
  isDemoSessionActive,
} from "../demo/demoSession";

// ─── Context ───────────────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Default flow state ────────────────────────────────────────────────────────

const DEFAULT_FLOW: AuthFlowState = {
  step:         "idle",
  pendingEmail: null,
  pendingToken: null,
};

// ─── Provider ─────────────────────────────────────────────────────────────────

interface AuthProviderProps { children: ReactNode }

export function AuthProvider({ children }: AuthProviderProps) {
  const [user,            setUser]            = useState<User | null>(null);
  const [token,           setToken]           = useState<AuthToken | null>(null);
  const [sessionStatus,   setSessionStatus]   = useState<SessionStatus>("unauthenticated");
  const [flowState,       setFlowState]       = useState<AuthFlowState>(DEFAULT_FLOW);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading,       setIsLoading]       = useState(true);
  const [error,           setError]           = useState<ApiError | null>(null);

  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Schedule auto-expiry warning ─────────────────────────────────────────
  const scheduleExpiry = useCallback((expiresAt: number) => {
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    const msUntilExpiry = expiresAt - Date.now() - 60_000;
    if (msUntilExpiry > 0) {
      expiryTimer.current = setTimeout(() => {
        setSessionStatus("expired");
        setIsAuthenticated(false);
      }, msUntilExpiry);
    }
  }, []);

  // ── Hydrate session from a resolved AuthSession ──────────────────────────
  const applySession = useCallback(
    (resolvedUser: User, resolvedToken: AuthToken) => {
      setUser(resolvedUser);
      setToken(resolvedToken);
      setIsAuthenticated(true);
      setSessionStatus("active");
      setFlowState(DEFAULT_FLOW);
      scheduleExpiry(resolvedToken.expiresAt);
    },
    [scheduleExpiry]
  );

  // ── Rehydrate session on mount ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const rehydrate = async () => {
      // ── Demo mode: inject fake session before any real network call ───────
      if (DEMO_MODE && isDemoSessionActive()) {
        if (!cancelled) {
          applySession(DEMO_USER, DEMO_TOKEN);
          setIsLoading(false);
        }
        return;
      }

      if (!authService.hasStoredSession()) {
        if (!cancelled) setIsLoading(false);
        return;
      }
      const session = await authService.rehydrate();
      if (!cancelled) {
        if (session) applySession(session.user, session.token);
        setIsLoading(false);
      }
    };

    void rehydrate();
    return () => { cancelled = true; };
  }, [applySession]);

  // ── Cleanup timer on unmount ──────────────────────────────────────────────
  useEffect(() => () => { if (expiryTimer.current) clearTimeout(expiryTimer.current); }, []);

  // ─── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    setIsLoading(true);
    setError(null);

    const res = await authService.login(credentials);

    if (res.error || !res.data) {
      setError(res.error ?? { code: "UNKNOWN", message: "Login failed." });
      setIsLoading(false);
      return;
    }

    const data = res.data;

    if ("requiresEmailVerification" in data) {
      setFlowState({ step: "verify-email", pendingEmail: data.email, pendingToken: null });
      setIsLoading(false);
      return;
    }
    if ("requiresOtp" in data) {
      setFlowState({ step: "otp", pendingEmail: data.email, pendingToken: data.pendingToken ?? null });
      setIsLoading(false);
      return;
    }
    if ("requires2fa" in data) {
      setFlowState({ step: "2fa", pendingEmail: data.email, pendingToken: data.pendingToken });
      setIsLoading(false);
      return;
    }

    applySession(data.session.user, data.session.token);
    setIsLoading(false);
  }, [applySession]);

  // ─── Register ──────────────────────────────────────────────────────────────
  const register = useCallback(async (credentials: RegisterCredentials): Promise<{
    ok: boolean;
    email?: string;
    autoVerified?: boolean;
    devMode?: boolean;
  }> => {
    setIsLoading(true);
    setError(null);
    const res = await authService.register(credentials);
    if (res.error || !res.data) {
      setError(res.error ?? { code: "UNKNOWN", message: "Registration failed." });
      setIsLoading(false);
      return { ok: false };
    }
    // Dev mode: account auto-verified — no email flow needed, go straight to login
    if ("autoVerified" in res.data && res.data.autoVerified) {
      setIsLoading(false);
      return { ok: true, email: res.data.email as string, autoVerified: true, devMode: true };
    }
    setFlowState({ step: "verify-email", pendingEmail: res.data.email, pendingToken: null });
    setIsLoading(false);
    return { ok: true, email: res.data.email };
  }, []);

  // ─── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async (): Promise<void> => {
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    // ── Demo mode: just clear the demo flag, skip real API logout ─────────
    if (DEMO_MODE && isDemoSessionActive()) {
      clearDemoSession();
    } else {
      await authService.logout();
    }
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    setSessionStatus("unauthenticated");
    setFlowState(DEFAULT_FLOW);
    setError(null);
  }, []);

  // ─── Forgot / Reset password ───────────────────────────────────────────────
  const forgotPassword = useCallback(async (req: ForgotPasswordRequest): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    const res = await authService.forgotPassword(req);
    if (res.error) setError(res.error);
    setIsLoading(false);
    return !res.error;
  }, []);

  const resetPassword = useCallback(async (req: ResetPasswordRequest): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    const res = await authService.resetPassword(req);
    if (res.error) setError(res.error);
    setIsLoading(false);
    return !res.error;
  }, []);

  // ─── Email verification ────────────────────────────────────────────────────
  const verifyEmail = useCallback(async (req: VerifyEmailRequest): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    const res = await authService.verifyEmail(req);
    if (res.error) { setError(res.error); setIsLoading(false); return false; }
    if (user) setUser({ ...user, emailVerified: true });
    setIsLoading(false);
    return true;
  }, [user]);

  const resendVerificationEmail = useCallback(async (email: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    const res = await authService.resendVerificationEmail(email);
    if (res.error) setError(res.error);
    setIsLoading(false);
  }, []);

  // ─── OTP ───────────────────────────────────────────────────────────────────
  const verifyOtp = useCallback(async (req: OtpVerifyRequest): Promise<void> => {
    setIsLoading(true);
    setError(null);
    const res = await authService.verifyOtp(req);
    if (res.error || !res.data) {
      setError(res.error ?? { code: "INVALID_OTP", message: "OTP verification failed." });
      setIsLoading(false);
      return;
    }
    applySession(res.data.user, res.data.token);
    setIsLoading(false);
  }, [applySession]);

  const resendOtp = useCallback(async (email: string): Promise<void> => {
    setError(null);
    const res = await authService.resendOtp(email);
    if (res.error) setError(res.error);
  }, []);

  // ─── 2FA ───────────────────────────────────────────────────────────────────
  const verify2fa = useCallback(async (req: TwoFactorVerifyRequest): Promise<void> => {
    setIsLoading(true);
    setError(null);
    const res = await authService.verify2fa(req);
    if (res.error || !res.data) {
      setError(res.error ?? { code: "INVALID_2FA_CODE", message: "2FA verification failed." });
      setIsLoading(false);
      return;
    }
    applySession(res.data.user, res.data.token);
    setIsLoading(false);
  }, [applySession]);

  const setup2fa = useCallback(async (): Promise<(TwoFactorSetupResponse & { otpauthUrl?: string }) | null> => {
    setIsLoading(true);
    setError(null);
    const res = await authService.setup2fa();
    setIsLoading(false);
    if (res.error) { setError(res.error); return null; }
    return res.data;
  }, []);

  const enable2fa = useCallback(async (code: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    const res = await authService.enable2fa(code);
    if (res.error) {
      setError(res.error);
    } else if (user && res.data) {
      setUser({ ...user, twoFactorEnabled: res.data.twoFactorEnabled });
    }
    setIsLoading(false);
  }, [user]);

  const disable2fa = useCallback(async (password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    const res = await authService.disable2fa(password);
    if (res.error) setError(res.error);
    else if (user) setUser({ ...user, twoFactorEnabled: false });
    setIsLoading(false);
  }, [user]);

  // ─── Profile ───────────────────────────────────────────────────────────────
  const updateProfile = useCallback(async (
    data: Partial<Pick<User, "name" | "phone" | "department" | "designation" | "profileImage">>,
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    const res = await authService.updateProfile(data);
    if (res.error) { setError(res.error); setIsLoading(false); return false; }
    if (res.data) setUser(res.data);
    setIsLoading(false);
    return true;
  }, []);

  const changePassword = useCallback(async (
    currentPassword: string,
    newPassword: string,
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    const res = await authService.changePassword(currentPassword, newPassword);
    if (res.error) {
      setError(res.error);
      setIsLoading(false);
      return false;
    }
    // Server cleared all sessions — log the user out locally too
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    setSessionStatus("unauthenticated");
    setIsLoading(false);
    return true;
  }, []);

  const deleteAccount = useCallback(async (password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    const res = await authService.deleteAccount(password);
    if (res.error) {
      setError(res.error);
      setIsLoading(false);
    } else {
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
      setSessionStatus("unauthenticated");
      setIsLoading(false);
    }
  }, []);

  // ─── Session ───────────────────────────────────────────────────────────────
  const refreshSession = useCallback(async (): Promise<void> => {
    const session = await authService.refreshSession();
    if (session) applySession(session.user, session.token);
    else { setSessionStatus("expired"); setIsAuthenticated(false); }
  }, [applySession]);

  const markSessionExpired = useCallback((): void => {
    setSessionStatus("expired");
    setIsAuthenticated(false);
  }, []);

  // ─── Utilities ────────────────────────────────────────────────────────────
  const clearError = useCallback(() => setError(null), []);

  const hasRole = useCallback((required: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    return authService.hasRole(user.role, required);
  }, [user]);

  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!user) return false;
    return authService.hasPermission(user.role, permission);
  }, [user]);

  // ─── Demo login (exposed so Login.tsx can call it) ─────────────────────────
  const loginDemo = useCallback((): void => {
    if (!DEMO_MODE) return;
    activateDemoSession();
    applySession(DEMO_USER, DEMO_TOKEN);
  }, [applySession]);

  // ─── Context value ─────────────────────────────────────────────────────────
  const value: AuthContextValue = {
    user, token, sessionStatus, flowState,
    isAuthenticated, isLoading, error,
    login, register, logout,
    forgotPassword, resetPassword,
    verifyEmail, resendVerificationEmail,
    verifyOtp, resendOtp,
    verify2fa, setup2fa, enable2fa, disable2fa,
    updateProfile, changePassword, deleteAccount,
    refreshSession, markSessionExpired,
    clearError, hasRole, hasPermission,
    // Demo-only — undefined in production builds after tree-shaking
    loginDemo: DEMO_MODE ? loginDemo : undefined,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

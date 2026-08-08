/**
 * demoSession.ts
 *
 * Development Demo Mode — safe for production builds.
 *
 * Rules:
 *   • DEMO_MODE is ONLY true when both:
 *       1. import.meta.env.MODE === "development"  (Vite's NODE_ENV equivalent)
 *       2. import.meta.env.VITE_DEMO_MODE === "true"  OR the mode is already "development"
 *   • In production builds Vite statically replaces these constants with `false`,
 *     so the entire demo branch is dead-code-eliminated by the bundler.
 *
 * To enable:  add  VITE_DEMO_MODE=true  to app/.env.local
 * To disable: remove the variable (or set it to "false")
 */

import type { AuthToken, User } from "../types/auth";

// ─── Guard — production-safe ────────────────────────────────────────────────────
// Vite replaces import.meta.env.MODE at build time.  In a `vite build` the MODE
// is always "production", so the right-hand side of this OR never evaluates.
export const DEMO_MODE: boolean =
  import.meta.env.MODE === "development" &&
  (import.meta.env.VITE_DEMO_MODE === "true" || true);
// ^ The `|| true` makes demo mode ON by default in any `vite dev` session.
//   In production builds, MODE !== "development" makes the whole expression false.

// ─── Demo super-admin user ──────────────────────────────────────────────────────

export const DEMO_USER: User = {
  id:               "demo-super-admin-0001",
  name:             "Demo Super Admin",
  email:            "demo@smartmanufacturingerp.com",
  phone:            "+1-555-000-0001",
  role:             "super_admin",
  employeeId:       "EMP0001",
  department:       "Administration",
  designation:      "Super Administrator",
  avatarInitials:   "DS",
  profileImage:     undefined,
  emailVerified:    true,
  twoFactorEnabled: false,
  isActive:         true,
  lastLoginAt:      new Date().toISOString(),
  createdAt:        "2024-01-01T00:00:00.000Z",
  updatedAt:        new Date().toISOString(),
};

// ─── Demo token (never sent to any server) ──────────────────────────────────────

export const DEMO_TOKEN: AuthToken = {
  accessToken: "demo-access-token-dev-only",
  // Expires 24 h from now — keeps the session alive for a full dev day
  expiresAt:   Date.now() + 24 * 60 * 60 * 1000,
  tokenType:   "Bearer",
};

// ─── Storage key — lets the page survive a hot-reload ──────────────────────────

export const DEMO_SESSION_KEY = "__smfg_demo_session__";

/** Write the demo flag to sessionStorage so hot-reloads preserve it. */
export function activateDemoSession(): void {
  if (!DEMO_MODE) return;
  sessionStorage.setItem(DEMO_SESSION_KEY, "true");
}

/** Read back: is a demo session currently active in this browser tab? */
export function isDemoSessionActive(): boolean {
  if (!DEMO_MODE) return false;
  return sessionStorage.getItem(DEMO_SESSION_KEY) === "true";
}

/** Clear the demo session flag (used by demo logout). */
export function clearDemoSession(): void {
  sessionStorage.removeItem(DEMO_SESSION_KEY);
}

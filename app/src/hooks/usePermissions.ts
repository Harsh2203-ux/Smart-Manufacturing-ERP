import { useAuth } from "./useAuth";
import type { Permission, UserRole } from "../types/auth";
import { ROLE_PERMISSIONS } from "../types/auth";

export function usePermissions() {
  const { hasRole, hasPermission, user } = useAuth();
  return {
    can:         (p: Permission): boolean         => hasPermission(p),
    isRole:      (r: UserRole | UserRole[]): boolean => hasRole(r),
    role:        user?.role ?? null,
    permissions: user ? ROLE_PERMISSIONS[user.role] : [],
  };
}

export type { Permission, UserRole };

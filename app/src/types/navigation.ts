import type { Permission, UserRole } from "./auth";

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  /** If set, item is hidden unless the user has at least one of these roles */
  requiredRoles?: UserRole[];
  /** If set, item is hidden unless the user has this permission */
  requiredPermission?: Permission;
}

export interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

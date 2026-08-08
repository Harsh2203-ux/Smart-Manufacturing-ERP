import type { NavItem } from "../../types";

// ─── SVG icons (inline, no external lib) ─────────────────────────────────────
// Each icon is a minimal 16×16 SVG path string.

function icon(paths: string[], viewBox = "0 0 20 20") {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">` +
    paths.map(d => `<path d="${d}"/>`).join("") +
    `</svg>`
  );
}

// We store icons as emoji-keyed objects so navItems.ts stays type-safe.
// In Sidebar.tsx we render them via dangerouslySetInnerHTML.

export type SidebarGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: SidebarGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard",           path: "/dashboard",                    icon: "grid",      requiredPermission: "dashboard:view"    },
    ],
  },
  {
    label: "Manufacturing",
    items: [
      { label: "Manufacturing Orders", path: "/dashboard/production",        icon: "factory",   requiredPermission: "production:view"   },
      { label: "Work Orders",          path: "/dashboard/work-orders",       icon: "tool",      requiredPermission: "production:view"   },
      { label: "Bill of Materials",    path: "/dashboard/bom",               icon: "layers",    requiredPermission: "production:view"   },
      { label: "Production Planning",  path: "/dashboard/planning",          icon: "calendar",  requiredPermission: "production:view"   },
    ],
  },
  {
    label: "Inventory & Warehouse",
    items: [
      { label: "Inventory",            path: "/dashboard/inventory",         icon: "box",       requiredPermission: "inventory:view"    },
      { label: "Products",             path: "/dashboard/products",          icon: "cube",      requiredPermission: "inventory:view"    },
      { label: "Warehouse",            path: "/dashboard/warehouse",         icon: "building",  requiredPermission: "inventory:view"    },
      { label: "Machines",             path: "/dashboard/machines",          icon: "gear",      requiredPermission: "maintenance:view"  },
    ],
  },
  {
    label: "Supply Chain",
    items: [
      { label: "Purchase",             path: "/dashboard/purchase",          icon: "cart",      requiredPermission: "orders:view"       },
      { label: "Suppliers",            path: "/dashboard/suppliers",         icon: "truck",     requiredPermission: "orders:view"       },
    ],
  },
  {
    label: "Sales & Customers",
    items: [
      { label: "Orders",               path: "/dashboard/orders",            icon: "orders",    requiredPermission: "orders:view"       },
      { label: "Customers",            path: "/dashboard/customers",         icon: "users",     requiredPermission: "orders:view"       },
    ],
  },
  {
    label: "HR",
    items: [
      { label: "Employees",            path: "/dashboard/employees",         icon: "person",    requiredPermission: "users:view"        },
      { label: "Attendance",           path: "/dashboard/attendance",        icon: "clock",     requiredPermission: "users:view"        },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Quality Control",      path: "/dashboard/quality",           icon: "check",     requiredPermission: "quality:view"      },
      { label: "Maintenance",          path: "/dashboard/maintenance",       icon: "wrench",    requiredPermission: "maintenance:view"  },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Reports",              path: "/dashboard/reports",           icon: "chart",     requiredPermission: "reports:view"      },
      { label: "Analytics",            path: "/dashboard/analytics",         icon: "analytics", requiredPermission: "reports:view"      },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Notifications",        path: "/dashboard/notifications",     icon: "bell",      requiredPermission: "dashboard:view"    },
      { label: "Settings",             path: "/dashboard/settings",          icon: "settings",  requiredPermission: "settings:view"     },
      { label: "Users",                path: "/dashboard/users",             icon: "team",      requiredPermission: "users:view"        },
    ],
  },
];

// Flat list for ProtectedRoute / old code that uses NAV_ITEMS
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

// ─── SVG path data keyed by icon name ────────────────────────────────────────
export const ICON_PATHS: Record<string, string[]> = {
  grid:       ["M3 3h6v6H3zM11 3h6v6h-6zM3 11h6v6H3zM11 11h6v6h-6z"],
  factory:    ["M2 17V9l6-4v4l5-4v12H2z","M13 17V9","M7 17v-4h3v4"],
  tool:       ["M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3-3a1 1 0 000-1.4l-1.6-1.6a1 1 0 00-1.4 0l-1 1L6 15l-4 1 1-4L14.7 6.3z"],
  layers:     ["M12 2L2 7l10 5 10-5-10-5z","M2 17l10 5 10-5","M2 12l10 5 10-5"],
  calendar:   ["M8 2v3M16 2v3M3 8h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"],
  box:        ["M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z","M3.27 6.96L12 12.01l8.73-5.05","M12 22.08V12"],
  cube:       ["M12 2l9 4.9V17L12 22 3 17V6.9L12 2z","M12 22V12","M21 7l-9 5-9-5"],
  building:   ["M3 20h18M6 20V10","M18 20V10","M12 20v-6","M8 14h8","M6 10l6-6 6 6"],
  gear:       ["M12 15a3 3 0 100-6 3 3 0 000 6z","M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"],
  cart:       ["M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z","M3 6h18","M16 10a4 4 0 01-8 0"],
  truck:      ["M1 3h15v13H1z","M16 8h4l3 3v5h-7V8z","M5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z","M18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"],
  orders:     ["M9 11l3 3L22 4","M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"],
  users:      ["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2","M9 11a4 4 0 100-8 4 4 0 000 8z","M23 21v-2a4 4 0 00-3-3.87","M16 3.13a4 4 0 010 7.75"],
  person:     ["M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2","M12 11a4 4 0 100-8 4 4 0 000 8z"],
  clock:      ["M12 22a10 10 0 100-20 10 10 0 000 20z","M12 6v6l4 2"],
  check:      ["M22 11.08V12a10 10 0 11-5.93-9.14","M22 4L12 14.01l-3-3"],
  wrench:     ["M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3-3a1 1 0 000-1.4l-1.6-1.6a1 1 0 00-1.4 0l-1 1L6 15l-4 1 1-4L14.7 6.3z"],
  chart:      ["M18 20V10","M12 20V4","M6 20v-6"],
  analytics:  ["M21 21H3","M21 3v18","M7 16l4-8 4 4 4-6"],
  bell:       ["M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9","M13.73 21a2 2 0 01-3.46 0"],
  settings:   ["M12 15a3 3 0 100-6 3 3 0 000 6z","M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"],
  team:       ["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2","M9 11a4 4 0 100-8 4 4 0 000 8z","M23 21v-2a4 4 0 00-3-3.87","M16 3.13a4 4 0 010 7.75"],
  profile:    ["M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2","M12 11a4 4 0 100-8 4 4 0 000 8z"],
  logout:     ["M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4","M16 17l5-5-5-5","M21 12H9"],
};

export function renderIcon(name: string): string {
  const paths = ICON_PATHS[name] ?? ICON_PATHS["grid"];
  return icon(paths);
}

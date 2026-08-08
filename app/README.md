# Smart Manufacturing ERP

Enterprise resource planning application for modern production and manufacturing facilities.

Built with **React 19**, **TypeScript**, **Vite**, and **React Router v7**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI framework | React 19 (functional components, hooks) |
| Language | TypeScript 6 — strict mode |
| Build tool | Vite 8 |
| Routing | React Router v7 |
| Styling | CSS custom properties (design tokens) + inline styles |
| Typography | Inter variable font |
| Auth | Mocked API layer — drop-in replaceable with real backend |

---

## Project Structure

```
src/
├── api/            # API client + mocked endpoint functions
│   ├── client.ts       Simulated HTTP transport (swap for fetch/axios)
│   └── authApi.ts      Auth endpoint mocks (login, logout, me, refresh)
├── components/
│   ├── Sidebar/        Collapsible, permission-filtered navigation
│   └── TopBar/         Top navigation bar with user info + logout
├── context/
│   └── AuthContext.tsx Global auth state provider
├── hooks/
│   ├── useAuth.ts       Typed context accessor
│   ├── usePermissions.ts Role/permission helper hook
│   └── useSidebar.ts    Sidebar collapse state
├── layouts/
│   ├── AuthLayout.tsx   Public page wrapper
│   └── DashboardLayout.tsx  Authenticated shell (sidebar + topbar + footer)
├── pages/
│   ├── Login.tsx        Sign-in page
│   ├── Dashboard.tsx    Main overview page
│   └── Unauthorized.tsx 403 access-denied page
├── routes/
│   ├── AppRoutes.tsx    Route configuration
│   └── ProtectedRoute.tsx  Auth + role guard
├── services/
│   └── authService.ts   Session management, token expiry, permission checks
├── types/
│   ├── auth.ts          User, UserRole, Permission, AuthToken, ApiResponse …
│   ├── navigation.ts    NavItem, SidebarProps
│   └── index.ts         Barrel export
└── utils/
    └── helpers.ts       formatDate, capitalize, classNames
```

---

## Roles & Permissions

| Role | Access |
|---|---|
| **Admin** | Full access — all modules + Settings + Users |
| **Manager** | Production, Inventory, Orders, Quality, Maintenance, Reports, Settings (view) |
| **Operator** | Production (view/create), Inventory (view), Orders (view), Quality (view), Maintenance |

Permissions are defined in [`src/types/auth.ts`](src/types/auth.ts) as a typed union and resolved via the `ROLE_PERMISSIONS` matrix. Components use `usePermissions().can("permission:action")` — never raw role strings.

---

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@erp.com | admin123 |
| Manager | manager@erp.com | manager123 |
| Operator | operator@erp.com | operator123 |

---

## Development

```bash
cd app
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

---

© 2026 Smart Manufacturing ERP

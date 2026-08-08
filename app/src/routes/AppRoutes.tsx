import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// ── Auth pages ────────────────────────────────────────────────────────────────
import Login           from "../pages/Login";
import CreateAccount   from "../pages/CreateAccount";
import ForgotPassword  from "../pages/ForgotPassword";
import ResetPassword   from "../pages/ResetPassword";
import VerifyEmail     from "../pages/VerifyEmail";
import OtpVerification from "../pages/OtpVerification";
import TwoFactorAuth   from "../pages/TwoFactorAuth";
import ProfileSettings from "../pages/ProfileSettings";
import ChangePassword  from "../pages/ChangePassword";
import TwoFactorSetup  from "../pages/TwoFactorSetup";
import SessionExpired  from "../pages/SessionExpired";
import Unauthorized    from "../pages/Unauthorized";

// ── ERP module pages ──────────────────────────────────────────────────────────
import Dashboard          from "../pages/Dashboard";
import Production         from "../pages/Production";
import WorkOrders         from "../pages/WorkOrders";
import BillOfMaterials    from "../pages/BillOfMaterials";
import ProductionPlanning from "../pages/ProductionPlanning";
import Inventory          from "../pages/Inventory";
import Products           from "../pages/Products";
import Warehouse          from "../pages/Warehouse";
import Machines           from "../pages/Machines";
import Orders             from "../pages/Orders";
import Purchase           from "../pages/Purchase";
import Suppliers          from "../pages/Suppliers";
import Customers          from "../pages/Customers";
import Quality            from "../pages/Quality";
import Maintenance        from "../pages/Maintenance";
import Employees          from "../pages/Employees";
import Attendance         from "../pages/Attendance";
import Reports            from "../pages/Reports";
import Analytics          from "../pages/Analytics";
import Notifications      from "../pages/Notifications";
import Settings           from "../pages/Settings";
import Users              from "../pages/Users";

// ── Layouts & Guards ──────────────────────────────────────────────────────────
import DashboardLayout from "../layouts/DashboardLayout";
import ProtectedRoute  from "./ProtectedRoute";
import type { UserRole } from "../types/auth";

// ─── Helper: wrap every protected ERP page in layout + guard ─────────────────

interface ERPRouteProps {
  element: React.ReactElement;
  requiredRoles?: UserRole[];
}

function ERPRoute({ element, requiredRoles }: ERPRouteProps) {
  return (
    <ProtectedRoute requiredRoles={requiredRoles}>
      <DashboardLayout>{element}</DashboardLayout>
    </ProtectedRoute>
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Public auth routes ────────────────────────────────────────── */}
        <Route path="/login"           element={<Login />} />
        <Route path="/register"        element={<CreateAccount />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />
        <Route path="/verify-email"    element={<VerifyEmail />} />
        <Route path="/otp"             element={<OtpVerification />} />
        <Route path="/2fa"             element={<TwoFactorAuth />} />

        {/* ── Status pages (always public) ─────────────────────────────── */}
        <Route path="/session-expired" element={<SessionExpired />} />
        <Route path="/unauthorized"    element={<Unauthorized />} />

        {/* ── Protected auth utility pages (inside dashboard layout) ───── */}
        <Route path="/profile"         element={<ERPRoute element={<ProfileSettings />} />} />
        <Route path="/change-password" element={<ERPRoute element={<ChangePassword />} />} />
        <Route path="/2fa-setup"       element={<ERPRoute element={<TwoFactorSetup />} />} />

        {/* ── Protected ERP routes ─────────────────────────────────────── */}

        {/* Any authenticated user */}
        <Route path="/dashboard"                element={<ERPRoute element={<Dashboard />}          />} />

        {/* Manufacturing */}
        <Route path="/dashboard/production"     element={<ERPRoute element={<Production />}         />} />
        <Route path="/dashboard/work-orders"    element={<ERPRoute element={<WorkOrders />}         />} />
        <Route path="/dashboard/bom"            element={<ERPRoute element={<BillOfMaterials />}    />} />
        <Route path="/dashboard/planning"       element={<ERPRoute element={<ProductionPlanning />} />} />

        {/* Inventory & Warehouse */}
        <Route path="/dashboard/inventory"      element={<ERPRoute element={<Inventory />}          />} />
        <Route path="/dashboard/products"       element={<ERPRoute element={<Products />}           />} />
        <Route path="/dashboard/warehouse"      element={<ERPRoute element={<Warehouse />}          />} />
        <Route path="/dashboard/machines"       element={<ERPRoute element={<Machines />}           />} />

        {/* Supply Chain */}
        <Route path="/dashboard/purchase"       element={<ERPRoute element={<Purchase />}           />} />
        <Route path="/dashboard/suppliers"      element={<ERPRoute element={<Suppliers />}          />} />

        {/* Sales & Customers */}
        <Route path="/dashboard/orders"         element={<ERPRoute element={<Orders />}             />} />
        <Route path="/dashboard/customers"      element={<ERPRoute element={<Customers />}          />} />

        {/* Operations */}
        <Route path="/dashboard/quality"        element={<ERPRoute element={<Quality />}            />} />
        <Route path="/dashboard/maintenance"    element={<ERPRoute element={<Maintenance />}        />} />

        {/* HR */}
        <Route path="/dashboard/employees"      element={<ERPRoute element={<Employees />}          />} />
        <Route path="/dashboard/attendance"     element={<ERPRoute element={<Attendance />}         />} />

        {/* Intelligence */}
        <Route path="/dashboard/reports"        element={<ERPRoute element={<Reports />}            />} />
        <Route path="/dashboard/analytics"      element={<ERPRoute element={<Analytics />}          />} />

        {/* System */}
        <Route path="/dashboard/notifications"  element={<ERPRoute element={<Notifications />}      />} />

        {/* Admin / manager roles only */}
        <Route
          path="/dashboard/settings"
          element={
            <ERPRoute
              element={<Settings />}
              requiredRoles={["super_admin", "admin", "hr_manager", "finance_manager"]}
            />
          }
        />

        {/* Admin only */}
        <Route
          path="/dashboard/users"
          element={
            <ERPRoute
              element={<Users />}
              requiredRoles={["super_admin", "admin", "hr_manager"]}
            />
          }
        />

        {/* ── Default redirects ─────────────────────────────────────────── */}
        <Route path="/"  element={<Navigate to="/dashboard" replace />} />
        <Route path="*"  element={<Navigate to="/dashboard" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

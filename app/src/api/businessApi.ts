/**
 * api/businessApi.ts
 * API layer for Suppliers, Customers, Purchase Orders, Employees,
 * Notifications, Reports, Settings.
 */

import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "./client";

// ── Helper ────────────────────────────────────────────────────────────────────

function toList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const d = data as Record<string, unknown> | null;
  if (d && Array.isArray(d.items)) return d.items as T[];
  return [];
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SupplierRecord {
  _id: string;
  code: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: { street?: string; city?: string; country?: string };
  category: string;
  paymentTerms: string;
  leadTimeDays: number;
  rating: number;
  isActive: boolean;
  isPreferred: boolean;
  createdAt: string;
}

export interface CustomerRecord {
  _id: string;
  customerNumber: string;
  name: string;
  type: "individual" | "business";
  contactPerson: string;
  email: string;
  phone: string;
  address: { street?: string; city?: string; country?: string };
  industry: string;
  creditLimit: number;
  paymentTerms: string;
  currency: string;
  isActive: boolean;
  isVip: boolean;
  createdAt: string;
}

export interface OrderItem {
  product: string;
  sku?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  tax?: number;
  total?: number;
}

export interface OrderRecord {
  _id: string;
  orderNumber: string;
  type: "sales" | "purchase" | "internal";
  status: string;
  customer?: { _id: string; name: string } | string | null;
  supplier?: { _id: string; name: string; code: string } | string | null;
  items: OrderItem[];
  subtotal: number;
  total: number;
  currency: string;
  orderDate: string;
  dueDate?: string;
  notes?: string;
  createdAt: string;
}

export interface EmployeeRecord {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  hireDate: string;
  status: "active" | "on_leave" | "terminated" | "probation";
  shift?: string;
  manager?: { _id: string; firstName: string; lastName: string } | string | null;
  createdAt: string;
}

export interface NotificationRecord {
  _id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  readAt?: string;
  link?: string;
  priority?: string;
  createdAt: string;
}

export interface ReportRecord {
  _id: string;
  title: string;
  type: string;
  status: "pending" | "running" | "completed" | "failed";
  format?: string;
  result?: unknown;
  errorMessage?: string;
  generatedAt?: string;
  createdAt: string;
}

export interface DashboardStats {
  orders: Array<{ _id: string; count: number; total: number }>;
  inventory: { totalItems: number; lowStock: number } | null;
  production: number;
  machines: Array<{ _id: string; count: number }>;
  employees: number;
}

// ── Suppliers ─────────────────────────────────────────────────────────────────

export const suppliersApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiGet<SupplierRecord[]>(`/suppliers${qs}`).then((r) => ({
      ...r,
      data: toList<SupplierRecord>(r.data),
    }));
  },
  get: (id: string) => apiGet<SupplierRecord>(`/suppliers/${id}`),
  create: (body: Partial<SupplierRecord> & Record<string, unknown>) =>
    apiPost<SupplierRecord>("/suppliers", body),
  update: (id: string, body: Partial<SupplierRecord> & Record<string, unknown>) =>
    apiPut<SupplierRecord>(`/suppliers/${id}`, body),
  delete: (id: string) => apiDelete<void>(`/suppliers/${id}`),
};

// ── Customers ─────────────────────────────────────────────────────────────────

export const customersApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiGet<CustomerRecord[]>(`/customers${qs}`).then((r) => ({
      ...r,
      data: toList<CustomerRecord>(r.data),
    }));
  },
  get: (id: string) => apiGet<CustomerRecord>(`/customers/${id}`),
  create: (body: Partial<CustomerRecord> & Record<string, unknown>) =>
    apiPost<CustomerRecord>("/customers", body),
  update: (id: string, body: Partial<CustomerRecord> & Record<string, unknown>) =>
    apiPut<CustomerRecord>(`/customers/${id}`, body),
  delete: (id: string) => apiDelete<void>(`/customers/${id}`),
};

// ── Orders (Purchase / Sales) ─────────────────────────────────────────────────

export const ordersApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiGet<OrderRecord[]>(`/orders${qs}`).then((r) => ({
      ...r,
      data: toList<OrderRecord>(r.data),
    }));
  },
  get: (id: string) => apiGet<OrderRecord>(`/orders/${id}`),
  create: (body: Partial<OrderRecord> & Record<string, unknown>) =>
    apiPost<OrderRecord>("/orders", body),
  update: (id: string, body: Partial<OrderRecord> & Record<string, unknown>) =>
    apiPut<OrderRecord>(`/orders/${id}`, body),
  updateStatus: (id: string, status: string) =>
    apiPatch<OrderRecord>(`/orders/${id}/status`, { status }),
  delete: (id: string) => apiDelete<void>(`/orders/${id}`),
};

// ── Employees ─────────────────────────────────────────────────────────────────

export const employeesApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiGet<EmployeeRecord[]>(`/employees${qs}`).then((r) => ({
      ...r,
      data: toList<EmployeeRecord>(r.data),
    }));
  },
  get: (id: string) => apiGet<EmployeeRecord>(`/employees/${id}`),
  create: (body: Partial<EmployeeRecord> & Record<string, unknown>) =>
    apiPost<EmployeeRecord>("/employees", body),
  update: (id: string, body: Partial<EmployeeRecord> & Record<string, unknown>) =>
    apiPut<EmployeeRecord>(`/employees/${id}`, body),
  delete: (id: string) => apiDelete<void>(`/employees/${id}`),
  departments: () => apiGet<string[]>("/employees/departments"),
};

// ── Notifications ─────────────────────────────────────────────────────────────

export const notificationsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiGet<NotificationRecord[]>(`/notifications${qs}`).then((r) => ({
      ...r,
      data: toList<NotificationRecord>(r.data),
    }));
  },
  unreadCount: () => apiGet<{ count: number }>("/notifications/unread-count"),
  markRead: (id: string) => apiPatch<NotificationRecord>(`/notifications/${id}/read`),
  markAllRead: () => apiPatch<void>("/notifications/read-all"),
  delete: (id: string) => apiDelete<void>(`/notifications/${id}`),
};

// ── Reports ───────────────────────────────────────────────────────────────────

export const reportsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiGet<ReportRecord[]>(`/reports${qs}`).then((r) => ({
      ...r,
      data: toList<ReportRecord>(r.data),
    }));
  },
  get: (id: string) => apiGet<ReportRecord>(`/reports/${id}`),
  create: (body: { title: string; type: string; format?: string; parameters?: Record<string, string> }) =>
    apiPost<ReportRecord>("/reports", body),
  delete: (id: string) => apiDelete<void>(`/reports/${id}`),
  dashboard: () => apiGet<DashboardStats>("/reports/dashboard"),
};

// ── Settings ──────────────────────────────────────────────────────────────────

export const settingsApi = {
  getAll: () => apiGet<Record<string, unknown>>("/settings"),
  bulkUpdate: (settings: Array<{ key: string; value: unknown }>) =>
    apiPatch<unknown[]>("/settings/bulk", { settings }),
};

// ── Quality Checks ────────────────────────────────────────────────────────────

export interface QualityCheckRecord {
  _id: string;
  checkNumber: string;
  batch: string;
  product?: { _id: string; name: string; sku: string } | string | null;
  productName: string;
  line: string;
  inspector: string;
  sampleSize: number;
  defects: number;
  defectRate: number;
  result: "Pass" | "Fail" | "Conditional Pass" | "Under Review";
  notes: string;
  inspectedAt: string;
  createdAt: string;
}

export interface MaintenanceTaskRecord {
  _id: string;
  taskNumber: string;
  asset: string;
  machine?: { _id: string; name: string; machineId: string } | string | null;
  assetId: string;
  type: "Preventive" | "Corrective" | "Predictive" | "Emergency";
  priority: "Critical" | "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Completed" | "Overdue";
  assignedTo: string;
  scheduledDate: string;
  completedDate?: string | null;
  estimatedHours: number;
  description: string;
  notes: string;
  createdAt: string;
}

export const qualityApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiGet<QualityCheckRecord[]>(`/quality${qs}`).then((r) => ({
      ...r,
      data: toList<QualityCheckRecord>(r.data),
    }));
  },
  get: (id: string) => apiGet<QualityCheckRecord>(`/quality/${id}`),
  create: (body: Partial<QualityCheckRecord> & Record<string, unknown>) =>
    apiPost<QualityCheckRecord>("/quality", body),
  update: (id: string, body: Partial<QualityCheckRecord> & Record<string, unknown>) =>
    apiPut<QualityCheckRecord>(`/quality/${id}`, body),
  delete: (id: string) => apiDelete<void>(`/quality/${id}`),
};

export const maintenanceApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiGet<MaintenanceTaskRecord[]>(`/maintenance${qs}`).then((r) => ({
      ...r,
      data: toList<MaintenanceTaskRecord>(r.data),
    }));
  },
  get: (id: string) => apiGet<MaintenanceTaskRecord>(`/maintenance/${id}`),
  create: (body: Partial<MaintenanceTaskRecord> & Record<string, unknown>) =>
    apiPost<MaintenanceTaskRecord>("/maintenance", body),
  update: (id: string, body: Partial<MaintenanceTaskRecord> & Record<string, unknown>) =>
    apiPut<MaintenanceTaskRecord>(`/maintenance/${id}`, body),
  delete: (id: string) => apiDelete<void>(`/maintenance/${id}`),
};

// ── Attendance ─────────────────────────────────────────────────────────────────

export interface AttendanceRecord {
  _id: string;
  attendanceId: string;
  employee: string | { _id: string; firstName: string; lastName: string; employeeId: string; department: string } | null;
  employeeId: string;
  employeeName: string;
  department: string;
  date: string;
  shift: "Morning" | "Afternoon" | "Night" | "General";
  scheduledIn: string;
  scheduledOut: string;
  actualIn: string;
  actualOut: string;
  hoursWorked: number;
  overtime: number;
  status: "Present" | "Absent" | "Late" | "Half Day" | "On Leave" | "Holiday" | "Weekend";
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  onLeave: number;
  totalOT: number;
  totalHours: number;
}

export const attendanceApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiGet<AttendanceRecord[]>(`/attendance${qs}`).then((r) => ({
      ...r,
      data: toList<AttendanceRecord>(r.data),
    }));
  },
  summary: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiGet<AttendanceSummary>(`/attendance/summary${qs}`);
  },
  departments: () => apiGet<string[]>("/attendance/departments"),
  get: (id: string) => apiGet<AttendanceRecord>(`/attendance/${id}`),
  create: (body: Partial<AttendanceRecord> & Record<string, unknown>) =>
    apiPost<AttendanceRecord>("/attendance", body),
  update: (id: string, body: Partial<AttendanceRecord> & Record<string, unknown>) =>
    apiPut<AttendanceRecord>(`/attendance/${id}`, body),
  delete: (id: string) => apiDelete<void>(`/attendance/${id}`),
};

// ── Analytics ──────────────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  revenue:          { value: number; prev: number; trend: number | null };
  productionOutput: { value: number; prev: number; trend: number | null };
  onTimeDelivery:   { value: number | null; ordersTotal: number };
  oee:              { value: number | null };
  defectRate:       { value: number | null };
  avgLeadTime:      { value: number | null };
}

export interface AnalyticsLinePoint {
  _id: string;
  checks?: number;
  totalSample?: number;
  totalDefects?: number;
  total?: number;
  passed?: number;
  passRate?: number;
  avgDefect?: number;
}

export interface AnalyticsOrderStatus {
  _id: string;
  count: number;
}

export interface AnalyticsBottomCards {
  topProduct:     string | null;
  topCustomer:    string | null;
  topSupplier:    string | null;
  openWorkOrders: number;
  scheduledPM:    number;
  posPending:     number;
}

export const analyticsApi = {
  summary:           () => apiGet<AnalyticsSummary>("/analytics/summary"),
  productionByLine:  () => apiGet<AnalyticsLinePoint[]>("/analytics/production-by-line"),
  qualityByLine:     () => apiGet<AnalyticsLinePoint[]>("/analytics/quality-by-line"),
  orderStatus:       () => apiGet<AnalyticsOrderStatus[]>("/analytics/order-status"),
  bottomCards:       () => apiGet<AnalyticsBottomCards>("/analytics/bottom-cards"),
};

// ─── KPI Card ──────────────────────────────────────────────────────────────────
export interface KpiCard {
  id: string;
  label: string;
  value: string;
  sub?: string;
  delta: string;
  deltaPositive: boolean;
  icon: string; // SVG path name key
  accent: string;
  sparkData?: number[];
  unit?: string;
}

// ─── Chart Point ──────────────────────────────────────────────────────────────
export interface ChartPoint {
  label: string;
  value: number;
  value2?: number; // for dual-series
}

// ─── Manufacturing Order ──────────────────────────────────────────────────────
export type OrderStatus = "Planned" | "In Progress" | "Completed" | "On Hold" | "Cancelled";

export interface ManufacturingOrder {
  id: string;
  product: string;
  qty: number;
  unit: string;
  status: OrderStatus;
  dueDate: string;
  assignedLine: string;
  priority: "High" | "Medium" | "Low";
  progress?: number; // 0–100
}

// ─── Inventory Transaction ────────────────────────────────────────────────────
export type TxnType = "Receipt" | "Issue" | "Transfer" | "Adjustment";

export interface InventoryTransaction {
  id: string;
  item: string;
  sku: string;
  type: TxnType;
  qty: number;
  unit: string;
  warehouse: string;
  date: string;
  value?: string;
}

// ─── Purchase Order ───────────────────────────────────────────────────────────
export type PoStatus = "Draft" | "Confirmed" | "Received" | "Cancelled";

export interface PurchaseOrder {
  id: string;
  supplier: string;
  items: number;
  amount: string;
  status: PoStatus;
  date: string;
  deliveryDate: string;
}

// ─── Sales Order ─────────────────────────────────────────────────────────────
export type SoStatus = "New" | "Processing" | "Shipped" | "Delivered" | "Cancelled";

export interface SalesOrder {
  id: string;
  customer: string;
  amount: string;
  status: SoStatus;
  date: string;
  region: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────
export type NotifLevel = "info" | "warning" | "error" | "success";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  level: NotifLevel;
  time: string;
  read: boolean;
  module: string;
}

// ─── Quick Action ─────────────────────────────────────────────────────────────
export interface QuickAction {
  id: string;
  label: string;
  icon: string;    // SVG icon key
  accent: string;
  description: string;
  path?: string;
}

// ─── Machine Status ───────────────────────────────────────────────────────────
export type MachineState = "Running" | "Idle" | "Maintenance" | "Fault";

export interface MachineStatus {
  id: string;
  name: string;
  type: string;
  state: MachineState;
  utilization: number;  // 0–100
  uptime: string;
  lastMaintenance: string;
  operator: string;
}

// ─── Production Efficiency ────────────────────────────────────────────────────
export interface ProductionLine {
  line: string;
  target: number;
  actual: number;
  efficiency: number; // 0–100
  scrapRate: number;  // 0–100
  oee: number;        // Overall Equipment Effectiveness 0–100
}

// ─── Right Panel ─────────────────────────────────────────────────────────────
export interface MaintenanceItem {
  machine: string;
  type: string;
  due: string;
  urgency: "Overdue" | "Due Soon" | "Scheduled";
  assignedTo: string;
  estimatedHours: number;
}

export interface ScheduleItem {
  time: string;
  event: string;
  location: string;
  type: "meeting" | "production" | "maintenance" | "review";
  attendees?: number;
}

export interface PendingApproval {
  id: string;
  type: string;
  requestedBy: string;
  amount?: string;
  priority: "High" | "Medium" | "Low";
  submittedAt: string;
}

export interface SystemHealthItem {
  service: string;
  status: "Operational" | "Degraded" | "Down";
  uptime: string;
  responseTime?: string;
}

// ─── Donut / Horizontal bar segment ──────────────────────────────────────────
export interface ChartSegment {
  label: string;
  value: number;
  color: string;
}

/**
 * api/manufacturingApi.ts
 * Unified API layer for all manufacturing + inventory modules.
 */

import { apiGet, apiPost, apiPut, apiDelete } from "./client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WorkOrderRecord {
  _id: string;
  workOrderNumber: string;
  product: { _id: string; name: string; sku: string } | string | null;
  machine?: { _id: string; name: string; machineId: string } | string | null;
  assignedTo?: { _id: string; firstName: string; lastName: string; employeeId: string } | string | null;
  status: string;
  priority: string;
  quantityPlanned: number;
  quantityProduced: number;
  quantityRejected: number;
  unit: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  progress?: number;
  notes: string;
  createdAt: string;
}

export interface ProductRecord {
  _id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  reorderPoint: number;
  safetyStock: number;
  leadTimeDays: number;
  isActive: boolean;
  isRawMaterial: boolean;
  supplier?: { _id: string; name: string; code: string } | null;
  notes: string;
  createdAt: string;
}

export interface InventoryItem {
  _id: string;
  product: { _id: string; name: string; sku: string; unit: string; reorderPoint: number } | null;
  warehouse: string;
  location: string;
  quantity: number;
  reservedQty: number;
  availableQty: number;
  unit: string;
  updatedAt: string;
}

export interface MachineRecord {
  _id: string;
  machineId: string;
  name: string;
  type: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  location: string;
  status: "operational" | "idle" | "maintenance" | "breakdown" | "decommissioned";
  purchaseDate?: string;
  purchaseCost: number;
  capacityPerHour: number;
  unit: string;
  oeeTarget: number;
  nextMaintenanceDate?: string;
  lastMaintenanceDate?: string;
  totalDowntimeHours: number;
  isActive: boolean;
  notes: string;
  createdAt: string;
}

export interface BOMRecord {
  _id: string;
  product: { _id: string; name: string; sku: string; category: string } | string | null;
  version: string;
  type: string;
  status: string;
  components: Array<{
    _id: string;
    product: { _id: string; name: string; sku: string; unit: string } | null;
    quantity: number;
    unit: string;
    notes: string;
  }>;
  totalCost: number;
  notes: string;
  createdBy?: { name: string } | null;
  createdAt: string;
}

export interface WarehouseRecord {
  _id: string;
  code: string;
  name: string;
  zone: string;
  type: string;
  aisles: number;
  racks: number;
  totalSlots: number;
  usedSlots: number;
  manager: string;
  temperature: string;
  status: string;
  isActive: boolean;
  notes: string;
  createdAt: string;
}

export interface ProductionPlanRecord {
  _id: string;
  planNumber: string;
  product: { _id: string; name: string; sku: string } | string | null;
  plannedQty: number;
  confirmedQty: number;
  startDate: string;
  endDate: string;
  productionLine: string;
  planner: string;
  status: string;
  priority: string;
  source: string;
  notes: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

// ── Helper to unwrap paginated list response ──────────────────────────────────

function toList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const d = data as Record<string, unknown> | null;
  if (d && Array.isArray(d.items)) return d.items as T[];
  return [];
}

// ── Work Orders / Manufacturing Orders ────────────────────────────────────────

export const workOrdersApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiGet<WorkOrderRecord[]>(`/production${qs}`).then((r) => ({
      ...r,
      data: toList<WorkOrderRecord>(r.data),
    }));
  },
  get: (id: string) => apiGet<WorkOrderRecord>(`/production/${id}`),
  create: (body: Partial<WorkOrderRecord> & Record<string, unknown>) =>
    apiPost<WorkOrderRecord>("/production", body),
  update: (id: string, body: Partial<WorkOrderRecord> & Record<string, unknown>) =>
    apiPut<WorkOrderRecord>(`/production/${id}`, body),
  updateStatus: (id: string, body: { status: string; quantityProduced?: number; notes?: string }) =>
    apiPut<WorkOrderRecord>(`/production/${id}/status`, body),
  delete: (id: string) => apiDelete<void>(`/production/${id}`),
};

// ── Products ──────────────────────────────────────────────────────────────────

export const productsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiGet<ProductRecord[]>(`/products${qs}`).then((r) => ({
      ...r,
      data: toList<ProductRecord>(r.data),
    }));
  },
  get: (id: string) => apiGet<ProductRecord>(`/products/${id}`),
  create: (body: Partial<ProductRecord> & Record<string, unknown>) =>
    apiPost<ProductRecord>("/products", body),
  update: (id: string, body: Partial<ProductRecord> & Record<string, unknown>) =>
    apiPut<ProductRecord>(`/products/${id}`, body),
  delete: (id: string) => apiDelete<void>(`/products/${id}`),
  categories: () => apiGet<string[]>("/products/categories"),
};

// ── Inventory ─────────────────────────────────────────────────────────────────

export const inventoryApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiGet<InventoryItem[]>(`/inventory${qs}`).then((r) => ({
      ...r,
      data: toList<InventoryItem>(r.data),
    }));
  },
  get: (id: string) => apiGet<InventoryItem>(`/inventory/${id}`),
  adjust: (body: {
    productId: string;
    warehouse?: string;
    quantity: number;
    type: "receipt" | "issue" | "adjustment" | "transfer" | "return" | "scrap";
    reference?: string;
    notes?: string;
  }) => apiPost<InventoryItem>("/inventory/adjust", body),
  lowStock: () => apiGet<InventoryItem[]>("/inventory/low-stock"),
  transactions: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiGet<unknown[]>(`/inventory/transactions${qs}`);
  },
};

// ── Machines ──────────────────────────────────────────────────────────────────

export const machinesApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiGet<MachineRecord[]>(`/machines${qs}`).then((r) => ({
      ...r,
      data: toList<MachineRecord>(r.data),
    }));
  },
  get: (id: string) => apiGet<MachineRecord>(`/machines/${id}`),
  create: (body: Partial<MachineRecord> & Record<string, unknown>) =>
    apiPost<MachineRecord>("/machines", body),
  update: (id: string, body: Partial<MachineRecord> & Record<string, unknown>) =>
    apiPut<MachineRecord>(`/machines/${id}`, body),
  delete: (id: string) => apiDelete<void>(`/machines/${id}`),
};

// ── BOM ───────────────────────────────────────────────────────────────────────

export const bomApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiGet<BOMRecord[]>(`/bom${qs}`).then((r) => ({
      ...r,
      data: toList<BOMRecord>(r.data),
    }));
  },
  get: (id: string) => apiGet<BOMRecord>(`/bom/${id}`),
  create: (body: Partial<BOMRecord> & Record<string, unknown>) =>
    apiPost<BOMRecord>("/bom", body),
  update: (id: string, body: Partial<BOMRecord> & Record<string, unknown>) =>
    apiPut<BOMRecord>(`/bom/${id}`, body),
  delete: (id: string) => apiDelete<void>(`/bom/${id}`),
};

// ── Warehouse ─────────────────────────────────────────────────────────────────

export const warehouseApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiGet<WarehouseRecord[]>(`/warehouse${qs}`).then((r) => ({
      ...r,
      data: toList<WarehouseRecord>(r.data),
    }));
  },
  get: (id: string) => apiGet<WarehouseRecord>(`/warehouse/${id}`),
  create: (body: Partial<WarehouseRecord> & Record<string, unknown>) =>
    apiPost<WarehouseRecord>("/warehouse", body),
  update: (id: string, body: Partial<WarehouseRecord> & Record<string, unknown>) =>
    apiPut<WarehouseRecord>(`/warehouse/${id}`, body),
  delete: (id: string) => apiDelete<void>(`/warehouse/${id}`),
};

// ── Production Planning ───────────────────────────────────────────────────────

export const planningApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiGet<ProductionPlanRecord[]>(`/planning${qs}`).then((r) => ({
      ...r,
      data: toList<ProductionPlanRecord>(r.data),
    }));
  },
  get: (id: string) => apiGet<ProductionPlanRecord>(`/planning/${id}`),
  create: (body: Partial<ProductionPlanRecord> & Record<string, unknown>) =>
    apiPost<ProductionPlanRecord>("/planning", body),
  update: (id: string, body: Partial<ProductionPlanRecord> & Record<string, unknown>) =>
    apiPut<ProductionPlanRecord>(`/planning/${id}`, body),
  delete: (id: string) => apiDelete<void>(`/planning/${id}`),
};

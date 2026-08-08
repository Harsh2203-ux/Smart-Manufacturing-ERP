import type {
  KpiCard,
  ChartPoint,
  ManufacturingOrder,
  InventoryTransaction,
  PurchaseOrder,
  SalesOrder,
  AppNotification,
  QuickAction,
  MaintenanceItem,
  ScheduleItem,
  PendingApproval,
  SystemHealthItem,
  MachineStatus,
  ProductionLine,
  ChartSegment,
} from "../types/dashboard";

// ─── KPI Cards ────────────────────────────────────────────────────────────────
export const KPI_CARDS: KpiCard[] = [
  {
    id: "production",   label: "Today's Production",    value: "4,820",  sub: "units",
    delta: "+8.3%",     deltaPositive: true,  icon: "factory",
    accent: "#3b82f6",  sparkData: [38,42,40,55,48,60,58,65,62,70,68,75],
  },
  {
    id: "mfg-orders",   label: "Pending Mfg Orders",    value: "37",
    delta: "-4 today",  deltaPositive: true,  icon: "orders",
    accent: "#8b5cf6",  sparkData: [45,42,48,41,37,35,32,30,35,38,36,37],
  },
  {
    id: "inv-value",    label: "Inventory Value",        value: "$2.84M",
    delta: "+$120K",    deltaPositive: true,  icon: "box",
    accent: "#10b981",  sparkData: [260,265,272,268,275,280,283,278,282,284,286,284],
  },
  {
    id: "low-stock",    label: "Low Stock Items",        value: "14",     sub: "need reorder",
    delta: "+3 new",    deltaPositive: false, icon: "warning",
    accent: "#f59e0b",  sparkData: [8,9,10,11,9,10,11,12,11,13,14,14],
  },
  {
    id: "machines",     label: "Machines Running",       value: "28",     sub: "/ 32 total",
    delta: "87.5% up",  deltaPositive: true,  icon: "gear",
    accent: "#06b6d4",  sparkData: [26,28,27,29,28,30,28,27,29,28,28,28],
  },
  {
    id: "utilization",  label: "OEE Score",              value: "76.4%",
    delta: "+2.1%",     deltaPositive: true,  icon: "analytics",
    accent: "#6366f1",  sparkData: [68,70,72,74,71,73,75,74,76,77,76,76],
  },
  {
    id: "attendance",   label: "Employees Present",      value: "186",    sub: "/ 210 staff",
    delta: "88.6% rate",deltaPositive: true,  icon: "users",
    accent: "#10b981",  sparkData: [175,180,178,182,185,183,186,184,187,188,186,186],
  },
  {
    id: "revenue",      label: "Revenue (MTD)",          value: "$1.23M",
    delta: "+9.7% YoY", deltaPositive: true,  icon: "chart",
    accent: "#3b82f6",  sparkData: [90,105,110,120,115,125,118,130,125,128,130,123],
  },
  {
    id: "quality",      label: "Quality Pass Rate",      value: "98.3%",
    delta: "+0.4%",     deltaPositive: true,  icon: "check",
    accent: "#10b981",  sparkData: [97.5,97.8,97.6,98.0,97.9,98.1,98.2,98.0,98.3,98.2,98.4,98.3],
  },
  {
    id: "efficiency",   label: "Production Efficiency",  value: "92.1%",
    delta: "+1.8%",     deltaPositive: true,  icon: "grid",
    accent: "#8b5cf6",  sparkData: [88,89,90,91,90,92,91,93,92,93,92,92],
  },
];

// ─── Production Trend (monthly, dual-series: actual vs target) ────────────────
export const PRODUCTION_TREND: ChartPoint[] = [
  { label: "Jan", value: 3800,  value2: 4200 },
  { label: "Feb", value: 4200,  value2: 4200 },
  { label: "Mar", value: 3950,  value2: 4300 },
  { label: "Apr", value: 4600,  value2: 4300 },
  { label: "May", value: 4300,  value2: 4500 },
  { label: "Jun", value: 4750,  value2: 4500 },
  { label: "Jul", value: 5100,  value2: 4800 },
  { label: "Aug", value: 4900,  value2: 4800 },
  { label: "Sep", value: 5200,  value2: 5000 },
  { label: "Oct", value: 5050,  value2: 5000 },
  { label: "Nov", value: 5400,  value2: 5200 },
  { label: "Dec", value: 4820,  value2: 5200 },
];

// ─── Weekly Orders (last 7 days) ──────────────────────────────────────────────
export const WEEKLY_ORDERS: ChartPoint[] = [
  { label: "Mon", value: 42 },
  { label: "Tue", value: 58 },
  { label: "Wed", value: 51 },
  { label: "Thu", value: 63 },
  { label: "Fri", value: 47 },
  { label: "Sat", value: 28 },
  { label: "Sun", value: 15 },
];

// ─── Machine Utilization ──────────────────────────────────────────────────────
export const MACHINE_UTILIZATION: ChartSegment[] = [
  { label: "CNC Machining",   value: 84, color: "#3b82f6" },
  { label: "Assembly Line A", value: 91, color: "#10b981" },
  { label: "Assembly Line B", value: 73, color: "#6366f1" },
  { label: "Welding Station", value: 67, color: "#f59e0b" },
  { label: "Paint Shop",      value: 78, color: "#8b5cf6" },
  { label: "Quality Testing", value: 95, color: "#06b6d4" },
  { label: "Packaging Unit",  value: 72, color: "#ec4899" },
];

// ─── Monthly Revenue (with cost overlay) ─────────────────────────────────────
export const MONTHLY_REVENUE: ChartPoint[] = [
  { label: "Jan", value: 980,  value2: 720 },
  { label: "Feb", value: 1050, value2: 760 },
  { label: "Mar", value: 1120, value2: 810 },
  { label: "Apr", value: 1060, value2: 790 },
  { label: "May", value: 1180, value2: 850 },
  { label: "Jun", value: 1250, value2: 890 },
  { label: "Jul", value: 1320, value2: 940 },
  { label: "Aug", value: 1290, value2: 920 },
  { label: "Sep", value: 1380, value2: 970 },
  { label: "Oct", value: 1340, value2: 950 },
  { label: "Nov", value: 1410, value2: 1010 },
  { label: "Dec", value: 1230, value2: 890 },
];

// ─── Inventory Distribution ───────────────────────────────────────────────────
export const INVENTORY_DIST: ChartSegment[] = [
  { label: "Raw Materials",   value: 38, color: "#3b82f6" },
  { label: "Work in Progress",value: 22, color: "#8b5cf6" },
  { label: "Finished Goods",  value: 28, color: "#10b981" },
  { label: "Spare Parts",     value: 12, color: "#f59e0b" },
];

// ─── Recent Manufacturing Orders ─────────────────────────────────────────────
export const RECENT_MFG_ORDERS: ManufacturingOrder[] = [
  { id:"MO-5821", product:"Hydraulic Pump A200",     qty:120, unit:"pcs",  status:"In Progress", dueDate:"25 Jul", assignedLine:"Line 1", priority:"High",   progress: 68 },
  { id:"MO-5820", product:"Conveyor Belt Drive V4",  qty:50,  unit:"pcs",  status:"Planned",     dueDate:"26 Jul", assignedLine:"Line 3", priority:"Medium", progress: 0  },
  { id:"MO-5819", product:"Control Panel v3.2",      qty:30,  unit:"pcs",  status:"Completed",   dueDate:"24 Jul", assignedLine:"Line 2", priority:"Low",    progress:100 },
  { id:"MO-5818", product:"Steel Frame Assembly Mk2",qty:200, unit:"pcs",  status:"In Progress", dueDate:"25 Jul", assignedLine:"Line 4", priority:"High",   progress: 42 },
  { id:"MO-5817", product:"Pneumatic Valve Set Pro", qty:80,  unit:"sets", status:"On Hold",     dueDate:"27 Jul", assignedLine:"Line 1", priority:"Medium", progress: 15 },
  { id:"MO-5816", product:"Electric Motor 15kW",     qty:40,  unit:"pcs",  status:"In Progress", dueDate:"26 Jul", assignedLine:"Line 2", priority:"High",   progress: 81 },
];

// ─── Recent Inventory Transactions ───────────────────────────────────────────
export const RECENT_INV_TXNS: InventoryTransaction[] = [
  { id:"TXN-9021", item:"Steel Rod 20mm",        sku:"STL-ROD-20",  type:"Receipt",    qty: 500, unit:"kg",  warehouse:"WH-A", date:"Today 09:12",  value:"$2,150"  },
  { id:"TXN-9020", item:"Hydraulic Fluid ISO 46", sku:"HYD-FL-46",  type:"Issue",      qty:-120, unit:"L",   warehouse:"WH-B", date:"Today 08:45",  value:"$480"    },
  { id:"TXN-9019", item:"Circuit Board PCB-v2",   sku:"PCB-V2-001", type:"Transfer",   qty:  50, unit:"pcs", warehouse:"WH-C", date:"Yesterday",    value:"$7,500"  },
  { id:"TXN-9018", item:"Aluminium Sheet 5mm",    sku:"ALU-SHT-5",  type:"Adjustment", qty: -20, unit:"pcs", warehouse:"WH-A", date:"Yesterday",    value:"-$340"   },
  { id:"TXN-9017", item:"O-Ring Seal Kit",        sku:"SEAL-OR-K",  type:"Receipt",    qty:1000, unit:"pcs", warehouse:"WH-B", date:"23 Jul",        value:"$880"    },
  { id:"TXN-9016", item:"Bearing 6205-2RS",       sku:"BRG-6205",   type:"Issue",      qty: -60, unit:"pcs", warehouse:"WH-A", date:"23 Jul",        value:"-$720"   },
];

// ─── Recent Purchase Orders ───────────────────────────────────────────────────
export const RECENT_PO: PurchaseOrder[] = [
  { id:"PO-3341", supplier:"Apex Steel Ltd",          items:12, amount:"$48,200",  status:"Confirmed", date:"24 Jul", deliveryDate:"30 Jul" },
  { id:"PO-3340", supplier:"TechParts Inc.",           items: 8, amount:"$12,800",  status:"Received",  date:"23 Jul", deliveryDate:"28 Jul" },
  { id:"PO-3339", supplier:"Global Electronics Co.",  items:24, amount:"$87,500",  status:"Draft",     date:"23 Jul", deliveryDate:"05 Aug" },
  { id:"PO-3338", supplier:"Precision Castings Co.",  items: 6, amount:"$22,100",  status:"Confirmed", date:"22 Jul", deliveryDate:"01 Aug" },
  { id:"PO-3337", supplier:"FastFix Components",      items: 3, amount:"$5,400",   status:"Received",  date:"21 Jul", deliveryDate:"25 Jul" },
];

// ─── Recent Sales Orders ──────────────────────────────────────────────────────
export const RECENT_SO: SalesOrder[] = [
  { id:"SO-7721", customer:"AutoDrive Motors Ltd",   amount:"$142,000", status:"Processing", date:"24 Jul", region:"North America" },
  { id:"SO-7720", customer:"BuildCorp Engineering",  amount:"$65,400",  status:"Shipped",    date:"23 Jul", region:"Europe"        },
  { id:"SO-7719", customer:"Renova Systems GmbH",    amount:"$28,900",  status:"New",        date:"23 Jul", region:"Europe"        },
  { id:"SO-7718", customer:"Northern Machines LLC",  amount:"$94,200",  status:"Delivered",  date:"22 Jul", region:"Asia Pacific"  },
  { id:"SO-7717", customer:"Pacific Industrial Co.", amount:"$51,600",  status:"Processing", date:"21 Jul", region:"Asia Pacific"  },
];

// ─── Notifications ────────────────────────────────────────────────────────────
export const NOTIFICATIONS: AppNotification[] = [
  { id:"N1", title:"Machine Fault",       body:"CNC-04 spindle fault detected — immediate attention required",    level:"error",   time:"5m ago",  read:false, module:"Maintenance"  },
  { id:"N2", title:"Low Stock Alert",     body:"Steel Rod 20mm below reorder point — only 50 kg remaining",      level:"warning", time:"22m ago", read:false, module:"Inventory"    },
  { id:"N3", title:"Order Shipped",       body:"SO-7720 dispatched to BuildCorp Engineering, tracking: TRK8821", level:"success", time:"1h ago",  read:false, module:"Sales"        },
  { id:"N4", title:"QC Failure",          body:"Batch B-441 failed final inspection — 3 units rejected",         level:"error",   time:"2h ago",  read:true,  module:"Quality"      },
  { id:"N5", title:"PO Approved",         body:"PO-3341 ($48,200) approved by Finance — Apex Steel Ltd",         level:"info",    time:"3h ago",  read:true,  module:"Procurement"  },
  { id:"N6", title:"Production Target",   body:"Line 2 exceeded daily target by 12% — 340 units completed",      level:"success", time:"4h ago",  read:true,  module:"Production"   },
];

// ─── Quick Actions ────────────────────────────────────────────────────────────
export const QUICK_ACTIONS: QuickAction[] = [
  { id:"qa1", label:"New Mfg Order",       icon:"factory",  accent:"#3b82f6", description:"Start production order",    path:"/dashboard/production"  },
  { id:"qa2", label:"Create BOM",          icon:"layers",   accent:"#8b5cf6", description:"Bill of materials entry",   path:"/dashboard/bom"         },
  { id:"qa3", label:"Add Inventory",       icon:"box",      accent:"#10b981", description:"Record stock receipt",      path:"/dashboard/inventory"   },
  { id:"qa4", label:"Purchase Order",      icon:"cart",     accent:"#f59e0b", description:"Create supplier PO",        path:"/dashboard/purchase"    },
  { id:"qa5", label:"New Sales Order",     icon:"orders",   accent:"#06b6d4", description:"Create customer order",     path:"/dashboard/orders"      },
  { id:"qa6", label:"Add Employee",        icon:"person",   accent:"#6366f1", description:"Register new employee",     path:"/dashboard/employees"   },
  { id:"qa7", label:"Run QC Check",        icon:"check",    accent:"#ec4899", description:"Quality inspection",        path:"/dashboard/quality"     },
  { id:"qa8", label:"Schedule Maintenance",icon:"wrench",   accent:"#14b8a6", description:"Plan maintenance task",     path:"/dashboard/maintenance" },
];

// ─── Machine Status ───────────────────────────────────────────────────────────
export const MACHINE_STATUS: MachineStatus[] = [
  { id:"CNC-01", name:"CNC Machine 01",     type:"CNC Machining",    state:"Running",     utilization:84, uptime:"6h 12m", lastMaintenance:"18 Jul", operator:"T. Nakamura" },
  { id:"CNC-02", name:"CNC Machine 02",     type:"CNC Machining",    state:"Running",     utilization:91, uptime:"7h 04m", lastMaintenance:"15 Jul", operator:"A. Singh"    },
  { id:"CNC-04", name:"CNC Machine 04",     type:"CNC Machining",    state:"Fault",       utilization: 0, uptime:"0h 00m", lastMaintenance:"02 Jul", operator:"—"           },
  { id:"ASM-L1", name:"Assembly Line 1",    type:"Assembly",         state:"Running",     utilization:93, uptime:"8h 00m", lastMaintenance:"20 Jul", operator:"B. Williams" },
  { id:"ASM-L2", name:"Assembly Line 2",    type:"Assembly",         state:"Running",     utilization:78, uptime:"5h 48m", lastMaintenance:"19 Jul", operator:"C. Osei"     },
  { id:"WLD-W1", name:"Welding Station W1", type:"Welding",          state:"Running",     utilization:67, uptime:"4h 30m", lastMaintenance:"17 Jul", operator:"D. Kim"      },
  { id:"PRS-02", name:"Hydraulic Press 02", type:"Press",            state:"Maintenance", utilization: 0, uptime:"0h 00m", lastMaintenance:"24 Jul", operator:"J. Patel"    },
  { id:"PKG-01", name:"Packaging Unit 01",  type:"Packaging",        state:"Idle",        utilization:15, uptime:"1h 20m", lastMaintenance:"21 Jul", operator:"M. Larson"   },
];

// ─── Production Line Efficiency ───────────────────────────────────────────────
export const PRODUCTION_LINES: ProductionLine[] = [
  { line:"Line 1", target:500, actual:468, efficiency:93.6, scrapRate:1.2, oee:81.4 },
  { line:"Line 2", target:420, actual:415, efficiency:98.8, scrapRate:0.5, oee:88.2 },
  { line:"Line 3", target:380, actual:342, efficiency:90.0, scrapRate:2.1, oee:76.3 },
  { line:"Line 4", target:300, actual:271, efficiency:90.3, scrapRate:1.8, oee:74.8 },
];

// ─── Upcoming Maintenance ─────────────────────────────────────────────────────
export const MAINTENANCE_ITEMS: MaintenanceItem[] = [
  { machine:"CNC-04",       type:"Spindle & Oil Change",  due:"Today",    urgency:"Overdue",   assignedTo:"J. Patel",   estimatedHours:3 },
  { machine:"Press-02",     type:"Blade & Die Inspection",due:"Tomorrow", urgency:"Due Soon",  assignedTo:"T. Nakamura",estimatedHours:2 },
  { machine:"Conveyor-L3",  type:"Belt Tension & Align",  due:"26 Jul",   urgency:"Scheduled", assignedTo:"B. Williams",estimatedHours:1 },
  { machine:"Welder-W1",    type:"Electrode Calibration", due:"28 Jul",   urgency:"Scheduled", assignedTo:"A. Singh",   estimatedHours:2 },
  { machine:"Compressor-C1",type:"Filter & Valve Check",  due:"01 Aug",   urgency:"Scheduled", assignedTo:"D. Kim",     estimatedHours:1 },
];

// ─── Today's Schedule ────────────────────────────────────────────────────────
export const SCHEDULE_ITEMS: ScheduleItem[] = [
  { time:"08:00", event:"Morning Production Briefing",   location:"Line 1 Meeting Room",  type:"meeting",     attendees:12 },
  { time:"10:30", event:"Quality Review — Batch B-442",  location:"QC Lab",               type:"review",      attendees:5  },
  { time:"13:00", event:"Supplier Call — Apex Steel",    location:"Conference Room A",    type:"meeting",     attendees:4  },
  { time:"14:30", event:"CNC-04 Maintenance Window",     location:"Shop Floor Zone B",    type:"maintenance", attendees:2  },
  { time:"15:00", event:"Shift Handover Meeting",        location:"Main Floor",           type:"meeting",     attendees:20 },
  { time:"16:30", event:"ERP System Patch Window",       location:"IT Server Room",       type:"maintenance", attendees:3  },
];

// ─── Pending Approvals ───────────────────────────────────────────────────────
export const PENDING_APPROVALS: PendingApproval[] = [
  { id:"PA1", type:"Purchase Order",      requestedBy:"Procurement Dept", amount:"$48,200", priority:"High",   submittedAt:"2h ago"  },
  { id:"PA2", type:"Leave Request",       requestedBy:"John Smith",                          priority:"Low",    submittedAt:"4h ago"  },
  { id:"PA3", type:"Overtime Approval",   requestedBy:"Night Shift Mgr",                    priority:"Medium", submittedAt:"5h ago"  },
  { id:"PA4", type:"Material Write-off",  requestedBy:"Warehouse Team",   amount:"$3,200",  priority:"High",   submittedAt:"Yesterday"},
];

// ─── System Health ────────────────────────────────────────────────────────────
export const SYSTEM_HEALTH: SystemHealthItem[] = [
  { service:"ERP Core",       status:"Operational", uptime:"99.98%", responseTime:"42ms"  },
  { service:"Database",       status:"Operational", uptime:"99.95%", responseTime:"18ms"  },
  { service:"Email Service",  status:"Degraded",    uptime:"97.20%", responseTime:"1.2s"  },
  { service:"File Storage",   status:"Operational", uptime:"100%",   responseTime:"85ms"  },
  { service:"API Gateway",    status:"Operational", uptime:"99.90%", responseTime:"31ms"  },
];

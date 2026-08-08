'use strict';
const Order       = require('../models/Order');
const Production  = require('../models/Production');
const QualityCheck= require('../models/QualityCheck');
const Machine     = require('../models/Machine');
const MaintenanceTask = require('../models/MaintenanceTask');
const { Inventory }   = require('../models/Inventory');
const Product     = require('../models/Product');
const Customer    = require('../models/Customer');
const Supplier    = require('../models/Supplier');
const { ApiResponse, asyncHandler } = require('../utils/apiResponse');

// ── Date helpers ──────────────────────────────────────────────────────────────

function monthBounds(offsetMonths = 0) {
  const now  = new Date();
  const year = now.getFullYear();
  const mon  = now.getMonth() + offsetMonths;
  const start = new Date(year, mon, 1);
  const end   = new Date(year, mon + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

// ── Summary KPIs ──────────────────────────────────────────────────────────────

exports.getSummary = asyncHandler(async (_req, res) => {
  const { start, end } = monthBounds(0);
  const { start: prevStart, end: prevEnd } = monthBounds(-1);
  const dateFilter     = { createdAt: { $gte: start, $lte: end } };
  const prevDateFilter = { createdAt: { $gte: prevStart, $lte: prevEnd } };

  const [
    revenueThis,
    revenuePrev,
    productionThis,
    productionPrev,
    ordersThis,
    machineAgg,
    qualityAgg,
    inventoryAgg,
    productAgg,
  ] = await Promise.all([
    // Revenue MTD (sales orders, non-cancelled)
    Order.aggregate([
      { $match: { ...dateFilter, type: 'sales', status: { $nin: ['cancelled'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    // Revenue prior month
    Order.aggregate([
      { $match: { ...prevDateFilter, type: 'sales', status: { $nin: ['cancelled'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    // Production output this month (quantityProduced)
    Production.aggregate([
      { $match: dateFilter },
      { $group: { _id: null, produced: { $sum: '$quantityProduced' }, prevProduced: { $sum: 0 } } },
    ]),
    // Production output prior month
    Production.aggregate([
      { $match: prevDateFilter },
      { $group: { _id: null, produced: { $sum: '$quantityProduced' } } },
    ]),
    // Orders this month for on-time delivery calculation
    Order.aggregate([
      { $match: { ...dateFilter, type: 'sales' } },
      {
        $group: {
          _id: null,
          total:   { $sum: 1 },
          onTime:  {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$status', 'delivered'] },
                    { $and: [
                      { $in: ['$status', ['delivered', 'shipped']] },
                      { $or: [
                        { $not: ['$dueDate'] },
                        { $lte: ['$deliveredDate', '$dueDate'] },
                      ]},
                    ]},
                  ],
                },
                1, 0,
              ],
            },
          },
        },
      },
    ]),
    // OEE — average oeeTarget across active machines (oeeActual not stored; use oeeTarget as proxy)
    Machine.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, avgOee: { $avg: '$oeeTarget' }, count: { $sum: 1 } } },
    ]),
    // Defect rate — avg across all QC checks this month
    QualityCheck.aggregate([
      { $match: dateFilter },
      { $group: { _id: null, avgDefect: { $avg: '$defectRate' }, total: { $sum: 1 } } },
    ]),
    // Inventory — total items & qty count (costPrice lives on Product, not Inventory)
    Inventory.aggregate([
      { $group: { _id: null, totalItems: { $sum: 1 }, totalQty: { $sum: '$quantity' } } },
    ]),
    // Product lead time average
    Product.aggregate([
      { $match: { isActive: true, leadTimeDays: { $gt: 0 } } },
      { $group: { _id: null, avgLead: { $avg: '$leadTimeDays' } } },
    ]),
  ]);

  const revThis  = revenueThis[0]?.total   || 0;
  const revPrev  = revenuePrev[0]?.total   || 0;
  const prodThis = productionThis[0]?.produced || 0;
  const prodPrev = productionPrev[0]?.produced || 0;

  const ordersTotal  = ordersThis[0]?.total  || 0;
  const ordersOnTime = ordersThis[0]?.onTime || 0;
  const onTimePct = ordersTotal > 0 ? (ordersOnTime / ordersTotal) * 100 : null;

  const oee       = machineAgg[0]?.avgOee    ?? null;
  const defectRate= qualityAgg[0]?.avgDefect ?? null;
  const avgLead   = productAgg[0]?.avgLead   ?? null;

  // Trend: % change vs prior period (null if no prior data)
  const revTrend     = revPrev     > 0 ? ((revThis  - revPrev)  / revPrev)  * 100 : null;
  const prodTrend    = prodPrev    > 0 ? ((prodThis - prodPrev) / prodPrev) * 100 : null;

  new ApiResponse(200, 'Analytics summary retrieved.', {
    revenue:         { value: revThis,      prev: revPrev,   trend: revTrend  },
    productionOutput:{ value: prodThis,     prev: prodPrev,  trend: prodTrend },
    onTimeDelivery:  { value: onTimePct,    ordersTotal                        },
    oee:             { value: oee                                               },
    defectRate:      { value: defectRate                                        },
    avgLeadTime:     { value: avgLead                                           },
  }).send(res);
});

// ── Production by line (from QualityCheck.line which is the production line) ───

exports.getProductionByLine = asyncHandler(async (_req, res) => {
  const { start, end } = monthBounds(0);

  // QualityCheck has a `line` field ("Line 1" … "Line 5", "Assembly", etc.)
  const agg = await QualityCheck.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end }, line: { $ne: '' } } },
    {
      $group: {
        _id:        '$line',
        checks:     { $sum: 1 },
        totalSample:{ $sum: '$sampleSize' },
        totalDefects:{ $sum: '$defects' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Also aggregate production quantityProduced — Production model has no line field
  // so we return QC checks per line as a proxy for activity level
  new ApiResponse(200, 'Production by line retrieved.', agg).send(res);
});

// ── Quality pass-rate by QC line ──────────────────────────────────────────────

exports.getQualityByLine = asyncHandler(async (_req, res) => {
  const agg = await QualityCheck.aggregate([
    { $match: { line: { $ne: '' } } },
    {
      $group: {
        _id:       '$line',
        total:     { $sum: 1 },
        passed:    { $sum: { $cond: [{ $eq: ['$result', 'Pass'] }, 1, 0] } },
        avgDefect: { $avg: '$defectRate' },
      },
    },
    {
      $project: {
        line:      '$_id',
        total:     1,
        passed:    1,
        passRate:  {
          $cond: [
            { $gt: ['$total', 0] },
            { $multiply: [{ $divide: ['$passed', '$total'] }, 100] },
            0,
          ],
        },
        avgDefect: 1,
      },
    },
    { $sort: { line: 1 } },
  ]);

  new ApiResponse(200, 'Quality by line retrieved.', agg).send(res);
});

// ── Order status distribution ─────────────────────────────────────────────────

exports.getOrderStatus = asyncHandler(async (_req, res) => {
  const { start, end } = monthBounds(0);

  const agg = await Order.aggregate([
    { $match: { type: 'sales', createdAt: { $gte: start, $lte: end } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort:  { _id: 1 } },
  ]);

  new ApiResponse(200, 'Order status distribution retrieved.', agg).send(res);
});

// ── Bottom cards — top product, customer, supplier, open WOs, PM, POs ─────────

exports.getBottomCards = asyncHandler(async (_req, res) => {
  const { start, end } = monthBounds(0);

  const [
    topProductAgg,
    topCustomerAgg,
    topSupplierAgg,
    openWOs,
    scheduledPM,
    posPending,
  ] = await Promise.all([
    // Top product by quantity produced this month
    Production.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, quantityProduced: { $gt: 0 } } },
      { $group: { _id: '$product', totalProduced: { $sum: '$quantityProduced' } } },
      { $sort:  { totalProduced: -1 } },
      { $limit: 1 },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'prod' } },
      { $unwind: { path: '$prod', preserveNullAndEmptyArrays: true } },
    ]),
    // Top customer by sales order value this month
    Order.aggregate([
      { $match: { type: 'sales', status: { $nin: ['cancelled'] }, createdAt: { $gte: start, $lte: end }, customer: { $ne: null } } },
      { $group: { _id: '$customer', total: { $sum: '$total' } } },
      { $sort:  { total: -1 } },
      { $limit: 1 },
      { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'cust' } },
      { $unwind: { path: '$cust', preserveNullAndEmptyArrays: true } },
    ]),
    // Top supplier by purchase order value this month
    Order.aggregate([
      { $match: { type: 'purchase', status: { $nin: ['cancelled'] }, createdAt: { $gte: start, $lte: end }, supplier: { $ne: null } } },
      { $group: { _id: '$supplier', total: { $sum: '$total' } } },
      { $sort:  { total: -1 } },
      { $limit: 1 },
      { $lookup: { from: 'suppliers', localField: '_id', foreignField: '_id', as: 'supp' } },
      { $unwind: { path: '$supp', preserveNullAndEmptyArrays: true } },
    ]),
    // Open work orders
    Production.countDocuments({ status: 'in_progress' }),
    // Scheduled preventive maintenance tasks this week
    MaintenanceTask.countDocuments({
      type: 'Preventive',
      status: { $in: ['Open', 'In Progress'] },
      scheduledDate: {
        $gte: (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d; })(),
        $lte: (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 6); d.setHours(23,59,59,999); return d; })(),
      },
    }),
    // Purchase orders pending (status: pending or confirmed)
    Order.countDocuments({ type: 'purchase', status: { $in: ['pending', 'draft'] } }),
  ]);

  const topProduct  = topProductAgg[0]  ? (topProductAgg[0].prod?.sku  || topProductAgg[0].prod?.name || null) : null;
  const topCustomer = topCustomerAgg[0] ? (topCustomerAgg[0].cust?.name || topCustomerAgg[0].cust?.company || null) : null;
  const topSupplier = topSupplierAgg[0] ? (topSupplierAgg[0].supp?.name || topSupplierAgg[0].supp?.company || null) : null;

  new ApiResponse(200, 'Analytics bottom cards retrieved.', {
    topProduct,
    topCustomer,
    topSupplier,
    openWorkOrders:   openWOs,
    scheduledPM,
    posPending,
  }).send(res);
});

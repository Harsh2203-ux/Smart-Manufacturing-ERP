'use strict';
const Report = require('../models/Report');
const Order   = require('../models/Order');
const { Inventory } = require('../models/Inventory');
const Production    = require('../models/Production');
const Employee      = require('../models/Employee');
const Machine       = require('../models/Machine');
const { ApiResponse, ApiError, asyncHandler, getPagination, buildPaginationMeta } = require('../utils/apiResponse');

async function runReport(report) {
  const { type, parameters = {} } = report;
  const { startDate, endDate } = parameters;
  const dateFilter = startDate && endDate
    ? { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } }
    : {};

  switch (type) {
    case 'sales_summary':
      return Order.aggregate([
        { $match: { ...dateFilter, type: 'sales' } },
        { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' } } },
      ]);

    case 'purchase_summary':
      return Order.aggregate([
        { $match: { ...dateFilter, type: 'purchase' } },
        { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' } } },
      ]);

    case 'inventory_summary':
      return Inventory.aggregate([
        { $group: { _id: '$warehouse', totalItems: { $sum: 1 }, totalQty: { $sum: '$quantity' }, totalAvailable: { $sum: '$availableQty' } } },
      ]);

    case 'production_summary':
      return Production.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$status', count: { $sum: 1 }, totalPlanned: { $sum: '$quantityPlanned' }, totalProduced: { $sum: '$quantityProduced' } } },
      ]);

    case 'employee_summary':
      return Employee.aggregate([
        { $group: { _id: '$department', count: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ['$status','active'] }, 1, 0] } } } },
      ]);

    case 'machine_utilisation':
      return Machine.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 }, totalDowntime: { $sum: '$totalDowntimeHours' } } },
      ]);

    case 'financial_overview': {
      const [sales, purchases] = await Promise.all([
        Order.aggregate([{ $match: { ...dateFilter, type: 'sales', status: { $nin: ['cancelled'] } } }, { $group: { _id: null, revenue: { $sum: '$total' } } }]),
        Order.aggregate([{ $match: { ...dateFilter, type: 'purchase', status: { $nin: ['cancelled'] } } }, { $group: { _id: null, cost: { $sum: '$total' } } }]),
      ]);
      return { revenue: sales[0]?.revenue || 0, cost: purchases[0]?.cost || 0, profit: (sales[0]?.revenue || 0) - (purchases[0]?.cost || 0) };
    }

    default:
      return null;
  }
}

exports.getReports = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { createdBy: req.user.id };
  if (req.query.type)   filter.type   = req.query.type;
  if (req.query.status) filter.status = req.query.status;
  const [reports, total] = await Promise.all([
    Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Report.countDocuments(filter),
  ]);
  new ApiResponse(200, 'Reports retrieved.', reports, buildPaginationMeta(total, page, limit)).send(res);
});

exports.getReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) throw ApiError.notFound('Report not found.');
  new ApiResponse(200, 'Report retrieved.', report).send(res);
});

exports.createReport = asyncHandler(async (req, res) => {
  req.body.createdBy = req.user.id;
  req.body.status    = 'running';
  const report = await Report.create(req.body);

  // Run report asynchronously
  setImmediate(async () => {
    try {
      const result = await runReport(report);
      await Report.findByIdAndUpdate(report._id, { status: 'completed', result, generatedAt: new Date() });
    } catch (err) {
      await Report.findByIdAndUpdate(report._id, { status: 'failed', errorMessage: err.message });
    }
  });

  new ApiResponse(202, 'Report generation started.', report).send(res);
});

exports.deleteReport = asyncHandler(async (req, res) => {
  const report = await Report.findByIdAndDelete(req.params.id);
  if (!report) throw ApiError.notFound('Report not found.');
  new ApiResponse(200, 'Report deleted.').send(res);
});

exports.getDashboardStats = asyncHandler(async (_req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [orders, inventory, production, machines, employees] = await Promise.all([
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' } } }]),
    Inventory.aggregate([{ $group: { _id: null, totalItems: { $sum: 1 }, lowStock: { $sum: { $cond: [{ $lte: ['$availableQty', 10] }, 1, 0] } } } }]),
    Production.countDocuments({ status: 'in_progress' }),
    Machine.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Employee.countDocuments({ status: 'active' }),
  ]);
  new ApiResponse(200, 'Dashboard stats retrieved.', { orders, inventory: inventory[0], production, machines, employees }).send(res);
});

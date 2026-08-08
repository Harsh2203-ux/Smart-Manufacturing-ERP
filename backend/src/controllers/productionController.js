'use strict';
const Production = require('../models/Production');
const { ApiResponse, ApiError, asyncHandler, getPagination, buildPaginationMeta, buildSort } = require('../utils/apiResponse');
const { createNotification } = require('../services/notificationService');

const pad = (n) => String(n).padStart(6, '0');

async function nextWONumber() {
  const count = await Production.countDocuments();
  return `WO-${pad(count + 1)}`;
}

exports.getWorkOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.status)   filter.status   = req.query.status;
  if (req.query.product)  filter.product  = req.query.product;
  if (req.query.machine)  filter.machine  = req.query.machine;
  if (req.query.priority) filter.priority = req.query.priority;

  const sort = buildSort(req.query.sort, ['workOrderNumber','plannedStartDate','status','priority','createdAt']);
  const [wos, total] = await Promise.all([
    Production.find(filter)
      .populate('product','name sku').populate('machine','name machineId')
      .populate('assignedTo','firstName lastName employeeId')
      .sort(sort).skip(skip).limit(limit),
    Production.countDocuments(filter),
  ]);
  new ApiResponse(200, 'Work orders retrieved.', wos, buildPaginationMeta(total, page, limit)).send(res);
});

exports.getWorkOrder = asyncHandler(async (req, res) => {
  const wo = await Production.findById(req.params.id)
    .populate('product').populate('machine').populate('assignedTo').populate('createdBy','name');
  if (!wo) throw ApiError.notFound('Work order not found.');
  new ApiResponse(200, 'Work order retrieved.', wo).send(res);
});

exports.createWorkOrder = asyncHandler(async (req, res) => {
  req.body.workOrderNumber = await nextWONumber();
  req.body.createdBy       = req.user.id;
  const wo = await Production.create(req.body);
  new ApiResponse(201, 'Work order created.', wo).send(res);
});

exports.updateWorkOrder = asyncHandler(async (req, res) => {
  const wo = await Production.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!wo) throw ApiError.notFound('Work order not found.');
  new ApiResponse(200, 'Work order updated.', wo).send(res);
});

exports.updateWOStatus = asyncHandler(async (req, res) => {
  const { status, quantityProduced, quantityRejected, notes } = req.body;
  const wo = await Production.findById(req.params.id);
  if (!wo) throw ApiError.notFound('Work order not found.');

  wo.status = status;
  if (quantityProduced !== undefined) wo.quantityProduced  = quantityProduced;
  if (quantityRejected !== undefined) wo.quantityRejected  = quantityRejected;
  if (notes)                          wo.notes             = notes;
  if (status === 'in_progress' && !wo.actualStartDate)  wo.actualStartDate = new Date();
  if (status === 'completed')                           wo.actualEndDate   = new Date();
  await wo.save();

  if (status === 'completed') {
    await createNotification({
      recipientId: req.user.id, type: 'production_completed',
      title: 'Work Order Completed',
      message: `Work order ${wo.workOrderNumber} completed. Produced: ${wo.quantityProduced} units.`,
      entityType: 'Production', entityId: wo._id,
    });
  }
  new ApiResponse(200, 'Work order status updated.', wo).send(res);
});

exports.deleteWorkOrder = asyncHandler(async (req, res) => {
  const wo = await Production.findById(req.params.id);
  if (!wo) throw ApiError.notFound('Work order not found.');
  if (wo.status === 'in_progress') throw ApiError.badRequest('Cannot delete an in-progress work order.');
  await wo.deleteOne();
  new ApiResponse(200, 'Work order deleted.').send(res);
});

exports.getProductionStats = asyncHandler(async (_req, res) => {
  const stats = await Production.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 }, totalPlanned: { $sum: '$quantityPlanned' }, totalProduced: { $sum: '$quantityProduced' } } },
  ]);
  new ApiResponse(200, 'Production stats retrieved.', stats).send(res);
});

'use strict';
const MaintenanceTask = require('../models/MaintenanceTask');
const { ApiResponse, ApiError, asyncHandler, getPagination, buildPaginationMeta } = require('../utils/apiResponse');

exports.getTasks = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.status)   filter.status   = req.query.status;
  if (req.query.type)     filter.type     = req.query.type;
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.query.search) {
    const re = new RegExp(req.query.search, 'i');
    filter.$or = [{ asset: re }, { assetId: re }, { assignedTo: re }, { taskNumber: re }];
  }

  const [items, total] = await Promise.all([
    MaintenanceTask.find(filter).populate('machine', 'name machineId').sort({ scheduledDate: 1 }).skip(skip).limit(limit),
    MaintenanceTask.countDocuments(filter),
  ]);

  new ApiResponse(200, 'Maintenance tasks retrieved.', items, buildPaginationMeta(total, page, limit)).send(res);
});

exports.getTask = asyncHandler(async (req, res) => {
  const task = await MaintenanceTask.findById(req.params.id).populate('machine', 'name machineId');
  if (!task) throw ApiError.notFound('Maintenance task not found.');
  new ApiResponse(200, 'Maintenance task retrieved.', task).send(res);
});

exports.createTask = asyncHandler(async (req, res) => {
  req.body.createdBy = req.user.id;
  const task = await MaintenanceTask.create(req.body);
  new ApiResponse(201, 'Maintenance task created.', task).send(res);
});

exports.updateTask = asyncHandler(async (req, res) => {
  const task = await MaintenanceTask.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!task) throw ApiError.notFound('Maintenance task not found.');
  new ApiResponse(200, 'Maintenance task updated.', task).send(res);
});

exports.deleteTask = asyncHandler(async (req, res) => {
  const task = await MaintenanceTask.findByIdAndDelete(req.params.id);
  if (!task) throw ApiError.notFound('Maintenance task not found.');
  new ApiResponse(200, 'Maintenance task deleted.').send(res);
});

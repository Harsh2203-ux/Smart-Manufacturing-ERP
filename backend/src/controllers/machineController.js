'use strict';
const Machine = require('../models/Machine');
const { ApiResponse, ApiError, asyncHandler, getPagination, buildPaginationMeta, buildSort } = require('../utils/apiResponse');
const { createNotification } = require('../services/notificationService');

exports.getMachines = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.status)   filter.status   = req.query.status;
  if (req.query.location) filter.location = req.query.location;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  const sort = buildSort(req.query.sort, ['name','machineId','status','location','createdAt']);
  const [machines, total] = await Promise.all([
    Machine.find(filter).sort(sort).skip(skip).limit(limit),
    Machine.countDocuments(filter),
  ]);
  new ApiResponse(200, 'Machines retrieved.', machines, buildPaginationMeta(total, page, limit)).send(res);
});

exports.getMachine = asyncHandler(async (req, res) => {
  const machine = await Machine.findById(req.params.id)
    .populate('maintenanceLogs.performedBy','firstName lastName');
  if (!machine) throw ApiError.notFound('Machine not found.');
  new ApiResponse(200, 'Machine retrieved.', machine).send(res);
});

exports.createMachine = asyncHandler(async (req, res) => {
  req.body.createdBy = req.user.id;
  // Auto-generate machineId if not provided
  if (!req.body.machineId) {
    const count = await Machine.countDocuments();
    req.body.machineId = `MCH-${String(count + 1).padStart(3, '0')}`;
  }
  const machine = await Machine.create(req.body);
  new ApiResponse(201, 'Machine created.', machine).send(res);
});

exports.updateMachine = asyncHandler(async (req, res) => {
  const prev    = await Machine.findById(req.params.id);
  if (!prev) throw ApiError.notFound('Machine not found.');
  const machine = await Machine.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

  if (req.body.status === 'breakdown' && prev.status !== 'breakdown') {
    await createNotification({
      recipientId: req.user.id, type: 'machine_breakdown',
      title: 'Machine Breakdown', message: `Machine ${machine.name} (${machine.machineId}) has broken down.`,
      entityType: 'Machine', entityId: machine._id, priority: 'high',
    });
  }
  new ApiResponse(200, 'Machine updated.', machine).send(res);
});

exports.deleteMachine = asyncHandler(async (req, res) => {
  const machine = await Machine.findByIdAndDelete(req.params.id);
  if (!machine) throw ApiError.notFound('Machine not found.');
  new ApiResponse(200, 'Machine deleted.').send(res);
});

exports.addMaintenanceLog = asyncHandler(async (req, res) => {
  const machine = await Machine.findById(req.params.id);
  if (!machine) throw ApiError.notFound('Machine not found.');

  machine.maintenanceLogs.push(req.body);
  machine.lastMaintenanceDate = new Date();
  if (req.body.nextDueDate) machine.nextMaintenanceDate = req.body.nextDueDate;
  if (req.body.downtimeHours) machine.totalDowntimeHours += req.body.downtimeHours;
  await machine.save();
  new ApiResponse(200, 'Maintenance log added.', machine).send(res);
});

exports.getMachineStats = asyncHandler(async (_req, res) => {
  const stats = await Machine.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 }, totalDowntime: { $sum: '$totalDowntimeHours' } } },
  ]);
  new ApiResponse(200, 'Machine stats retrieved.', stats).send(res);
});

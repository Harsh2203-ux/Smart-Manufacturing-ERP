'use strict';
const Warehouse = require('../models/Warehouse');
const { ApiResponse, ApiError, asyncHandler, getPagination, buildPaginationMeta } = require('../utils/apiResponse');

exports.getWarehouses = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type)   filter.type   = req.query.type;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  const [warehouses, total] = await Promise.all([
    Warehouse.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Warehouse.countDocuments(filter),
  ]);
  new ApiResponse(200, 'Warehouses retrieved.', warehouses, buildPaginationMeta(total, page, limit)).send(res);
});

exports.getWarehouse = asyncHandler(async (req, res) => {
  const wh = await Warehouse.findById(req.params.id);
  if (!wh) throw ApiError.notFound('Warehouse not found.');
  new ApiResponse(200, 'Warehouse retrieved.', wh).send(res);
});

exports.createWarehouse = asyncHandler(async (req, res) => {
  req.body.createdBy = req.user.id;
  const wh = await Warehouse.create(req.body);
  new ApiResponse(201, 'Warehouse created.', wh).send(res);
});

exports.updateWarehouse = asyncHandler(async (req, res) => {
  const wh = await Warehouse.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!wh) throw ApiError.notFound('Warehouse not found.');
  new ApiResponse(200, 'Warehouse updated.', wh).send(res);
});

exports.deleteWarehouse = asyncHandler(async (req, res) => {
  const wh = await Warehouse.findByIdAndDelete(req.params.id);
  if (!wh) throw ApiError.notFound('Warehouse not found.');
  new ApiResponse(200, 'Warehouse deleted.').send(res);
});

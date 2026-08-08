'use strict';
const Supplier = require('../models/Supplier');
const { ApiResponse, ApiError, asyncHandler, getPagination, buildPaginationMeta, buildSort } = require('../utils/apiResponse');
const { toCode } = require('../utils/helpers');

exports.getSuppliers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
  if (req.query.category)  filter.category  = req.query.category;
  if (req.query.search)    filter.$text = { $search: req.query.search };

  const sort = buildSort(req.query.sort, ['name','code','rating','createdAt']);
  const [suppliers, total] = await Promise.all([
    Supplier.find(filter).sort(sort).skip(skip).limit(limit),
    Supplier.countDocuments(filter),
  ]);
  new ApiResponse(200, 'Suppliers retrieved.', suppliers, buildPaginationMeta(total, page, limit)).send(res);
});

exports.getSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) throw ApiError.notFound('Supplier not found.');
  new ApiResponse(200, 'Supplier retrieved.', supplier).send(res);
});

exports.createSupplier = asyncHandler(async (req, res) => {
  req.body.createdBy = req.user.id;
  if (!req.body.code) req.body.code = toCode(req.body.name).slice(0, 8) + '-' + Date.now().toString().slice(-4);
  const supplier = await Supplier.create(req.body);
  new ApiResponse(201, 'Supplier created.', supplier).send(res);
});

exports.updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!supplier) throw ApiError.notFound('Supplier not found.');
  new ApiResponse(200, 'Supplier updated.', supplier).send(res);
});

exports.deleteSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByIdAndDelete(req.params.id);
  if (!supplier) throw ApiError.notFound('Supplier not found.');
  new ApiResponse(200, 'Supplier deleted.').send(res);
});

'use strict';
const QualityCheck = require('../models/QualityCheck');
const { ApiResponse, ApiError, asyncHandler, getPagination, buildPaginationMeta } = require('../utils/apiResponse');

exports.getChecks = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.result)  filter.result  = req.query.result;
  if (req.query.search) {
    const re = new RegExp(req.query.search, 'i');
    filter.$or = [{ batch: re }, { productName: re }, { inspector: re }, { checkNumber: re }];
  }

  const [items, total] = await Promise.all([
    QualityCheck.find(filter).populate('product', 'name sku').sort({ createdAt: -1 }).skip(skip).limit(limit),
    QualityCheck.countDocuments(filter),
  ]);

  new ApiResponse(200, 'Quality checks retrieved.', items, buildPaginationMeta(total, page, limit)).send(res);
});

exports.getCheck = asyncHandler(async (req, res) => {
  const check = await QualityCheck.findById(req.params.id).populate('product', 'name sku');
  if (!check) throw ApiError.notFound('Quality check not found.');
  new ApiResponse(200, 'Quality check retrieved.', check).send(res);
});

exports.createCheck = asyncHandler(async (req, res) => {
  req.body.createdBy = req.user.id;
  const check = await QualityCheck.create(req.body);
  new ApiResponse(201, 'Quality check created.', check).send(res);
});

exports.updateCheck = asyncHandler(async (req, res) => {
  const check = await QualityCheck.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!check) throw ApiError.notFound('Quality check not found.');
  new ApiResponse(200, 'Quality check updated.', check).send(res);
});

exports.deleteCheck = asyncHandler(async (req, res) => {
  const check = await QualityCheck.findByIdAndDelete(req.params.id);
  if (!check) throw ApiError.notFound('Quality check not found.');
  new ApiResponse(200, 'Quality check deleted.').send(res);
});

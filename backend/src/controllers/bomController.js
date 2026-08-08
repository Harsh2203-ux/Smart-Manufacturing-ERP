'use strict';
const BOM = require('../models/BOM');
const { ApiResponse, ApiError, asyncHandler, getPagination, buildPaginationMeta } = require('../utils/apiResponse');

const pad = (n) => String(n).padStart(4, '0');
async function nextBOMNumber() {
  const count = await BOM.countDocuments();
  return `BOM-${pad(count + 1)}`;
}

exports.getBOMs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.status)  filter.status  = req.query.status;
  if (req.query.product) filter.product = req.query.product;
  if (req.query.type)    filter.type    = req.query.type;

  const [boms, total] = await Promise.all([
    BOM.find(filter)
      .populate('product', 'name sku category')
      .populate('components.product', 'name sku unit')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    BOM.countDocuments(filter),
  ]);
  new ApiResponse(200, 'BOMs retrieved.', boms, buildPaginationMeta(total, page, limit)).send(res);
});

exports.getBOM = asyncHandler(async (req, res) => {
  const bom = await BOM.findById(req.params.id)
    .populate('product', 'name sku category')
    .populate('components.product', 'name sku unit costPrice')
    .populate('createdBy', 'name');
  if (!bom) throw ApiError.notFound('BOM not found.');
  new ApiResponse(200, 'BOM retrieved.', bom).send(res);
});

exports.createBOM = asyncHandler(async (req, res) => {
  req.body.createdBy = req.user.id;
  if (!req.body.bomNumber) req.body.bomNumber = await nextBOMNumber();
  const bom = await BOM.create(req.body);
  new ApiResponse(201, 'BOM created.', bom).send(res);
});

exports.updateBOM = asyncHandler(async (req, res) => {
  const bom = await BOM.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    .populate('product', 'name sku')
    .populate('components.product', 'name sku unit');
  if (!bom) throw ApiError.notFound('BOM not found.');
  new ApiResponse(200, 'BOM updated.', bom).send(res);
});

exports.deleteBOM = asyncHandler(async (req, res) => {
  const bom = await BOM.findByIdAndDelete(req.params.id);
  if (!bom) throw ApiError.notFound('BOM not found.');
  new ApiResponse(200, 'BOM deleted.').send(res);
});

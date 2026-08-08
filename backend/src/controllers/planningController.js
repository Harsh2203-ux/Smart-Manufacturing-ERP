'use strict';
const ProductionPlan = require('../models/ProductionPlan');
const { ApiResponse, ApiError, asyncHandler, getPagination, buildPaginationMeta } = require('../utils/apiResponse');

const pad = (n) => String(n).padStart(4, '0');
async function nextPlanNumber() {
  const count = await ProductionPlan.countDocuments();
  return `PP-${pad(count + 1)}`;
}

exports.getPlans = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.status)  filter.status  = req.query.status;
  if (req.query.product) filter.product = req.query.product;

  const [plans, total] = await Promise.all([
    ProductionPlan.find(filter)
      .populate('product', 'name sku')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    ProductionPlan.countDocuments(filter),
  ]);
  new ApiResponse(200, 'Plans retrieved.', plans, buildPaginationMeta(total, page, limit)).send(res);
});

exports.getPlan = asyncHandler(async (req, res) => {
  const plan = await ProductionPlan.findById(req.params.id)
    .populate('product', 'name sku')
    .populate('linkedWorkOrders');
  if (!plan) throw ApiError.notFound('Production plan not found.');
  new ApiResponse(200, 'Plan retrieved.', plan).send(res);
});

exports.createPlan = asyncHandler(async (req, res) => {
  req.body.createdBy = req.user.id;
  req.body.planNumber = await nextPlanNumber();
  const plan = await ProductionPlan.create(req.body);
  new ApiResponse(201, 'Production plan created.', plan).send(res);
});

exports.updatePlan = asyncHandler(async (req, res) => {
  const plan = await ProductionPlan.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    .populate('product', 'name sku');
  if (!plan) throw ApiError.notFound('Production plan not found.');
  new ApiResponse(200, 'Production plan updated.', plan).send(res);
});

exports.deletePlan = asyncHandler(async (req, res) => {
  const plan = await ProductionPlan.findByIdAndDelete(req.params.id);
  if (!plan) throw ApiError.notFound('Production plan not found.');
  new ApiResponse(200, 'Production plan deleted.').send(res);
});

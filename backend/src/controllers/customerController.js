'use strict';
const Customer = require('../models/Customer');
const { ApiResponse, ApiError, asyncHandler, getPagination, buildPaginationMeta, buildSort } = require('../utils/apiResponse');
const { toCode } = require('../utils/helpers');

exports.getCustomers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
  if (req.query.type)   filter.type   = req.query.type;
  if (req.query.search) filter.$text  = { $search: req.query.search };

  const sort = buildSort(req.query.sort, ['name','customerNumber','createdAt']);
  const [customers, total] = await Promise.all([
    Customer.find(filter).sort(sort).skip(skip).limit(limit),
    Customer.countDocuments(filter),
  ]);
  new ApiResponse(200, 'Customers retrieved.', customers, buildPaginationMeta(total, page, limit)).send(res);
});

exports.getCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw ApiError.notFound('Customer not found.');
  new ApiResponse(200, 'Customer retrieved.', customer).send(res);
});

exports.createCustomer = asyncHandler(async (req, res) => {
  req.body.createdBy = req.user.id;
  if (!req.body.customerNumber)
    req.body.customerNumber = 'CUST-' + Date.now().toString().slice(-6);
  const customer = await Customer.create(req.body);
  new ApiResponse(201, 'Customer created.', customer).send(res);
});

exports.updateCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!customer) throw ApiError.notFound('Customer not found.');
  new ApiResponse(200, 'Customer updated.', customer).send(res);
});

exports.deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findByIdAndDelete(req.params.id);
  if (!customer) throw ApiError.notFound('Customer not found.');
  new ApiResponse(200, 'Customer deleted.').send(res);
});

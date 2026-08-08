'use strict';
const Product = require('../models/Product');
const { ApiResponse, ApiError, asyncHandler, getPagination, buildPaginationMeta, buildSort } = require('../utils/apiResponse');
const { toCode } = require('../utils/helpers');

exports.getProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.category)      filter.category      = req.query.category;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
  if (req.query.isRawMaterial !== undefined) filter.isRawMaterial = req.query.isRawMaterial === 'true';
  if (req.query.supplier)      filter.supplier      = req.query.supplier;
  if (req.query.search) filter.$text = { $search: req.query.search };

  const sort = buildSort(req.query.sort, ['name','sku','category','costPrice','sellingPrice','createdAt']);
  const [products, total] = await Promise.all([
    Product.find(filter).populate('supplier','name code').sort(sort).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);
  new ApiResponse(200, 'Products retrieved.', products, buildPaginationMeta(total, page, limit)).send(res);
});

exports.getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('supplier','name code');
  if (!product) throw ApiError.notFound('Product not found.');
  new ApiResponse(200, 'Product retrieved.', product).send(res);
});

exports.createProduct = asyncHandler(async (req, res) => {
  req.body.createdBy = req.user.id;
  if (!req.body.sku) req.body.sku = toCode(req.body.name) + '-' + Date.now().toString().slice(-4);
  const product = await Product.create(req.body);
  new ApiResponse(201, 'Product created.', product).send(res);
});

exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!product) throw ApiError.notFound('Product not found.');
  new ApiResponse(200, 'Product updated.', product).send(res);
});

exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw ApiError.notFound('Product not found.');
  new ApiResponse(200, 'Product deleted.').send(res);
});

exports.getCategories = asyncHandler(async (_req, res) => {
  const categories = await Product.distinct('category');
  new ApiResponse(200, 'Categories retrieved.', categories).send(res);
});

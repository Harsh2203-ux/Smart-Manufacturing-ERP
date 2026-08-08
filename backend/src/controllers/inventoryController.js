'use strict';
const { Inventory, InventoryTransaction } = require('../models/Inventory');
const Product = require('../models/Product');
const { ApiResponse, ApiError, asyncHandler, getPagination, buildPaginationMeta } = require('../utils/apiResponse');
const { createNotification } = require('../services/notificationService');

exports.getInventory = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.warehouse) filter.warehouse = req.query.warehouse;
  if (req.query.product)   filter.product   = req.query.product;

  const [items, total] = await Promise.all([
    Inventory.find(filter).populate('product','name sku unit reorderPoint').skip(skip).limit(limit),
    Inventory.countDocuments(filter),
  ]);
  new ApiResponse(200, 'Inventory retrieved.', items, buildPaginationMeta(total, page, limit)).send(res);
});

exports.getStockItem = asyncHandler(async (req, res) => {
  const item = await Inventory.findById(req.params.id).populate('product','name sku unit');
  if (!item) throw ApiError.notFound('Stock item not found.');
  new ApiResponse(200, 'Stock item retrieved.', item).send(res);
});

exports.adjustStock = asyncHandler(async (req, res) => {
  const { productId, warehouse = 'Main Warehouse', quantity, type, reference, notes } = req.body;

  const product = await Product.findById(productId);
  if (!product) throw ApiError.notFound('Product not found.');

  let stock = await Inventory.findOne({ product: productId, warehouse });
  if (!stock) {
    stock = await Inventory.create({ product: productId, warehouse, quantity: 0, unit: product.unit });
  }

  const previousQty = stock.quantity;
  const delta = ['receipt','return','adjustment'].includes(type) ? quantity : -quantity;
  stock.quantity = Math.max(0, stock.quantity + delta);
  stock.lastUpdatedBy = req.user.id;
  await stock.save();

  await InventoryTransaction.create({
    product: productId, type, quantity, previousQty, newQty: stock.quantity,
    warehouse, reference, notes, performedBy: req.user.id,
  });

  // Low-stock notification
  if (stock.availableQty <= product.reorderPoint && product.reorderPoint > 0) {
    await createNotification({
      recipientId: req.user.id, type: 'low_stock',
      title: 'Low Stock Alert',
      message: `${product.name} (${product.sku}) is below reorder point. Available: ${stock.availableQty} ${product.unit}.`,
      entityType: 'Product', entityId: product._id, priority: 'high',
    });
  }

  new ApiResponse(200, 'Stock adjusted.', stock).send(res);
});

exports.getTransactions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.product)   filter.product   = req.query.product;
  if (req.query.type)      filter.type      = req.query.type;
  if (req.query.warehouse) filter.warehouse = req.query.warehouse;

  const [txns, total] = await Promise.all([
    InventoryTransaction.find(filter)
      .populate('product','name sku').populate('performedBy','name')
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    InventoryTransaction.countDocuments(filter),
  ]);
  new ApiResponse(200, 'Transactions retrieved.', txns, buildPaginationMeta(total, page, limit)).send(res);
});

exports.getLowStock = asyncHandler(async (_req, res) => {
  const items = await Inventory.aggregate([
    { $lookup: { from: 'products', localField: 'product', foreignField: '_id', as: 'productInfo' } },
    { $unwind: '$productInfo' },
    { $match: { $expr: { $lte: ['$availableQty', '$productInfo.reorderPoint'] } } },
    { $project: { product: 1, warehouse: 1, quantity: 1, availableQty: 1, 'productInfo.name': 1, 'productInfo.sku': 1, 'productInfo.reorderPoint': 1 } },
  ]);
  new ApiResponse(200, 'Low-stock items retrieved.', items).send(res);
});

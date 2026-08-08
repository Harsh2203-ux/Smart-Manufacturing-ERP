'use strict';
const Order   = require('../models/Order');
const { Inventory } = require('../models/Inventory');
const { ApiResponse, ApiError, asyncHandler, getPagination, buildPaginationMeta, buildSort } = require('../utils/apiResponse');
const { createNotification } = require('../services/notificationService');

const pad = (n, len = 6) => String(n).padStart(len, '0');

async function nextOrderNumber(type) {
  const prefix = type === 'sales' ? 'SO' : type === 'purchase' ? 'PO' : 'IO';
  const count  = await Order.countDocuments({ type });
  return `${prefix}-${pad(count + 1)}`;
}

exports.getOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.status)   filter.status   = req.query.status;
  if (req.query.type)     filter.type     = req.query.type;
  if (req.query.customer) filter.customer = req.query.customer;
  if (req.query.supplier) filter.supplier = req.query.supplier;
  if (req.query.search)   filter.orderNumber = { $regex: req.query.search, $options: 'i' };

  const sort = buildSort(req.query.sort, ['orderNumber','orderDate','total','status','createdAt']);
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('customer','name customerNumber').populate('supplier','name code')
      .populate('createdBy','name').sort(sort).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);
  new ApiResponse(200, 'Orders retrieved.', orders, buildPaginationMeta(total, page, limit)).send(res);
});

exports.getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('customer','name email phone').populate('supplier','name email phone')
    .populate('items.product','name sku').populate('createdBy','name');
  if (!order) throw ApiError.notFound('Order not found.');
  new ApiResponse(200, 'Order retrieved.', order).send(res);
});

exports.createOrder = asyncHandler(async (req, res) => {
  req.body.orderNumber = await nextOrderNumber(req.body.type || 'sales');
  req.body.createdBy   = req.user.id;
  const order = await Order.create(req.body);
  await createNotification({
    recipientId: req.user.id, type: 'order_created',
    title: 'Order Created', message: `Order ${order.orderNumber} has been created.`,
    entityType: 'Order', entityId: order._id,
  });
  new ApiResponse(201, 'Order created.', order).send(res);
});

exports.updateOrder = asyncHandler(async (req, res) => {
  const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!order) throw ApiError.notFound('Order not found.');
  new ApiResponse(200, 'Order updated.', order).send(res);
});

exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found.');
  order.status = status;
  if (status === 'shipped')   order.shippedDate   = new Date();
  if (status === 'delivered') order.deliveredDate = new Date();
  await order.save();
  new ApiResponse(200, 'Order status updated.', order).send(res);
});

exports.deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found.');
  if (['shipped','delivered'].includes(order.status))
    throw ApiError.badRequest('Cannot delete a shipped or delivered order.');
  await order.deleteOne();
  new ApiResponse(200, 'Order deleted.').send(res);
});

exports.getOrderStats = asyncHandler(async (_req, res) => {
  const [byStatus, revenue] = await Promise.all([
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' } } }]),
    Order.aggregate([
      { $match: { status: { $in: ['delivered','confirmed'] } } },
      { $group: { _id: null, totalRevenue: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
  ]);
  new ApiResponse(200, 'Order stats retrieved.', { byStatus, revenue: revenue[0] || {} }).send(res);
});

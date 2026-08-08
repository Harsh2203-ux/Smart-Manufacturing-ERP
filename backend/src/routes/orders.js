'use strict';
const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(protect);

router.get ('/',          ctrl.getOrders);
router.get ('/stats',     ctrl.getOrderStats);
router.get ('/:id',       ctrl.getOrder);
router.post('/', authorize('admin','manager'), [
  body('type').isIn(['sales','purchase','internal']).withMessage('Invalid order type.'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required.'),
  body('items.*.product').isMongoId().withMessage('Valid product ID required per item.'),
  body('items.*.quantity').isFloat({ min: 1 }).withMessage('Quantity must be at least 1.'),
  body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be non-negative.'),
], validate, ctrl.createOrder);
router.put ('/:id',        authorize('admin','manager'), ctrl.updateOrder);
router.patch('/:id/status',authorize('admin','manager'), [
  body('status').isIn(['draft','pending','confirmed','in_production','shipped','delivered','cancelled','returned'])
    .withMessage('Invalid order status.'),
], validate, ctrl.updateOrderStatus);
router.delete('/:id',      authorize('admin'), ctrl.deleteOrder);

module.exports = router;

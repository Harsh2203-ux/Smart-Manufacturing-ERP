'use strict';
const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(protect);

router.get ('/',              ctrl.getInventory);
router.get ('/low-stock',     ctrl.getLowStock);
router.get ('/transactions',  ctrl.getTransactions);
router.get ('/:id',           ctrl.getStockItem);
router.post('/adjust', authorize('admin','manager','operator'), [
  body('productId').isMongoId().withMessage('Valid product ID required.'),
  body('quantity').isFloat({ min: 0.001 }).withMessage('Quantity must be positive.'),
  body('type').isIn(['receipt','issue','adjustment','transfer','return','scrap']).withMessage('Invalid transaction type.'),
], validate, ctrl.adjustStock);

module.exports = router;

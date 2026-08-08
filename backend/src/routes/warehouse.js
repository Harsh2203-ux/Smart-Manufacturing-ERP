'use strict';
const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/warehouseController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(protect);

router.get ('/',    ctrl.getWarehouses);
router.get ('/:id', ctrl.getWarehouse);
router.post('/', authorize('admin','manager'), [
  body('code').trim().notEmpty().withMessage('Warehouse code is required.'),
  body('name').trim().notEmpty().withMessage('Warehouse name is required.'),
], validate, ctrl.createWarehouse);
router.put   ('/:id', authorize('admin','manager'), ctrl.updateWarehouse);
router.delete('/:id', authorize('admin'), ctrl.deleteWarehouse);

module.exports = router;

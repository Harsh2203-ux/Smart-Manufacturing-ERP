'use strict';
const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/supplierController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(protect);

router.get ('/',    ctrl.getSuppliers);
router.get ('/:id', ctrl.getSupplier);
router.post('/',    authorize('admin','manager'), [
  body('name').trim().notEmpty().withMessage('Supplier name is required.'),
  body('email').optional().isEmail().normalizeEmail(),
], validate, ctrl.createSupplier);
router.put ('/:id', authorize('admin','manager'), ctrl.updateSupplier);
router.delete('/:id', authorize('admin'), ctrl.deleteSupplier);

module.exports = router;

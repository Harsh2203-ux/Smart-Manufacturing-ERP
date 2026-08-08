'use strict';
const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(protect);

router.get ('/',    ctrl.getCustomers);
router.get ('/:id', ctrl.getCustomer);
router.post('/',    authorize('admin','manager'), [
  body('name').trim().notEmpty().withMessage('Customer name is required.'),
  body('email').optional().isEmail().normalizeEmail(),
  body('type').optional().isIn(['individual','business']),
], validate, ctrl.createCustomer);
router.put ('/:id', authorize('admin','manager'), ctrl.updateCustomer);
router.delete('/:id', authorize('admin'), ctrl.deleteCustomer);

module.exports = router;

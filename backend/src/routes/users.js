'use strict';
const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

// All user routes require authentication
router.use(protect);

// GET /api/v1/users — list all users (admins only)
router.get('/', authorize('super_admin', 'admin', 'hr_manager'), ctrl.getUsers);

// GET /api/v1/users/:id — get single user
router.get('/:id', authorize('super_admin', 'admin', 'hr_manager'), ctrl.getUser);

// PUT /api/v1/users/:id — update a user (admin only)
router.put('/:id', authorize('super_admin', 'admin'), [
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required.'),
  body('role').optional().isIn([
    'super_admin', 'admin', 'production_manager', 'inventory_manager',
    'purchase_manager', 'sales_manager', 'quality_manager', 'maintenance_manager',
    'hr_manager', 'finance_manager', 'operator', 'employee',
  ]).withMessage('Invalid role.'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean.'),
  body('department').optional().trim(),
  body('designation').optional().trim(),
], validate, ctrl.updateUser);

// DELETE /api/v1/users/:id — delete a user (super_admin only)
router.delete('/:id', authorize('super_admin', 'admin'), ctrl.deleteUser);

module.exports = router;

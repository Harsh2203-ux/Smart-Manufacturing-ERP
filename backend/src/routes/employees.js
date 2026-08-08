'use strict';
const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(protect);

router.get ('/',              ctrl.getEmployees);
router.get ('/departments',   ctrl.getDepartments);
router.get ('/:id',           ctrl.getEmployee);
router.post('/',              authorize('admin','manager'), [
  body('firstName').trim().notEmpty().withMessage('First name is required.'),
  body('lastName').trim().notEmpty().withMessage('Last name is required.'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required.'),
  body('department').trim().notEmpty().withMessage('Department is required.'),
  body('position').trim().notEmpty().withMessage('Position is required.'),
  body('hireDate').isISO8601().withMessage('Valid hire date required.'),
], validate, ctrl.createEmployee);
router.put ('/:id',           authorize('admin','manager'), ctrl.updateEmployee);
router.delete('/:id',         authorize('admin'), ctrl.deleteEmployee);

module.exports = router;

'use strict';
const router = require('express').Router();
const { body } = require('express-validator');
const ctrl   = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(protect);

router.get ('/',              ctrl.getReports);
router.get ('/dashboard',     ctrl.getDashboardStats);
router.get ('/:id',           ctrl.getReport);
router.post('/',              [
  body('title').trim().notEmpty().withMessage('Report title is required.'),
  body('type').isIn(['sales_summary','purchase_summary','inventory_summary','production_summary',
    'employee_summary','machine_utilisation','financial_overview','custom']).withMessage('Invalid report type.'),
], validate, ctrl.createReport);
router.delete('/:id',         ctrl.deleteReport);

module.exports = router;

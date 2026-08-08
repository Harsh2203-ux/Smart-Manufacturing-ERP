'use strict';
const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/productionController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(protect);

router.get ('/',         ctrl.getWorkOrders);
router.get ('/stats',    ctrl.getProductionStats);
router.get ('/:id',      ctrl.getWorkOrder);
router.post('/', authorize('admin','manager'), [
  body('product').isMongoId().withMessage('Valid product ID required.'),
  body('quantityPlanned').isInt({ min: 1 }).withMessage('Planned quantity must be at least 1.'),
  body('plannedStartDate').isISO8601().withMessage('Valid start date required.'),
  body('plannedEndDate').isISO8601().withMessage('Valid end date required.'),
], validate, ctrl.createWorkOrder);
router.put    ('/:id',          authorize('admin','manager'), ctrl.updateWorkOrder);
router.patch  ('/:id/status',   authorize('admin','manager','operator'), [
  body('status').isIn(['planned','in_progress','on_hold','completed','cancelled']).withMessage('Invalid status.'),
], validate, ctrl.updateWOStatus);
router.delete ('/:id',          authorize('admin'), ctrl.deleteWorkOrder);

module.exports = router;

'use strict';
const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/planningController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(protect);

router.get ('/',    ctrl.getPlans);
router.get ('/:id', ctrl.getPlan);
router.post('/', authorize('admin','manager'), [
  body('product').isMongoId().withMessage('Valid product ID required.'),
  body('plannedQty').isInt({ min: 1 }).withMessage('Planned quantity must be at least 1.'),
  body('startDate').isISO8601().withMessage('Valid start date required.'),
  body('endDate').isISO8601().withMessage('Valid end date required.'),
], validate, ctrl.createPlan);
router.put   ('/:id', authorize('admin','manager'), ctrl.updatePlan);
router.delete('/:id', authorize('admin'), ctrl.deletePlan);

module.exports = router;

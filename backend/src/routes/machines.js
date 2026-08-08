'use strict';
const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/machineController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(protect);

router.get ('/',           ctrl.getMachines);
router.get ('/stats',      ctrl.getMachineStats);
router.get ('/:id',        ctrl.getMachine);
router.post('/',           authorize('admin','manager'), [
  body('name').trim().notEmpty().withMessage('Machine name is required.'),
  body('type').trim().notEmpty().withMessage('Machine type is required.'),
], validate, ctrl.createMachine);
router.put ('/:id',        authorize('admin','manager'), ctrl.updateMachine);
router.delete('/:id',      authorize('admin'), ctrl.deleteMachine);
router.post('/:id/maintenance', authorize('admin','manager'), [
  body('type').isIn(['preventive','corrective','predictive']).withMessage('Invalid maintenance type.'),
  body('description').trim().notEmpty().withMessage('Description is required.'),
], validate, ctrl.addMaintenanceLog);

module.exports = router;

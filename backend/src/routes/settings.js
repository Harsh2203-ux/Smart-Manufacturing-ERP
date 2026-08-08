'use strict';
const router = require('express').Router();
const { body } = require('express-validator');
const ctrl   = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(protect);

router.get ('/',        ctrl.getSettings);
router.get ('/:key',    ctrl.getSetting);
router.put ('/:key',    authorize('admin'), [
  body('value').exists().withMessage('Value is required.'),
], validate, ctrl.updateSetting);
router.patch('/bulk',   authorize('admin'), [
  body('settings').isArray({ min: 1 }).withMessage('settings must be a non-empty array.'),
], validate, ctrl.bulkUpdate);

module.exports = router;

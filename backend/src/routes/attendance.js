'use strict';
const router = require('express').Router();
const { body } = require('express-validator');
const ctrl   = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(protect);

router.get ('/',              ctrl.getRecords);
router.get ('/summary',       ctrl.getSummary);
router.get ('/departments',   ctrl.getDepartments);
router.get ('/:id',           ctrl.getRecord);

router.post('/',
  authorize('admin', 'manager', 'hr_manager', 'operator'),
  [
    body('status')
      .isIn(['Present', 'Absent', 'Late', 'Half Day', 'On Leave', 'Holiday', 'Weekend'])
      .withMessage('Invalid status.'),
  ],
  validate,
  ctrl.createRecord
);

router.put ('/:id',  authorize('admin', 'manager', 'hr_manager'), ctrl.updateRecord);
router.delete('/:id', authorize('admin', 'manager', 'hr_manager'), ctrl.deleteRecord);

module.exports = router;

'use strict';
const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/bomController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(protect);

router.get ('/',    ctrl.getBOMs);
router.get ('/:id', ctrl.getBOM);
router.post('/', authorize('admin','manager'), [
  body('product').isMongoId().withMessage('Valid product ID required.'),
  body('version').trim().notEmpty().withMessage('Version is required.'),
], validate, ctrl.createBOM);
router.put   ('/:id', authorize('admin','manager'), ctrl.updateBOM);
router.delete('/:id', authorize('admin'), ctrl.deleteBOM);

module.exports = router;

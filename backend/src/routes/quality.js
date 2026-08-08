'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/qualityController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get ('/',     ctrl.getChecks);
router.get ('/:id',  ctrl.getCheck);
router.post('/',     authorize('admin','manager','quality_manager','operator'), ctrl.createCheck);
router.put ('/:id',  authorize('admin','manager','quality_manager'), ctrl.updateCheck);
router.delete('/:id',authorize('admin','manager','quality_manager'), ctrl.deleteCheck);

module.exports = router;

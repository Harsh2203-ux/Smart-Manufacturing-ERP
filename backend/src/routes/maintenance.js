'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/maintenanceController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get ('/',     ctrl.getTasks);
router.get ('/:id',  ctrl.getTask);
router.post('/',     authorize('admin','manager','maintenance_manager','operator'), ctrl.createTask);
router.put ('/:id',  authorize('admin','manager','maintenance_manager'), ctrl.updateTask);
router.delete('/:id',authorize('admin','manager','maintenance_manager'), ctrl.deleteTask);

module.exports = router;

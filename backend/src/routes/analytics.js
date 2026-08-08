'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/summary',             ctrl.getSummary);
router.get('/production-by-line',  ctrl.getProductionByLine);
router.get('/quality-by-line',     ctrl.getQualityByLine);
router.get('/order-status',        ctrl.getOrderStatus);
router.get('/bottom-cards',        ctrl.getBottomCards);

module.exports = router;

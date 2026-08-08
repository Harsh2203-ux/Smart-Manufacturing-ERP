'use strict';
const router = require('express').Router();
const ctrl   = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get ('/',              ctrl.getNotifications);
router.get ('/unread-count',  ctrl.getUnreadCount);
router.patch('/read-all',     ctrl.markAllRead);
router.patch('/:id/read',     ctrl.markAsRead);
router.delete('/:id',         ctrl.deleteNotification);

module.exports = router;

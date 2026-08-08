'use strict';
const Notification = require('../models/Notification');
const { markRead }  = require('../services/notificationService');
const { ApiResponse, ApiError, asyncHandler, getPagination, buildPaginationMeta } = require('../utils/apiResponse');

exports.getNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { recipient: req.user.id };
  if (req.query.isRead !== undefined) filter.isRead = req.query.isRead === 'true';
  if (req.query.type)                 filter.type   = req.query.type;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user.id, isRead: false }),
  ]);
  new ApiResponse(200, 'Notifications retrieved.', notifications,
    { ...buildPaginationMeta(total, page, limit), unreadCount }).send(res);
});

exports.markAsRead = asyncHandler(async (req, res) => {
  await markRead(req.user.id, req.params.id || null);
  new ApiResponse(200, 'Notification(s) marked as read.').send(res);
});

exports.markAllRead = asyncHandler(async (req, res) => {
  await markRead(req.user.id);
  new ApiResponse(200, 'All notifications marked as read.').send(res);
});

exports.deleteNotification = asyncHandler(async (req, res) => {
  const notif = await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user.id });
  if (!notif) throw ApiError.notFound('Notification not found.');
  new ApiResponse(200, 'Notification deleted.').send(res);
});

exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ recipient: req.user.id, isRead: false });
  new ApiResponse(200, 'Unread count retrieved.', { count }).send(res);
});

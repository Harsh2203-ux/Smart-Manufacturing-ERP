'use strict';
const Notification = require('../models/Notification');
const logger       = require('../utils/logger');

/**
 * Create a notification for a single recipient.
 */
async function createNotification({ recipientId, title, message, type = 'info', link = '',
                                    entityType = '', entityId = null, sentById = null, priority = 'medium' }) {
  try {
    return await Notification.create({
      recipient:  recipientId,
      title,
      message,
      type,
      link,
      entityType,
      entityId,
      sentBy:     sentById,
      priority,
    });
  } catch (err) {
    logger.error(`Failed to create notification for ${recipientId}: ${err.message}`);
    return null;
  }
}

/**
 * Create notifications for multiple recipients.
 */
async function broadcastNotification({ recipientIds, title, message, type = 'info',
                                        link = '', entityType = '', entityId = null, sentById = null }) {
  const docs = recipientIds.map(id => ({
    recipient: id, title, message, type, link, entityType, entityId, sentBy: sentById,
  }));
  try {
    return await Notification.insertMany(docs, { ordered: false });
  } catch (err) {
    logger.error(`Broadcast notification failed: ${err.message}`);
    return [];
  }
}

/**
 * Mark a notification (or all for a user) as read.
 */
async function markRead(recipientId, notificationId = null) {
  const filter = notificationId
    ? { _id: notificationId, recipient: recipientId }
    : { recipient: recipientId, isRead: false };
  return Notification.updateMany(filter, { isRead: true, readAt: new Date() });
}

module.exports = { createNotification, broadcastNotification, markRead };

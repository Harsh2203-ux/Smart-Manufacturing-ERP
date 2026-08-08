'use strict';
const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'info','success','warning','error',
  'order_created','order_updated','order_cancelled',
  'low_stock','out_of_stock',
  'production_started','production_completed','production_overdue',
  'maintenance_due','machine_breakdown',
  'employee_onboarded',
  'system',
];

const notificationSchema = new mongoose.Schema({
  recipient:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:        { type: String, required: true, maxlength: 200 },
  message:      { type: String, required: true },
  type:         { type: String, enum: NOTIFICATION_TYPES, default: 'info' },
  isRead:       { type: Boolean, default: false },
  readAt:       { type: Date },
  link:         { type: String, default: '' },       // frontend route to navigate to
  entityType:   { type: String, default: '' },       // 'Order', 'Machine', etc.
  entityId:     { type: mongoose.Schema.Types.ObjectId },
  sentBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  priority:     { type: String, enum: ['low','medium','high'], default: 'medium' },
}, {
  timestamps: true,
  toJSON:  { virtuals: true, versionKey: false },
  toObject:{ virtuals: true },
});

notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

// Auto-mark readAt when isRead flips to true
notificationSchema.pre('save', function (next) {
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Notification', notificationSchema);

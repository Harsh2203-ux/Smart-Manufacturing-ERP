'use strict';
const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key:        { type: String, required: true, unique: true, trim: true, lowercase: true },
  value:      { type: mongoose.Schema.Types.Mixed, required: true },
  category:   { type: String, required: true, default: 'general' },
  label:      { type: String, default: '' },
  description:{ type: String, default: '' },
  isPublic:   { type: Boolean, default: false },  // can be returned without auth
  isEditable: { type: Boolean, default: true },
  dataType:   { type: String, enum: ['string','number','boolean','json','array'], default: 'string' },
  updatedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON:  { virtuals: true, versionKey: false },
  toObject:{ virtuals: true },
});

settingsSchema.index({ category: 1 });

// ── Default settings seeded on first run ──────────────────────────────────────
settingsSchema.statics.seed = async function () {
  const defaults = [
    { key: 'company_name',    value: 'Smart Manufacturing ERP', category: 'company', label: 'Company Name',   isPublic: true,  dataType: 'string' },
    { key: 'company_address', value: '',                         category: 'company', label: 'Address',        isPublic: true,  dataType: 'string' },
    { key: 'company_email',   value: '',                         category: 'company', label: 'Support Email',  isPublic: true,  dataType: 'string' },
    { key: 'company_phone',   value: '',                         category: 'company', label: 'Phone',          isPublic: true,  dataType: 'string' },
    { key: 'currency',        value: 'USD',                      category: 'finance', label: 'Default Currency', isPublic: true,dataType: 'string' },
    { key: 'tax_rate',        value: 0,                          category: 'finance', label: 'Tax Rate (%)',    isPublic: false, dataType: 'number' },
    { key: 'low_stock_threshold', value: 10,                     category: 'inventory', label: 'Low Stock Threshold', isPublic: false, dataType: 'number' },
    { key: 'maintenance_alert_days', value: 7,                   category: 'maintenance', label: 'Maintenance Alert Days', isPublic: false, dataType: 'number' },
    { key: 'email_notifications', value: true,                   category: 'notifications', label: 'Email Notifications', isPublic: false, dataType: 'boolean' },
    { key: 'otp_enabled',     value: false,                      category: 'security', label: 'OTP on Login',  isPublic: false, dataType: 'boolean' },
    { key: 'session_timeout_hours', value: 8,                    category: 'security', label: 'Session Timeout (h)', isPublic: false, dataType: 'number' },
  ];

  for (const s of defaults) {
    await this.findOneAndUpdate({ key: s.key }, s, { upsert: true, new: true, setDefaultsOnInsert: true });
  }
};

module.exports = mongoose.model('Setting', settingsSchema);

'use strict';
const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  title:        { type: String, required: true, trim: true },
  type:         {
    type: String,
    required: true,
    enum: [
      'sales_summary','purchase_summary','inventory_summary',
      'production_summary','employee_summary','machine_utilisation',
      'financial_overview','custom',
    ],
  },
  description:  { type: String, default: '' },
  parameters:   { type: mongoose.Schema.Types.Mixed, default: {} },
  result:       { type: mongoose.Schema.Types.Mixed, default: null },
  status:       { type: String, enum: ['pending','running','completed','failed'], default: 'pending' },
  errorMessage: { type: String, default: '' },
  startDate:    { type: Date },
  endDate:      { type: Date },
  generatedAt:  { type: Date },
  fileUrl:      { type: String, default: '' },         // exported PDF / CSV
  format:       { type: String, enum: ['json','csv','pdf','xlsx'], default: 'json' },
  isScheduled:  { type: Boolean, default: false },
  schedule:     { type: String, default: '' },         // cron expression
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true,
  toJSON:  { virtuals: true, versionKey: false },
  toObject:{ virtuals: true },
});

reportSchema.index({ type: 1 });
reportSchema.index({ status: 1 });
reportSchema.index({ createdBy: 1 });
reportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);

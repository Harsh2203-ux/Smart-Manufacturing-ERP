'use strict';
const mongoose = require('mongoose');

const PLAN_STATUSES = ['planned','released','partially_done','completed','cancelled'];

const productionPlanSchema = new mongoose.Schema({
  planNumber:     { type: String, required: true, unique: true },
  product:        { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  plannedQty:     { type: Number, required: true, min: 1 },
  confirmedQty:   { type: Number, default: 0, min: 0 },
  startDate:      { type: Date, required: true },
  endDate:        { type: Date, required: true },
  productionLine: { type: String, default: '' },
  planner:        { type: String, default: '' },
  status:         { type: String, enum: PLAN_STATUSES, default: 'planned' },
  priority:       { type: String, enum: ['low','medium','high'], default: 'medium' },
  source:         { type: String, enum: ['mrp','manual','sales_order','forecast'], default: 'manual' },
  notes:          { type: String, default: '' },
  linkedWorkOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Production' }],
  createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true,
  toJSON:  { virtuals: true, versionKey: false },
  toObject:{ virtuals: true },
});

productionPlanSchema.index({ status: 1 });
productionPlanSchema.index({ product: 1 });
productionPlanSchema.index({ startDate: 1 });

module.exports = mongoose.model('ProductionPlan', productionPlanSchema);

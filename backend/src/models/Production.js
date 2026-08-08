'use strict';
const mongoose = require('mongoose');

const WO_STATUSES = ['planned','in_progress','on_hold','completed','cancelled'];

const materialSchema = new mongoose.Schema({
  product:      { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantityRequired: { type: Number, required: true },
  quantityUsed:     { type: Number, default: 0 },
  unit:         { type: String, default: 'pcs' },
}, { _id: false });

const productionSchema = new mongoose.Schema({
  workOrderNumber: { type: String, required: true, unique: true },
  product:         { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  machine:         { type: mongoose.Schema.Types.ObjectId, ref: 'Machine' },
  assignedTo:      { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  status:          { type: String, enum: WO_STATUSES, default: 'planned' },
  priority:        { type: String, enum: ['low','medium','high','critical'], default: 'medium' },

  quantityPlanned:   { type: Number, required: true, min: 1 },
  quantityProduced:  { type: Number, default: 0, min: 0 },
  quantityRejected:  { type: Number, default: 0, min: 0 },
  unit:              { type: String, default: 'pcs' },

  materials:         [materialSchema],

  plannedStartDate:  { type: Date, required: true },
  plannedEndDate:    { type: Date, required: true },
  actualStartDate:   { type: Date },
  actualEndDate:     { type: Date },

  qualityCheckPassed:{ type: Boolean, default: null },
  qualityNotes:      { type: String, default: '' },
  notes:             { type: String, default: '' },

  // Progress 0–100%
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    get: function () {
      if (this.quantityPlanned === 0) return 0;
      return Math.min(100, Math.round((this.quantityProduced / this.quantityPlanned) * 100));
    },
  },

  linkedOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true,
  toJSON:  { virtuals: true, versionKey: false },
  toObject:{ virtuals: true, getters: true },
});

productionSchema.index({ status: 1 });
productionSchema.index({ product: 1 });
productionSchema.index({ machine: 1 });
productionSchema.index({ plannedStartDate: 1 });

module.exports = mongoose.model('Production', productionSchema);

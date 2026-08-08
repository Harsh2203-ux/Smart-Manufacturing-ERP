'use strict';
const mongoose = require('mongoose');

const componentSchema = new mongoose.Schema({
  product:       { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity:      { type: Number, required: true, min: 0.001 },
  unit:          { type: String, default: 'pcs' },
  notes:         { type: String, default: '' },
}, { _id: true });

const bomSchema = new mongoose.Schema({
  product:      { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  version:      { type: String, required: true, default: 'v1.0', trim: true },
  type:         { type: String, enum: ['manufacture','phantom','kit','subcontract'], default: 'manufacture' },
  status:       { type: String, enum: ['draft','active','under_review','obsolete'], default: 'draft' },
  components:   [componentSchema],
  totalCost:    { type: Number, default: 0, min: 0 },
  notes:        { type: String, default: '' },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true,
  toJSON:  { virtuals: true, versionKey: false },
  toObject:{ virtuals: true },
});

bomSchema.index({ product: 1 });
bomSchema.index({ status: 1 });

module.exports = mongoose.model('BOM', bomSchema);

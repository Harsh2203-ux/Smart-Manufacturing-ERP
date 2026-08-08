'use strict';
const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema({
  code:        { type: String, required: true, unique: true, uppercase: true, trim: true },
  name:        { type: String, required: true, trim: true },
  zone:        { type: String, default: '' },
  type:        { type: String, enum: ['receiving','storage','dispatch','quality_hold','production_staging'], default: 'storage' },
  aisles:      { type: Number, default: 0, min: 0 },
  racks:       { type: Number, default: 0, min: 0 },
  totalSlots:  { type: Number, default: 0, min: 0 },
  usedSlots:   { type: Number, default: 0, min: 0 },
  manager:     { type: String, default: '' },
  temperature: { type: String, enum: ['ambient','cold','frozen','controlled'], default: 'ambient' },
  status:      { type: String, enum: ['operational','maintenance','full','closed'], default: 'operational' },
  address:     { type: String, default: '' },
  notes:       { type: String, default: '' },
  isActive:    { type: Boolean, default: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true,
  toJSON:  { virtuals: true, versionKey: false },
  toObject:{ virtuals: true },
});

warehouseSchema.index({ status: 1 });
warehouseSchema.index({ type: 1 });

module.exports = mongoose.model('Warehouse', warehouseSchema);

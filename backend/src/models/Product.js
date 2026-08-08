'use strict';
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  sku:           { type: String, required: true, unique: true, uppercase: true, trim: true },
  name:          { type: String, required: true, trim: true, maxlength: 200 },
  description:   { type: String, default: '' },
  category:      { type: String, required: true, trim: true },
  subCategory:   { type: String, default: '' },
  unit:          { type: String, required: true, default: 'pcs' },
  costPrice:     { type: Number, required: true, min: 0 },
  sellingPrice:  { type: Number, required: true, min: 0 },
  weight:        { type: Number, default: 0 },
  dimensions:    {
    length: { type: Number, default: 0 },
    width:  { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    unit:   { type: String, default: 'cm' },
  },
  images:        [{ type: String }],
  tags:          [{ type: String, lowercase: true }],
  supplier:      { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  isActive:      { type: Boolean, default: true },
  isRawMaterial: { type: Boolean, default: false },
  reorderPoint:  { type: Number, default: 0 },
  safetyStock:   { type: Number, default: 0 },
  leadTimeDays:  { type: Number, default: 0 },
  barcodeEAN:    { type: String, default: '' },
  notes:         { type: String, default: '' },
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true,
  toJSON:  { virtuals: true, versionKey: false },
  toObject:{ virtuals: true },
});

productSchema.index({ category: 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ isActive: 1 });

module.exports = mongoose.model('Product', productSchema);

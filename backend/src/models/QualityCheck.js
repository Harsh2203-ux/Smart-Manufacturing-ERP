'use strict';
const mongoose = require('mongoose');

const qualityCheckSchema = new mongoose.Schema({
  checkNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
  batch: {
    type: String,
    required: [true, 'Batch identifier is required.'],
    trim: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null,
  },
  productName: {
    type: String,
    trim: true,
    default: '',
  },
  line: {
    type: String,
    trim: true,
    default: '',
  },
  inspector: {
    type: String,
    trim: true,
    default: '',
  },
  sampleSize: {
    type: Number,
    required: [true, 'Sample size is required.'],
    min: [1, 'Sample size must be at least 1.'],
  },
  defects: {
    type: Number,
    default: 0,
    min: [0, 'Defects cannot be negative.'],
  },
  defectRate: {
    type: Number, // percentage, computed on save
    default: 0,
  },
  result: {
    type: String,
    enum: ['Pass', 'Fail', 'Conditional Pass', 'Under Review'],
    default: 'Under Review',
  },
  notes: {
    type: String,
    trim: true,
    default: '',
  },
  inspectedAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Auto-compute defect rate before save
qualityCheckSchema.pre('save', function (next) {
  if (this.sampleSize > 0) {
    this.defectRate = parseFloat(((this.defects / this.sampleSize) * 100).toFixed(2));
  }
  next();
});

// Auto-generate checkNumber
qualityCheckSchema.pre('save', async function (next) {
  if (!this.isNew || this.checkNumber) return next();
  const count = await mongoose.model('QualityCheck').countDocuments();
  this.checkNumber = `QC-${String(7200 + count + 1).padStart(4, '0')}`;
  next();
});

module.exports = mongoose.model('QualityCheck', qualityCheckSchema);

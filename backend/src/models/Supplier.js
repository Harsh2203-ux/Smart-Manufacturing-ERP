'use strict';
const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  code:         { type: String, required: true, unique: true, uppercase: true, trim: true },
  name:         { type: String, required: true, trim: true, maxlength: 200 },
  contactPerson:{ type: String, default: '' },
  email:        { type: String, default: '', lowercase: true, trim: true },
  phone:        { type: String, default: '' },
  website:      { type: String, default: '' },
  address: {
    street:  { type: String, default: '' },
    city:    { type: String, default: '' },
    state:   { type: String, default: '' },
    country: { type: String, default: '' },
    zip:     { type: String, default: '' },
  },
  category:     { type: String, default: 'General' },
  taxId:        { type: String, default: '' },
  bankDetails: {
    bankName:      { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    routingNumber: { type: String, default: '' },
    swift:         { type: String, default: '' },
  },
  paymentTerms: { type: String, default: 'Net 30' },
  leadTimeDays: { type: Number, default: 14 },
  rating:       { type: Number, min: 0, max: 5, default: 0 },
  isActive:     { type: Boolean, default: true },
  isPreferred:  { type: Boolean, default: false },
  notes:        { type: String, default: '' },
  attachments:  [{ type: String }],
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true,
  toJSON:  { virtuals: true, versionKey: false },
  toObject:{ virtuals: true },
});

supplierSchema.index({ name: 'text' });
supplierSchema.index({ isActive: 1 });

module.exports = mongoose.model('Supplier', supplierSchema);

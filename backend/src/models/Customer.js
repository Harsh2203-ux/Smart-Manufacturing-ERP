'use strict';
const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  customerNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name:           { type: String, required: true, trim: true, maxlength: 200 },
  type:           { type: String, enum: ['individual','business'], default: 'business' },
  contactPerson:  { type: String, default: '' },
  email:          { type: String, default: '', lowercase: true, trim: true },
  phone:          { type: String, default: '' },
  website:        { type: String, default: '' },
  address: {
    street:  { type: String, default: '' },
    city:    { type: String, default: '' },
    state:   { type: String, default: '' },
    country: { type: String, default: '' },
    zip:     { type: String, default: '' },
  },
  taxId:          { type: String, default: '' },
  industry:       { type: String, default: '' },
  creditLimit:    { type: Number, default: 0, min: 0 },
  paymentTerms:   { type: String, default: 'Net 30' },
  currency:       { type: String, default: 'USD' },
  isActive:       { type: Boolean, default: true },
  isVip:          { type: Boolean, default: false },
  notes:          { type: String, default: '' },
  attachments:    [{ type: String }],
  createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true,
  toJSON:  { virtuals: true, versionKey: false },
  toObject:{ virtuals: true },
});

customerSchema.index({ name: 'text', email: 'text' });
customerSchema.index({ isActive: 1 });

module.exports = mongoose.model('Customer', customerSchema);

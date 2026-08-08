'use strict';
const mongoose = require('mongoose');

const ORDER_STATUSES = ['draft','pending','confirmed','in_production','shipped','delivered','cancelled','returned'];
const ORDER_TYPES    = ['sales','purchase','internal'];

const orderItemSchema = new mongoose.Schema({
  product:      { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  sku:          { type: String, required: true },
  name:         { type: String, required: true },
  quantity:     { type: Number, required: true, min: 1 },
  unit:         { type: String, default: 'pcs' },
  unitPrice:    { type: Number, required: true, min: 0 },
  discount:     { type: Number, default: 0, min: 0, max: 100 }, // %
  tax:          { type: Number, default: 0, min: 0 },           // %
  total:        { type: Number, required: true },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber:  { type: String, required: true, unique: true },
  type:         { type: String, enum: ORDER_TYPES, required: true, default: 'sales' },
  status:       { type: String, enum: ORDER_STATUSES, default: 'draft' },
  customer:     { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  supplier:     { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  items:        [orderItemSchema],

  // ── Financials ─────────────────────────────────────────────────────────
  subtotal:     { type: Number, default: 0 },
  taxAmount:    { type: Number, default: 0 },
  discountAmount:{ type: Number, default: 0 },
  shippingCost: { type: Number, default: 0 },
  total:        { type: Number, default: 0 },
  currency:     { type: String, default: 'USD' },

  // ── Addresses ──────────────────────────────────────────────────────────
  shippingAddress: {
    street: String, city: String, state: String, country: String, zip: String,
  },
  billingAddress: {
    street: String, city: String, state: String, country: String, zip: String,
  },

  // ── Dates ──────────────────────────────────────────────────────────────
  orderDate:    { type: Date, default: Date.now },
  dueDate:      { type: Date },
  shippedDate:  { type: Date },
  deliveredDate:{ type: Date },

  paymentStatus:{ type: String, enum: ['unpaid','partial','paid','refunded'], default: 'unpaid' },
  paymentMethod:{ type: String, default: '' },
  notes:        { type: String, default: '' },
  attachments:  [{ type: String }],
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true,
  toJSON:  { virtuals: true, versionKey: false },
  toObject:{ virtuals: true },
});

orderSchema.index({ status: 1 });
orderSchema.index({ type: 1 });
orderSchema.index({ customer: 1 });
orderSchema.index({ supplier: 1 });
orderSchema.index({ createdAt: -1 });

// Auto-compute totals before save
orderSchema.pre('save', function (next) {
  this.subtotal = this.items.reduce((s, i) => s + (i.unitPrice * i.quantity), 0);
  const discountAmt = this.items.reduce((s, i) => s + (i.unitPrice * i.quantity * i.discount / 100), 0);
  const taxAmt      = this.items.reduce((s, i) => s + ((i.unitPrice * i.quantity - i.unitPrice * i.quantity * i.discount / 100) * i.tax / 100), 0);
  this.discountAmount = discountAmt;
  this.taxAmount      = taxAmt;
  this.total = this.subtotal - discountAmt + taxAmt + (this.shippingCost || 0);
  next();
});

module.exports = mongoose.model('Order', orderSchema);

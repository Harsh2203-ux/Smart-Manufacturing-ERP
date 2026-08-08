'use strict';
const mongoose = require('mongoose');

const TRANSACTION_TYPES = ['receipt', 'issue', 'adjustment', 'transfer', 'return', 'scrap'];

const inventorySchema = new mongoose.Schema({
  product:       { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  warehouse:     { type: String, required: true, default: 'Main Warehouse' },
  location:      { type: String, default: '' },       // bin / shelf code
  quantity:      { type: Number, required: true, default: 0, min: 0 },
  reservedQty:   { type: Number, default: 0, min: 0 },
  availableQty:  { type: Number, default: 0, min: 0 },
  unit:          { type: String, required: true, default: 'pcs' },
  batchNumber:   { type: String, default: '' },
  expiryDate:    { type: Date },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON:  { virtuals: true, versionKey: false },
  toObject:{ virtuals: true },
});

// Compute availableQty as a virtual
inventorySchema.pre('save', function (next) {
  this.availableQty = Math.max(0, this.quantity - this.reservedQty);
  next();
});

inventorySchema.index({ product: 1, warehouse: 1 }, { unique: true });
inventorySchema.index({ warehouse: 1 });

// ── Inventory transaction log ──────────────────────────────────────────────────
const transactionSchema = new mongoose.Schema({
  product:       { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  type:          { type: String, enum: TRANSACTION_TYPES, required: true },
  quantity:      { type: Number, required: true },
  previousQty:   { type: Number, required: true },
  newQty:        { type: Number, required: true },
  warehouse:     { type: String, required: true, default: 'Main Warehouse' },
  reference:     { type: String, default: '' },      // order # / work order #
  notes:         { type: String, default: '' },
  performedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, toJSON: { virtuals: true, versionKey: false } });

transactionSchema.index({ product: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ createdAt: -1 });

module.exports = {
  Inventory:           mongoose.model('Inventory', inventorySchema),
  InventoryTransaction:mongoose.model('InventoryTransaction', transactionSchema),
};

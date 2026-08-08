'use strict';
const mongoose = require('mongoose');

const MACHINE_STATUSES = ['operational','idle','maintenance','breakdown','decommissioned'];

const maintenanceLogSchema = new mongoose.Schema({
  type:          { type: String, enum: ['preventive','corrective','predictive'], required: true },
  description:   { type: String, required: true },
  performedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  cost:          { type: Number, default: 0 },
  downtimeHours: { type: Number, default: 0 },
  partsReplaced: [{ type: String }],
  date:          { type: Date, default: Date.now },
  nextDueDate:   { type: Date },
}, { _id: true });

const machineSchema = new mongoose.Schema({
  machineId:      { type: String, required: true, unique: true, uppercase: true, trim: true },
  name:           { type: String, required: true, trim: true },
  type:           { type: String, required: true },
  manufacturer:   { type: String, default: '' },
  model:          { type: String, default: '' },
  serialNumber:   { type: String, default: '' },
  location:       { type: String, default: '' },
  status:         { type: String, enum: MACHINE_STATUSES, default: 'idle' },
  purchaseDate:   { type: Date },
  purchaseCost:   { type: Number, default: 0 },
  warrantyExpiry: { type: Date },
  capacityPerHour:{ type: Number, default: 0 },
  unit:           { type: String, default: 'pcs' },
  powerKw:        { type: Number, default: 0 },
  oeeTarget:      { type: Number, default: 85, min: 0, max: 100 },  // %
  maintenanceLogs:[maintenanceLogSchema],
  nextMaintenanceDate: { type: Date },
  lastMaintenanceDate: { type: Date },
  totalDowntimeHours:  { type: Number, default: 0 },
  isActive:       { type: Boolean, default: true },
  notes:          { type: String, default: '' },
  images:         [{ type: String }],
  createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true,
  toJSON:  { virtuals: true, versionKey: false },
  toObject:{ virtuals: true },
});

machineSchema.index({ status: 1 });
machineSchema.index({ location: 1 });

module.exports = mongoose.model('Machine', machineSchema);

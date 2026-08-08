'use strict';
const mongoose = require('mongoose');

const EMP_STATUSES = ['active','on_leave','terminated','probation'];

const employeeSchema = new mongoose.Schema({
  employeeId:   { type: String, required: true, unique: true, uppercase: true, trim: true },
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  firstName:    { type: String, required: true, trim: true },
  lastName:     { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:        { type: String, default: '' },
  department:   { type: String, required: true },
  position:     { type: String, required: true },
  hireDate:     { type: Date, required: true },
  terminationDate:{ type: Date },
  status:       { type: String, enum: EMP_STATUSES, default: 'active' },
  salary:       { type: Number, default: 0, min: 0, select: false },
  currency:     { type: String, default: 'USD' },
  address: {
    street: String, city: String, state: String, country: String, zip: String,
  },
  emergencyContact: {
    name:         { type: String, default: '' },
    relationship: { type: String, default: '' },
    phone:        { type: String, default: '' },
  },
  skills:       [{ type: String, lowercase: true }],
  certifications:[{
    name:      { type: String },
    issuer:    { type: String },
    expiryDate:{ type: Date },
  }],
  shift:        { type: String, enum: ['day','evening','night','rotating'], default: 'day' },
  manager:      { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  avatarUrl:    { type: String, default: '' },
  notes:        { type: String, default: '' },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true,
  toJSON:  { virtuals: true, versionKey: false },
  toObject:{ virtuals: true },
});

employeeSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

employeeSchema.index({ department: 1 });
employeeSchema.index({ status: 1 });
employeeSchema.index({ firstName: 'text', lastName: 'text' });

module.exports = mongoose.model('Employee', employeeSchema);

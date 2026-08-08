'use strict';
const mongoose = require('mongoose');

const maintenanceTaskSchema = new mongoose.Schema({
  taskNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
  asset: {
    type: String,
    required: [true, 'Asset name is required.'],
    trim: true,
  },
  machine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Machine',
    default: null,
  },
  assetId: {
    type: String,
    trim: true,
    default: '',
  },
  type: {
    type: String,
    enum: ['Preventive', 'Corrective', 'Predictive', 'Emergency'],
    default: 'Preventive',
  },
  priority: {
    type: String,
    enum: ['Critical', 'High', 'Medium', 'Low'],
    default: 'Medium',
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Completed', 'Overdue'],
    default: 'Open',
  },
  assignedTo: {
    type: String,
    trim: true,
    default: '',
  },
  assignedEmployee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null,
  },
  scheduledDate: {
    type: Date,
    required: [true, 'Scheduled date is required.'],
  },
  completedDate: {
    type: Date,
    default: null,
  },
  estimatedHours: {
    type: Number,
    default: 1,
    min: [0.5, 'Estimated hours must be at least 0.5.'],
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  notes: {
    type: String,
    trim: true,
    default: '',
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

// Auto-generate taskNumber
maintenanceTaskSchema.pre('save', async function (next) {
  if (!this.isNew || this.taskNumber) return next();
  const count = await mongoose.model('MaintenanceTask').countDocuments();
  this.taskNumber = `MT-${String(3300 + count + 1).padStart(4, '0')}`;
  next();
});

// Auto-mark Overdue if scheduled date passed and not completed
maintenanceTaskSchema.pre('save', function (next) {
  if (this.status === 'Open' && this.scheduledDate && new Date(this.scheduledDate) < new Date() ) {
    this.status = 'Overdue';
  }
  next();
});

module.exports = mongoose.model('MaintenanceTask', maintenanceTaskSchema);

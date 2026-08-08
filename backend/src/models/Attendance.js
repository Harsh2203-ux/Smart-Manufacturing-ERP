'use strict';
const mongoose = require('mongoose');

const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Late', 'Half Day', 'On Leave', 'Holiday', 'Weekend'];
const SHIFTS = ['Morning', 'Afternoon', 'Night', 'General'];

const attendanceSchema = new mongoose.Schema({
  attendanceId: {
    type: String,
    unique: true,
    sparse: true,
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null,
  },
  // Denormalised for fast display (employee may not exist in DB)
  employeeId:   { type: String, trim: true, default: '' },
  employeeName: { type: String, trim: true, default: '' },
  department:   { type: String, trim: true, default: '' },

  date: {
    type: Date,
    required: [true, 'Date is required.'],
    default: () => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    },
  },

  shift: {
    type: String,
    enum: SHIFTS,
    default: 'General',
  },

  scheduledIn:  { type: String, default: '' },
  scheduledOut: { type: String, default: '' },
  actualIn:     { type: String, default: '' },
  actualOut:    { type: String, default: '' },

  hoursWorked: { type: Number, default: 0, min: 0 },
  overtime:    { type: Number, default: 0, min: 0 },

  status: {
    type: String,
    enum: ATTENDANCE_STATUSES,
    required: [true, 'Status is required.'],
    default: 'Present',
  },

  note: { type: String, trim: true, default: '' },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: true,
  toJSON:  { virtuals: true, versionKey: false },
  toObject:{ virtuals: true },
});

// Auto-generate attendanceId (ATT-NNNN)
attendanceSchema.pre('save', async function (next) {
  if (!this.isNew || this.attendanceId) return next();
  const count = await mongoose.model('Attendance').countDocuments();
  this.attendanceId = `ATT-${String(count + 1).padStart(4, '0')}`;
  next();
});

attendanceSchema.index({ date: -1 });
attendanceSchema.index({ employee: 1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ department: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);

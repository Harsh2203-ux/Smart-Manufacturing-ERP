'use strict';
const Attendance = require('../models/Attendance');
const Employee   = require('../models/Employee');
const { ApiResponse, ApiError, asyncHandler, getPagination, buildPaginationMeta } = require('../utils/apiResponse');

// ── List ──────────────────────────────────────────────────────────────────────

exports.getRecords = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};

  if (req.query.status)     filter.status     = req.query.status;
  if (req.query.department) filter.department = req.query.department;
  if (req.query.shift)      filter.shift      = req.query.shift;

  // date filter — default to today if no date supplied
  if (req.query.date) {
    const d = new Date(req.query.date);
    d.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    filter.date = { $gte: d, $lte: end };
  } else if (!req.query.all) {
    // default: today's records
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const end   = new Date(); end.setHours(23, 59, 59, 999);
    filter.date = { $gte: today, $lte: end };
  }

  if (req.query.search) {
    const re = new RegExp(req.query.search, 'i');
    filter.$or = [
      { employeeName: re },
      { employeeId:   re },
      { department:   re },
      { attendanceId: re },
    ];
  }

  const [items, total] = await Promise.all([
    Attendance.find(filter)
      .populate('employee', 'firstName lastName employeeId department')
      .sort({ date: -1, employeeName: 1 })
      .skip(skip)
      .limit(limit),
    Attendance.countDocuments(filter),
  ]);

  new ApiResponse(200, 'Attendance records retrieved.', items, buildPaginationMeta(total, page, limit)).send(res);
});

// ── Single ────────────────────────────────────────────────────────────────────

exports.getRecord = asyncHandler(async (req, res) => {
  const rec = await Attendance.findById(req.params.id)
    .populate('employee', 'firstName lastName employeeId department');
  if (!rec) throw ApiError.notFound('Attendance record not found.');
  new ApiResponse(200, 'Attendance record retrieved.', rec).send(res);
});

// ── Create ────────────────────────────────────────────────────────────────────

exports.createRecord = asyncHandler(async (req, res) => {
  req.body.createdBy = req.user.id;

  // If an Employee ObjectId is supplied, auto-fill denormalised fields
  if (req.body.employee) {
    const emp = await Employee.findById(req.body.employee).select('firstName lastName employeeId department');
    if (emp) {
      req.body.employeeName = req.body.employeeName || `${emp.firstName} ${emp.lastName}`;
      req.body.employeeId   = req.body.employeeId   || emp.employeeId;
      req.body.department   = req.body.department   || emp.department;
    }
  }

  const rec = await Attendance.create(req.body);
  new ApiResponse(201, 'Attendance record created.', rec).send(res);
});

// ── Update ────────────────────────────────────────────────────────────────────

exports.updateRecord = asyncHandler(async (req, res) => {
  const rec = await Attendance.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!rec) throw ApiError.notFound('Attendance record not found.');
  new ApiResponse(200, 'Attendance record updated.', rec).send(res);
});

// ── Delete ────────────────────────────────────────────────────────────────────

exports.deleteRecord = asyncHandler(async (req, res) => {
  const rec = await Attendance.findByIdAndDelete(req.params.id);
  if (!rec) throw ApiError.notFound('Attendance record not found.');
  new ApiResponse(200, 'Attendance record deleted.').send(res);
});

// ── Summary (KPIs for today / given date) ─────────────────────────────────────

exports.getSummary = asyncHandler(async (req, res) => {
  const d = req.query.date ? new Date(req.query.date) : new Date();
  d.setHours(0, 0, 0, 0);
  const end = new Date(d); end.setHours(23, 59, 59, 999);

  const agg = await Attendance.aggregate([
    { $match: { date: { $gte: d, $lte: end } } },
    {
      $group: {
        _id: null,
        total:     { $sum: 1 },
        present:   { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
        absent:    { $sum: { $cond: [{ $eq: ['$status', 'Absent']  }, 1, 0] } },
        late:      { $sum: { $cond: [{ $eq: ['$status', 'Late']    }, 1, 0] } },
        halfDay:   { $sum: { $cond: [{ $eq: ['$status', 'Half Day']}, 1, 0] } },
        onLeave:   { $sum: { $cond: [{ $eq: ['$status', 'On Leave']}, 1, 0] } },
        totalOT:   { $sum: '$overtime' },
        totalHours:{ $sum: '$hoursWorked' },
      },
    },
  ]);

  const summary = agg[0] || { total: 0, present: 0, absent: 0, late: 0, halfDay: 0, onLeave: 0, totalOT: 0, totalHours: 0 };
  new ApiResponse(200, 'Attendance summary retrieved.', summary).send(res);
});

// ── Departments list (for filter dropdown) ────────────────────────────────────

exports.getDepartments = asyncHandler(async (_req, res) => {
  const depts = await Attendance.distinct('department');
  new ApiResponse(200, 'Departments retrieved.', depts.filter(Boolean)).send(res);
});

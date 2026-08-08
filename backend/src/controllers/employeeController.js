'use strict';
const Employee = require('../models/Employee');
const { ApiResponse, ApiError, asyncHandler, getPagination, buildPaginationMeta, buildSort } = require('../utils/apiResponse');

exports.getEmployees = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.department) filter.department = req.query.department;
  if (req.query.status)     filter.status     = req.query.status;
  if (req.query.shift)      filter.shift      = req.query.shift;
  if (req.query.search)     filter.$text      = { $search: req.query.search };

  const sort = buildSort(req.query.sort, ['firstName','lastName','employeeId','department','hireDate','createdAt']);
  const [employees, total] = await Promise.all([
    Employee.find(filter).populate('manager','firstName lastName employeeId').sort(sort).skip(skip).limit(limit),
    Employee.countDocuments(filter),
  ]);
  new ApiResponse(200, 'Employees retrieved.', employees, buildPaginationMeta(total, page, limit)).send(res);
});

exports.getEmployee = asyncHandler(async (req, res) => {
  const emp = await Employee.findById(req.params.id).populate('manager','firstName lastName').populate('user','email role');
  if (!emp) throw ApiError.notFound('Employee not found.');
  new ApiResponse(200, 'Employee retrieved.', emp).send(res);
});

exports.createEmployee = asyncHandler(async (req, res) => {
  req.body.createdBy = req.user.id;
  if (!req.body.employeeId) req.body.employeeId = 'EMP-' + Date.now().toString().slice(-6);
  const emp = await Employee.create(req.body);
  new ApiResponse(201, 'Employee created.', emp).send(res);
});

exports.updateEmployee = asyncHandler(async (req, res) => {
  delete req.body.salary; // salary updates require separate privilege check
  const emp = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!emp) throw ApiError.notFound('Employee not found.');
  new ApiResponse(200, 'Employee updated.', emp).send(res);
});

exports.deleteEmployee = asyncHandler(async (req, res) => {
  const emp = await Employee.findByIdAndDelete(req.params.id);
  if (!emp) throw ApiError.notFound('Employee not found.');
  new ApiResponse(200, 'Employee deleted.').send(res);
});

exports.getDepartments = asyncHandler(async (_req, res) => {
  const departments = await Employee.distinct('department');
  new ApiResponse(200, 'Departments retrieved.', departments).send(res);
});

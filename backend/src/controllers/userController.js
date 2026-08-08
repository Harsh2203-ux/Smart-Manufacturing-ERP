'use strict';
const User = require('../models/User');
const { ApiResponse, ApiError, asyncHandler, getPagination, buildPaginationMeta, buildSort } = require('../utils/apiResponse');

exports.getUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.role)     filter.role     = req.query.role;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
  if (req.query.search)   filter.$or = [
    { name:  { $regex: req.query.search, $options: 'i' } },
    { email: { $regex: req.query.search, $options: 'i' } },
  ];

  const sort  = buildSort(req.query.sort, ['name','email','role','createdAt']);
  const [users, total] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  new ApiResponse(200, 'Users retrieved.', users.map(u => u.toPublic()),
    buildPaginationMeta(total, page, limit)).send(res);
});

exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found.');
  new ApiResponse(200, 'User retrieved.', user.toPublic()).send(res);
});

exports.updateUser = asyncHandler(async (req, res) => {
  const forbidden = ['password','refreshToken','loginAttempts','lockUntil'];
  forbidden.forEach(f => delete req.body[f]);
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!user) throw ApiError.notFound('User not found.');
  new ApiResponse(200, 'User updated.', user.toPublic()).send(res);
});

exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw ApiError.notFound('User not found.');
  new ApiResponse(200, 'User deleted.').send(res);
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['name','phone','department','avatarUrl'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });
  new ApiResponse(200, 'Profile updated.', user.toPublic()).send(res);
});

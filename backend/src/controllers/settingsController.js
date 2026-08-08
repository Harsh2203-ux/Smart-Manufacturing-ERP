'use strict';
const Setting = require('../models/Settings');
const { ApiResponse, ApiError, asyncHandler } = require('../utils/apiResponse');

exports.getSettings = asyncHandler(async (req, res) => {
  const filter = req.user?.role === 'admin' ? {} : { isPublic: true };
  if (req.query.category) filter.category = req.query.category;
  const settings = await Setting.find(filter).sort('category key');
  // Return as key→value map for easy front-end consumption
  const map = {};
  settings.forEach(s => { map[s.key] = s.value; });
  new ApiResponse(200, 'Settings retrieved.', map).send(res);
});

exports.getSetting = asyncHandler(async (req, res) => {
  const setting = await Setting.findOne({ key: req.params.key });
  if (!setting) throw ApiError.notFound('Setting not found.');
  if (!setting.isPublic && req.user?.role !== 'admin') throw ApiError.forbidden('Not authorised.');
  new ApiResponse(200, 'Setting retrieved.', setting).send(res);
});

exports.updateSetting = asyncHandler(async (req, res) => {
  const setting = await Setting.findOne({ key: req.params.key });
  if (!setting) throw ApiError.notFound('Setting not found.');
  if (!setting.isEditable) throw ApiError.forbidden('This setting cannot be modified.');

  setting.value     = req.body.value;
  setting.updatedBy = req.user.id;
  await setting.save();
  new ApiResponse(200, 'Setting updated.', setting).send(res);
});

exports.bulkUpdate = asyncHandler(async (req, res) => {
  const { settings } = req.body; // [{ key, value }]
  if (!Array.isArray(settings)) throw ApiError.badRequest('settings must be an array.');

  const results = await Promise.all(
    settings.map(({ key, value }) =>
      Setting.findOneAndUpdate(
        { key, isEditable: true },
        { value, updatedBy: req.user.id },
        { new: true }
      )
    )
  );
  new ApiResponse(200, 'Settings updated.', results.filter(Boolean)).send(res);
});

'use strict';
const multer = require('multer');
const path   = require('path');
const { v4: uuid } = require('uuid');
const config = require('../config');
const { ApiError } = require('../utils/apiResponse');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.upload.dest),
  filename:    (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${uuid()}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (_req, file, cb) => {
  if (config.upload.allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, `File type '${file.mimetype}' is not allowed.`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.upload.maxSizeBytes },
});

module.exports = { upload };

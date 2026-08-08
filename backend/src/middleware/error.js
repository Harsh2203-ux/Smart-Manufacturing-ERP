'use strict';
const mongoose = require('mongoose');
const logger   = require('../utils/logger');
const { ApiError } = require('../utils/apiResponse');
const config   = require('../config');

/**
 * Central Express error handler.
 * Must have exactly 4 parameters so Express recognises it as an error handler.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  let error = { ...err };
  error.message = err.message;

  // ── Mongoose: bad ObjectId ──────────────────────────────────────────────
  if (err.name === 'CastError') {
    error = ApiError.notFound(`Resource not found with id: ${err.value}`);
  }

  // ── Mongoose: duplicate key ─────────────────────────────────────────────
  if (err.code === 11000) {
    const field  = Object.keys(err.keyValue || {})[0] || 'field';
    const value  = err.keyValue?.[field];
    error = ApiError.conflict(`Duplicate value: '${value}' is already in use for ${field}.`);
  }

  // ── Mongoose: validation error ──────────────────────────────────────────
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({ field: e.path, message: e.message }));
    error = ApiError.unprocessable('Validation failed.', errors);
  }

  // ── JWT errors ──────────────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError')  error = ApiError.unauthorized('Invalid token.');
  if (err.name === 'TokenExpiredError')  error = ApiError.unauthorized('Token expired.');

  // ── Multer file size ────────────────────────────────────────────────────
  if (err.code === 'LIMIT_FILE_SIZE') error = ApiError.badRequest('File size exceeds the allowed limit.');

  const statusCode = error.statusCode || 500;
  const message    = error.message    || 'Internal Server Error';

  if (config.env !== 'production') {
    logger.error(`${req.method} ${req.originalUrl} → ${statusCode}: ${message}`, { stack: err.stack });
  } else if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} → ${statusCode}: ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(error.errors?.length && { errors: error.errors }),
    ...(config.env === 'development' && statusCode >= 500 && { stack: err.stack }),
  });
};

/**
 * 404 handler — must be registered AFTER all routes.
 */
const notFound = (req, res, _next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

module.exports = { errorHandler, notFound };

'use strict';

/**
 * Uniform JSON response helper.
 * All controllers call res.success() / res.error() via the
 * responseHelper middleware, or construct ApiResponse objects directly.
 */
class ApiResponse {
  constructor(statusCode, message, data = null, meta = null) {
    this.statusCode = statusCode;
    this.success    = statusCode >= 200 && statusCode < 300;
    this.message    = message;
    if (data !== null) this.data = data;
    if (meta !== null) this.meta = meta;
  }

  send(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      message: this.message,
      ...(this.data !== undefined && { data: this.data }),
      ...(this.meta !== undefined && { meta: this.meta }),
    });
  }
}

class ApiError extends Error {
  constructor(statusCode, message, errors = [], stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.errors     = errors;
    this.isOperational = true;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(msg, errors)   { return new ApiError(400, msg, errors); }
  static unauthorized(msg)         { return new ApiError(401, msg || 'Unauthorized'); }
  static forbidden(msg)            { return new ApiError(403, msg || 'Forbidden'); }
  static notFound(msg)             { return new ApiError(404, msg || 'Resource not found'); }
  static conflict(msg)             { return new ApiError(409, msg || 'Conflict'); }
  static unprocessable(msg, errors){ return new ApiError(422, msg, errors); }
  static tooManyRequests(msg)      { return new ApiError(429, msg || 'Too many requests'); }
  static internal(msg)             { return new ApiError(500, msg || 'Internal server error'); }
}

/**
 * Wraps async route handlers so unhandled promise rejections
 * are forwarded to Express's next(err) automatically.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Pagination helper — reads page/limit from query params and
 * returns skip offset + sanitised values.
 */
const getPagination = (query) => {
  const page  = Math.max(1, parseInt(query.page,  10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

/**
 * Build a standard pagination meta object to include in list responses.
 */
const buildPaginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  pages: Math.ceil(total / limit),
  hasNext: page * limit < total,
  hasPrev: page > 1,
});

/**
 * Sanitise a sort string like "-createdAt,name" into a Mongoose sort object.
 */
const buildSort = (sortQuery, allowed = []) => {
  if (!sortQuery) return { createdAt: -1 };
  const sort = {};
  String(sortQuery).split(',').forEach((field) => {
    const dir = field.startsWith('-') ? -1 : 1;
    const key = field.replace(/^-/, '');
    if (!allowed.length || allowed.includes(key)) sort[key] = dir;
  });
  return Object.keys(sort).length ? sort : { createdAt: -1 };
};

module.exports = { ApiResponse, ApiError, asyncHandler, getPagination, buildPaginationMeta, buildSort };

'use strict';
const { validationResult } = require('express-validator');
const { ApiError } = require('../utils/apiResponse');

/**
 * Run after express-validator chains.
 * If there are validation errors, throw an ApiError with all field errors.
 */
const validate = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const fieldErrors = errors.array().map(e => ({
      field:   e.path || e.param,
      message: e.msg,
      value:   e.value,
    }));
    return next(ApiError.unprocessable('Validation failed.', fieldErrors));
  }
  next();
};

module.exports = { validate };

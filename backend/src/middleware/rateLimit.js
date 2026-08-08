'use strict';
const rateLimit = require('express-rate-limit');
const config    = require('../config');

const createLimiter = (max, message) =>
  rateLimit({
    windowMs:   config.rateLimit.windowMs,
    max,
    standardHeaders: true,
    legacyHeaders:   false,
    message: { success: false, message: message || 'Too many requests. Please try again later.' },
  });

/** General API limiter — applied globally */
const apiLimiter  = createLimiter(config.rateLimit.max,     'Too many API requests. Please slow down.');
/** Strict limiter for auth endpoints */
const authLimiter = createLimiter(config.rateLimit.authMax, 'Too many authentication attempts. Please try again in 15 minutes.');

module.exports = { apiLimiter, authLimiter };

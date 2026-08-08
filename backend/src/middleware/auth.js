'use strict';
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const config = require('../config');
const { ApiError, asyncHandler } = require('../utils/apiResponse');

/**
 * protect — verify the JWT in the Authorization header or access_token cookie.
 * Attaches `req.user` on success.
 */
const protect = asyncHandler(async (req, _res, next) => {
  let token;

  // 1. HTTP-only cookie (preferred in production)
  if (req.cookies?.access_token) {
    token = req.cookies.access_token;
  }
  // 2. Authorization: Bearer <token> header fallback
  else if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) throw ApiError.unauthorized('No authentication token provided.');

  let decoded;
  try {
    decoded = jwt.verify(token, config.jwt.secret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') throw ApiError.unauthorized('Session has expired. Please sign in again.');
    throw ApiError.unauthorized('Invalid authentication token.');
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user)          throw ApiError.unauthorized('Account not found.');
  if (!user.isActive) throw ApiError.forbidden('Your account has been deactivated.');
  if (user.isLocked()) throw ApiError.forbidden('Account is temporarily locked. Please try again later.');

  req.user = user;
  next();
});

/**
 * authorize(...roles) — restrict route to specific roles.
 * Must be used AFTER protect.
 */
const authorize = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden(`Role '${req.user.role}' is not authorised to access this resource.`));
  }
  next();
};

/**
 * optionalAuth — like protect but does NOT throw if no token is present.
 * Attaches req.user if valid token exists; leaves it undefined otherwise.
 */
const optionalAuth = asyncHandler(async (req, _res, next) => {
  let token;
  if (req.cookies?.access_token) token = req.cookies.access_token;
  else if (req.headers.authorization?.startsWith('Bearer ')) token = req.headers.authorization.split(' ')[1];
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    const user    = await User.findById(decoded.id);
    if (user && user.isActive) req.user = user;
  } catch {
    // silently ignore invalid / expired token
  }
  next();
});

module.exports = { protect, authorize, optionalAuth };

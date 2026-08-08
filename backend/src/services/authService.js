'use strict';
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const User   = require('../models/User');
const config = require('../config');
const { generateToken } = require('../utils/helpers');

/** Issue a signed access JWT for a user. */
function signAccessToken(userId) {
  return jwt.sign({ id: userId }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

/** Issue a signed refresh JWT. */
function signRefreshToken(userId) {
  return jwt.sign({ id: userId }, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
}

/** Attach the access token as an HTTP-only cookie to the response. */
function setAuthCookies(res, accessToken, refreshToken, rememberMe = false) {
  const accessMaxAge  = 8 * 60 * 60 * 1000;                         // 8 h
  const refreshMaxAge = rememberMe
    ? 30 * 24 * 60 * 60 * 1000                                       // 30 days
    : 7  * 24 * 60 * 60 * 1000;                                      // 7 days

  const base = {
    httpOnly: true,
    secure:   config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path:     '/',
  };

  res.cookie('access_token',  accessToken,  { ...base, maxAge: accessMaxAge });
  res.cookie('refresh_token', refreshToken, { ...base, maxAge: refreshMaxAge, path: '/api/v1/auth/refresh' });
}

/** Clear both auth cookies. */
function clearAuthCookies(res) {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  setAuthCookies,
  clearAuthCookies,
};

'use strict';
const crypto = require('crypto');

/** Generate a cryptographically random hex token of `length` bytes. */
const generateToken = (length = 32) => crypto.randomBytes(length).toString('hex');

/** Hash a plain token for storage (SHA-256 — not bcrypt, tokens aren't passwords). */
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/** Return the current Unix epoch in seconds. */
const nowSeconds = () => Math.floor(Date.now() / 1000);

/** Format bytes into a human-readable string. */
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes','KB','MB','GB','TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

/** Deep-omit keys from an object (e.g. strip sensitive fields). */
const omitKeys = (obj, keys) => {
  const result = { ...obj };
  keys.forEach(k => delete result[k]);
  return result;
};

/** Build a slug-safe code from a string (e.g. "Widget A" → "WIDGET-A"). */
const toCode = (str) =>
  String(str).toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');

module.exports = { generateToken, hashToken, nowSeconds, formatBytes, omitKeys, toCode };

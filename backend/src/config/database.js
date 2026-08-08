'use strict';
const mongoose = require('mongoose');
const config   = require('./index');
const logger   = require('../utils/logger');

// ── IP-whitelist error detection ───────────────────────────────────────────────
// MongoDB Atlas returns a TLS alert (code 80 / ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR)
// when the connecting IP is not in the project's IP Access List.  The generic
// mongoose message ("Could not connect to any servers…") buries this fact.
// We surface it explicitly so the developer knows exactly what to fix.
function isIpWhitelistError(message = '') {
  return (
    message.includes('SSL alert number 80') ||
    message.includes('TLSV1_ALERT_INTERNAL_ERROR') ||
    message.includes('tlsv1 alert internal error') ||
    message.includes("IP that isn't whitelisted") ||
    message.includes('IP whitelist')
  );
}

function logConnectionError(err) {
  const msg = err.message || '';
  if (isIpWhitelistError(msg)) {
    logger.error('━'.repeat(64));
    logger.error('MongoDB Atlas connection BLOCKED — IP not whitelisted');
    logger.error('');
    logger.error('Fix: Go to MongoDB Atlas → Network Access → Add IP Address');
    logger.error('  • Add your current IP, OR');
    logger.error('  • Add 0.0.0.0/0 (allow all — only for development)');
    logger.error('');
    logger.error('Your current public IP: run  curl https://api.ipify.org');
    logger.error('━'.repeat(64));
  } else {
    logger.error(`MongoDB connection failed: ${msg}`);
  }
}

// ── connectDB ──────────────────────────────────────────────────────────────────
async function connectDB() {
  if (mongoose.connection.readyState === 1) return; // already connected

  try {
    const conn = await mongoose.connect(config.mongo.uri, config.mongo.options);
    logger.info(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    logConnectionError(err);
    process.exit(1);
  }
}

// ── Connection event listeners ─────────────────────────────────────────────────
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected.');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected.');
});

mongoose.connection.on('error', (err) => {
  logConnectionError(err);
});

module.exports = { connectDB };

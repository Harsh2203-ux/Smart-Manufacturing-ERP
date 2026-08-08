'use strict';
require('dotenv').config();

const required = [
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`[config] FATAL: Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

module.exports = {
  // ── Server ──────────────────────────────────────────────────────────────────
  env:     process.env.NODE_ENV     || 'development',
  port:    parseInt(process.env.PORT, 10) || 5000,
  apiVersion: process.env.API_VERSION || 'v1',

  // ── Database ─────────────────────────────────────────────────────────────────
  mongo: {
    uri: process.env.MONGO_URI,
    options: {
      // Timeout: fail fast so startup errors are obvious
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS:          45000,
      connectTimeoutMS:         10000,
      // Heartbeat: detect drops quickly
      heartbeatFrequencyMS:     10000,
      // Connection pool
      maxPoolSize:              10,
      minPoolSize:              2,
      // TLS is required by MongoDB Atlas — the driver handles it automatically
      // when the URI uses the +srv scheme.  Do NOT set tls:false or
      // tlsAllowInvalidCertificates:true — that would downgrade security.
      tls:                      true,
      // Retry on transient network errors
      retryWrites:              true,
      retryReads:               true,
      // Force IPv4 to avoid IPv6 routing issues on some cloud providers
      family:                   4,
    },
  },

  // ── JWT ───────────────────────────────────────────────────────────────────────
  jwt: {
    secret:          process.env.JWT_SECRET,
    expiresIn:       process.env.JWT_EXPIRES_IN        || '8h',
    refreshSecret:   process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn:process.env.JWT_REFRESH_EXPIRES_IN|| '30d',
  },

  // ── Auth ──────────────────────────────────────────────────────────────────────
  bcryptRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,

  // ── CORS ──────────────────────────────────────────────────────────────────────
  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
      .split(',')
      .map(o => o.trim()),
  },

  // ── Cookies ───────────────────────────────────────────────────────────────────
  cookie: {
    secret:   process.env.COOKIE_SECRET   || 'change_me',
    secure:   process.env.COOKIE_SECURE   === 'true',
    sameSite: process.env.COOKIE_SAME_SITE|| 'lax',
    httpOnly: true,
  },

  // ── Rate limiting ─────────────────────────────────────────────────────────────
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    // Development: 1 000 req/15 min (plenty for HMR + StrictMode double effects)
    // Production : set RATE_LIMIT_MAX=200 in environment
    max:      parseInt(process.env.RATE_LIMIT_MAX, 10) ||
              (process.env.NODE_ENV === 'production' ? 200 : 1000),
    // Auth endpoints: 20 in dev (allows testing), 10 in production
    authMax:  parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) ||
              (process.env.NODE_ENV === 'production' ? 10 : 20),
  },

  // ── Email ─────────────────────────────────────────────────────────────────────
  email: {
    host:    process.env.SMTP_HOST          || 'smtp.mailtrap.io',
    port:    parseInt(process.env.SMTP_PORT, 10) || 587,
    secure:  process.env.SMTP_SECURE        === 'true',
    user:    process.env.SMTP_USER          || '',
    pass:    process.env.SMTP_PASS          || '',
    fromName:process.env.EMAIL_FROM_NAME    || 'Smart Manufacturing ERP',
    fromAddress:process.env.EMAIL_FROM_ADDRESS || 'noreply@erp.local',
  },

  // ── File uploads ──────────────────────────────────────────────────────────────
  upload: {
    maxSizeBytes: (parseInt(process.env.UPLOAD_MAX_SIZE_MB, 10) || 10) * 1024 * 1024,
    allowedTypes: (process.env.UPLOAD_ALLOWED_TYPES || 'image/jpeg,image/png,image/webp,application/pdf')
      .split(',').map(t => t.trim()),
    dest: 'uploads/',
  },

  // ── Frontend ──────────────────────────────────────────────────────────────────
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // ── Logging ───────────────────────────────────────────────────────────────────
  logLevel: process.env.LOG_LEVEL || 'info',
};

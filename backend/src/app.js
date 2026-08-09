'use strict';
const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const morgan       = require('morgan');
const cookieParser = require('cookie-parser');
const compression  = require('compression');
const mongoSanitize= require('express-mongo-sanitize');
const path         = require('path');

const config       = require('./config');
const logger       = require('./utils/logger');
const { apiLimiter } = require('./middleware/rateLimit');
const { errorHandler, notFound } = require('./middleware/error');

// ── Route modules ──────────────────────────────────────────────────────────────
const testRoutes          = require('./routes/test');
const authRoutes          = require('./routes/auth');
const userRoutes          = require('./routes/users');
const productRoutes       = require('./routes/products');
const inventoryRoutes     = require('./routes/inventory');
const orderRoutes         = require('./routes/orders');
const productionRoutes    = require('./routes/production');
const supplierRoutes      = require('./routes/suppliers');
const customerRoutes      = require('./routes/customers');
const machineRoutes       = require('./routes/machines');
const employeeRoutes      = require('./routes/employees');
const notificationRoutes  = require('./routes/notifications');
const reportRoutes        = require('./routes/reports');
const settingsRoutes      = require('./routes/settings');
const bomRoutes           = require('./routes/bom');
const warehouseRoutes     = require('./routes/warehouse');
const planningRoutes      = require('./routes/planning');
const qualityRoutes       = require('./routes/quality');
const maintenanceRoutes   = require('./routes/maintenance');
const attendanceRoutes    = require('./routes/attendance');
const analyticsRoutes     = require('./routes/analytics');

const app = express();

// ── Security headers ───────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ───────────────────────────────────────────────────────────────────────
// config.cors.origins  — exact origins from CORS_ORIGINS env var (comma-separated)
// CORS_ORIGIN_PATTERNS — optional comma-separated JS-regex strings for wildcard
//   matching, e.g. "https://.*\\.vercel\\.app$" to allow all Vercel preview URLs.
const _corsPatterns = (process.env.CORS_ORIGIN_PATTERNS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
  .map(s => new RegExp(s));

app.use(cors({
  origin(origin, cb) {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman)
    if (!origin) return cb(null, true);
    // Exact match against CORS_ORIGINS list
    if (config.cors.origins.includes(origin)) return cb(null, true);
    // Pattern match against CORS_ORIGIN_PATTERNS list
    if (_corsPatterns.some(re => re.test(origin))) return cb(null, true);
    logger.warn(`[CORS] blocked origin: ${origin}`);
    cb(new Error(`CORS: origin '${origin}' not allowed.`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

// ── Request parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(config.cookie.secret));

// ── Sanitise MongoDB query injection ──────────────────────────────────────────
app.use(mongoSanitize());

// ── Compression ───────────────────────────────────────────────────────────────
app.use(compression());

// ── HTTP request logging ──────────────────────────────────────────────────────
if (config.env !== 'test') {
  app.use(morgan(config.env === 'production' ? 'combined' : 'dev', {
    stream: { write: msg => logger.http(msg.trim()) },
  }));
}

// ── Static file serving (uploads) ─────────────────────────────────────────────
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ── Global rate limiter ────────────────────────────────────────────────────────
app.use(`/api/${config.apiVersion}`, apiLimiter);

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ success: true, status: 'ok', env: config.env, timestamp: new Date().toISOString() })
);

// ── API Routes ────────────────────────────────────────────────────────────────
const BASE = `/api/${config.apiVersion}`;

// Test endpoint — SMTP verification (available in all environments)
app.use(`${BASE}/test`,          testRoutes);

app.use(`${BASE}/auth`,          authRoutes);
app.use(`${BASE}/users`,         userRoutes);
app.use(`${BASE}/products`,      productRoutes);
app.use(`${BASE}/inventory`,     inventoryRoutes);
app.use(`${BASE}/orders`,        orderRoutes);
app.use(`${BASE}/production`,    productionRoutes);
app.use(`${BASE}/suppliers`,     supplierRoutes);
app.use(`${BASE}/customers`,     customerRoutes);
app.use(`${BASE}/machines`,      machineRoutes);
app.use(`${BASE}/bom`,           bomRoutes);
app.use(`${BASE}/warehouse`,     warehouseRoutes);
app.use(`${BASE}/planning`,      planningRoutes);
app.use(`${BASE}/employees`,     employeeRoutes);
app.use(`${BASE}/notifications`, notificationRoutes);
app.use(`${BASE}/reports`,       reportRoutes);
app.use(`${BASE}/settings`,      settingsRoutes);
app.use(`${BASE}/quality`,       qualityRoutes);
app.use(`${BASE}/maintenance`,   maintenanceRoutes);
app.use(`${BASE}/attendance`,    attendanceRoutes);
app.use(`${BASE}/analytics`,     analyticsRoutes);

// ── 404 + global error handler (must be last) ─────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;

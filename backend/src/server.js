'use strict';
require('dotenv').config();

const app    = require('./app');
const config = require('./config');
const { connectDB } = require('./config/database');
const logger = require('./utils/logger');
const Setting = require('./models/Settings');
const { verifySmtpConnection } = require('./services/emailService');
const fs      = require('fs');
const path    = require('path');

// ── Ensure uploads directory exists ───────────────────────────────────────────
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ── Graceful shutdown handler ──────────────────────────────────────────────────
const shutdown = (server) => {
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully…');
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received. Shutting down gracefully…');
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  });
};

// ── Unhandled rejection safety net ────────────────────────────────────────────
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled rejection: ${err.message}`, { stack: err.stack });
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err.message}`, { stack: err.stack });
  process.exit(1);
});

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap() {
  await connectDB();

  // Seed default settings on first run (upsert — safe to run every time)
  await Setting.seed();
  logger.info('Default settings seeded.');

  // Verify SMTP connection — non-fatal: logs success or failure then continues
  await verifySmtpConnection();

  const server = app.listen(config.port, () => {
    logger.info(`🚀 Smart Manufacturing ERP API running`);
    logger.info(`   Environment : ${config.env}`);
    logger.info(`   Port        : ${config.port}`);
    logger.info(`   Base URL    : http://localhost:${config.port}/api/${config.apiVersion}`);
    logger.info(`   Health      : http://localhost:${config.port}/health`);
  });

  shutdown(server);
}

bootstrap();

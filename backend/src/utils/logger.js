'use strict';
const winston = require('winston');
const DailyRotate = require('winston-daily-rotate-file');
const config = require('../config');

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp: ts, stack }) =>
  `${ts} [${level}]: ${stack || message}`
);

const transports = [
  new winston.transports.Console({
    format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), errors({ stack: true }), logFormat),
  }),
];

if (config.env === 'production') {
  transports.push(
    new DailyRotate({
      dirname:        'logs',
      filename:       'erp-%DATE%.log',
      datePattern:    'YYYY-MM-DD',
      maxFiles:       '14d',
      format:         combine(timestamp(), errors({ stack: true }), winston.format.json()),
    })
  );
}

const logger = winston.createLogger({
  level:      config.logLevel,
  transports,
});

module.exports = logger;

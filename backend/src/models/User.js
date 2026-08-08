'use strict';
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');
const config   = require('../config');

const ROLES = [
  'super_admin',
  'admin',
  'production_manager',
  'inventory_manager',
  'purchase_manager',
  'sales_manager',
  'quality_manager',
  'maintenance_manager',
  'hr_manager',
  'finance_manager',
  'operator',
  'employee',
];

const userSchema = new mongoose.Schema({
  // ── Identity ───────────────────────────────────────────────────────────────
  // unique: true already creates an index — we do NOT add schema.index() for these fields
  name:        { type: String, required: true, trim: true, maxlength: 100 },
  email:       { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:       { type: String, trim: true, default: '' },
  password:    { type: String, required: true, minlength: 8, select: false },

  // ── Employee profile ───────────────────────────────────────────────────────
  employeeId:  { type: String, trim: true, default: undefined, unique: true, sparse: true },
  department:  { type: String, trim: true, default: '' },
  designation: { type: String, trim: true, default: '' },
  role:        { type: String, enum: ROLES, default: 'employee' },
  profileImage:{ type: String, default: '' },
  avatarInitials:{ type: String, default: '' },

  // ── Status ─────────────────────────────────────────────────────────────────
  isActive:    { type: Boolean, default: true },

  // ── Email verification ─────────────────────────────────────────────────────
  emailVerified:      { type: Boolean, default: false },
  emailVerifyToken:   { type: String, select: false },
  emailVerifyExpires: { type: Date,   select: false },

  // ── Two-factor authentication ──────────────────────────────────────────────
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret:  { type: String,  select: false },

  // ── OTP ────────────────────────────────────────────────────────────────────
  otpCode:        { type: String,  select: false },
  otpExpires:     { type: Date,    select: false },
  otpAttempts:    { type: Number,  default: 0,   select: false }, // failed verify attempts
  otpResendAfter: { type: Date,    select: false },               // earliest time to resend

  // ── Password reset ─────────────────────────────────────────────────────────
  passwordResetToken:   { type: String, select: false },
  passwordResetExpires: { type: Date,   select: false },

  // ── Refresh token (hashed) ─────────────────────────────────────────────────
  refreshToken: { type: String, select: false },

  // ── Login tracking ─────────────────────────────────────────────────────────
  lastLoginAt:   { type: Date },
  lastLoginIp:   { type: String },
  loginAttempts: { type: Number, default: 0 },
  lockUntil:     { type: Date },
  rememberMe:    { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON:  { virtuals: true, versionKey: false },
  toObject:{ virtuals: true },
});

// ── Indexes ────────────────────────────────────────────────────────────────────
// Note: email and employeeId already have indexes via unique:true above.
// Only define additional compound or non-unique indexes here.
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// ── Hash password before save ──────────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, config.bcryptRounds);
  this.avatarInitials = this.name
    .split(' ')
    .map(p => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  next();
});

// ── Instance methods ───────────────────────────────────────────────────────────
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

userSchema.methods.generatePasswordResetToken = function () {
  const raw = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken   = crypto.createHash('sha256').update(raw).digest('hex');
  this.passwordResetExpires = Date.now() + 30 * 60 * 1000; // 30 min
  return raw;
};

userSchema.methods.generateEmailVerifyToken = function () {
  const raw = crypto.randomBytes(32).toString('hex');
  this.emailVerifyToken   = crypto.createHash('sha256').update(raw).digest('hex');
  this.emailVerifyExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 h
  return raw;
};

userSchema.methods.generateOtp = function (expiryMs = 5 * 60 * 1000) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  this.otpCode        = crypto.createHash('sha256').update(code).digest('hex');
  this.otpExpires     = Date.now() + expiryMs;        // default 5 min
  this.otpAttempts    = 0;                             // reset attempt counter
  this.otpResendAfter = Date.now() + 60 * 1000;       // resend allowed after 60 s
  return code;
};

userSchema.methods.toPublic = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.emailVerifyToken;
  delete obj.emailVerifyExpires;
  delete obj.otpCode;
  delete obj.otpExpires;
  delete obj.refreshToken;
  delete obj.twoFactorSecret;
  delete obj.loginAttempts;
  delete obj.lockUntil;
  return obj;
};

module.exports = mongoose.model('User', userSchema);

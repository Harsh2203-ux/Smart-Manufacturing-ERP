'use strict';
const crypto  = require('crypto');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const config  = require('../config');
const logger  = require('../utils/logger');
const { ApiResponse, ApiError, asyncHandler } = require('../utils/apiResponse');
const { signAccessToken, signRefreshToken, setAuthCookies, clearAuthCookies } = require('../services/authService');
const {
  sendMail,
  otpTemplate,
  verifyEmailTemplate,
  resetPasswordTemplate,
  accountCreatedTemplate,
  passwordChangedTemplate,
} = require('../services/emailService');

// ══════════════════════════════════════════════════════════════════════════════
// REGISTRATION FLOW  (3-step: email → OTP → set password + profile)
// ══════════════════════════════════════════════════════════════════════════════

// ── Legacy single-step register (kept for compatibility) ─────────────────────
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role, department, designation, employeeId } = req.body;

  if (await User.findOne({ email })) throw ApiError.conflict('Email is already registered.');
  if (employeeId && await User.findOne({ employeeId })) throw ApiError.conflict('Employee ID is already taken.');

  const userData = {
    name, email, password,
    phone:         phone        || '',
    role:          role         || 'employee',
    department:    department   || '',
    designation:   designation  || '',
    employeeId:    employeeId   || undefined,
    emailVerified: true,   // legacy path: auto-verify
    isActive:      true,
  };

  const user = await User.create(userData);
  logger.info(`[register] Account created: ${user.email}`);

  new ApiResponse(201, 'Account created. You can sign in immediately.', {
    email: user.email,
  }).send(res);
});

// ── Step 1: POST /api/v1/auth/register/init — send OTP ───────────────────────
exports.registerInit = asyncHandler(async (req, res) => {
  const { email } = req.body;

  logger.info(`[registerInit] EMAIL RECEIVED: ${email}`);

  // Only block a fully active + verified account.
  const existing = await User.findOne({ email });
  const alreadyRegistered = !!(existing && existing.isActive && existing.emailVerified);
  logger.info(`[registerInit] EXISTING ACCOUNT: ${alreadyRegistered}`);

  if (alreadyRegistered) {
    throw ApiError.conflict('This email is already registered.');
  }

  // Fetch or create the pending placeholder (isActive=false, emailVerified=false)
  let pending = await User.findOne({ email }).select('+otpCode +otpExpires +otpResendAfter');
  if (!pending) {
    logger.info(`[registerInit] Creating pending placeholder for ${email}`);
    const placeholder = crypto.randomBytes(32).toString('hex');
    pending = await User.create({
      name:          email.split('@')[0],
      email,
      password:      placeholder,
      emailVerified: false,
      isActive:      false,
      // employeeId intentionally omitted — sparse unique index must not collide
    });
    pending = await User.findById(pending.id).select('+otpCode +otpExpires +otpResendAfter');
  }

  // Enforce 60-second resend cooldown
  if (pending.otpResendAfter && pending.otpResendAfter > Date.now()) {
    const secsLeft = Math.ceil((pending.otpResendAfter - Date.now()) / 1000);
    logger.warn(`[registerInit] Resend cooldown active — ${secsLeft}s remaining for ${email}`);
    throw ApiError.tooManyRequests(
      `Please wait ${secsLeft} second${secsLeft !== 1 ? 's' : ''} before requesting a new code.`
    );
  }

  const otp = pending.generateOtp(5 * 60 * 1000); // 5-min expiry
  logger.info(`[registerInit] OTP GENERATED: ${otp}`);

  await pending.save({ validateBeforeSave: false });
  logger.info(`[registerInit] OTP RECIPIENT: ${email}`);
  logger.info(`[registerInit] CALLING SENDMAIL`);

  try {
    const mailResult = await sendMail({ to: email, ...otpTemplate(pending.name, otp) });
    logger.info(`[registerInit] OTP EMAIL SENT SUCCESSFULLY — messageId: ${mailResult.messageId}`);
  } catch (err) {
    logger.error(`[registerInit] SENDMAIL FAILED to ${email}`);
    logger.error(`  message      : ${err.message}`);
    logger.error(`  code         : ${err.code}`);
    logger.error(`  response     : ${err.response}`);
    logger.error(`  responseCode : ${err.responseCode}`);
    logger.error(`  command      : ${err.command}`);
    throw ApiError.internal('Failed to send verification email. Please try again.');
  }

  new ApiResponse(200, 'Verification code sent to your email address.', { email }).send(res);
});

// ── Step 2: POST /api/v1/auth/register/verify-otp — verify OTP ───────────────
exports.registerVerifyOtp = asyncHandler(async (req, res) => {
  const { email, code } = req.body;

  const user = await User.findOne({ email }).select('+otpCode +otpExpires');
  if (!user) throw ApiError.badRequest('No pending registration found for this email.');
  if (!user.otpCode || !user.otpExpires || user.otpExpires < Date.now()) {
    throw ApiError.unprocessable('Verification code has expired. Please request a new one.');
  }

  const hashed = crypto.createHash('sha256').update(code).digest('hex');
  if (hashed !== user.otpCode) throw ApiError.unprocessable('Incorrect code. Please try again.');

  // OTP valid — clear it and issue a short-lived registration token
  user.otpCode    = undefined;
  user.otpExpires = undefined;
  await user.save({ validateBeforeSave: false });

  const regToken = signAccessToken(user.id);

  new ApiResponse(200, 'Code verified. You can now set your password.', {
    email,
    regToken,
  }).send(res);
});

// ── Step 3: POST /api/v1/auth/register/complete — set password + activate ────
exports.registerComplete = asyncHandler(async (req, res) => {
  const { regToken, name, email, password, phone, role, department, designation, employeeId } = req.body;

  let decoded;
  try {
    decoded = jwt.verify(regToken, config.jwt.secret);
  } catch {
    throw ApiError.unauthorized('Registration session expired. Please start again.');
  }

  const user = await User.findOne({ _id: decoded.id, email }).select('+password');
  if (!user) throw ApiError.notFound('Registration session not found. Please start again.');
  if (user.isActive && user.emailVerified) {
    throw ApiError.conflict('This account is already fully registered.');
  }

  if (employeeId && employeeId.trim()) {
    const taken = await User.findOne({ employeeId: employeeId.trim(), _id: { $ne: user._id } });
    if (taken) throw ApiError.conflict('Employee ID is already taken.');
  }

  user.name          = name || email.split('@')[0];
  user.password      = password;  // hashed by pre-save hook
  user.phone         = phone        || '';
  user.role          = role         || 'employee';
  user.department    = department   || '';
  user.designation   = designation  || '';
  user.employeeId    = employeeId   || undefined;
  user.emailVerified = true;
  user.isActive      = true;

  await user.save(); // triggers bcrypt + avatarInitials

  // Welcome email — fire and forget
  sendMail({
    to: user.email,
    ...accountCreatedTemplate(user.name, user.email, user.role, `${config.frontendUrl}/login`),
  }).catch(err => logger.error(`[registerComplete] Welcome email failed: ${err.message}`));

  logger.info(`[registerComplete] Account activated: ${user.email} (${user.role})`);

  new ApiResponse(201, 'Account created successfully. You can now sign in.', {
    email: user.email,
  }).send(res);
});

// ══════════════════════════════════════════════════════════════════════════════
// LOGIN FLOW  (3-step: email → OTP → password)
//
//  Step 1: POST /login/init
//          Body: { email }
//          If account exists + active + verified: enforce 60 s resend cooldown,
//          generate a 6-digit OTP (5-min expiry), send via Gmail SMTP.
//          Always returns 200 { requiresOtp: true, email } (anti-enumeration).
//
//  Step 2: POST /login/verify-otp
//          Body: { email, code }
//          Verifies OTP.  Max 5 bad attempts → 30-min account lock.
//          Returns { requiresPassword: true, loginToken, email }.
//
//  Step 3: POST /login/complete
//          Body: { email, loginToken, password, rememberMe? }
//          Verifies loginToken JWT, then bcrypt-checks password.
//          Issues Access Token + Refresh Token, sets HTTP-only cookies.
//          Returns { user, accessToken }.
// ══════════════════════════════════════════════════════════════════════════════

// ── Login Step 1: send OTP ────────────────────────────────────────────────────
exports.loginInit = asyncHandler(async (req, res) => {
  const { email } = req.body;

  logger.info(`[loginInit] ── LOGIN INIT START ── email=${email}`);

  const user = await User.findOne({ email })
    .select('+otpCode +otpExpires +otpAttempts +otpResendAfter');

  logger.info(`[loginInit] USER FOUND: ${!!user}`);

  // We only send the OTP when the account is real, active and verified.
  // The response shape is always the same to prevent user enumeration.
  if (user && user.isActive && user.emailVerified) {
    logger.info(`[loginInit] USER ACTIVE: ${user.isActive} | EMAIL VERIFIED: ${user.emailVerified}`);

    if (user.isLocked()) {
      logger.warn(`[loginInit] Account locked — ${email}`);
      throw ApiError.forbidden(
        'Account temporarily locked due to too many failed attempts. Please try again later.'
      );
    }

    // Enforce 60-second resend cooldown
    if (user.otpResendAfter && user.otpResendAfter > Date.now()) {
      const secsLeft = Math.ceil((user.otpResendAfter - Date.now()) / 1000);
      logger.warn(`[loginInit] Resend cooldown active — ${secsLeft}s remaining for ${email}`);
      throw ApiError.tooManyRequests(
        `Please wait ${secsLeft} second${secsLeft !== 1 ? 's' : ''} before requesting a new code.`
      );
    }

    const otp = user.generateOtp(5 * 60 * 1000); // 5-min expiry
    logger.info(`[loginInit] OTP GENERATED: ${otp}`);

    await user.save({ validateBeforeSave: false });
    logger.info(`[loginInit] OTP SAVED to DB`);

    logger.info(`[loginInit] CALLING SENDMAIL to ${user.email}`);
    try {
      const mailResult = await sendMail({ to: user.email, ...otpTemplate(user.name, otp) });
      logger.info(`[loginInit] OTP EMAIL SENT SUCCESSFULLY — messageId: ${mailResult.messageId}`);
    } catch (err) {
      logger.error(`[loginInit] SENDMAIL FAILED to ${user.email}`);
      logger.error(`  message      : ${err.message}`);
      logger.error(`  code         : ${err.code}`);
      logger.error(`  response     : ${err.response}`);
      logger.error(`  responseCode : ${err.responseCode}`);
      logger.error(`  command      : ${err.command}`);
      // Re-throw so the client gets a 500 rather than a silent failure
      throw ApiError.internal('Failed to send verification email. Please try again.');
    }
  } else {
    logger.warn(`[loginInit] OTP gate NOT passed — user=${!!user} active=${user?.isActive} verified=${user?.emailVerified}`);
  }

  new ApiResponse(200, 'If that email is registered, a verification code has been sent.', {
    requiresOtp: true,
    email,
  }).send(res);
});

// ── Login Step 2: verify OTP ──────────────────────────────────────────────────
exports.loginVerifyOtp = asyncHandler(async (req, res) => {
  const { email, code } = req.body;

  const user = await User.findOne({ email })
    .select('+otpCode +otpExpires +otpAttempts');
  if (!user || !user.isActive || !user.emailVerified) {
    throw ApiError.unprocessable('Verification code is invalid or has expired.');
  }
  if (!user.otpCode || !user.otpExpires || user.otpExpires < Date.now()) {
    throw ApiError.unprocessable('Verification code has expired. Please request a new one.');
  }

  const hashed = crypto.createHash('sha256').update(code).digest('hex');

  if (hashed !== user.otpCode) {
    user.otpAttempts = (user.otpAttempts || 0) + 1;
    if (user.otpAttempts >= 5) {
      user.lockUntil  = Date.now() + 30 * 60 * 1000;
      user.otpCode    = undefined;
      user.otpExpires = undefined;
      await user.save({ validateBeforeSave: false });
      throw ApiError.forbidden('Too many incorrect attempts. Account locked for 30 minutes.');
    }
    await user.save({ validateBeforeSave: false });
    const remaining = 5 - user.otpAttempts;
    throw ApiError.unprocessable(
      `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
    );
  }

  // OTP correct — clear it, issue short-lived login session token
  user.otpCode       = undefined;
  user.otpExpires    = undefined;
  user.otpAttempts   = 0;
  user.loginAttempts = 0;
  user.lockUntil     = undefined;
  await user.save({ validateBeforeSave: false });

  const loginToken = signAccessToken(user.id);

  new ApiResponse(200, 'Code verified. Please enter your password.', {
    requiresPassword: true,
    loginToken,
    email,
  }).send(res);
});

// ── Login Step 3: verify password, issue tokens ───────────────────────────────
exports.loginComplete = asyncHandler(async (req, res) => {
  const { email, loginToken, password, rememberMe = false } = req.body;

  let decoded;
  try {
    decoded = jwt.verify(loginToken, config.jwt.secret);
  } catch {
    throw ApiError.unauthorized('Login session expired. Please start again.');
  }

  const user = await User.findOne({ _id: decoded.id, email })
    .select('+password +refreshToken');
  if (!user || !user.isActive || !user.emailVerified) {
    throw ApiError.unauthorized('Login session not found. Please start again.');
  }
  if (user.isLocked()) {
    throw ApiError.forbidden('Account temporarily locked. Please try again later.');
  }

  const passwordOk = await user.comparePassword(password);
  if (!passwordOk) {
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    if (user.loginAttempts >= 5) user.lockUntil = Date.now() + 30 * 60 * 1000;
    await user.save({ validateBeforeSave: false });
    throw ApiError.unauthorized('Incorrect password.');
  }

  // Password correct — reset counters, issue tokens
  user.loginAttempts = 0;
  user.lockUntil     = undefined;
  user.lastLoginAt   = new Date();
  user.lastLoginIp   = req.ip;
  user.rememberMe    = rememberMe;

  const accessToken  = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);
  user.refreshToken  = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await user.save({ validateBeforeSave: false });

  setAuthCookies(res, accessToken, refreshToken, rememberMe);

  logger.info(`[loginComplete] Successful login: ${user.email}`);

  new ApiResponse(200, 'Login successful.', {
    user:        user.toPublic(),
    accessToken,
  }).send(res);
});

// ── Legacy /login — kept for backward-compat ─────────────────────────────────
exports.login = asyncHandler(async (req, res) => {
  const { email, password, rememberMe = false } = req.body;

  const user = await User.findOne({ email })
    .select('+password +refreshToken +otpCode +otpExpires');
  if (!user || !(await user.comparePassword(password))) {
    if (user) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) user.lockUntil = Date.now() + 30 * 60 * 1000;
      await user.save({ validateBeforeSave: false });
    }
    throw ApiError.unauthorized('Invalid email or password.');
  }

  if (user.isLocked())  throw ApiError.forbidden('Account temporarily locked. Try again later.');
  if (!user.isActive)   throw ApiError.forbidden('Account is deactivated. Contact your administrator.');

  user.loginAttempts = 0;
  user.lockUntil     = undefined;

  if (!user.emailVerified) {
    await user.save({ validateBeforeSave: false });
    return new ApiResponse(200, 'EMAIL_VERIFICATION_REQUIRED', {
      requiresEmailVerification: true,
      email: user.email,
    }).send(res);
  }

  const otp = user.generateOtp(5 * 60 * 1000);
  user.rememberMe = rememberMe;
  await user.save({ validateBeforeSave: false });

  await sendMail({ to: user.email, ...otpTemplate(user.name, otp) }).catch(err => {
    logger.error(`[login] Email send failed: ${err.message}`);
  });

  const pendingToken = signAccessToken(user.id);

  new ApiResponse(200, 'OTP_REQUIRED', {
    requiresOtp:  true,
    pendingToken,
    email:        user.email,
  }).send(res);
});

// ── Logout ────────────────────────────────────────────────────────────────────
exports.logout = asyncHandler(async (req, res) => {
  if (req.user) {
    req.user.refreshToken = undefined;
    await req.user.save({ validateBeforeSave: false });
  }
  clearAuthCookies(res);
  new ApiResponse(200, 'Logged out successfully.').send(res);
});

// ── Refresh access token ──────────────────────────────────────────────────────
exports.refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refresh_token;
  if (!token) throw ApiError.unauthorized('No refresh token provided.');

  let decoded;
  try {
    decoded = jwt.verify(token, config.jwt.refreshSecret);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token.');
  }

  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user   = await User.findOne({ _id: decoded.id, refreshToken: hashed }).select('+refreshToken');
  if (!user) throw ApiError.unauthorized('Refresh token has been revoked.');

  const newAccess  = signAccessToken(user.id);
  const newRefresh = signRefreshToken(user.id);
  user.refreshToken = crypto.createHash('sha256').update(newRefresh).digest('hex');
  await user.save({ validateBeforeSave: false });

  setAuthCookies(res, newAccess, newRefresh, user.rememberMe);
  new ApiResponse(200, 'Token refreshed.', { accessToken: newAccess }).send(res);
});

// ── Get current user profile ──────────────────────────────────────────────────
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.notFound('User not found.');
  new ApiResponse(200, 'Profile retrieved.', user.toPublic()).send(res);
});

// ── Update profile ────────────────────────────────────────────────────────────
exports.updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone', 'department', 'designation', 'profileImage'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (updates.name) {
    updates.avatarInitials = updates.name
      .split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
  }
  const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });
  if (!user) throw ApiError.notFound('User not found.');
  new ApiResponse(200, 'Profile updated.', user.toPublic()).send(res);
});

// ── Forgot password: Step 1 — send OTP ───────────────────────────────────────
exports.forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email })
    .select('+otpCode +otpExpires +otpResendAfter');

  if (user && user.emailVerified && user.isActive) {
    // Enforce resend cooldown on forgot-password too
    if (user.otpResendAfter && user.otpResendAfter > Date.now()) {
      const secsLeft = Math.ceil((user.otpResendAfter - Date.now()) / 1000);
      throw ApiError.tooManyRequests(
        `Please wait ${secsLeft} second${secsLeft !== 1 ? 's' : ''} before requesting a new code.`
      );
    }
    const otp = user.generateOtp(5 * 60 * 1000);
    await user.save({ validateBeforeSave: false });
    await sendMail({ to: user.email, ...otpTemplate(user.name, otp) }).catch(() => {});
  }

  // Always return the same response to prevent user enumeration
  new ApiResponse(200, 'If that email is registered, a verification code has been sent.', {
    email: req.body.email,
  }).send(res);
});

// ── Forgot password: Step 2 — verify OTP ─────────────────────────────────────
exports.forgotPasswordVerifyOtp = asyncHandler(async (req, res) => {
  const { email, code } = req.body;

  const user = await User.findOne({ email }).select('+otpCode +otpExpires');
  if (!user || !user.emailVerified) throw ApiError.unprocessable('Code is invalid or has expired.');
  if (!user.otpCode || !user.otpExpires || user.otpExpires < Date.now()) {
    throw ApiError.unprocessable('Verification code has expired. Please request a new one.');
  }

  const hashed = crypto.createHash('sha256').update(code).digest('hex');
  if (hashed !== user.otpCode) throw ApiError.unprocessable('Incorrect code. Please try again.');

  user.otpCode    = undefined;
  user.otpExpires = undefined;

  const raw = user.generatePasswordResetToken();
  await user.save({ validateBeforeSave: false });

  new ApiResponse(200, 'Code verified. You can now set a new password.', {
    resetToken: raw,
    email,
  }).send(res);
});

// ── Reset password ────────────────────────────────────────────────────────────
exports.resetPassword = asyncHandler(async (req, res) => {
  const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    passwordResetToken:   hashed,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+password');
  if (!user) throw ApiError.badRequest('Reset token is invalid or has expired.');

  user.password             = req.body.password;
  user.passwordResetToken   = undefined;
  user.passwordResetExpires = undefined;
  user.refreshToken         = undefined;
  await user.save();

  await sendMail({ to: user.email, ...passwordChangedTemplate(user.name) }).catch(() => {});

  clearAuthCookies(res);
  new ApiResponse(200, 'Password has been reset. Please sign in with your new password.').send(res);
});

// ── Change password (authenticated) ──────────────────────────────────────────
exports.changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+password');
  if (!user) throw ApiError.notFound('User not found.');
  if (!(await user.comparePassword(req.body.currentPassword))) {
    throw ApiError.unauthorized('Current password is incorrect.');
  }
  user.password     = req.body.newPassword;
  user.refreshToken = undefined;
  await user.save();

  await sendMail({ to: user.email, ...passwordChangedTemplate(user.name) }).catch(() => {});

  clearAuthCookies(res);
  new ApiResponse(200, 'Password updated successfully. Please sign in again.').send(res);
});

// ── Verify email ──────────────────────────────────────────────────────────────
exports.verifyEmail = asyncHandler(async (req, res) => {
  const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    emailVerifyToken:   hashed,
    emailVerifyExpires: { $gt: Date.now() },
  });
  if (!user) throw ApiError.badRequest('Verification link is invalid or has expired. Please request a new one.');

  user.emailVerified      = true;
  user.emailVerifyToken   = undefined;
  user.emailVerifyExpires = undefined;
  await user.save({ validateBeforeSave: false });

  new ApiResponse(200, 'Email verified successfully. You can now sign in.').send(res);
});

// ── Resend verification email ─────────────────────────────────────────────────
exports.resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (user && !user.emailVerified) {
    const raw = user.generateEmailVerifyToken();
    await user.save({ validateBeforeSave: false });
    const verifyUrl = `${config.frontendUrl}/verify-email?token=${raw}`;
    await sendMail({ to: user.email, ...verifyEmailTemplate(user.name, verifyUrl) }).catch(() => {});
  }

  new ApiResponse(200, 'If that account exists and is unverified, a new link has been sent.').send(res);
});

// ── Send OTP (generic) ────────────────────────────────────────────────────────
exports.sendOtp = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email })
    .select('+otpCode +otpExpires +otpResendAfter');

  if (user) {
    const otp = user.generateOtp(5 * 60 * 1000);
    await user.save({ validateBeforeSave: false });
    await sendMail({ to: user.email, ...otpTemplate(user.name, otp) }).catch(() => {});
  }

  new ApiResponse(200, 'If that account exists, an OTP has been sent.').send(res);
});

// ── Verify OTP (legacy / 2FA path) ───────────────────────────────────────────
exports.verifyOtp = asyncHandler(async (req, res) => {
  const { email, code } = req.body;

  const user = await User.findOne({ email }).select('+otpCode +otpExpires +refreshToken');
  if (!user) throw ApiError.unprocessable('OTP is invalid or has expired.');
  if (!user.otpCode || !user.otpExpires || user.otpExpires < Date.now()) {
    throw ApiError.unprocessable('OTP has expired. Please request a new code.');
  }

  const hashed = crypto.createHash('sha256').update(code).digest('hex');
  if (hashed !== user.otpCode) throw ApiError.unprocessable('Incorrect OTP code.');

  user.otpCode    = undefined;
  user.otpExpires = undefined;

  const accessToken  = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);
  user.refreshToken  = crypto.createHash('sha256').update(refreshToken).digest('hex');
  user.lastLoginAt   = new Date();
  await user.save({ validateBeforeSave: false });

  setAuthCookies(res, accessToken, refreshToken, user.rememberMe);
  new ApiResponse(200, 'OTP verified. Login successful.', { user: user.toPublic(), accessToken }).send(res);
});

// ── Setup 2FA ─────────────────────────────────────────────────────────────────
exports.setup2fa = asyncHandler(async (req, res) => {
  const secret = crypto.randomBytes(20).toString('base64')
    .replace(/[^A-Z2-7]/gi, '')
    .toUpperCase()
    .slice(0, 32);

  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.notFound('User not found.');
  user.twoFactorSecret = secret;
  await user.save({ validateBeforeSave: false });

  const otpauthUrl = `otpauth://totp/SmartMfgERP:${encodeURIComponent(user.email)}?secret=${secret}&issuer=SmartManufacturingERP`;

  new ApiResponse(200, '2FA secret generated.', { secret, otpauthUrl }).send(res);
});

// ── Enable 2FA ────────────────────────────────────────────────────────────────
exports.enable2fa = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+twoFactorSecret');
  if (!user) throw ApiError.notFound('User not found.');
  if (!user.twoFactorSecret) throw ApiError.badRequest('Run 2FA setup first.');
  if (!/^\d{6}$/.test(req.body.code)) throw ApiError.unprocessable('Invalid 2FA code format.');

  user.twoFactorEnabled = true;
  await user.save({ validateBeforeSave: false });

  new ApiResponse(200, 'Two-factor authentication enabled.', { twoFactorEnabled: true }).send(res);
});

// ── Disable 2FA ───────────────────────────────────────────────────────────────
exports.disable2fa = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+password');
  if (!user) throw ApiError.notFound('User not found.');
  if (!(await user.comparePassword(req.body.password))) {
    throw ApiError.unauthorized('Password is incorrect.');
  }

  user.twoFactorEnabled = false;
  user.twoFactorSecret  = undefined;
  await user.save({ validateBeforeSave: false });

  new ApiResponse(200, 'Two-factor authentication disabled.').send(res);
});

// ── Delete account ────────────────────────────────────────────────────────────
exports.deleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+password');
  if (!user) throw ApiError.notFound('User not found.');
  if (!(await user.comparePassword(req.body.password))) {
    throw ApiError.unauthorized('Password is incorrect.');
  }

  await User.findByIdAndDelete(req.user.id);
  clearAuthCookies(res);
  new ApiResponse(200, 'Account deleted successfully.').send(res);
});

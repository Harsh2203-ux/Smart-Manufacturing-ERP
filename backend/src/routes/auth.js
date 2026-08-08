'use strict';
const router  = require('express').Router();
const ctrl    = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimit');
const { body, param } = require('express-validator');

// ── Shared validator snippets ──────────────────────────────────────────────────
const emailRule = body('email').isEmail().toLowerCase().withMessage('A valid email address is required.');
const codeRule  = body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be exactly 6 digits.');
const pwdRule   = body('password')
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
  .matches(/[A-Z]/).withMessage('Must contain at least one uppercase letter.')
  .matches(/[a-z]/).withMessage('Must contain at least one lowercase letter.')
  .matches(/\d/).withMessage('Must contain at least one number.')
  .matches(/[^A-Za-z0-9]/).withMessage('Must contain at least one special character.');
const confirmPwdRule = body('confirmPassword')
  .custom((v, { req }) => v === req.body.password)
  .withMessage('Passwords do not match.');

// ══════════════════════════════════════════════════════════════════════════════
// REGISTRATION FLOW  (3-step: email → OTP → set password)
// ══════════════════════════════════════════════════════════════════════════════

// Step 1: POST /api/v1/auth/register/init — check email, send OTP
router.post('/register/init', authLimiter,
  [emailRule],
  validate,
  ctrl.registerInit);

// Step 2: POST /api/v1/auth/register/verify-otp — verify OTP, get regToken
router.post('/register/verify-otp', authLimiter,
  [emailRule, codeRule],
  validate,
  ctrl.registerVerifyOtp);

// Step 3: POST /api/v1/auth/register/complete — set password + profile, activate account
router.post('/register/complete', authLimiter, [
  body('regToken').notEmpty().withMessage('Registration token is required.'),
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Full name must be 2–100 characters.'),
  emailRule,
  pwdRule,
  confirmPwdRule,
  body('department').optional().trim(),
  body('designation').optional().trim(),
  body('phone').optional().trim(),
  body('employeeId').optional().trim(),
  body('role').optional().isIn([
    'super_admin','admin','production_manager','inventory_manager','purchase_manager',
    'sales_manager','quality_manager','maintenance_manager','hr_manager',
    'finance_manager','operator','employee',
  ]).withMessage('Invalid role.'),
], validate, ctrl.registerComplete);

// ── Legacy POST /api/v1/auth/register (kept for compatibility) ────────────────
router.post('/register', authLimiter, [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Full name required.'),
  emailRule, pwdRule,
  body('confirmPassword').custom((v, { req }) => v === req.body.password).withMessage('Passwords do not match.'),
], validate, ctrl.register);

// ══════════════════════════════════════════════════════════════════════════════
// LOGIN FLOW  (3-step: email → OTP → password)
// ══════════════════════════════════════════════════════════════════════════════

// Step 1: POST /api/v1/auth/login/init — send OTP to email
router.post('/login/init', authLimiter,
  [emailRule],
  validate,
  ctrl.loginInit);

// Step 2: POST /api/v1/auth/login/verify-otp — verify OTP, receive loginToken
router.post('/login/verify-otp', authLimiter,
  [emailRule, codeRule],
  validate,
  ctrl.loginVerifyOtp);

// Step 3: POST /api/v1/auth/login/complete — submit password, receive JWT
router.post('/login/complete', authLimiter, [
  emailRule,
  body('loginToken').notEmpty().withMessage('Login session token is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
  body('rememberMe').optional().isBoolean(),
], validate, ctrl.loginComplete);

// ── Legacy POST /api/v1/auth/login (email+password → OTP gate, kept for compat)
router.post('/login', authLimiter, [
  emailRule,
  body('password').notEmpty().withMessage('Password is required.'),
], validate, ctrl.login);

// ── POST /api/v1/auth/verify-otp — verify OTP, receive tokens (legacy + 2FA path)
router.post('/verify-otp', authLimiter, [emailRule, codeRule], validate, ctrl.verifyOtp);

// ── POST /api/v1/auth/logout ───────────────────────────────────────────────────
router.post('/logout', protect, ctrl.logout);

// ── POST /api/v1/auth/refresh ──────────────────────────────────────────────────
router.post('/refresh', ctrl.refreshToken);

// ── GET  /api/v1/auth/profile ──────────────────────────────────────────────────
router.get('/profile', protect, ctrl.getMe);

// ── PUT  /api/v1/auth/profile ──────────────────────────────────────────────────
router.put('/profile', protect, [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters.'),
  body('phone').optional().trim(),
  body('department').optional().trim(),
  body('designation').optional().trim(),
  body('profileImage').optional().trim(),
], validate, ctrl.updateProfile);

// ══════════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD FLOW  (3-step: email → OTP → new password)
// ══════════════════════════════════════════════════════════════════════════════

// Step 1: POST /api/v1/auth/forgot-password — send OTP
router.post('/forgot-password', authLimiter, [emailRule], validate, ctrl.forgotPassword);

// Step 2: POST /api/v1/auth/forgot-password/verify-otp — verify OTP, get resetToken
router.post('/forgot-password/verify-otp', authLimiter,
  [emailRule, codeRule],
  validate,
  ctrl.forgotPasswordVerifyOtp);

// Step 3: PUT /api/v1/auth/reset-password/:token — set new password
router.put('/reset-password/:token', authLimiter, [
  param('token').notEmpty().withMessage('Reset token is required.'),
  pwdRule,
  confirmPwdRule,
], validate, ctrl.resetPassword);

// ── PUT  /api/v1/auth/change-password ─────────────────────────────────────────
router.put('/change-password', protect, [
  body('currentPassword').notEmpty().withMessage('Current password is required.'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Must contain an uppercase letter.')
    .matches(/[a-z]/).withMessage('Must contain a lowercase letter.')
    .matches(/\d/).withMessage('Must contain a number.')
    .matches(/[^A-Za-z0-9]/).withMessage('Must contain a special character.')
    .custom((v, { req }) => v !== req.body.currentPassword)
    .withMessage('New password must differ from current password.'),
], validate, ctrl.changePassword);

// ── GET  /api/v1/auth/verify-email/:token ─────────────────────────────────────
router.get('/verify-email/:token', ctrl.verifyEmail);

// ── POST /api/v1/auth/resend-verification ─────────────────────────────────────
router.post('/resend-verification', authLimiter, [emailRule], validate, ctrl.resendVerification);

// ── POST /api/v1/auth/send-otp ────────────────────────────────────────────────
router.post('/send-otp', authLimiter, [emailRule], validate, ctrl.sendOtp);

// ── 2FA ───────────────────────────────────────────────────────────────────────
router.post('/2fa/setup',   protect, ctrl.setup2fa);
router.post('/2fa/enable',  protect, [
  body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('2FA code must be 6 digits.'),
], validate, ctrl.enable2fa);
router.post('/2fa/disable', protect, [
  body('password').notEmpty().withMessage('Password is required to disable 2FA.'),
], validate, ctrl.disable2fa);

// ── DELETE /api/v1/auth/account ───────────────────────────────────────────────
router.delete('/account', protect, [
  body('password').notEmpty().withMessage('Password is required.'),
], validate, ctrl.deleteAccount);

module.exports = router;

'use strict';
/**
 * validators/auth.js
 *
 * express-validator rule chains for every auth endpoint.
 * Import the array you need directly into the route file.
 */
const { body, param } = require('express-validator');

// ── Reusable rules ─────────────────────────────────────────────────────────────

const emailRule = body('email')
  .isEmail()
  .toLowerCase()
  .withMessage('A valid email address is required.');

const passwordRule = body('password')
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
  .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
  .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter.')
  .matches(/\d/).withMessage('Password must contain at least one number.');

const confirmPasswordRule = body('confirmPassword')
  .custom((value, { req }) => value === req.body.password)
  .withMessage('Passwords do not match.');

const otpCodeRule = body('code')
  .isLength({ min: 6, max: 6 })
  .isNumeric()
  .withMessage('OTP must be exactly 6 digits.');

// ── Rule sets per endpoint ─────────────────────────────────────────────────────

/** POST /auth/register */
const registerRules = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be 2–100 characters.'),
  emailRule,
  passwordRule,
  confirmPasswordRule,
  body('department').optional().trim(),
  body('designation').optional().trim(),
  body('phone').optional().trim().isMobilePhone('any').withMessage('Invalid phone number.'),
  body('employeeId').optional().trim(),
  body('role')
    .optional()
    .isIn([
      'super_admin', 'admin', 'production_manager', 'inventory_manager',
      'purchase_manager', 'sales_manager', 'quality_manager', 'maintenance_manager',
      'hr_manager', 'finance_manager', 'operator', 'employee',
    ])
    .withMessage('Invalid role.'),
];

/** POST /auth/login */
const loginRules = [
  emailRule,
  body('password').notEmpty().withMessage('Password is required.'),
];

/** POST /auth/forgot-password */
const forgotPasswordRules = [emailRule];

/** PUT /auth/reset-password/:token */
const resetPasswordRules = [
  param('token').notEmpty().withMessage('Reset token is required.'),
  passwordRule,
  confirmPasswordRule,
];

/** POST /auth/resend-verification */
const resendVerificationRules = [emailRule];

/** POST /auth/send-otp */
const sendOtpRules = [emailRule];

/** POST /auth/verify-otp */
const verifyOtpRules = [emailRule, otpCodeRule];

/** PUT /auth/change-password */
const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required.'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('New password must contain at least one uppercase letter.')
    .matches(/[a-z]/).withMessage('New password must contain at least one lowercase letter.')
    .matches(/\d/).withMessage('New password must contain at least one number.')
    .custom((v, { req }) => v !== req.body.currentPassword)
    .withMessage('New password must be different from the current password.'),
];

/** PUT /auth/profile */
const updateProfileRules = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters.'),
  body('phone').optional().trim(),
  body('department').optional().trim(),
  body('designation').optional().trim(),
  body('profileImage').optional().trim(),
];

/** POST /auth/2fa/enable */
const enable2faRules = [
  body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('2FA code must be 6 digits.'),
];

/** POST /auth/2fa/disable */
const disable2faRules = [
  body('password').notEmpty().withMessage('Password is required to disable 2FA.'),
];

/** DELETE /auth/account */
const deleteAccountRules = [
  body('password').notEmpty().withMessage('Password is required to confirm account deletion.'),
];

module.exports = {
  registerRules,
  loginRules,
  forgotPasswordRules,
  resetPasswordRules,
  resendVerificationRules,
  sendOtpRules,
  verifyOtpRules,
  changePasswordRules,
  updateProfileRules,
  enable2faRules,
  disable2faRules,
  deleteAccountRules,
};

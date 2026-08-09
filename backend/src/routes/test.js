'use strict';
/**
 * POST /api/v1/test/email
 *
 * Sends a real test email via the configured email provider (SMTP or Resend)
 * and reports the exact outcome.  Useful for verifying email credentials
 * without touching auth logic.
 *
 * Body:  { "email": "recipient@example.com" }
 * Returns:
 *   200 { success: true,  message: "Email sent successfully", messageId: "..." }
 *   400 { success: false, message: "email field is required" }
 *   503 { success: false, message: "Email provider is not configured..." }
 *   500 { success: false, message: "<exact error>" }
 */

const router     = require('express').Router();
const { body, validationResult } = require('express-validator');
const { IS_DEV_EMAIL, sendMail } = require('../services/emailService');
const config     = require('../config');

const EMAIL_PROVIDER = (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase().trim();

router.post(
  '/email',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('A valid recipient email address is required.'),
  ],
  async (req, res) => {
    // ── Validation ──────────────────────────────────────────────────────────────
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors:  errors.array(),
      });
    }

    const { email } = req.body;

    // ── Dev-mode guard ──────────────────────────────────────────────────────────
    if (IS_DEV_EMAIL) {
      return res.status(503).json({
        success: false,
        message:
          `Email provider (${EMAIL_PROVIDER}) is not fully configured. ` +
          (EMAIL_PROVIDER === 'smtp'
            ? 'Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in environment variables.'
            : 'Set RESEND_API_KEY in environment variables.'),
      });
    }

    // ── Send test email ─────────────────────────────────────────────────────────
    try {
      const result = await sendMail({
        to:      email,
        subject: '✅ Smart Manufacturing ERP — Email test',
        text:    'This is a test email from Smart Manufacturing ERP. If you received this, the email provider is working correctly.',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:40px auto;padding:32px;
                      border:1px solid #e2e8f0;border-radius:10px;background:#ffffff;">
            <h2 style="margin:0 0 12px;color:#0f172a;font-size:18px;">✅ Email Test Successful</h2>
            <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
              This is a test email from <strong>Smart Manufacturing ERP</strong>.<br/>
              Provider: <strong>${EMAIL_PROVIDER.toUpperCase()}</strong> — configured and sending correctly.
            </p>
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              Sent from ${config.email.fromAddress}
            </p>
          </div>`,
      });

      return res.status(200).json({
        success:   true,
        message:   'Email sent successfully',
        provider:  EMAIL_PROVIDER,
        messageId: result.messageId,
        to:        email,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
        name:    err.name || null,
      });
    }
  }
);

module.exports = router;

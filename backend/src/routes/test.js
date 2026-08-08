'use strict';
/**
 * POST /api/v1/test/email
 *
 * Sends a real test email via Nodemailer and reports the exact outcome.
 * Useful for verifying Gmail SMTP credentials without touching auth logic.
 *
 * Body:  { "email": "recipient@example.com" }
 * Returns:
 *   200 { success: true,  message: "Email sent successfully", messageId: "..." }
 *   400 { success: false, message: "email field is required" }
 *   500 { success: false, message: "<exact SMTP error>" }
 */

const router     = require('express').Router();
const { body, validationResult } = require('express-validator');
const { IS_DEV_EMAIL, transporter } = require('../services/emailService');
const config     = require('../config');

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
    // If SMTP is not configured the transporter is null.  Return a clear message
    // instead of crashing so the developer knows what to fix.
    if (IS_DEV_EMAIL || !transporter) {
      return res.status(503).json({
        success: false,
        message:
          'SMTP is not configured. Set SMTP_USER and SMTP_PASS in .env to send real emails.',
      });
    }

    // ── Send test email ─────────────────────────────────────────────────────────
    try {
      const info = await transporter.sendMail({
        from:    `"${config.email.fromName}" <${config.email.fromAddress}>`,
        to:      email,
        subject: '✅ Smart Manufacturing ERP — SMTP test',
        text:    'This is a test email from Smart Manufacturing ERP. If you received this, Gmail SMTP is working correctly.',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:40px auto;padding:32px;
                      border:1px solid #e2e8f0;border-radius:10px;background:#ffffff;">
            <h2 style="margin:0 0 12px;color:#0f172a;font-size:18px;">✅ SMTP Test Successful</h2>
            <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
              This is a test email from <strong>Smart Manufacturing ERP</strong>.<br/>
              Gmail SMTP is configured and sending correctly.
            </p>
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              Sent via ${config.email.host}:${config.email.port} as ${config.email.user}
            </p>
          </div>`,
      });

      return res.status(200).json({
        success:   true,
        message:   'Email sent successfully',
        messageId: info.messageId,
        to:        email,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message,           // exact SMTP error surfaced to caller
        code:    err.code   || null,
        command: err.command|| null,
      });
    }
  }
);

module.exports = router;

'use strict';
const nodemailer = require('nodemailer');
const config     = require('../config');
const logger     = require('../utils/logger');

// ── Dev-mode detection ─────────────────────────────────────────────────────────
// If SMTP_USER is empty / not configured we are in development mode.
// Emails are NOT sent — instead the relevant token/OTP is printed to the console
// so developers can still test the full flow without an SMTP server.

const IS_DEV_EMAIL = !config.email.user || config.email.user.trim() === '';

if (IS_DEV_EMAIL) {
  logger.warn(
    '[emailService] ⚠  SMTP not configured — running in DEV EMAIL MODE.\n' +
    '  Verification tokens, OTPs and reset links will be printed to this console.\n' +
    '  Set SMTP_USER / SMTP_PASS in .env to send real emails.'
  );
}

// ── Transporter (only created when SMTP is configured) ─────────────────────────
let transporter = null;

if (!IS_DEV_EMAIL) {
  transporter = nodemailer.createTransport({
    host:   config.email.host,
    port:   config.email.port,
    secure: config.email.secure,
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
  });
}

// ── verifySmtpConnection ───────────────────────────────────────────────────────
// Called once on server startup.  Resolves true on success, false in dev mode.
// Logs the outcome; never throws — a broken SMTP connection should not crash the server.
async function verifySmtpConnection() {
  if (IS_DEV_EMAIL) {
    logger.warn('[SMTP] Running in DEV EMAIL MODE — no real emails will be sent.');
    return false;
  }
  try {
    await transporter.verify();
    logger.info(`[SMTP] ✅  SMTP connected successfully — ${config.email.host}:${config.email.port} as ${config.email.user}`);
    return true;
  } catch (err) {
    logger.error(`[SMTP] ❌  SMTP connection failed: ${err.message}`);
    return false;
  }
}

// ── sendMail ───────────────────────────────────────────────────────────────────
// Returns { devMode: true } when SMTP is not configured so callers know the email
// was not actually sent.  Never throws in dev mode.

async function sendMail({ to, subject, html, text, _devHint }) {
  logger.info(`[sendMail] SENDMAIL START — to=${to} | subject="${subject}"`);

  if (IS_DEV_EMAIL) {
    // Print a clearly formatted dev-mode block to the console
    const border = '─'.repeat(64);
    console.log(`\n${border}`);
    console.log(`📬  DEV EMAIL — would have sent to: ${to}`);
    console.log(`    Subject : ${subject}`);
    if (_devHint) {
      console.log(`    ★  ${_devHint}`);
    }
    console.log(border + '\n');
    logger.info(`[DEV EMAIL] to=${to} | ${subject}${_devHint ? ' | ' + _devHint : ''}`);
    return { devMode: true };
  }

  logger.info(`[sendMail] SMTP SEND START — host=${config.email.host}:${config.email.port} from=${config.email.fromAddress}`);
  try {
    const info = await transporter.sendMail({
      from: `"${config.email.fromName}" <${config.email.fromAddress}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ''),
    });
    logger.info(`[sendMail] SMTP SEND RESULT — messageId=${info.messageId} | response=${info.response}`);
    return info;
  } catch (err) {
    logger.error(`[sendMail] SMTP SEND FAILED — to=${to} | message=${err.message} | code=${err.code} | response=${err.response} | responseCode=${err.responseCode} | command=${err.command}`);
    throw err;
  }
}

// ── Shared layout ──────────────────────────────────────────────────────────────
function emailLayout(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Smart Manufacturing ERP</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; }
    .wrapper { max-width: 580px; margin: 40px auto; padding: 0 16px 40px; }
    .header { background: #0f172a; border-radius: 14px 14px 0 0; padding: 28px 36px; text-align: center; }
    .header-logo { display: inline-flex; align-items: center; gap: 12px; }
    .header-logo-icon { width: 44px; height: 44px; border-radius: 10px; background: #1d4ed8; display: inline-flex; align-items: center; justify-content: center; }
    .header-title { font-size: 20px; font-weight: 700; color: #f1f5f9; letter-spacing: -0.4px; }
    .body { background: #ffffff; padding: 40px 36px; }
    .greeting { font-size: 17px; font-weight: 600; color: #0f172a; margin-bottom: 16px; }
    .text { font-size: 15px; color: #475569; line-height: 1.7; margin-bottom: 16px; }
    .otp-box { background: #eff6ff; border: 2px solid #bfdbfe; border-radius: 12px; padding: 24px; text-align: center; margin: 28px 0; }
    .otp-code { font-size: 42px; font-weight: 800; letter-spacing: 14px; color: #1d4ed8; font-feature-settings: "tnum"; }
    .otp-expires { font-size: 13px; color: #64748b; margin-top: 10px; }
    .btn { display: block; width: fit-content; margin: 28px auto; padding: 14px 36px; background: #1d4ed8; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600; letter-spacing: 0.2px; }
    .divider { height: 1px; background: #e2e8f0; margin: 28px 0; }
    .info-box { background: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 0 8px 8px 0; padding: 14px 18px; margin: 20px 0; }
    .info-text { font-size: 13px; color: #64748b; line-height: 1.6; }
    .warning-box { background: #fff7ed; border-left: 4px solid #f97316; border-radius: 0 8px 8px 0; padding: 14px 18px; margin: 20px 0; }
    .warning-text { font-size: 13px; color: #9a3412; line-height: 1.6; }
    .success-icon { font-size: 48px; text-align: center; margin-bottom: 16px; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 14px 14px; padding: 20px 36px; text-align: center; }
    .footer-text { font-size: 12px; color: #94a3b8; line-height: 1.7; }
    .footer-brand { font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 4px; }
    .url-box { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin: 12px 0; word-break: break-all; }
    .url-text { font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-logo">
        <div class="header-logo-icon">
          <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
            <rect x="3" y="15" width="26" height="14" rx="2" fill="white" opacity=".95"/>
            <polygon points="2,15 16,6 30,15" fill="#93c5fd"/>
            <rect x="6" y="8" width="4" height="8" rx="1" fill="#93c5fd"/>
            <rect x="12" y="10" width="4" height="6" rx="1" fill="#93c5fd"/>
            <rect x="13" y="20" width="6" height="9" rx="1" fill="#1d4ed8"/>
            <rect x="5" y="19" width="6" height="5" rx="1" fill="#bfdbfe"/>
            <rect x="21" y="19" width="6" height="5" rx="1" fill="#bfdbfe"/>
          </svg>
        </div>
        <span class="header-title">Smart Manufacturing ERP</span>
      </div>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <div class="footer-brand">Smart Manufacturing ERP</div>
      <div class="footer-text">
        This email was sent from an automated system. Please do not reply.<br/>
        If you didn't request this, you can safely ignore this email.
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ── Email Verification ─────────────────────────────────────────────────────────
function verifyEmailTemplate(name, verifyUrl) {
  return {
    subject: '✉️ Verify your Smart Manufacturing ERP email',
    html: emailLayout(`
      <div class="greeting">Hi ${name},</div>
      <p class="text">
        Welcome to <strong>Smart Manufacturing ERP</strong>! Please verify your email address to activate your account.
      </p>
      <a href="${verifyUrl}" class="btn">Verify Email Address</a>
      <p class="text" style="font-size:13px; text-align:center; color:#94a3b8;">
        Or copy and paste this link into your browser:
      </p>
      <div class="url-box"><span class="url-text">${verifyUrl}</span></div>
      <div class="divider"></div>
      <div class="info-box">
        <div class="info-text">
          <strong>⏰ This link expires in 24 hours.</strong><br/>
          If it expires, you can request a new verification email from the sign-in page.
        </div>
      </div>
      <p class="text">If you didn't create an account, no action is required.</p>
    `),
    _devHint: `Verify URL → ${verifyUrl}`,
  };
}

// ── Forgot Password ────────────────────────────────────────────────────────────
function resetPasswordTemplate(name, resetUrl) {
  return {
    subject: '🔐 Reset your Smart Manufacturing ERP password',
    html: emailLayout(`
      <div class="greeting">Hi ${name},</div>
      <p class="text">
        We received a request to reset your <strong>Smart Manufacturing ERP</strong> password.
        Click the button below to create a new password.
      </p>
      <a href="${resetUrl}" class="btn">Reset Password</a>
      <p class="text" style="font-size:13px; text-align:center; color:#94a3b8;">
        Or copy and paste this link into your browser:
      </p>
      <div class="url-box"><span class="url-text">${resetUrl}</span></div>
      <div class="divider"></div>
      <div class="warning-box">
        <div class="warning-text">
          <strong>⏰ This link expires in 30 minutes.</strong><br/>
          For security, this link can only be used once.
        </div>
      </div>
      <p class="text">If you didn't request a password reset, please ignore this email.</p>
    `),
    _devHint: `Reset URL → ${resetUrl}`,
  };
}

// ── OTP Verification ───────────────────────────────────────────────────────────
function otpTemplate(name, otp) {
  return {
    subject: '🔑 Your Smart Manufacturing ERP verification code',
    html: emailLayout(`
      <div class="greeting">Hi ${name},</div>
      <p class="text">
        Here is your one-time verification code for <strong>Smart Manufacturing ERP</strong>.
      </p>
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
        <div class="otp-expires">⏰ Expires in <strong>10 minutes</strong></div>
      </div>
      <div class="warning-box">
        <div class="warning-text">
          <strong>🛡️ Security notice:</strong> Never share this code with anyone.
        </div>
      </div>
      <p class="text">If you didn't attempt to sign in, please change your password immediately.</p>
    `),
    _devHint: `OTP Code → ${otp}`,
  };
}

// ── Account Created ────────────────────────────────────────────────────────────
function accountCreatedTemplate(name, email, role, verifyUrl) {
  return {
    subject: '🎉 Welcome to Smart Manufacturing ERP',
    html: emailLayout(`
      <div class="success-icon">🎉</div>
      <div class="greeting">Welcome, ${name}!</div>
      <p class="text">
        Your <strong>Smart Manufacturing ERP</strong> account has been created successfully.
      </p>
      <div class="info-box">
        <div class="info-text">
          <strong>Email:</strong> ${email}<br/>
          <strong>Role:</strong> ${role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
        </div>
      </div>
      <p class="text">To get started, please verify your email address:</p>
      <a href="${verifyUrl}" class="btn">Verify Email &amp; Get Started</a>
      <div class="divider"></div>
      <p class="text" style="font-size:13px; color:#94a3b8;">
        If you have any questions, contact your system administrator.
      </p>
    `),
    _devHint: `Verify URL → ${verifyUrl}`,
  };
}

// ── Password Changed Confirmation ──────────────────────────────────────────────
function passwordChangedTemplate(name) {
  const time = new Date().toLocaleString('en-US', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC',
  });
  return {
    subject: '🔒 Your Smart Manufacturing ERP password has been changed',
    html: emailLayout(`
      <div class="success-icon">🔒</div>
      <div class="greeting">Hi ${name},</div>
      <p class="text">
        Your <strong>Smart Manufacturing ERP</strong> password was changed on <strong>${time} UTC</strong>.
      </p>
      <div class="divider"></div>
      <div class="warning-box">
        <div class="warning-text">
          <strong>⚠️ Didn't change your password?</strong><br/>
          Contact your system administrator immediately or use Forgot Password to secure your account.
        </div>
      </div>
      <p class="text">For security, all active sessions have been terminated.</p>
    `),
  };
}

module.exports = {
  IS_DEV_EMAIL,
  transporter,
  sendMail,
  verifySmtpConnection,
  verifyEmailTemplate,
  resetPasswordTemplate,
  otpTemplate,
  accountCreatedTemplate,
  passwordChangedTemplate,
};

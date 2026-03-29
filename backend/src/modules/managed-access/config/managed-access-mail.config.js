'use strict';

module.exports = {
  host: 'smtp.fasthosts.co.uk',
  port: 587,
  secure: false,
  requireTLS: true,
  connectTimeoutMs: 10000,
  socketTimeoutMs: 10000,
  fromName: 'ChatPDM',
  fromEmail: 'hello@chatpdm.com',
  verificationExpiryMinutes: 30,
  verificationApiPath: '/api/v1/managed-access/verify-email',
  verificationResultPath: '/managed-access/verification-result',
  auth: {
    user: String(process.env.SMTP_USER || '').trim(),
    pass: String(process.env.SMTP_PASS || ''),
  },
};

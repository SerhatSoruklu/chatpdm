'use strict';

const managedAccessMailConfig = require('../config/managed-access-mail.config');
const { sendManagedAccessMail } = require('./smtp-client');
const { renderManagedAccessVerificationEmailHtml } = require('./templates/verification-email.html');
const { renderManagedAccessVerificationEmailText } = require('./templates/verification-email.text');

async function sendVerificationEmail(context) {
  const emailContext = {
    institutionName: context.institutionName,
    verificationLink: context.verificationLink,
    verificationExpiryMinutes: managedAccessMailConfig.verificationExpiryMinutes,
    verificationMethodLabel: 'Work Email',
  };

  await sendManagedAccessMail({
    from: `"${managedAccessMailConfig.fromName}" <${managedAccessMailConfig.fromEmail}>`,
    to: context.workEmail,
    subject: 'Verify your institution access request for ChatPDM',
    text: renderManagedAccessVerificationEmailText(emailContext),
    html: renderManagedAccessVerificationEmailHtml(emailContext),
  });
}

module.exports = {
  sendVerificationEmail,
};

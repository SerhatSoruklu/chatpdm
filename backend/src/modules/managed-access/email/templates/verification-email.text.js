'use strict';

function renderManagedAccessVerificationEmailText(context) {
  return [
    'A request was made to verify institutional access for your organization.',
    '',
    'Use the secure verification link below to confirm control of this work email domain and continue your managed access request.',
    '',
    `Institution: ${context.institutionName}`,
    `Verification path: ${context.verificationMethodLabel}`,
    `Verification link: ${context.verificationLink}`,
    `Verification expires in: ${context.verificationExpiryMinutes} minutes`,
    '',
    'This verification confirms organizational control before trust-bound managed access can move into review.',
    '',
    'If you did not request this verification, no further action is required.',
  ].join('\n');
}

module.exports = {
  renderManagedAccessVerificationEmailText,
};

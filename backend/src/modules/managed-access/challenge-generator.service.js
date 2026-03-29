'use strict';

const crypto = require('node:crypto');
const verificationConfig = require('./config/managed-access-verification.config');

function buildChallengeExpiresAt(now = new Date()) {
  return new Date(now.getTime() + (verificationConfig.challengeExpiryMinutes * 60 * 1000));
}

function createChallengeToken() {
  return crypto.randomBytes(24).toString('hex');
}

function buildDnsTxtChallenge(companyDomain, now = new Date()) {
  const token = createChallengeToken();
  const expiresAt = buildChallengeExpiresAt(now);

  return {
    type: 'dns_txt',
    host: `${verificationConfig.dnsTxtRecordPrefix}.${companyDomain}`,
    value: `chatpdm-site-verification=${token}`,
    expiresAt,
    issuedAt: now,
  };
}

function buildWebsiteFileChallenge(companyDomain, now = new Date()) {
  const token = createChallengeToken();
  const fileName = `${verificationConfig.websiteFilePrefix}${token.slice(0, 16)}.txt`;
  const filePath = `${verificationConfig.websiteFileDirectory}/${fileName}`;
  const expiresAt = buildChallengeExpiresAt(now);

  return {
    type: 'website_file',
    fileName,
    filePath,
    url: `https://${companyDomain}${filePath}`,
    content: `chatpdm-site-verification=${token}`,
    expiresAt,
    issuedAt: now,
  };
}

module.exports = {
  buildDnsTxtChallenge,
  buildWebsiteFileChallenge,
};

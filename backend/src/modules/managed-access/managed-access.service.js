'use strict';

const crypto = require('node:crypto');

const env = require('../../config/env');
const managedAccessMailConfig = require('./config/managed-access-mail.config');
const ManagedAccessRequest = require('./managed-access.model');
const ManagedAccessEvidenceEvent = require('./managed-access-evidence-event.model');
const { buildDnsTxtChallenge, buildWebsiteFileChallenge } = require('./challenge-generator.service');
const { sendVerificationEmail } = require('./email/send-verification-email');
const {
  fetchWebsiteText,
  resolveDnsTxtRecords,
} = require('./verification-probe.service');
const {
  MANAGED_ACCESS_STATUSES,
  MANAGED_ACCESS_TRUST_LEVELS,
  MANAGED_ACCESS_VERIFICATION_STATES,
} = require('./constants');
const {
  ManagedAccessValidationError,
  normalizeCreateManagedAccessPayload,
  normalizeManagedAccessRequestId,
  normalizeVerificationToken,
} = require('./managed-access.validation');

function createManagedAccessServiceError(code, message, statusCode) {
  const error = new Error(message);
  error.name = 'ManagedAccessServiceError';
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function buildVerificationToken() {
  const token = crypto.randomBytes(32).toString('hex');

  return {
    token,
    tokenHash: hashVerificationToken(token),
  };
}

function hashVerificationToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function buildChallengeFingerprint(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
}

function buildVerificationTokenExpiresAt(now = new Date()) {
  return new Date(now.getTime() + (managedAccessMailConfig.verificationExpiryMinutes * 60 * 1000));
}

function buildVerificationLink(token) {
  const verificationUrl = new URL(managedAccessMailConfig.verificationApiPath, env.apiOrigin);
  verificationUrl.searchParams.set('token', token);
  return verificationUrl.toString();
}

function buildVerificationResultUrl(status) {
  const resultUrl = new URL(managedAccessMailConfig.verificationResultPath, env.frontendUrl);
  resultUrl.searchParams.set('status', status);
  return resultUrl.toString();
}

function toIsoOrNull(value) {
  return value instanceof Date && !Number.isNaN(value.getTime())
    ? value.toISOString()
    : null;
}

function buildChallengePayloadFromRequest(requestRecord) {
  if (requestRecord.challengeType === 'dns_txt') {
    return {
      type: 'dns_txt',
      host: requestRecord.dnsTxtRecordName,
      value: requestRecord.dnsTxtRecordValue,
      expiresAt: toIsoOrNull(requestRecord.challengeExpiresAt),
      instructions:
        'Publish this TXT record on the exact host shown below, wait for DNS propagation, then refresh verification status.',
    };
  }

  if (requestRecord.challengeType === 'website_file') {
    return {
      type: 'website_file',
      fileName: requestRecord.websiteFileName,
      filePath: requestRecord.websiteFilePath,
      url: requestRecord.websiteFileUrl,
      content: requestRecord.websiteFileContent,
      expiresAt: toIsoOrNull(requestRecord.challengeExpiresAt),
      instructions:
        'Host this file at the exact path shown below, serve the exact content, then refresh verification status.',
    };
  }

  return null;
}

function buildChallengeLocator(requestRecord) {
  if (requestRecord.challengeType === 'dns_txt') {
    return requestRecord.dnsTxtRecordName;
  }

  if (requestRecord.challengeType === 'website_file') {
    return requestRecord.websiteFilePath;
  }

  return null;
}

function buildManagedAccessResponse(requestRecord, options = {}) {
  const response = {
    requestId: String(requestRecord._id),
    verificationMethod: requestRecord.verificationMethod,
    status: options.statusOverride || requestRecord.status,
    verificationState: requestRecord.verificationState,
    trustLevel: requestRecord.trustLevel,
    institutionName: requestRecord.institutionName,
    companyDomain: requestRecord.companyDomain,
    industry: requestRecord.industry,
    deploymentPreference: requestRecord.deploymentPreference,
    workEmail: requestRecord.workEmail,
    createdAt: toIsoOrNull(requestRecord.createdAt),
    verifiedAt: toIsoOrNull(requestRecord.verifiedAt),
    challengeLastCheckedAt: toIsoOrNull(requestRecord.challengeLastCheckedAt),
    challengeFailureReason: requestRecord.challengeFailureReason || null,
    message: options.message,
  };

  if (requestRecord.verificationMethod === 'work_email') {
    response.verificationTokenExpiresAt = toIsoOrNull(requestRecord.verificationTokenExpiresAt);
  }

  const challenge = buildChallengePayloadFromRequest(requestRecord);

  if (challenge) {
    response.challenge = challenge;
  }

  return response;
}

async function appendManagedAccessEvidenceEvent(requestRecord, eventType, options = {}) {
  await ManagedAccessEvidenceEvent.create({
    requestId: requestRecord._id,
    verificationMethod: requestRecord.verificationMethod,
    eventType,
    status: requestRecord.status,
    verificationState: requestRecord.verificationState,
    trustLevel: requestRecord.trustLevel,
    challengeLocator: options.challengeLocator ?? buildChallengeLocator(requestRecord),
    challengeFingerprint: options.challengeValue
      ? buildChallengeFingerprint(options.challengeValue)
      : null,
    detailCode: options.detailCode ?? null,
    recordedAt: options.recordedAt || new Date(),
    context: 'managed_access_integrity_ledger',
  });
}

async function deleteManagedAccessRequestWithEvidence(requestId) {
  await ManagedAccessEvidenceEvent.deleteMany({ requestId });
  await ManagedAccessRequest.deleteOne({ _id: requestId });
}

async function createManagedAccessRequest(payload) {
  const normalizedPayload = normalizeCreateManagedAccessPayload(payload);

  switch (normalizedPayload.verificationMethod) {
    case 'work_email':
      return createWorkEmailManagedAccessRequest(normalizedPayload);
    case 'dns_txt':
      return createDnsTxtManagedAccessRequest(normalizedPayload);
    case 'website_file':
      return createWebsiteFileManagedAccessRequest(normalizedPayload);
    default:
      throw createManagedAccessServiceError(
        'unsupported_verification_method',
        'The managed access verification method is not supported.',
        400,
      );
  }
}

async function createWorkEmailManagedAccessRequest(payload) {
  const { token, tokenHash } = buildVerificationToken();
  const verificationTokenExpiresAt = buildVerificationTokenExpiresAt();

  const createdRequest = await ManagedAccessRequest.create({
    ...payload,
    status: MANAGED_ACCESS_STATUSES.pendingEmailVerification,
    verificationState: MANAGED_ACCESS_VERIFICATION_STATES[0],
    trustLevel: MANAGED_ACCESS_TRUST_LEVELS[0],
    verificationTokenHash: tokenHash,
    verificationTokenExpiresAt,
    verifiedAt: null,
    challengeType: null,
    challengeIssuedAt: null,
    challengeExpiresAt: null,
    challengeLastCheckedAt: null,
    challengeFailureReason: null,
    dnsTxtRecordName: null,
    dnsTxtRecordValue: null,
    websiteFileName: null,
    websiteFilePath: null,
    websiteFileContent: null,
    websiteFileUrl: null,
  });

  try {
    await appendManagedAccessEvidenceEvent(createdRequest, 'request_created', {
      detailCode: 'work_email_request_created',
    });
  } catch (error) {
    await deleteManagedAccessRequestWithEvidence(createdRequest._id);
    throw error;
  }

  try {
    await sendVerificationEmail({
      institutionName: createdRequest.institutionName,
      verificationLink: buildVerificationLink(token),
      workEmail: createdRequest.workEmail,
    });
  } catch (error) {
    await deleteManagedAccessRequestWithEvidence(createdRequest._id);

    process.stderr.write(
      `[chatpdm-backend] managed access email send failed: ${error.stack || error.message}\n`,
    );

    throw createManagedAccessServiceError(
      'managed_access_email_send_failed',
      'The verification email could not be sent. Please try again later.',
      500,
    );
  }

  try {
    await appendManagedAccessEvidenceEvent(createdRequest, 'email_verification_sent', {
      detailCode: 'work_email_verification_dispatched',
    });
  } catch (error) {
    process.stderr.write(
      `[chatpdm-backend] managed access evidence write failed: ${error.stack || error.message}\n`,
    );
  }

  return buildManagedAccessResponse(createdRequest, {
    statusOverride: 'verification_email_sent',
    message:
      'Verification email sent. Work email verification is required before trust review.',
  });
}

async function createDnsTxtManagedAccessRequest(payload) {
  const challenge = buildDnsTxtChallenge(payload.companyDomain);
  const createdRequest = await ManagedAccessRequest.create({
    ...payload,
    status: MANAGED_ACCESS_STATUSES.pendingDnsVerification,
    verificationState: MANAGED_ACCESS_VERIFICATION_STATES[0],
    trustLevel: MANAGED_ACCESS_TRUST_LEVELS[0],
    verificationTokenHash: null,
    verificationTokenExpiresAt: null,
    verifiedAt: null,
    challengeType: challenge.type,
    challengeIssuedAt: challenge.issuedAt,
    challengeExpiresAt: challenge.expiresAt,
    challengeLastCheckedAt: null,
    challengeFailureReason: null,
    dnsTxtRecordName: challenge.host,
    dnsTxtRecordValue: challenge.value,
    websiteFileName: null,
    websiteFilePath: null,
    websiteFileContent: null,
    websiteFileUrl: null,
  });

  try {
    await appendManagedAccessEvidenceEvent(createdRequest, 'request_created', {
      detailCode: 'dns_txt_request_created',
    });
    await appendManagedAccessEvidenceEvent(createdRequest, 'dns_challenge_created', {
      detailCode: 'dns_txt_challenge_created',
      challengeValue: challenge.value,
    });
  } catch (error) {
    await deleteManagedAccessRequestWithEvidence(createdRequest._id);
    throw error;
  }

  return buildManagedAccessResponse(createdRequest, {
    message:
      'DNS TXT challenge created. Publish the exact record and refresh verification status.',
  });
}

async function createWebsiteFileManagedAccessRequest(payload) {
  const challenge = buildWebsiteFileChallenge(payload.companyDomain);
  const createdRequest = await ManagedAccessRequest.create({
    ...payload,
    status: MANAGED_ACCESS_STATUSES.pendingWebsiteFileVerification,
    verificationState: MANAGED_ACCESS_VERIFICATION_STATES[0],
    trustLevel: MANAGED_ACCESS_TRUST_LEVELS[0],
    verificationTokenHash: null,
    verificationTokenExpiresAt: null,
    verifiedAt: null,
    challengeType: challenge.type,
    challengeIssuedAt: challenge.issuedAt,
    challengeExpiresAt: challenge.expiresAt,
    challengeLastCheckedAt: null,
    challengeFailureReason: null,
    dnsTxtRecordName: null,
    dnsTxtRecordValue: null,
    websiteFileName: challenge.fileName,
    websiteFilePath: challenge.filePath,
    websiteFileContent: challenge.content,
    websiteFileUrl: challenge.url,
  });

  try {
    await appendManagedAccessEvidenceEvent(createdRequest, 'request_created', {
      detailCode: 'website_file_request_created',
    });
    await appendManagedAccessEvidenceEvent(createdRequest, 'website_file_challenge_created', {
      detailCode: 'website_file_challenge_created',
      challengeValue: challenge.content,
    });
  } catch (error) {
    await deleteManagedAccessRequestWithEvidence(createdRequest._id);
    throw error;
  }

  return buildManagedAccessResponse(createdRequest, {
    message:
      'Website file challenge created. Host the exact file and refresh verification status.',
  });
}

async function verifyManagedAccessEmailToken(token) {
  const normalizedToken = normalizeVerificationToken(token);
  const verificationTokenHash = hashVerificationToken(normalizedToken);
  const requestRecord = await ManagedAccessRequest.findOne({ verificationTokenHash }).exec();

  if (!requestRecord) {
    throw createManagedAccessServiceError(
      'invalid_verification_token',
      'This verification link is invalid or has already been used.',
      400,
    );
  }

  if (requestRecord.status !== MANAGED_ACCESS_STATUSES.pendingEmailVerification) {
    throw createManagedAccessServiceError(
      'invalid_verification_token',
      'This verification link is invalid or has already been used.',
      400,
    );
  }

  const expiresAt = requestRecord.verificationTokenExpiresAt;

  if (!(expiresAt instanceof Date) || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    requestRecord.status = MANAGED_ACCESS_STATUSES.verificationExpired;
    requestRecord.verificationState = 'expired';
    requestRecord.verificationTokenHash = null;
    requestRecord.verificationTokenExpiresAt = null;
    requestRecord.challengeFailureReason = 'verification_expired';
    await requestRecord.save();
    await safeAppendManagedAccessEvidenceEvent(requestRecord, 'email_verification_expired', {
      detailCode: 'work_email_verification_expired',
    });

    throw createManagedAccessServiceError(
      'verification_expired',
      'This verification link has expired. Submit a fresh managed access request to continue.',
      410,
    );
  }

  requestRecord.status = MANAGED_ACCESS_STATUSES.underTrustReview;
  requestRecord.verificationState = 'verified';
  requestRecord.trustLevel = 'work_email_verified';
  requestRecord.verifiedAt = new Date();
  requestRecord.verificationTokenHash = null;
  requestRecord.verificationTokenExpiresAt = null;
  requestRecord.challengeFailureReason = null;
  await requestRecord.save();
  await safeAppendManagedAccessEvidenceEvent(requestRecord, 'email_verified', {
    detailCode: 'work_email_verified',
  });

  return buildManagedAccessResponse(requestRecord, {
    message:
      'Work email verified. Your institutional access request is now under trust review.',
  });
}

async function verifyManagedAccessDnsRequest(payload) {
  const requestRecord = await getManagedAccessRequestForVerification(payload, 'dns_txt');
  const expiredResponse = await maybeExpireStrongerProofRequest(requestRecord, 'dns_verification_expired');

  if (expiredResponse) {
    return expiredResponse;
  }

  if (requestRecord.verificationState === 'verified' && requestRecord.status === MANAGED_ACCESS_STATUSES.underTrustReview) {
    return buildManagedAccessResponse(requestRecord, {
      message:
        'DNS TXT verification already succeeded. Your institutional access request remains under trust review with stronger organization proof.',
    });
  }

  const checkTime = new Date();

  try {
    const records = await resolveDnsTxtRecords(requestRecord.dnsTxtRecordName);
    const matchesExpectedValue = records
      .map((entry) => entry.join('').trim())
      .some((value) => value === requestRecord.dnsTxtRecordValue);

    if (!matchesExpectedValue) {
      return markStrongerProofVerificationFailure(
        requestRecord,
        checkTime,
        'dns_txt_record_not_found_or_mismatch',
        'dns_verification_checked',
        'DNS TXT verification is not yet visible. Publish the exact record and refresh again.',
      );
    }
  } catch (error) {
    if (['ENODATA', 'ENOTFOUND', 'ESERVFAIL', 'ETIMEOUT', 'EREFUSED'].includes(error.code)) {
      return markStrongerProofVerificationFailure(
        requestRecord,
        checkTime,
        'dns_lookup_unavailable',
        'dns_verification_checked',
        'DNS TXT verification could not yet be confirmed. Wait for propagation and refresh again.',
      );
    }

    throw createManagedAccessServiceError(
      'dns_verification_probe_failed',
      'DNS TXT verification could not be checked at this time.',
      502,
    );
  }

  return markStrongerProofVerificationSuccess(
    requestRecord,
    checkTime,
    'dns_verified',
    'dns_txt_verified',
    'DNS TXT verification succeeded. Your institutional access request is now under trust review with stronger organization proof.',
  );
}

async function verifyManagedAccessWebsiteFileRequest(payload) {
  const requestRecord = await getManagedAccessRequestForVerification(payload, 'website_file');
  const expiredResponse = await maybeExpireStrongerProofRequest(requestRecord, 'website_file_verification_expired');

  if (expiredResponse) {
    return expiredResponse;
  }

  if (requestRecord.verificationState === 'verified' && requestRecord.status === MANAGED_ACCESS_STATUSES.underTrustReview) {
    return buildManagedAccessResponse(requestRecord, {
      message:
        'Website file verification already succeeded. Your institutional access request remains under trust review with stronger organization proof.',
    });
  }

  const checkTime = new Date();
  let fetchResult;

  try {
    fetchResult = await fetchWebsiteText(requestRecord.websiteFileUrl);
  } catch (error) {
    return markStrongerProofVerificationFailure(
      requestRecord,
      checkTime,
      'website_file_fetch_unavailable',
      'website_file_verification_checked',
      'Website file verification could not be checked at this time. Refresh again in a moment.',
    );
  }

  if (!fetchResult.ok) {
    return markStrongerProofVerificationFailure(
      requestRecord,
      checkTime,
      fetchResult.status === 404 ? 'website_file_not_found' : 'website_file_unreachable',
      'website_file_verification_checked',
      'Website file verification is not yet visible. Host the exact file and refresh again.',
    );
  }

  if (String(fetchResult.text).trim() !== String(requestRecord.websiteFileContent).trim()) {
    return markStrongerProofVerificationFailure(
      requestRecord,
      checkTime,
      'website_file_content_mismatch',
      'website_file_verification_checked',
      'Website file content did not match the expected verification payload. Update the file and refresh again.',
    );
  }

  return markStrongerProofVerificationSuccess(
    requestRecord,
    checkTime,
    'website_file_verified',
    'website_file_verified',
    'Website file verification succeeded. Your institutional access request is now under trust review with stronger organization proof.',
  );
}

async function getManagedAccessRequestForVerification(payload, expectedMethod) {
  const requestId = normalizeManagedAccessRequestId(payload);
  const requestRecord = await ManagedAccessRequest.findById(requestId).exec();

  if (!requestRecord) {
    throw createManagedAccessServiceError(
      'managed_access_request_not_found',
      'Managed access request was not found.',
      404,
    );
  }

  if (requestRecord.verificationMethod !== expectedMethod) {
    throw createManagedAccessServiceError(
      'managed_access_request_method_mismatch',
      `Managed access request is not using the ${expectedMethod} verification method.`,
      400,
    );
  }

  return requestRecord;
}

async function maybeExpireStrongerProofRequest(requestRecord, detailCode) {
  const expiresAt = requestRecord.challengeExpiresAt;

  if (!(expiresAt instanceof Date) || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() > Date.now()) {
    return null;
  }

  requestRecord.status = MANAGED_ACCESS_STATUSES.verificationExpired;
  requestRecord.verificationState = 'expired';
  requestRecord.challengeLastCheckedAt = new Date();
  requestRecord.challengeFailureReason = 'challenge_expired';
  await requestRecord.save();
  await safeAppendManagedAccessEvidenceEvent(requestRecord, detailCode, {
    detailCode: 'stronger_proof_challenge_expired',
  });

  return buildManagedAccessResponse(requestRecord, {
    message:
      'This stronger-proof challenge has expired. Submit a fresh managed access request to continue.',
  });
}

async function markStrongerProofVerificationFailure(
  requestRecord,
  checkedAt,
  failureReason,
  eventType,
  message,
) {
  requestRecord.verificationState = 'failed';
  requestRecord.challengeLastCheckedAt = checkedAt;
  requestRecord.challengeFailureReason = failureReason;
  await requestRecord.save();
  await safeAppendManagedAccessEvidenceEvent(requestRecord, eventType, {
    detailCode: failureReason,
  });

  return buildManagedAccessResponse(requestRecord, {
    message,
  });
}

async function markStrongerProofVerificationSuccess(
  requestRecord,
  checkedAt,
  eventType,
  detailCode,
  message,
) {
  requestRecord.status = MANAGED_ACCESS_STATUSES.underTrustReview;
  requestRecord.verificationState = 'verified';
  requestRecord.trustLevel = 'stronger_organization_proof';
  requestRecord.verifiedAt = checkedAt;
  requestRecord.challengeLastCheckedAt = checkedAt;
  requestRecord.challengeFailureReason = null;
  await requestRecord.save();
  await safeAppendManagedAccessEvidenceEvent(requestRecord, eventType, {
    detailCode,
  });

  return buildManagedAccessResponse(requestRecord, {
    message,
  });
}

async function safeAppendManagedAccessEvidenceEvent(requestRecord, eventType, options) {
  try {
    await appendManagedAccessEvidenceEvent(requestRecord, eventType, options);
  } catch (error) {
    process.stderr.write(
      `[chatpdm-backend] managed access evidence write failed: ${error.stack || error.message}\n`,
    );
  }
}

module.exports = {
  ManagedAccessValidationError,
  buildVerificationResultUrl,
  createManagedAccessRequest,
  verifyManagedAccessDnsRequest,
  verifyManagedAccessEmailToken,
  verifyManagedAccessWebsiteFileRequest,
};

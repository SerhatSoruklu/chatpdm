'use strict';

const {
  MANAGED_ACCESS_DEPLOYMENT_PREFERENCES,
  MANAGED_ACCESS_INDUSTRIES,
  MANAGED_ACCESS_VERIFICATION_METHODS,
} = require('./constants');

class ManagedAccessValidationError extends TypeError {
  constructor(code, message) {
    super(message);
    this.name = 'ManagedAccessValidationError';
    this.code = code;
    this.statusCode = 400;
  }
}

const ALLOWED_CREATE_REQUEST_FIELDS = new Set([
  'verificationMethod',
  'institutionName',
  'companyDomain',
  'industry',
  'deploymentPreference',
  'workEmail',
]);

function assertManagedAccessObject(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ManagedAccessValidationError(
      'invalid_managed_access_request',
      'Managed access payload must be an object.',
    );
  }
}

function assertAllowedFields(payload) {
  const unexpectedFields = Object.keys(payload)
    .filter((fieldName) => !ALLOWED_CREATE_REQUEST_FIELDS.has(fieldName))
    .sort();

  if (unexpectedFields.length > 0) {
    throw new ManagedAccessValidationError(
      'invalid_managed_access_request',
      `Unsupported managed access field(s): ${unexpectedFields.join(', ')}.`,
    );
  }
}

const ALLOWED_MANAGED_ACCESS_LOOKUP_FIELDS = new Set(['requestId']);

function normalizeNonEmptyString(value, fieldName) {
  if (typeof value !== 'string') {
    throw new ManagedAccessValidationError(
      'invalid_managed_access_request',
      `${fieldName} must be a string.`,
    );
  }

  const normalizedValue = value.trim().replace(/\s+/g, ' ');

  if (normalizedValue.length === 0) {
    throw new ManagedAccessValidationError(
      'invalid_managed_access_request',
      `${fieldName} is required.`,
    );
  }

  return normalizedValue;
}

function normalizeDomain(value) {
  return normalizeNonEmptyString(value, 'companyDomain')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
}

function normalizeEmail(value) {
  return normalizeNonEmptyString(value, 'workEmail').toLowerCase();
}

function assertAllowedValue(value, allowedValues, fieldName) {
  if (!allowedValues.includes(value)) {
    throw new ManagedAccessValidationError(
      'invalid_managed_access_request',
      `${fieldName} is invalid.`,
    );
  }
}

function assertReasonableDomain(domain) {
  const domainPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

  if (!domainPattern.test(domain)) {
    throw new ManagedAccessValidationError(
      'invalid_managed_access_request',
      'companyDomain must be a reasonable domain-style value.',
    );
  }
}

function assertReasonableEmail(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    throw new ManagedAccessValidationError(
      'invalid_managed_access_request',
      'workEmail must be a reasonable email-style value.',
    );
  }
}

function assertWorkEmailMatchesCompanyDomain(workEmail, companyDomain) {
  const emailDomain = workEmail.slice(workEmail.lastIndexOf('@') + 1);

  if (emailDomain !== companyDomain && !emailDomain.endsWith(`.${companyDomain}`)) {
    throw new ManagedAccessValidationError(
      'invalid_managed_access_request',
      'workEmail must belong to the declared companyDomain boundary.',
    );
  }
}

function normalizeCreateManagedAccessPayload(payload) {
  assertManagedAccessObject(payload);
  assertAllowedFields(payload);

  const verificationMethod = normalizeNonEmptyString(payload.verificationMethod, 'verificationMethod')
    .toLowerCase()
    .replace(/\s+/g, '_');
  assertAllowedValue(
    verificationMethod,
    MANAGED_ACCESS_VERIFICATION_METHODS,
    'verificationMethod',
  );

  const institutionName = normalizeNonEmptyString(payload.institutionName, 'institutionName');
  const companyDomain = normalizeDomain(payload.companyDomain);
  const industry = normalizeNonEmptyString(payload.industry, 'industry').toLowerCase();
  const deploymentPreference = normalizeNonEmptyString(
    payload.deploymentPreference,
    'deploymentPreference',
  ).toLowerCase();
  const workEmail = normalizeEmail(payload.workEmail);

  assertReasonableDomain(companyDomain);
  assertReasonableEmail(workEmail);
  assertAllowedValue(industry, MANAGED_ACCESS_INDUSTRIES, 'industry');
  assertAllowedValue(
    deploymentPreference,
    MANAGED_ACCESS_DEPLOYMENT_PREFERENCES,
    'deploymentPreference',
  );
  assertWorkEmailMatchesCompanyDomain(workEmail, companyDomain);

  return {
    verificationMethod,
    institutionName,
    companyDomain,
    industry,
    deploymentPreference,
    workEmail,
  };
}

function normalizeVerificationToken(token) {
  if (typeof token !== 'string') {
    throw new ManagedAccessValidationError(
      'invalid_verification_token',
      'Verification token must be a string.',
    );
  }

  const normalizedToken = token.trim().toLowerCase();

  if (!/^[a-f0-9]{64}$/.test(normalizedToken)) {
    throw new ManagedAccessValidationError(
      'invalid_verification_token',
      'Verification token is invalid.',
    );
  }

  return normalizedToken;
}

function normalizeManagedAccessRequestId(payload) {
  assertManagedAccessObject(payload);

  const unexpectedFields = Object.keys(payload)
    .filter((fieldName) => !ALLOWED_MANAGED_ACCESS_LOOKUP_FIELDS.has(fieldName))
    .sort();

  if (unexpectedFields.length > 0) {
    throw new ManagedAccessValidationError(
      'invalid_managed_access_request_lookup',
      `Unsupported managed access lookup field(s): ${unexpectedFields.join(', ')}.`,
    );
  }

  const requestId = normalizeNonEmptyString(payload.requestId, 'requestId').toLowerCase();

  if (!/^[a-f0-9]{24}$/.test(requestId)) {
    throw new ManagedAccessValidationError(
      'invalid_managed_access_request_lookup',
      'requestId must be a valid managed access request identifier.',
    );
  }

  return requestId;
}

module.exports = {
  ManagedAccessValidationError,
  normalizeCreateManagedAccessPayload,
  normalizeManagedAccessRequestId,
  normalizeVerificationToken,
};

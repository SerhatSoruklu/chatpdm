'use strict';

const mongoose = require('mongoose');

const {
  MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
} = require('./config/managed-access-assurance.config');

const PROVISIONING_EVIDENCE_CANONICAL_ENVELOPE_KEYS = Object.freeze([
  'hashVersion',
  'requestId',
  'sequence',
  'eventType',
  'actorIdentity',
  'recordedAt',
  'payload',
  'previousHash',
]);

class CanonicalizationContractViolationError extends TypeError {
  constructor(message, path) {
    super(message);
    this.name = 'CanonicalizationContractViolationError';
    this.code = 'canonicalization_contract_violation';
    this.path = path;
  }
}

function assertCanonicalizableProvisioningEvidenceValue(value, path = 'value') {
  normalizeCanonicalProvisioningEvidenceValue(value, path);
}

function normalizeCanonicalProvisioningEvidenceValue(value, path = 'value') {
  if (value === undefined) {
    throw new CanonicalizationContractViolationError(
      `${path} must not be undefined.`,
      path,
    );
  }

  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new CanonicalizationContractViolationError(
        `${path} must be a valid Date.`,
        path,
      );
    }

    return value.toISOString();
  }

  if (isObjectIdInstance(value)) {
    return value.toHexString().toLowerCase();
  }

  if (Array.isArray(value)) {
    return value.map((entry, index) =>
      normalizeCanonicalProvisioningEvidenceValue(entry, `${path}[${index}]`));
  }

  switch (typeof value) {
    case 'boolean':
      return value;
    case 'number':
      if (!Number.isFinite(value)) {
        throw new CanonicalizationContractViolationError(
          `${path} must be a finite number.`,
          path,
        );
      }

      return value;
    case 'string':
      return normalizeCanonicalString(value);
    case 'object':
      if (!isPlainObject(value)) {
        throw new CanonicalizationContractViolationError(
          `${path} must be a plain object.`,
          path,
        );
      }

      return Object.keys(value)
        .sort()
        .reduce((normalizedValue, key) => {
          normalizedValue[key] = normalizeCanonicalProvisioningEvidenceValue(
            value[key],
            `${path}.${key}`,
          );
          return normalizedValue;
        }, {});
    case 'function':
    case 'symbol':
    case 'bigint':
      throw new CanonicalizationContractViolationError(
        `${path} contains unsupported value type "${typeof value}".`,
        path,
      );
    default:
      throw new CanonicalizationContractViolationError(
        `${path} contains unsupported value type "${typeof value}".`,
        path,
      );
  }
}

function buildCanonicalProvisioningEvidenceEnvelope(input) {
  if (!isPlainObject(input)) {
    throw new CanonicalizationContractViolationError(
      'envelope must be a plain object.',
      'envelope',
    );
  }

  const inputKeys = Object.keys(input).sort();
  const expectedKeys = [...PROVISIONING_EVIDENCE_CANONICAL_ENVELOPE_KEYS].sort();

  if (inputKeys.length !== expectedKeys.length || !inputKeys.every((key, index) => key === expectedKeys[index])) {
    throw new CanonicalizationContractViolationError(
      `envelope keys must exactly match ${PROVISIONING_EVIDENCE_CANONICAL_ENVELOPE_KEYS.join(', ')}.`,
      'envelope',
    );
  }

  if (input.hashVersion !== MANAGED_ACCESS_ASSURANCE_HASH_VERSION) {
    throw new CanonicalizationContractViolationError(
      `hashVersion must equal ${MANAGED_ACCESS_ASSURANCE_HASH_VERSION}.`,
      'envelope.hashVersion',
    );
  }

  if (!isObjectIdLikeValue(input.requestId)) {
    throw new CanonicalizationContractViolationError(
      'requestId must be a canonical ObjectId value.',
      'envelope.requestId',
    );
  }

  if (!Number.isSafeInteger(input.sequence) || input.sequence < 1) {
    throw new CanonicalizationContractViolationError(
      'sequence must be a positive safe integer.',
      'envelope.sequence',
    );
  }

  if (typeof input.eventType !== 'string' || input.eventType.length === 0) {
    throw new CanonicalizationContractViolationError(
      'eventType must be a non-empty string.',
      'envelope.eventType',
    );
  }

  if (typeof input.actorIdentity !== 'string' || input.actorIdentity.length === 0) {
    throw new CanonicalizationContractViolationError(
      'actorIdentity must be a non-empty string.',
      'envelope.actorIdentity',
    );
  }

  if (!(input.recordedAt instanceof Date)) {
    throw new CanonicalizationContractViolationError(
      'recordedAt must be a Date.',
      'envelope.recordedAt',
    );
  }

  if (!isPlainObject(input.payload)) {
    throw new CanonicalizationContractViolationError(
      'payload must be a plain object.',
      'envelope.payload',
    );
  }

  if (
    input.previousHash !== null
    && (
      typeof input.previousHash !== 'string'
      || !/^[a-f0-9]{64}$/i.test(input.previousHash)
    )
  ) {
    throw new CanonicalizationContractViolationError(
      'previousHash must be null or a 64-character hexadecimal string.',
      'envelope.previousHash',
    );
  }

  const normalizedEnvelope = {
    hashVersion: MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
    requestId: normalizeCanonicalProvisioningEvidenceValue(input.requestId, 'envelope.requestId'),
    sequence: input.sequence,
    eventType: normalizeCanonicalProvisioningEvidenceValue(input.eventType, 'envelope.eventType'),
    actorIdentity: normalizeCanonicalProvisioningEvidenceValue(
      input.actorIdentity,
      'envelope.actorIdentity',
    ),
    recordedAt: normalizeCanonicalProvisioningEvidenceValue(input.recordedAt, 'envelope.recordedAt'),
    payload: normalizeCanonicalProvisioningEvidenceValue(input.payload, 'envelope.payload'),
    previousHash: normalizeCanonicalProvisioningEvidenceValue(
      input.previousHash,
      'envelope.previousHash',
    ),
  };

  return normalizedEnvelope;
}

function canonicalizeEvent(envelope) {
  return stableSerializeCanonicalEnvelope(
    buildCanonicalProvisioningEvidenceEnvelope(envelope),
  );
}

function canonicalizeValue(value) {
  const normalizedValue = normalizeCanonicalProvisioningEvidenceValue(value);
  return stableSerializeCanonicalValue(normalizedValue);
}

function stableSerializeCanonicalValue(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerializeCanonicalValue(entry)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableSerializeCanonicalValue(value[key])}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

function stableSerializeCanonicalEnvelope(envelope) {
  return `{${PROVISIONING_EVIDENCE_CANONICAL_ENVELOPE_KEYS.map((key) =>
    `${JSON.stringify(key)}:${stableSerializeCanonicalValue(envelope[key])}`).join(',')}}`;
}

function normalizeCanonicalString(value) {
  const normalizedValue = value.normalize('NFC');

  if (isObjectIdLikeValue(normalizedValue)) {
    return normalizedValue.toLowerCase();
  }

  return normalizedValue;
}

function isObjectIdInstance(value) {
  return value instanceof mongoose.Types.ObjectId;
}

function isObjectIdLikeValue(value) {
  return isObjectIdInstance(value)
    || (
      typeof value === 'string'
      && /^[a-f0-9]{24}$/i.test(value)
    );
}

function isPlainObject(value) {
  return value !== null
    && typeof value === 'object'
    && Object.getPrototypeOf(value) === Object.prototype;
}

module.exports = {
  MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
  PROVISIONING_EVIDENCE_CANONICAL_ENVELOPE_KEYS,
  assertCanonicalizableProvisioningEvidenceValue,
  buildCanonicalProvisioningEvidenceEnvelope,
  canonicalizeEvent,
  canonicalizeValue,
  normalizeCanonicalProvisioningEvidenceValue,
};

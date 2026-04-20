'use strict';

const LEGAL_VALIDATOR_RESOURCE = 'legal-validator';
const LEGAL_VALIDATOR_PRODUCT = 'legal-argument-validator';
const LEGAL_VALIDATOR_SCOPE = 'bounded-legal-validation';
const LEGAL_VALIDATOR_SCOPE_LOCK_CONTRACT_VERSION = 'pre-a-scope-lock-v1';
const LEGAL_VALIDATOR_ORCHESTRATOR_CONTRACT_VERSION = 'orchestrator-v1';
const LEGAL_VALIDATOR_MATTER_CONTRACT_VERSION = 'matter-intake-v1';
const LEGAL_VALIDATOR_REPLAY_CONTRACT_VERSION = 'replay-v1';
const LEGAL_VALIDATOR_REQUIRED_SCOPE_KEYS = Object.freeze([
  'product',
  'scope',
  'matterId',
  'jurisdiction',
  'practiceArea',
]);
const LEGAL_VALIDATOR_MATTER_STATUSES = Object.freeze(['draft', 'active', 'closed']);
const LEGAL_VALIDATOR_REQUIRED_MATTER_KEYS = Object.freeze([
  'matterId',
  'title',
  'jurisdiction',
  'practiceArea',
  'status',
  'createdBy',
]);
const LEGAL_VALIDATOR_REQUIRED_ORCHESTRATOR_KEYS = Object.freeze([
  ...LEGAL_VALIDATOR_REQUIRED_SCOPE_KEYS,
  'sourceDocumentId',
  'doctrineArtifactId',
  'authorityInput',
  'resolverDecision',
  'validationDecision',
  'traceInput',
]);
const LEGAL_VALIDATOR_REQUIRED_REPLAY_KEYS = Object.freeze([
  'validationRunId',
]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readWrappedInput(body) {
  if (!isPlainObject(body)) {
    return {
      kind: 'invalid',
      message: 'Legal Argument Validator requests must be JSON objects with a single input field.',
    };
  }

  const keys = Object.keys(body);

  if (keys.length !== 1 || !Object.prototype.hasOwnProperty.call(body, 'input')) {
    return {
      kind: 'invalid',
      message: 'Legal Argument Validator requests must contain exactly one top-level field named "input".',
    };
  }

  return {
    kind: 'ok',
    input: body.input,
  };
}

function normalizeStringField(value, fieldName) {
  if (typeof value !== 'string') {
    return {
      kind: 'invalid',
      message: `Legal Argument Validator scope-lock input must declare ${fieldName} as a non-empty string.`,
    };
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    return {
      kind: 'invalid',
      message: `Legal Argument Validator scope-lock input must declare ${fieldName} as a non-empty string.`,
    };
  }

  return {
    kind: 'ok',
    value: normalizedValue,
  };
}

function validateScopeLockInput(input) {
  if (!isPlainObject(input)) {
    return {
      kind: 'invalid',
      message: 'Legal Argument Validator scope-lock input must be a plain object.',
    };
  }

  const keys = Object.keys(input);

  if (
    keys.length !== LEGAL_VALIDATOR_REQUIRED_SCOPE_KEYS.length
    || !LEGAL_VALIDATOR_REQUIRED_SCOPE_KEYS.every((key) => Object.prototype.hasOwnProperty.call(input, key))
  ) {
    return {
      kind: 'scope_violation',
      message: 'Legal Argument Validator scope-lock input must contain exactly product, scope, matterId, jurisdiction, and practiceArea.',
    };
  }

  const product = normalizeStringField(input.product, 'product');
  if (product.kind !== 'ok') {
    return product;
  }

  if (product.value !== LEGAL_VALIDATOR_PRODUCT) {
    return {
      kind: 'scope_violation',
      message: `Legal Argument Validator requests must declare product="${LEGAL_VALIDATOR_PRODUCT}".`,
    };
  }

  const scope = normalizeStringField(input.scope, 'scope');
  if (scope.kind !== 'ok') {
    return scope;
  }

  if (scope.value !== LEGAL_VALIDATOR_SCOPE) {
    return {
      kind: 'scope_violation',
      message: `Legal Argument Validator requests must declare scope="${LEGAL_VALIDATOR_SCOPE}".`,
    };
  }

  const matterId = normalizeStringField(input.matterId, 'matterId');
  if (matterId.kind !== 'ok') {
    return matterId;
  }

  const jurisdiction = normalizeStringField(input.jurisdiction, 'jurisdiction');
  if (jurisdiction.kind !== 'ok') {
    return jurisdiction;
  }

  const practiceArea = normalizeStringField(input.practiceArea, 'practiceArea');
  if (practiceArea.kind !== 'ok') {
    return practiceArea;
  }

  return {
    kind: 'ok',
    boundary: Object.freeze({
      product: LEGAL_VALIDATOR_PRODUCT,
      scope: LEGAL_VALIDATOR_SCOPE,
      matterId: matterId.value,
      jurisdiction: jurisdiction.value,
      practiceArea: practiceArea.value,
    }),
  };
}

function validateMatterInput(input) {
  if (!isPlainObject(input)) {
    return {
      kind: 'invalid',
      message: 'Legal Argument Validator matter input must be a plain object.',
    };
  }

  const keys = Object.keys(input);

  if (
    keys.length !== LEGAL_VALIDATOR_REQUIRED_MATTER_KEYS.length
    || !LEGAL_VALIDATOR_REQUIRED_MATTER_KEYS.every((key) => Object.prototype.hasOwnProperty.call(input, key))
  ) {
    return {
      kind: 'invalid',
      message: 'Legal Argument Validator matter input must contain exactly matterId, title, jurisdiction, practiceArea, status, and createdBy.',
    };
  }

  const matterId = normalizeStringField(input.matterId, 'matterId');
  if (matterId.kind !== 'ok') {
    return matterId;
  }

  const title = normalizeStringField(input.title, 'title');
  if (title.kind !== 'ok') {
    return title;
  }

  const jurisdiction = normalizeStringField(input.jurisdiction, 'jurisdiction');
  if (jurisdiction.kind !== 'ok') {
    return jurisdiction;
  }

  const practiceArea = normalizeStringField(input.practiceArea, 'practiceArea');
  if (practiceArea.kind !== 'ok') {
    return practiceArea;
  }

  const status = normalizeStringField(input.status, 'status');
  if (status.kind !== 'ok') {
    return status;
  }

  if (!LEGAL_VALIDATOR_MATTER_STATUSES.includes(status.value)) {
    return {
      kind: 'invalid',
      message: `Legal Argument Validator matter input must declare status as one of ${LEGAL_VALIDATOR_MATTER_STATUSES.join(', ')}.`,
    };
  }

  const createdBy = normalizeStringField(input.createdBy, 'createdBy');
  if (createdBy.kind !== 'ok') {
    return createdBy;
  }

  return {
    kind: 'ok',
    matter: Object.freeze({
      matterId: matterId.value,
      title: title.value,
      jurisdiction: jurisdiction.value,
      practiceArea: practiceArea.value,
      status: status.value,
      createdBy: createdBy.value,
    }),
  };
}

function normalizeOptionalObject(value, fieldName) {
  if (value == null) {
    return { kind: 'ok', value: null };
  }

  if (!isPlainObject(value)) {
    return {
      kind: 'invalid',
      message: `Legal Argument Validator orchestrator input must declare ${fieldName} as a plain object when present.`,
    };
  }

  return { kind: 'ok', value };
}

function normalizeOptionalStringArray(value, fieldName) {
  if (value == null) {
    return { kind: 'ok', value: null };
  }

  if (!Array.isArray(value)) {
    return {
      kind: 'invalid',
      message: `Legal Argument Validator orchestrator input must declare ${fieldName} as an array of strings when present.`,
    };
  }

  const normalizedValues = value.map((entry) => {
    if (typeof entry !== 'string' || entry.trim().length === 0) {
      return null;
    }

    return entry.trim();
  });

  if (normalizedValues.some((entry) => entry == null)) {
    return {
      kind: 'invalid',
      message: `Legal Argument Validator orchestrator input must declare ${fieldName} as an array of non-empty strings when present.`,
    };
  }

  if (new Set(normalizedValues).size !== normalizedValues.length) {
    return {
      kind: 'invalid',
      message: `Legal Argument Validator orchestrator input must declare ${fieldName} values uniquely.`,
    };
  }

  return {
    kind: 'ok',
    value: normalizedValues,
  };
}

function validateOrchestratorInput(input) {
  if (!isPlainObject(input)) {
    return {
      kind: 'invalid',
      message: 'Legal Argument Validator orchestrator input must be a plain object.',
    };
  }

  const allowedKeys = new Set(LEGAL_VALIDATOR_REQUIRED_ORCHESTRATOR_KEYS);

  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      return {
        kind: 'invalid',
        message: `Legal Argument Validator orchestrator input contains unsupported field "${key}".`,
      };
    }
  }

  const boundaryValidation = validateScopeLockInput({
    product: input.product,
    scope: input.scope,
    matterId: input.matterId,
    jurisdiction: input.jurisdiction,
    practiceArea: input.practiceArea,
  });

  if (boundaryValidation.kind !== 'ok') {
    return boundaryValidation;
  }

  const sourceDocumentId = normalizeStringField(input.sourceDocumentId, 'sourceDocumentId');
  if (sourceDocumentId.kind !== 'ok') {
    return sourceDocumentId;
  }

  const doctrineArtifactId = normalizeStringField(input.doctrineArtifactId, 'doctrineArtifactId');
  if (doctrineArtifactId.kind !== 'ok') {
    return doctrineArtifactId;
  }

  const authorityInput = normalizeOptionalObject(input.authorityInput, 'authorityInput');
  if (authorityInput.kind !== 'ok') {
    return authorityInput;
  }

  const resolverDecision = normalizeOptionalObject(input.resolverDecision, 'resolverDecision');
  if (resolverDecision.kind !== 'ok') {
    return resolverDecision;
  }

  const validationDecision = normalizeOptionalObject(input.validationDecision, 'validationDecision');
  if (validationDecision.kind !== 'ok') {
    return validationDecision;
  }

  const traceInput = normalizeOptionalObject(input.traceInput, 'traceInput');
  if (traceInput.kind !== 'ok' || traceInput.value == null) {
    return {
      kind: 'invalid',
      message: 'Legal Argument Validator orchestrator input requires a traceInput object.',
    };
  }

  const validationRunId = normalizeStringField(traceInput.value.validationRunId, 'traceInput.validationRunId');
  if (validationRunId.kind !== 'ok') {
    return validationRunId;
  }

  const resolverVersion = normalizeStringField(traceInput.value.resolverVersion, 'traceInput.resolverVersion');
  if (resolverVersion.kind !== 'ok') {
    return resolverVersion;
  }

  const inputHash = normalizeStringField(traceInput.value.inputHash, 'traceInput.inputHash');
  if (inputHash.kind !== 'ok') {
    return inputHash;
  }

  return {
    kind: 'ok',
    boundary: boundaryValidation.boundary,
    orchestrator: Object.freeze({
      sourceDocumentId: sourceDocumentId.value,
      doctrineArtifactId: doctrineArtifactId.value,
      authorityInput: authorityInput.value,
      resolverDecision: resolverDecision.value,
      validationDecision: validationDecision.value,
      traceInput: Object.freeze({
        ...traceInput.value,
        validationRunId: validationRunId.value,
        resolverVersion: resolverVersion.value,
        inputHash: inputHash.value,
      }),
    }),
  };
}

function validateMatterIntakeInput(input) {
  if (!isPlainObject(input)) {
    return {
      kind: 'invalid',
      message: 'Legal Argument Validator intake input must be a plain object.',
    };
  }

  const allowedKeys = new Set(['matter', 'sourceDocumentIds']);

  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      return {
        kind: 'invalid',
        message: `Legal Argument Validator intake input contains unsupported field "${key}".`,
      };
    }
  }

  const matterValidation = validateMatterInput(input.matter);

  if (matterValidation.kind !== 'ok') {
    return matterValidation;
  }

  const sourceDocumentIds = normalizeOptionalStringArray(input.sourceDocumentIds, 'sourceDocumentIds');

  if (sourceDocumentIds.kind !== 'ok') {
    return sourceDocumentIds;
  }

  return {
    kind: 'ok',
    matter: matterValidation.matter,
    sourceDocumentIds: sourceDocumentIds.value || [],
  };
}

function validateReplayInput(input) {
  if (!isPlainObject(input)) {
    return {
      kind: 'invalid',
      message: 'Legal Argument Validator replay input must be a plain object.',
    };
  }

  const allowedKeys = new Set(LEGAL_VALIDATOR_REQUIRED_REPLAY_KEYS);

  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      return {
        kind: 'invalid',
        message: `Legal Argument Validator replay input contains unsupported field "${key}".`,
      };
    }
  }

  const validationRunId = normalizeStringField(input.validationRunId, 'validationRunId');

  if (validationRunId.kind !== 'ok') {
    return validationRunId;
  }

  return {
    kind: 'ok',
    validationRunId: validationRunId.value,
  };
}

module.exports = Object.freeze({
  LEGAL_VALIDATOR_RESOURCE,
  LEGAL_VALIDATOR_PRODUCT,
  LEGAL_VALIDATOR_SCOPE,
  LEGAL_VALIDATOR_SCOPE_LOCK_CONTRACT_VERSION,
  LEGAL_VALIDATOR_ORCHESTRATOR_CONTRACT_VERSION,
  LEGAL_VALIDATOR_MATTER_CONTRACT_VERSION,
  LEGAL_VALIDATOR_REPLAY_CONTRACT_VERSION,
  LEGAL_VALIDATOR_REQUIRED_SCOPE_KEYS,
  LEGAL_VALIDATOR_MATTER_STATUSES,
  LEGAL_VALIDATOR_REQUIRED_MATTER_KEYS,
  LEGAL_VALIDATOR_REQUIRED_ORCHESTRATOR_KEYS,
  LEGAL_VALIDATOR_REQUIRED_REPLAY_KEYS,
  isPlainObject,
  readWrappedInput,
  normalizeStringField,
  validateScopeLockInput,
  validateMatterInput,
  validateOrchestratorInput,
  validateMatterIntakeInput,
  validateReplayInput,
});

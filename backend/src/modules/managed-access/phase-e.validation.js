'use strict';

const {
  MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
} = require('./config/managed-access-assurance.config');
const {
  MANAGED_ACCESS_TRUST_LEVELS,
  MANAGED_ACCESS_VERIFICATION_METHODS,
} = require('./constants');
const {
  PHASE_E_ASSIGNMENT_STATUSES,
  PHASE_E_DECISION_OUTCOMES,
  PHASE_E_DEPLOYMENT_MODES,
  PHASE_E_EVIDENCE_EVENT_TYPES,
  PHASE_E_HEALTH_CHECK_RESULTS,
  PHASE_E_PILOT_STATUSES,
  PHASE_E_PROVISIONING_JOB_STATUSES,
  PHASE_E_PROVISIONING_JOB_TYPES,
  PHASE_E_REVIEW_STATUSES,
  PHASE_E_RUNTIME_ISOLATION_LEVELS,
  PHASE_E_SUBDOMAIN_SOURCES,
  PHASE_E_TRUST_TIERS,
  PHASE_E_UPGRADE_PATHS,
  PHASE_E_WORKSPACE_STATUSES,
} = require('./phase-e.constants');

class PhaseEValidationError extends TypeError {
  constructor(message) {
    super(message);
    this.name = 'PhaseEValidationError';
  }
}

function assertPersistableObject(record, recordName) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new PhaseEValidationError(`${recordName} must be an object.`);
  }
}

function assertAllowedKeys(record, allowedKeys, recordName) {
  const unexpectedKeys = Object.keys(record)
    .filter((key) => !allowedKeys.has(key))
    .sort();

  if (unexpectedKeys.length > 0) {
    throw new PhaseEValidationError(
      `${recordName} must not include extra fields: ${unexpectedKeys.join(', ')}.`,
    );
  }
}

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new PhaseEValidationError(`${fieldName} must be a non-empty string.`);
  }
}

function assertOptionalNullableString(value, fieldName) {
  if (value === null || value === undefined) {
    return;
  }

  assertNonEmptyString(value, fieldName);
}

function assertNullish(value, fieldName) {
  if (value !== null && value !== undefined) {
    throw new PhaseEValidationError(`${fieldName} must be omitted for the current record shape.`);
  }
}

function assertEmailLike(value, fieldName) {
  assertNonEmptyString(value, fieldName);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    throw new PhaseEValidationError(`${fieldName} must be a reasonable email-style value.`);
  }
}

function assertDateValue(value, fieldName) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new PhaseEValidationError(`${fieldName} must be a valid Date.`);
  }
}

function assertOptionalDateValue(value, fieldName) {
  if (value === null || value === undefined) {
    return;
  }

  assertDateValue(value, fieldName);
}

function assertInteger(value, fieldName, minimumValue = 0) {
  if (!Number.isInteger(value) || value < minimumValue) {
    throw new PhaseEValidationError(
      `${fieldName} must be an integer greater than or equal to ${minimumValue}.`,
    );
  }
}

function assertOptionalInteger(value, fieldName, minimumValue = 0) {
  if (value === null || value === undefined) {
    return;
  }

  assertInteger(value, fieldName, minimumValue);
}

function assertAllowedValue(value, allowedValues, fieldName) {
  if (!allowedValues.includes(value)) {
    throw new PhaseEValidationError(`${fieldName} is invalid.`);
  }
}

function assertOptionalAllowedValue(value, allowedValues, fieldName) {
  if (value === null || value === undefined) {
    return;
  }

  assertAllowedValue(value, allowedValues, fieldName);
}

function assertObjectIdLike(value, fieldName) {
  if (value === null || value === undefined) {
    throw new PhaseEValidationError(`${fieldName} must be present.`);
  }

  if (!/^[a-f0-9]{24}$/i.test(String(value))) {
    throw new PhaseEValidationError(`${fieldName} must be a valid Mongo ObjectId value.`);
  }
}

function assertOptionalObjectIdLike(value, fieldName) {
  if (value === null || value === undefined) {
    return;
  }

  assertObjectIdLike(value, fieldName);
}

function assertArrayOfNonEmptyStrings(value, fieldName) {
  if (!Array.isArray(value)) {
    throw new PhaseEValidationError(`${fieldName} must be an array.`);
  }

  for (const entry of value) {
    assertNonEmptyString(entry, `${fieldName}[]`);
  }
}

function assertTenantKeyLike(value, fieldName) {
  assertNonEmptyString(value, fieldName);

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.trim())) {
    throw new PhaseEValidationError(`${fieldName} must be a normalized tenant key.`);
  }
}

function assertSubdomainLike(value, fieldName) {
  assertNonEmptyString(value, fieldName);

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.chatpdm\.com$/.test(value.trim())) {
    throw new PhaseEValidationError(`${fieldName} must be a normalized *.chatpdm.com hostname.`);
  }
}

function assertDomainLike(value, fieldName) {
  assertNonEmptyString(value, fieldName);

  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(value.trim())) {
    throw new PhaseEValidationError(`${fieldName} must be a reasonable domain-style value.`);
  }
}

function assertOptionalHash(value, fieldName) {
  if (value === null || value === undefined) {
    return;
  }

  if (!/^[a-f0-9]{64}$/i.test(String(value))) {
    throw new PhaseEValidationError(
      `${fieldName} must be a 64-character hexadecimal hash when present.`,
    );
  }
}

function assertRequiredHash(value, fieldName) {
  assertOptionalHash(value, fieldName);

  if (value === null || value === undefined) {
    throw new PhaseEValidationError(`${fieldName} must be present.`);
  }
}

function assertOptionalLowercaseHash(value, fieldName) {
  if (value === null || value === undefined) {
    return;
  }

  if (!/^[a-f0-9]{64}$/.test(String(value))) {
    throw new PhaseEValidationError(
      `${fieldName} must be a lowercase 64-character hexadecimal hash when present.`,
    );
  }
}

function assertRequiredLowercaseHash(value, fieldName) {
  assertOptionalLowercaseHash(value, fieldName);

  if (value === null || value === undefined) {
    throw new PhaseEValidationError(`${fieldName} must be present.`);
  }
}

const ALLOWED_TRUST_REVIEW_DECISION_KEYS = new Set([
  'requestId',
  'reviewStatus',
  'decisionOutcome',
  'reviewerIdentity',
  'decisionTimestamp',
  'internalNotes',
  'sectorPackageRecommendation',
  'riskFlags',
  'trustTier',
  'reviewReminderAt',
]);

function assertPersistableTrustReviewDecisionRecord(record) {
  assertPersistableObject(record, 'Trust review decision record');
  assertAllowedKeys(record, ALLOWED_TRUST_REVIEW_DECISION_KEYS, 'Trust review decision record');
  assertObjectIdLike(record.requestId, 'requestId');
  assertAllowedValue(record.reviewStatus, PHASE_E_REVIEW_STATUSES, 'reviewStatus');
  assertAllowedValue(record.trustTier, PHASE_E_TRUST_TIERS, 'trustTier');
  assertArrayOfNonEmptyStrings(record.riskFlags, 'riskFlags');

  if (record.internalNotes !== undefined && typeof record.internalNotes !== 'string') {
    throw new PhaseEValidationError('internalNotes must be a string.');
  }

  assertOptionalNullableString(record.sectorPackageRecommendation, 'sectorPackageRecommendation');
  assertOptionalDateValue(record.reviewReminderAt, 'reviewReminderAt');

  const hasDecisionOutcome = record.decisionOutcome !== null && record.decisionOutcome !== undefined;
  const hasReviewerIdentity = record.reviewerIdentity !== null && record.reviewerIdentity !== undefined;
  const hasDecisionTimestamp = record.decisionTimestamp !== null && record.decisionTimestamp !== undefined;

  if (hasDecisionOutcome || hasReviewerIdentity || hasDecisionTimestamp) {
    if (record.reviewStatus !== 'decision_recorded') {
      throw new PhaseEValidationError(
        'Decision fields can only be persisted when reviewStatus is decision_recorded.',
      );
    }

    assertAllowedValue(record.decisionOutcome, PHASE_E_DECISION_OUTCOMES, 'decisionOutcome');
    assertEmailLike(record.reviewerIdentity, 'reviewerIdentity');
    assertDateValue(record.decisionTimestamp, 'decisionTimestamp');
    return;
  }

  if (record.reviewStatus === 'decision_recorded') {
    throw new PhaseEValidationError(
      'decisionOutcome, reviewerIdentity, and decisionTimestamp are required when reviewStatus is decision_recorded.',
    );
  }
}

const ALLOWED_DEPLOYMENT_ASSIGNMENT_KEYS = new Set([
  'requestId',
  'reviewDecisionId',
  'assignmentStatus',
  'deploymentMode',
  'tenantKey',
  'tenantSubdomain',
  'requestedSubdomain',
  'subdomainSource',
  'collisionSuffix',
  'packageVersion',
  'sectorTrack',
  'region',
  'runtimeIsolationLevel',
  'pm2AppName',
  'nginxBinding',
  'assignedByIdentity',
  'assignedAt',
  'assignmentNotes',
]);

function assertPersistableDeploymentAssignmentRecord(record) {
  assertPersistableObject(record, 'Deployment assignment record');
  assertAllowedKeys(record, ALLOWED_DEPLOYMENT_ASSIGNMENT_KEYS, 'Deployment assignment record');
  assertObjectIdLike(record.requestId, 'requestId');
  assertOptionalObjectIdLike(record.reviewDecisionId, 'reviewDecisionId');
  assertAllowedValue(record.assignmentStatus, PHASE_E_ASSIGNMENT_STATUSES, 'assignmentStatus');
  assertAllowedValue(record.deploymentMode, PHASE_E_DEPLOYMENT_MODES, 'deploymentMode');
  assertTenantKeyLike(record.tenantKey, 'tenantKey');
  assertSubdomainLike(record.tenantSubdomain, 'tenantSubdomain');
  assertAllowedValue(record.subdomainSource, PHASE_E_SUBDOMAIN_SOURCES, 'subdomainSource');
  assertInteger(record.collisionSuffix, 'collisionSuffix', 0);
  assertNonEmptyString(record.packageVersion, 'packageVersion');
  assertNonEmptyString(record.region, 'region');
  assertAllowedValue(
    record.runtimeIsolationLevel,
    PHASE_E_RUNTIME_ISOLATION_LEVELS,
    'runtimeIsolationLevel',
  );
  assertEmailLike(record.assignedByIdentity, 'assignedByIdentity');
  assertDateValue(record.assignedAt, 'assignedAt');

  if (record.assignmentNotes !== undefined && typeof record.assignmentNotes !== 'string') {
    throw new PhaseEValidationError('assignmentNotes must be a string.');
  }

  assertOptionalNullableString(record.sectorTrack, 'sectorTrack');
  assertOptionalNullableString(record.pm2AppName, 'pm2AppName');
  assertOptionalNullableString(record.nginxBinding, 'nginxBinding');

  if (record.subdomainSource === 'manual_override') {
    assertSubdomainLike(record.requestedSubdomain, 'requestedSubdomain');
  } else {
    assertNullish(record.requestedSubdomain, 'requestedSubdomain');
  }

  if (record.subdomainSource === 'deterministic_collision_suffix') {
    if (record.collisionSuffix < 1) {
      throw new PhaseEValidationError(
        'collisionSuffix must be greater than or equal to 1 when subdomainSource is deterministic_collision_suffix.',
      );
    }
  } else if (record.collisionSuffix !== 0) {
    throw new PhaseEValidationError(
      'collisionSuffix must be 0 unless subdomainSource is deterministic_collision_suffix.',
    );
  }
}

const ALLOWED_PROVISIONING_JOB_KEYS = new Set([
  'requestId',
  'deploymentAssignmentId',
  'retryOfJobId',
  'jobType',
  'jobStatus',
  'triggeredByIdentity',
  'attemptNumber',
  'queuedAt',
  'startedAt',
  'completedAt',
  'failureCode',
  'failureMessage',
  'healthCheckResult',
]);

function assertPersistableProvisioningJobRecord(record) {
  assertPersistableObject(record, 'Provisioning job record');
  assertAllowedKeys(record, ALLOWED_PROVISIONING_JOB_KEYS, 'Provisioning job record');
  assertObjectIdLike(record.requestId, 'requestId');
  assertObjectIdLike(record.deploymentAssignmentId, 'deploymentAssignmentId');
  assertOptionalObjectIdLike(record.retryOfJobId, 'retryOfJobId');
  assertAllowedValue(record.jobType, PHASE_E_PROVISIONING_JOB_TYPES, 'jobType');
  assertAllowedValue(record.jobStatus, PHASE_E_PROVISIONING_JOB_STATUSES, 'jobStatus');
  assertEmailLike(record.triggeredByIdentity, 'triggeredByIdentity');
  assertInteger(record.attemptNumber, 'attemptNumber', 1);
  assertDateValue(record.queuedAt, 'queuedAt');
  assertAllowedValue(record.healthCheckResult, PHASE_E_HEALTH_CHECK_RESULTS, 'healthCheckResult');
  assertOptionalDateValue(record.startedAt, 'startedAt');
  assertOptionalDateValue(record.completedAt, 'completedAt');
  assertOptionalNullableString(record.failureCode, 'failureCode');
  assertOptionalNullableString(record.failureMessage, 'failureMessage');

  if (record.jobStatus === 'queued') {
    assertNullish(record.startedAt, 'startedAt');
    assertNullish(record.completedAt, 'completedAt');
    assertNullish(record.failureCode, 'failureCode');
    assertNullish(record.failureMessage, 'failureMessage');
    return;
  }

  if (record.jobStatus === 'running') {
    assertDateValue(record.startedAt, 'startedAt');
    assertNullish(record.completedAt, 'completedAt');
    assertNullish(record.failureCode, 'failureCode');
    assertNullish(record.failureMessage, 'failureMessage');
    return;
  }

  if (record.jobStatus === 'failed') {
    assertDateValue(record.startedAt, 'startedAt');
    assertDateValue(record.completedAt, 'completedAt');
    assertNonEmptyString(record.failureCode, 'failureCode');
    assertNonEmptyString(record.failureMessage, 'failureMessage');
    return;
  }

  if (record.jobStatus === 'cancelled') {
    assertDateValue(record.completedAt, 'completedAt');
    return;
  }

  if (record.jobStatus === 'succeeded') {
    assertDateValue(record.startedAt, 'startedAt');
    assertDateValue(record.completedAt, 'completedAt');
    assertNullish(record.failureCode, 'failureCode');
    assertNullish(record.failureMessage, 'failureMessage');
    assertAllowedValue(record.healthCheckResult, ['passing'], 'healthCheckResult');
  }
}

const ALLOWED_INSTITUTION_WORKSPACE_KEYS = new Set([
  'requestId',
  'deploymentAssignmentId',
  'workspaceStatus',
  'organizationName',
  'companyDomain',
  'tenantSubdomain',
  'deploymentMode',
  'packageVersion',
  'verificationMethod',
  'trustLevel',
  'workEmailVerifiedAt',
  'strongerProofVerifiedAt',
  'supportContactEmail',
  'replayExportAccess',
  'pilotStatus',
  'upgradePath',
  'activationTimestamp',
]);

function assertPersistableInstitutionWorkspaceRecord(record) {
  assertPersistableObject(record, 'Institution workspace record');
  assertAllowedKeys(record, ALLOWED_INSTITUTION_WORKSPACE_KEYS, 'Institution workspace record');
  assertObjectIdLike(record.requestId, 'requestId');
  assertObjectIdLike(record.deploymentAssignmentId, 'deploymentAssignmentId');
  assertAllowedValue(record.workspaceStatus, PHASE_E_WORKSPACE_STATUSES, 'workspaceStatus');
  assertNonEmptyString(record.organizationName, 'organizationName');
  assertDomainLike(record.companyDomain, 'companyDomain');
  assertSubdomainLike(record.tenantSubdomain, 'tenantSubdomain');
  assertAllowedValue(record.deploymentMode, PHASE_E_DEPLOYMENT_MODES, 'deploymentMode');
  assertNonEmptyString(record.packageVersion, 'packageVersion');
  assertAllowedValue(
    record.verificationMethod,
    MANAGED_ACCESS_VERIFICATION_METHODS,
    'verificationMethod',
  );
  assertAllowedValue(record.trustLevel, MANAGED_ACCESS_TRUST_LEVELS, 'trustLevel');
  assertEmailLike(record.supportContactEmail, 'supportContactEmail');

  if (typeof record.replayExportAccess !== 'boolean') {
    throw new PhaseEValidationError('replayExportAccess must be a boolean.');
  }

  assertAllowedValue(record.pilotStatus, PHASE_E_PILOT_STATUSES, 'pilotStatus');
  assertAllowedValue(record.upgradePath, PHASE_E_UPGRADE_PATHS, 'upgradePath');
  assertOptionalDateValue(record.workEmailVerifiedAt, 'workEmailVerifiedAt');
  assertOptionalDateValue(record.strongerProofVerifiedAt, 'strongerProofVerifiedAt');
  assertOptionalDateValue(record.activationTimestamp, 'activationTimestamp');

  if (record.workspaceStatus === 'active') {
    assertDateValue(record.activationTimestamp, 'activationTimestamp');
  }
}

const ALLOWED_PROVISIONING_EVIDENCE_EVENT_KEYS = new Set([
  'requestId',
  'sequence',
  'hashVersion',
  'actorIdentity',
  'previousHash',
  'eventHash',
  'reviewDecisionId',
  'deploymentAssignmentId',
  'provisioningJobId',
  'institutionWorkspaceId',
  'eventType',
  'reviewerIdentity',
  'decisionTimestamp',
  'decisionOutcome',
  'deploymentMode',
  'tenantSubdomain',
  'pm2AppName',
  'nginxBinding',
  'packageVersion',
  'healthCheckResult',
  'activationTimestamp',
  'provisioningEvidenceHash',
  'recordedAt',
  'context',
]);

function assertPersistableProvisioningEvidenceEventRecord(record) {
  assertPersistableObject(record, 'Provisioning evidence event record');
  assertAllowedKeys(
    record,
    ALLOWED_PROVISIONING_EVIDENCE_EVENT_KEYS,
    'Provisioning evidence event record',
  );
  assertObjectIdLike(record.requestId, 'requestId');
  assertInteger(record.sequence, 'sequence', 1);
  assertEmailLike(record.actorIdentity, 'actorIdentity');
  assertAllowedValue(record.eventType, PHASE_E_EVIDENCE_EVENT_TYPES, 'eventType');
  assertDateValue(record.recordedAt, 'recordedAt');
  assertNonEmptyString(record.context, 'context');
  assertRequiredLowercaseHash(record.eventHash, 'eventHash');

  if (record.hashVersion !== MANAGED_ACCESS_ASSURANCE_HASH_VERSION) {
    throw new PhaseEValidationError(
      `hashVersion must equal ${MANAGED_ACCESS_ASSURANCE_HASH_VERSION}.`,
    );
  }

  if (record.sequence === 1) {
    assertNullish(record.previousHash, 'previousHash');
  } else {
    assertRequiredLowercaseHash(record.previousHash, 'previousHash');
  }

  assertOptionalObjectIdLike(record.reviewDecisionId, 'reviewDecisionId');
  assertOptionalObjectIdLike(record.deploymentAssignmentId, 'deploymentAssignmentId');
  assertOptionalObjectIdLike(record.provisioningJobId, 'provisioningJobId');
  assertOptionalObjectIdLike(record.institutionWorkspaceId, 'institutionWorkspaceId');
  assertOptionalNullableString(record.reviewerIdentity, 'reviewerIdentity');
  assertOptionalDateValue(record.decisionTimestamp, 'decisionTimestamp');
  assertOptionalAllowedValue(record.decisionOutcome, PHASE_E_DECISION_OUTCOMES, 'decisionOutcome');
  assertOptionalAllowedValue(record.deploymentMode, PHASE_E_DEPLOYMENT_MODES, 'deploymentMode');

  if (record.tenantSubdomain !== null && record.tenantSubdomain !== undefined) {
    assertSubdomainLike(record.tenantSubdomain, 'tenantSubdomain');
  }

  assertOptionalNullableString(record.pm2AppName, 'pm2AppName');
  assertOptionalNullableString(record.nginxBinding, 'nginxBinding');
  assertOptionalNullableString(record.packageVersion, 'packageVersion');
  assertOptionalAllowedValue(
    record.healthCheckResult,
    PHASE_E_HEALTH_CHECK_RESULTS,
    'healthCheckResult',
  );
  assertOptionalDateValue(record.activationTimestamp, 'activationTimestamp');
  assertOptionalHash(record.provisioningEvidenceHash, 'provisioningEvidenceHash');

  if (record.eventType === 'review_decision_recorded') {
    assertObjectIdLike(record.reviewDecisionId, 'reviewDecisionId');
    assertEmailLike(record.reviewerIdentity, 'reviewerIdentity');
    assertDateValue(record.decisionTimestamp, 'decisionTimestamp');
    assertAllowedValue(record.decisionOutcome, PHASE_E_DECISION_OUTCOMES, 'decisionOutcome');
    return;
  }

  if (record.eventType === 'deployment_assignment_recorded') {
    assertObjectIdLike(record.deploymentAssignmentId, 'deploymentAssignmentId');
    assertAllowedValue(record.deploymentMode, PHASE_E_DEPLOYMENT_MODES, 'deploymentMode');
    assertSubdomainLike(record.tenantSubdomain, 'tenantSubdomain');
    assertNonEmptyString(record.packageVersion, 'packageVersion');
    return;
  }

  if (record.eventType === 'provisioning_job_queued' || record.eventType === 'provisioning_job_started') {
    assertObjectIdLike(record.deploymentAssignmentId, 'deploymentAssignmentId');
    assertObjectIdLike(record.provisioningJobId, 'provisioningJobId');
    return;
  }

  if (record.eventType === 'provisioning_job_failed') {
    assertObjectIdLike(record.deploymentAssignmentId, 'deploymentAssignmentId');
    assertObjectIdLike(record.provisioningJobId, 'provisioningJobId');
    return;
  }

  if (record.eventType === 'provisioning_job_succeeded') {
    assertObjectIdLike(record.deploymentAssignmentId, 'deploymentAssignmentId');
    assertObjectIdLike(record.provisioningJobId, 'provisioningJobId');
    assertAllowedValue(record.healthCheckResult, ['passing'], 'healthCheckResult');
    return;
  }

  if (record.eventType === 'workspace_activation_recorded') {
    assertObjectIdLike(record.deploymentAssignmentId, 'deploymentAssignmentId');
    assertObjectIdLike(record.institutionWorkspaceId, 'institutionWorkspaceId');
    assertSubdomainLike(record.tenantSubdomain, 'tenantSubdomain');
    assertNonEmptyString(record.packageVersion, 'packageVersion');
    assertDateValue(record.activationTimestamp, 'activationTimestamp');
    assertAllowedValue(record.healthCheckResult, ['passing'], 'healthCheckResult');
    assertRequiredHash(record.provisioningEvidenceHash, 'provisioningEvidenceHash');
    return;
  }

  if (record.eventType === 'workspace_handoff_recorded') {
    assertObjectIdLike(record.institutionWorkspaceId, 'institutionWorkspaceId');
  }
}

const ALLOWED_PROVISIONING_EVIDENCE_CHAIN_HEAD_KEYS = new Set([
  'requestId',
  'hashVersion',
  'lastSequence',
  'lastEventHash',
  'lastRecordedAt',
  'inFlightAppendToken',
  'inFlightSequence',
  'inFlightPreviousHash',
  'inFlightRecordedAt',
  'inFlightExpiresAt',
  'lastVerifiedSequence',
  'lastVerifiedAt',
  'lastVerificationStatus',
  'lastVerificationReason',
  'lastAnchoredSequence',
  'lastAnchoredAt',
  'lastAnchorStatus',
  'lastAnchorPath',
  'lastSignedSequence',
  'lastSignedAt',
  'lastCheckpointKeyId',
  'lastCheckpointSignature',
]);

function assertPersistableProvisioningEvidenceChainHeadRecord(record) {
  assertPersistableObject(record, 'Provisioning evidence chain head record');
  assertAllowedKeys(
    record,
    ALLOWED_PROVISIONING_EVIDENCE_CHAIN_HEAD_KEYS,
    'Provisioning evidence chain head record',
  );
  assertObjectIdLike(record.requestId, 'requestId');
  assertInteger(record.lastSequence, 'lastSequence', 0);

  if (record.hashVersion !== MANAGED_ACCESS_ASSURANCE_HASH_VERSION) {
    throw new PhaseEValidationError(
      `hashVersion must equal ${MANAGED_ACCESS_ASSURANCE_HASH_VERSION}.`,
    );
  }

  assertOptionalLowercaseHash(record.lastEventHash, 'lastEventHash');
  assertOptionalDateValue(record.lastRecordedAt, 'lastRecordedAt');
  assertOptionalNullableString(record.inFlightAppendToken, 'inFlightAppendToken');
  assertOptionalInteger(record.inFlightSequence, 'inFlightSequence', 1);
  assertOptionalHash(record.inFlightPreviousHash, 'inFlightPreviousHash');
  assertOptionalDateValue(record.inFlightRecordedAt, 'inFlightRecordedAt');
  assertOptionalDateValue(record.inFlightExpiresAt, 'inFlightExpiresAt');
  assertOptionalInteger(record.lastVerifiedSequence, 'lastVerifiedSequence', 0);
  assertOptionalDateValue(record.lastVerifiedAt, 'lastVerifiedAt');
  assertOptionalNullableString(record.lastVerificationStatus, 'lastVerificationStatus');
  assertOptionalNullableString(record.lastVerificationReason, 'lastVerificationReason');
  assertOptionalInteger(record.lastAnchoredSequence, 'lastAnchoredSequence', 0);
  assertOptionalDateValue(record.lastAnchoredAt, 'lastAnchoredAt');
  assertOptionalNullableString(record.lastAnchorStatus, 'lastAnchorStatus');
  assertOptionalNullableString(record.lastAnchorPath, 'lastAnchorPath');
  assertOptionalInteger(record.lastSignedSequence, 'lastSignedSequence', 0);
  assertOptionalDateValue(record.lastSignedAt, 'lastSignedAt');
  assertOptionalNullableString(record.lastCheckpointKeyId, 'lastCheckpointKeyId');
  assertOptionalNullableString(record.lastCheckpointSignature, 'lastCheckpointSignature');

  if (record.lastSequence === 0) {
    assertNullish(record.lastEventHash, 'lastEventHash');
    assertNullish(record.lastRecordedAt, 'lastRecordedAt');
  } else {
    assertRequiredLowercaseHash(record.lastEventHash, 'lastEventHash');
    assertDateValue(record.lastRecordedAt, 'lastRecordedAt');
  }

  const hasInFlightAppendToken = record.inFlightAppendToken !== null && record.inFlightAppendToken !== undefined;
  const hasInFlightSequence = record.inFlightSequence !== null && record.inFlightSequence !== undefined;
  const hasInFlightRecordedAt = record.inFlightRecordedAt !== null && record.inFlightRecordedAt !== undefined;
  const hasInFlightExpiresAt = record.inFlightExpiresAt !== null && record.inFlightExpiresAt !== undefined;

  if (hasInFlightAppendToken || hasInFlightSequence || hasInFlightRecordedAt || hasInFlightExpiresAt) {
    assertNonEmptyString(record.inFlightAppendToken, 'inFlightAppendToken');
    assertInteger(record.inFlightSequence, 'inFlightSequence', 1);
    assertDateValue(record.inFlightRecordedAt, 'inFlightRecordedAt');
    assertDateValue(record.inFlightExpiresAt, 'inFlightExpiresAt');
    if (record.inFlightSequence === 1) {
      assertNullish(record.inFlightPreviousHash, 'inFlightPreviousHash');
    } else {
      assertRequiredLowercaseHash(record.inFlightPreviousHash, 'inFlightPreviousHash');
    }
    return;
  }

  assertNullish(record.inFlightAppendToken, 'inFlightAppendToken');
  assertNullish(record.inFlightSequence, 'inFlightSequence');
  assertNullish(record.inFlightPreviousHash, 'inFlightPreviousHash');
  assertNullish(record.inFlightRecordedAt, 'inFlightRecordedAt');
  assertNullish(record.inFlightExpiresAt, 'inFlightExpiresAt');
}

module.exports = {
  PhaseEValidationError,
  assertPersistableDeploymentAssignmentRecord,
  assertPersistableProvisioningEvidenceChainHeadRecord,
  assertPersistableInstitutionWorkspaceRecord,
  assertPersistableProvisioningEvidenceEventRecord,
  assertPersistableProvisioningJobRecord,
  assertPersistableTrustReviewDecisionRecord,
};

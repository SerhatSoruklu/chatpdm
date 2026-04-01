'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { LIVE_CONCEPT_IDS } = require('./admission-state');

const governanceDomainLockPath = path.resolve(
  __dirname,
  '../../../../data/constraint-contracts/governance-domain-lock.json',
);

const CONSTRAINT_CONTRACT_TOP_LEVEL_FIELDS = Object.freeze([
  'version',
  'domainLockRef',
  'templateRole',
  'expectedSourceKind',
  'expectedIdentityKind',
  'requiredFields',
  'requiredRelations',
  'allowedRelations',
  'forbiddenRelations',
  'invariants',
  'structuralFailures',
  'resolutionRules',
]);

const GOVERNANCE_DOMAIN_LOCK_FIELDS = Object.freeze([
  'version',
  'lockId',
  'runtimeDomainId',
  'conceptPacketDomainIds',
  'definition',
  'inScopeTopics',
  'outOfScopeTopics',
  'liveKernelConceptIds',
]);

const CONSTRAINT_CONTRACT_RESOLUTION_VALUES = Object.freeze([
  'valid',
  'invalid',
  'conflict',
  'refused',
]);

const COMMON_CONSTRAINT_CASE_FIELDS = Object.freeze([
  'domain',
  'governanceOrder',
  'relationType',
  'relatedConceptId',
  'outOfScopeTopic',
]);

const SOURCE_CONSTRAINT_CASE_FIELDS = Object.freeze([
  ...COMMON_CONSTRAINT_CASE_FIELDS,
  'sourceKind',
  'assertedRole',
]);

const IDENTITY_CONSTRAINT_CASE_FIELDS = Object.freeze([
  ...COMMON_CONSTRAINT_CASE_FIELDS,
  'identityKind',
]);

const LAW_INVALID_RESULT_CODES = Object.freeze({
  missingRequiredField: 'LAW_MISSING_REQUIRED_FIELD',
  relationTargetMismatch: 'LAW_RELATION_TARGET_MISMATCH',
  unsupportedAssertedRole: 'LAW_UNSUPPORTED_ASSERTED_ROLE',
  unsupportedInputField: 'LAW_UNSUPPORTED_INPUT_FIELD',
});

const ASSERTED_ROLE_FAILURE_CODES = Object.freeze({
  required_conduct: 'LAW_COLLAPSES_TO_DUTY',
  directive_standing: 'LAW_COLLAPSES_TO_AUTHORITY',
  justified_validity: 'LAW_COLLAPSES_TO_LEGITIMACY',
});

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepFreeze(value) {
  if (Array.isArray(value)) {
    value.forEach((entry) => deepFreeze(entry));
    return Object.freeze(value);
  }

  if (isPlainObject(value)) {
    Object.values(value).forEach((entry) => deepFreeze(entry));
    return Object.freeze(value);
  }

  return value;
}

function sortStrings(left, right) {
  return left.localeCompare(right);
}

function assertNonEmptyString(value, fieldName, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} has invalid ${fieldName}.`);
  }
}

function assertArray(value, fieldName, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} has invalid ${fieldName}; expected an array.`);
  }
}

function assertStringArray(value, fieldName, label, minimumLength = 0) {
  assertArray(value, fieldName, label);

  if (value.length < minimumLength) {
    throw new Error(`${label} has invalid ${fieldName}; expected at least ${minimumLength} item(s).`);
  }

  value.forEach((entry, index) => {
    assertNonEmptyString(entry, `${fieldName}[${index}]`, label);
  });

  if (new Set(value).size !== value.length) {
    throw new Error(`${label} has duplicate values in ${fieldName}.`);
  }
}

function assertUnexpectedFields(value, allowedFields, label) {
  const unexpectedFields = Object.keys(value).filter((fieldName) => !allowedFields.includes(fieldName));

  if (unexpectedFields.length > 0) {
    throw new Error(`${label} has unsupported field(s): ${unexpectedFields.join(', ')}.`);
  }
}

function validateAllowedRelationEntry(entry, fieldName, label) {
  if (!isPlainObject(entry)) {
    throw new Error(`${label} has invalid ${fieldName}; expected an object.`);
  }

  assertUnexpectedFields(entry, ['relationType', 'targetConceptId'], `${label} ${fieldName}`);
  assertNonEmptyString(entry.relationType, `${fieldName}.relationType`, label);
  assertNonEmptyString(entry.targetConceptId, `${fieldName}.targetConceptId`, label);

  return deepFreeze({
    relationType: entry.relationType.trim(),
    targetConceptId: entry.targetConceptId.trim(),
  });
}

function validateForbiddenRelationEntry(entry, fieldName, label) {
  if (!isPlainObject(entry)) {
    throw new Error(`${label} has invalid ${fieldName}; expected an object.`);
  }

  assertUnexpectedFields(entry, ['relationType', 'targetConceptId', 'failureCode'], `${label} ${fieldName}`);
  assertNonEmptyString(entry.relationType, `${fieldName}.relationType`, label);
  assertNonEmptyString(entry.targetConceptId, `${fieldName}.targetConceptId`, label);
  assertNonEmptyString(entry.failureCode, `${fieldName}.failureCode`, label);

  return deepFreeze({
    relationType: entry.relationType.trim(),
    targetConceptId: entry.targetConceptId.trim(),
    failureCode: entry.failureCode.trim(),
  });
}

function validateInvariantEntry(entry, fieldName, label) {
  if (!isPlainObject(entry)) {
    throw new Error(`${label} has invalid ${fieldName}; expected an object.`);
  }

  assertUnexpectedFields(entry, ['id', 'statement'], `${label} ${fieldName}`);
  assertNonEmptyString(entry.id, `${fieldName}.id`, label);
  assertNonEmptyString(entry.statement, `${fieldName}.statement`, label);

  return deepFreeze({
    id: entry.id.trim(),
    statement: entry.statement.trim(),
  });
}

function validateStructuralFailureEntry(entry, fieldName, label) {
  if (!isPlainObject(entry)) {
    throw new Error(`${label} has invalid ${fieldName}; expected an object.`);
  }

  assertUnexpectedFields(entry, ['code', 'condition', 'reason'], `${label} ${fieldName}`);
  assertNonEmptyString(entry.code, `${fieldName}.code`, label);
  assertNonEmptyString(entry.condition, `${fieldName}.condition`, label);
  assertNonEmptyString(entry.reason, `${fieldName}.reason`, label);

  return deepFreeze({
    code: entry.code.trim(),
    condition: entry.condition.trim(),
    reason: entry.reason.trim(),
  });
}

function validateGovernanceDomainLock(lock) {
  const label = 'Governance domain lock';

  if (!isPlainObject(lock)) {
    throw new Error(`${label} must be an object.`);
  }

  assertUnexpectedFields(lock, GOVERNANCE_DOMAIN_LOCK_FIELDS, label);

  if (lock.version !== 1) {
    throw new Error(`${label} must declare version 1.`);
  }

  assertNonEmptyString(lock.lockId, 'lockId', label);
  assertNonEmptyString(lock.runtimeDomainId, 'runtimeDomainId', label);
  assertStringArray(lock.conceptPacketDomainIds, 'conceptPacketDomainIds', label, 1);
  assertNonEmptyString(lock.definition, 'definition', label);
  assertStringArray(lock.inScopeTopics, 'inScopeTopics', label, 1);
  assertStringArray(lock.outOfScopeTopics, 'outOfScopeTopics', label, 1);
  assertStringArray(lock.liveKernelConceptIds, 'liveKernelConceptIds', label, 1);

  if (lock.runtimeDomainId !== 'governance') {
    throw new Error(`${label} runtimeDomainId must equal "governance".`);
  }

  if (!lock.conceptPacketDomainIds.includes('governance-structures')) {
    throw new Error(`${label} conceptPacketDomainIds must include "governance-structures".`);
  }

  if (JSON.stringify(lock.liveKernelConceptIds) !== JSON.stringify(LIVE_CONCEPT_IDS)) {
    throw new Error(`${label} liveKernelConceptIds must exactly match concept-admission-state liveConceptIds.`);
  }

  return deepFreeze({
    version: 1,
    lockId: lock.lockId.trim(),
    runtimeDomainId: lock.runtimeDomainId.trim(),
    conceptPacketDomainIds: [...lock.conceptPacketDomainIds],
    definition: lock.definition.trim(),
    inScopeTopics: [...lock.inScopeTopics],
    outOfScopeTopics: [...lock.outOfScopeTopics],
    liveKernelConceptIds: [...lock.liveKernelConceptIds],
  });
}

function loadGovernanceDomainLock() {
  if (!fs.existsSync(governanceDomainLockPath)) {
    throw new Error(`Governance domain lock file is missing at ${governanceDomainLockPath}.`);
  }

  const lock = JSON.parse(fs.readFileSync(governanceDomainLockPath, 'utf8'));
  return validateGovernanceDomainLock(lock);
}

function validateConstraintContractShape(contract, conceptId) {
  if (contract === undefined) {
    return null;
  }

  const label = `Concept "${conceptId}" constraintContract`;

  if (!isPlainObject(contract)) {
    throw new Error(`${label} must be an object.`);
  }

  assertUnexpectedFields(contract, CONSTRAINT_CONTRACT_TOP_LEVEL_FIELDS, label);

  if (contract.version !== 1) {
    throw new Error(`${label} must declare version 1.`);
  }

  assertNonEmptyString(contract.domainLockRef, 'constraintContract.domainLockRef', `Concept "${conceptId}"`);
  assertNonEmptyString(contract.templateRole, 'constraintContract.templateRole', `Concept "${conceptId}"`);
  const domainLock = loadGovernanceDomainLock();

  if (contract.domainLockRef.trim() !== domainLock.lockId) {
    throw new Error(
      `Concept "${conceptId}" constraintContract.domainLockRef must equal "${domainLock.lockId}".`,
    );
  }

  const hasExpectedSourceKind = typeof contract.expectedSourceKind === 'string'
    && contract.expectedSourceKind.trim() !== '';
  const hasExpectedIdentityKind = typeof contract.expectedIdentityKind === 'string'
    && contract.expectedIdentityKind.trim() !== '';

  if (hasExpectedSourceKind === hasExpectedIdentityKind) {
    throw new Error(
      `${label} must declare exactly one of expectedSourceKind or expectedIdentityKind.`,
    );
  }

  if (hasExpectedSourceKind) {
    assertNonEmptyString(contract.expectedSourceKind, 'constraintContract.expectedSourceKind', `Concept "${conceptId}"`);
  }

  if (hasExpectedIdentityKind) {
    assertNonEmptyString(contract.expectedIdentityKind, 'constraintContract.expectedIdentityKind', `Concept "${conceptId}"`);
  }

  assertStringArray(contract.requiredFields, 'constraintContract.requiredFields', `Concept "${conceptId}"`, 1);
  if (!contract.requiredFields.includes('domain')) {
    throw new Error(`Concept "${conceptId}" constraintContract.requiredFields must include "domain".`);
  }

  const requiredKindField = hasExpectedSourceKind ? 'sourceKind' : 'identityKind';
  if (!contract.requiredFields.includes(requiredKindField)) {
    throw new Error(
      `Concept "${conceptId}" constraintContract.requiredFields must include "${requiredKindField}".`,
    );
  }

  let requiredRelations = null;
  if (contract.requiredRelations !== undefined) {
    assertArray(contract.requiredRelations, 'constraintContract.requiredRelations', `Concept "${conceptId}"`);
    if (contract.requiredRelations.length === 0) {
      throw new Error(`Concept "${conceptId}" constraintContract.requiredRelations must include at least one relation when declared.`);
    }

    requiredRelations = contract.requiredRelations.map((entry, index) => (
      validateAllowedRelationEntry(
        entry,
        `constraintContract.requiredRelations[${index}]`,
        `Concept "${conceptId}"`,
      )
    ));
  }

  assertArray(contract.allowedRelations, 'constraintContract.allowedRelations', `Concept "${conceptId}"`);
  if (contract.allowedRelations.length === 0) {
    throw new Error(`Concept "${conceptId}" constraintContract.allowedRelations must include at least one relation.`);
  }

  const allowedRelations = contract.allowedRelations.map((entry, index) => (
    validateAllowedRelationEntry(
      entry,
      `constraintContract.allowedRelations[${index}]`,
      `Concept "${conceptId}"`,
    )
  ));

  if (requiredRelations) {
    requiredRelations.forEach((entry) => {
      const isListedInAllowedRelations = allowedRelations.some((allowedEntry) => (
        allowedEntry.relationType === entry.relationType
        && allowedEntry.targetConceptId === entry.targetConceptId
      ));

      if (!isListedInAllowedRelations) {
        throw new Error(
          `Concept "${conceptId}" constraintContract.requiredRelations must also appear in allowedRelations.`,
        );
      }
    });
  }

  assertArray(contract.forbiddenRelations, 'constraintContract.forbiddenRelations', `Concept "${conceptId}"`);
  if (contract.forbiddenRelations.length === 0) {
    throw new Error(`Concept "${conceptId}" constraintContract.forbiddenRelations must include at least one relation.`);
  }

  const forbiddenRelations = contract.forbiddenRelations.map((entry, index) => (
    validateForbiddenRelationEntry(
      entry,
      `constraintContract.forbiddenRelations[${index}]`,
      `Concept "${conceptId}"`,
    )
  ));

  assertArray(contract.invariants, 'constraintContract.invariants', `Concept "${conceptId}"`);
  if (contract.invariants.length === 0) {
    throw new Error(`Concept "${conceptId}" constraintContract.invariants must include at least one invariant.`);
  }

  const invariants = contract.invariants.map((entry, index) => (
    validateInvariantEntry(
      entry,
      `constraintContract.invariants[${index}]`,
      `Concept "${conceptId}"`,
    )
  ));

  if (!isPlainObject(contract.structuralFailures)) {
    throw new Error(`Concept "${conceptId}" constraintContract.structuralFailures must be an object.`);
  }

  assertUnexpectedFields(
    contract.structuralFailures,
    ['invariantBreaches', 'refusals', 'contractIncompletes', 'runtimeBoundaries'],
    `Concept "${conceptId}" constraintContract.structuralFailures`,
  );

  assertArray(
    contract.structuralFailures.invariantBreaches,
    'constraintContract.structuralFailures.invariantBreaches',
    `Concept "${conceptId}"`,
  );
  assertArray(
    contract.structuralFailures.refusals,
    'constraintContract.structuralFailures.refusals',
    `Concept "${conceptId}"`,
  );

  const invariantBreaches = contract.structuralFailures.invariantBreaches.map((entry, index) => (
    validateStructuralFailureEntry(
      entry,
      `constraintContract.structuralFailures.invariantBreaches[${index}]`,
      `Concept "${conceptId}"`,
    )
  ));
  const refusals = contract.structuralFailures.refusals.map((entry, index) => (
    validateStructuralFailureEntry(
      entry,
      `constraintContract.structuralFailures.refusals[${index}]`,
      `Concept "${conceptId}"`,
    )
  ));
  let contractIncompletes = null;
  if (contract.structuralFailures.contractIncompletes !== undefined) {
    assertArray(
      contract.structuralFailures.contractIncompletes,
      'constraintContract.structuralFailures.contractIncompletes',
      `Concept "${conceptId}"`,
    );
    if (contract.structuralFailures.contractIncompletes.length === 0) {
      throw new Error(
        `Concept "${conceptId}" constraintContract.structuralFailures.contractIncompletes must include at least one entry when declared.`,
      );
    }

    contractIncompletes = contract.structuralFailures.contractIncompletes.map((entry, index) => (
      validateStructuralFailureEntry(
        entry,
        `constraintContract.structuralFailures.contractIncompletes[${index}]`,
        `Concept "${conceptId}"`,
      )
    ));
  }

  let runtimeBoundaries = null;
  if (contract.structuralFailures.runtimeBoundaries !== undefined) {
    assertArray(
      contract.structuralFailures.runtimeBoundaries,
      'constraintContract.structuralFailures.runtimeBoundaries',
      `Concept "${conceptId}"`,
    );
    if (contract.structuralFailures.runtimeBoundaries.length === 0) {
      throw new Error(
        `Concept "${conceptId}" constraintContract.structuralFailures.runtimeBoundaries must include at least one entry when declared.`,
      );
    }

    runtimeBoundaries = contract.structuralFailures.runtimeBoundaries.map((entry, index) => (
      validateStructuralFailureEntry(
        entry,
        `constraintContract.structuralFailures.runtimeBoundaries[${index}]`,
        `Concept "${conceptId}"`,
      )
    ));
  }

  if (!isPlainObject(contract.resolutionRules)) {
    throw new Error(`Concept "${conceptId}" constraintContract.resolutionRules must be an object.`);
  }

  assertUnexpectedFields(
    contract.resolutionRules,
    CONSTRAINT_CONTRACT_RESOLUTION_VALUES,
    `Concept "${conceptId}" constraintContract.resolutionRules`,
  );

  const resolutionRules = {};
  CONSTRAINT_CONTRACT_RESOLUTION_VALUES.forEach((resolution) => {
    assertStringArray(
      contract.resolutionRules[resolution],
      `constraintContract.resolutionRules.${resolution}`,
      `Concept "${conceptId}"`,
      1,
    );
    resolutionRules[resolution] = [...contract.resolutionRules[resolution]];
  });

  return deepFreeze({
    version: 1,
    domainLockRef: contract.domainLockRef.trim(),
    templateRole: contract.templateRole.trim(),
    expectedSourceKind: hasExpectedSourceKind ? contract.expectedSourceKind.trim() : null,
    expectedIdentityKind: hasExpectedIdentityKind ? contract.expectedIdentityKind.trim() : null,
    requiredFields: [...contract.requiredFields],
    ...(requiredRelations ? { requiredRelations } : {}),
    allowedRelations,
    forbiddenRelations,
    invariants,
    structuralFailures: {
      invariantBreaches,
      refusals,
      ...(contractIncompletes ? { contractIncompletes } : {}),
      ...(runtimeBoundaries ? { runtimeBoundaries } : {}),
    },
    resolutionRules,
  });
}

function buildConstraintContractSummary(conceptSource) {
  const conceptId = typeof conceptSource?.conceptId === 'string' && conceptSource.conceptId.trim() !== ''
    ? conceptSource.conceptId.trim()
    : null;

  if (!conceptId) {
    throw new Error('Constraint contract summary requires a concept packet with conceptId.');
  }

  const contract = resolveContractSource(conceptSource, conceptId);
  const kindField = contract.expectedSourceKind ? 'sourceKind' : 'identityKind';
  const kindValue = contract.expectedSourceKind ?? contract.expectedIdentityKind;
  const requiredRelations = contract.requiredRelations ?? [];
  const relationTargetIds = [
    ...requiredRelations.map((entry) => entry.targetConceptId),
    ...contract.allowedRelations.map((entry) => entry.targetConceptId),
    ...contract.forbiddenRelations.map((entry) => entry.targetConceptId),
  ].sort(sortStrings);

  return deepFreeze({
    conceptId,
    domainLockRef: contract.domainLockRef,
    templateRole: contract.templateRole,
    kindField,
    kindValue,
    requiredFields: [...contract.requiredFields],
    requiredRelationTargets: requiredRelations
      .map((entry) => `${entry.relationType}:${entry.targetConceptId}`)
      .sort(sortStrings),
    allowedRelationTargets: contract.allowedRelations
      .map((entry) => `${entry.relationType}:${entry.targetConceptId}`)
      .sort(sortStrings),
    forbiddenEquivalentTargets: contract.forbiddenRelations
      .filter((entry) => entry.relationType === 'equivalent_to')
      .map((entry) => entry.targetConceptId)
      .sort(sortStrings),
    relationTargetIds,
  });
}

function assertConstraintContractTargetsWithinLiveKernel(
  conceptSource,
  liveConceptIds = LIVE_CONCEPT_IDS,
) {
  if (!Array.isArray(liveConceptIds)) {
    throw new Error('Constraint contract live-kernel validation requires a live concept array.');
  }

  const summary = buildConstraintContractSummary(conceptSource);
  const liveConceptIdSet = new Set(liveConceptIds);
  const invalidTargetIds = summary.relationTargetIds
    .filter((targetConceptId) => !liveConceptIdSet.has(targetConceptId));

  if (invalidTargetIds.length > 0) {
    throw new Error(
      `Concept "${summary.conceptId}" constraintContract targets non-live concept(s): ${invalidTargetIds.join(', ')}.`,
    );
  }

  return summary;
}

function assertLiveConceptConstraintContractIntegration(liveConcepts) {
  if (!Array.isArray(liveConcepts)) {
    throw new Error('Live concept constraint-contract integration requires an array of live concepts.');
  }

  const liveConceptIds = liveConcepts.map((concept) => {
    if (typeof concept?.conceptId !== 'string' || concept.conceptId.trim() === '') {
      throw new Error('Live concept constraint-contract integration requires concept packets with conceptId.');
    }

    return concept.conceptId.trim();
  });
  const summaries = liveConcepts.map((concept) => (
    assertConstraintContractTargetsWithinLiveKernel(concept, liveConceptIds)
  ));
  const seenKindKeys = new Map();

  summaries.forEach((summary) => {
    const kindKey = `${summary.kindField}:${summary.kindValue}`;
    const existingConceptId = seenKindKeys.get(kindKey);

    if (existingConceptId) {
      throw new Error(
        `Live concept constraint-contract collision detected between "${existingConceptId}" and "${summary.conceptId}" on ${kindKey}.`,
      );
    }

    seenKindKeys.set(kindKey, summary.conceptId);
  });

  return deepFreeze(summaries.map((summary) => ({ ...summary })));
}

function buildResult(resolution, code, message) {
  return Object.freeze({
    resolution,
    code,
    message,
  });
}

function findStructuralFailureEntry(entries, code, label) {
  const match = entries.find((entry) => entry.code === code);

  if (!match) {
    throw new Error(`${label} is missing structural failure code "${code}".`);
  }

  return match;
}

function getContractLabel(conceptId) {
  return `${conceptId.charAt(0).toUpperCase()}${conceptId.slice(1)} constraint contract`;
}

function getContractCode(conceptId, suffix) {
  return `${conceptId.toUpperCase()}_${suffix}`;
}

function getExpectedKindConfig(contract, conceptId) {
  if (contract.expectedSourceKind) {
    return {
      fieldName: 'sourceKind',
      expectedValue: contract.expectedSourceKind,
      mismatchCode: getContractCode(conceptId, 'SOURCE_KIND_MISMATCH'),
      validMessage: `${conceptId.charAt(0).toUpperCase()}${conceptId.slice(1)} contract input satisfies the governance-domain source rules.`,
    };
  }

  return {
    fieldName: 'identityKind',
    expectedValue: contract.expectedIdentityKind,
    mismatchCode: getContractCode(conceptId, 'IDENTITY_KIND_MISMATCH'),
    validMessage: `${conceptId.charAt(0).toUpperCase()}${conceptId.slice(1)} contract input satisfies the governance-domain identity rules.`,
  };
}

function getAllowedCaseFields(contract) {
  return contract.expectedSourceKind ? SOURCE_CONSTRAINT_CASE_FIELDS : IDENTITY_CONSTRAINT_CASE_FIELDS;
}

function resolveContractSource(contractSource, conceptId) {
  const contract = validateConstraintContractShape(
    contractSource?.constraintContract ?? contractSource,
    conceptId,
  );

  if (!contract) {
    throw new Error(`${getContractLabel(conceptId)} is missing.`);
  }

  return contract;
}

function evaluateLawConstraintCase(caseInput, contractSource, domainLock = loadGovernanceDomainLock()) {
  const contract = resolveContractSource(contractSource, 'law');

  if (!isPlainObject(caseInput)) {
    return buildResult(
      'invalid',
      LAW_INVALID_RESULT_CODES.unsupportedInputField,
      'Law contract input must be an object.',
    );
  }

  const unexpectedFields = Object.keys(caseInput).filter((fieldName) => !getAllowedCaseFields(contract).includes(fieldName));
  if (unexpectedFields.length > 0) {
    return buildResult(
      'invalid',
      LAW_INVALID_RESULT_CODES.unsupportedInputField,
      `Law contract input has unsupported field(s): ${unexpectedFields.join(', ')}.`,
    );
  }

  for (const fieldName of contract.requiredFields) {
    if (typeof caseInput[fieldName] !== 'string' || caseInput[fieldName].trim() === '') {
      return buildResult(
        'invalid',
        LAW_INVALID_RESULT_CODES.missingRequiredField,
        `Law contract input is missing required field "${fieldName}".`,
      );
    }
  }

  const hasRelationType = typeof caseInput.relationType === 'string' && caseInput.relationType.trim() !== '';
  const hasRelatedConceptId = typeof caseInput.relatedConceptId === 'string' && caseInput.relatedConceptId.trim() !== '';

  if (hasRelationType !== hasRelatedConceptId) {
    return buildResult(
      'invalid',
      LAW_INVALID_RESULT_CODES.relationTargetMismatch,
      'Law contract input must provide relationType and relatedConceptId together.',
    );
  }

  if (caseInput.domain !== domainLock.runtimeDomainId) {
    const failure = findStructuralFailureEntry(
      contract.structuralFailures.refusals,
      'LAW_NON_GOVERNANCE_DOMAIN',
      'Law constraint contract',
    );
    return buildResult('refused', failure.code, failure.reason);
  }

  if (
    typeof caseInput.outOfScopeTopic === 'string'
    && caseInput.outOfScopeTopic.trim() !== ''
    && domainLock.outOfScopeTopics.includes(caseInput.outOfScopeTopic.trim())
  ) {
    const failure = findStructuralFailureEntry(
      contract.structuralFailures.refusals,
      'LAW_OUT_OF_SCOPE_TOPIC',
      'Law constraint contract',
    );
    return buildResult('refused', failure.code, failure.reason);
  }

  if (caseInput.sourceKind !== contract.expectedSourceKind) {
    const failure = findStructuralFailureEntry(
      contract.structuralFailures.invariantBreaches,
      'LAW_SOURCE_KIND_MISMATCH',
      'Law constraint contract',
    );
    return buildResult('conflict', failure.code, failure.reason);
  }

  if (typeof caseInput.assertedRole === 'string' && caseInput.assertedRole.trim() !== '') {
    const assertedRole = caseInput.assertedRole.trim();

    if (assertedRole !== contract.expectedSourceKind) {
      const failureCode = ASSERTED_ROLE_FAILURE_CODES[assertedRole];

      if (!failureCode) {
        return buildResult(
          'invalid',
          LAW_INVALID_RESULT_CODES.unsupportedAssertedRole,
          `Law contract input has unsupported assertedRole "${assertedRole}".`,
        );
      }

      const failure = findStructuralFailureEntry(
        contract.structuralFailures.invariantBreaches,
        failureCode,
        'Law constraint contract',
      );
      return buildResult('conflict', failure.code, failure.reason);
    }
  }

  if (hasRelationType) {
    const relationType = caseInput.relationType.trim();
    const relatedConceptId = caseInput.relatedConceptId.trim();

    const forbiddenRelation = contract.forbiddenRelations.find((entry) => (
      entry.relationType === relationType
      && entry.targetConceptId === relatedConceptId
    ));

    if (forbiddenRelation) {
      const failure = findStructuralFailureEntry(
        contract.structuralFailures.invariantBreaches,
        forbiddenRelation.failureCode,
        'Law constraint contract',
      );
      return buildResult('conflict', failure.code, failure.reason);
    }

    const allowedRelation = contract.allowedRelations.find((entry) => (
      entry.relationType === relationType
      && entry.targetConceptId === relatedConceptId
    ));

    if (!allowedRelation) {
      const failure = findStructuralFailureEntry(
        contract.structuralFailures.refusals,
        'LAW_UNSUPPORTED_RELATION',
        'Law constraint contract',
      );
      return buildResult('refused', failure.code, failure.reason);
    }
  }

  return buildResult(
    'valid',
    'LAW_CONTRACT_VALID',
    'Law contract input satisfies the governance-domain source rules.',
  );
}

function evaluateConstraintContractCase(caseInput, conceptSource, domainLock = loadGovernanceDomainLock()) {
  const conceptId = typeof conceptSource?.conceptId === 'string' && conceptSource.conceptId.trim() !== ''
    ? conceptSource.conceptId.trim()
    : null;

  if (!conceptId) {
    throw new Error('Constraint contract evaluation requires a concept packet with conceptId.');
  }

  const contract = resolveContractSource(conceptSource, conceptId);

  if (contract.expectedSourceKind) {
    return evaluateLawConstraintCase(caseInput, conceptSource, domainLock);
  }

  const contractLabel = getContractLabel(conceptId);
  const expectedKind = getExpectedKindConfig(contract, conceptId);

  if (!isPlainObject(caseInput)) {
    return buildResult(
      'invalid',
      getContractCode(conceptId, 'UNSUPPORTED_INPUT_FIELD'),
      `${conceptId.charAt(0).toUpperCase()}${conceptId.slice(1)} contract input must be an object.`,
    );
  }

  const unexpectedFields = Object.keys(caseInput).filter((fieldName) => !getAllowedCaseFields(contract).includes(fieldName));
  if (unexpectedFields.length > 0) {
    return buildResult(
      'invalid',
      getContractCode(conceptId, 'UNSUPPORTED_INPUT_FIELD'),
      `${conceptId.charAt(0).toUpperCase()}${conceptId.slice(1)} contract input has unsupported field(s): ${unexpectedFields.join(', ')}.`,
    );
  }

  for (const fieldName of contract.requiredFields) {
    if (typeof caseInput[fieldName] !== 'string' || caseInput[fieldName].trim() === '') {
      return buildResult(
        'invalid',
        getContractCode(conceptId, 'MISSING_REQUIRED_FIELD'),
        `${conceptId.charAt(0).toUpperCase()}${conceptId.slice(1)} contract input is missing required field "${fieldName}".`,
      );
    }
  }

  const hasRelationType = typeof caseInput.relationType === 'string' && caseInput.relationType.trim() !== '';
  const hasRelatedConceptId = typeof caseInput.relatedConceptId === 'string' && caseInput.relatedConceptId.trim() !== '';

  if (hasRelationType !== hasRelatedConceptId) {
    return buildResult(
      'invalid',
      getContractCode(conceptId, 'RELATION_TARGET_MISMATCH'),
      `${conceptId.charAt(0).toUpperCase()}${conceptId.slice(1)} contract input must provide relationType and relatedConceptId together.`,
    );
  }

  if (caseInput.domain !== domainLock.runtimeDomainId) {
    const failure = findStructuralFailureEntry(
      contract.structuralFailures.refusals,
      getContractCode(conceptId, 'NON_GOVERNANCE_DOMAIN'),
      contractLabel,
    );
    return buildResult('refused', failure.code, failure.reason);
  }

  if (
    typeof caseInput.outOfScopeTopic === 'string'
    && caseInput.outOfScopeTopic.trim() !== ''
    && domainLock.outOfScopeTopics.includes(caseInput.outOfScopeTopic.trim())
  ) {
    const failure = findStructuralFailureEntry(
      contract.structuralFailures.refusals,
      getContractCode(conceptId, 'OUT_OF_SCOPE_TOPIC'),
      contractLabel,
    );
    return buildResult('refused', failure.code, failure.reason);
  }

  if (caseInput[expectedKind.fieldName] !== expectedKind.expectedValue) {
    const failure = findStructuralFailureEntry(
      contract.structuralFailures.invariantBreaches,
      expectedKind.mismatchCode,
      contractLabel,
    );
    return buildResult('conflict', failure.code, failure.reason);
  }

  if (contract.requiredRelations && !hasRelationType) {
    return buildResult(
      'invalid',
      getContractCode(conceptId, 'MISSING_REQUIRED_RELATION'),
      `${conceptId.charAt(0).toUpperCase()}${conceptId.slice(1)} contract input must provide one of the declared required relations.`,
    );
  }

  if (hasRelationType) {
    const relationType = caseInput.relationType.trim();
    const relatedConceptId = caseInput.relatedConceptId.trim();

    const forbiddenRelation = contract.forbiddenRelations.find((entry) => (
      entry.relationType === relationType
      && entry.targetConceptId === relatedConceptId
    ));

    if (forbiddenRelation) {
      const failure = findStructuralFailureEntry(
        contract.structuralFailures.invariantBreaches,
        forbiddenRelation.failureCode,
        contractLabel,
      );
      return buildResult('conflict', failure.code, failure.reason);
    }

    if (contract.requiredRelations) {
      const matchesRequiredRelation = contract.requiredRelations.some((entry) => (
        entry.relationType === relationType
        && entry.targetConceptId === relatedConceptId
      ));

      if (!matchesRequiredRelation) {
        return buildResult(
          'invalid',
          getContractCode(conceptId, 'REQUIRED_RELATION_MISMATCH'),
          `${conceptId.charAt(0).toUpperCase()}${conceptId.slice(1)} contract input must match a declared required relation.`,
        );
      }
    }

    const allowedRelation = contract.allowedRelations.find((entry) => (
      entry.relationType === relationType
      && entry.targetConceptId === relatedConceptId
    ));

    if (!allowedRelation) {
      const failure = findStructuralFailureEntry(
        contract.structuralFailures.refusals,
        getContractCode(conceptId, 'UNSUPPORTED_RELATION'),
        contractLabel,
      );
      return buildResult('refused', failure.code, failure.reason);
    }
  }

  return buildResult(
    'valid',
    getContractCode(conceptId, 'CONTRACT_VALID'),
    expectedKind.validMessage,
  );
}

module.exports = {
  assertConstraintContractTargetsWithinLiveKernel,
  assertLiveConceptConstraintContractIntegration,
  buildConstraintContractSummary,
  CONSTRAINT_CONTRACT_RESOLUTION_VALUES,
  governanceDomainLockPath,
  evaluateConstraintContractCase,
  evaluateLawConstraintCase,
  loadGovernanceDomainLock,
  validateConstraintContractShape,
  validateGovernanceDomainLock,
};

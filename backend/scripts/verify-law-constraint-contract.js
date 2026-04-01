'use strict';

const assert = require('node:assert/strict');

const { LIVE_CONCEPT_IDS } = require('../src/modules/concepts/admission-state');
const { getConceptById } = require('../src/modules/concepts/concept-loader');
const {
  evaluateLawConstraintCase,
  loadGovernanceDomainLock,
  validateConstraintContractShape,
} = require('../src/modules/concepts/constraint-contract');

function getLawArtifacts() {
  const law = getConceptById('law');
  assert.notEqual(law, null, 'Law concept packet must load.');

  const domainLock = loadGovernanceDomainLock();
  const contract = validateConstraintContractShape(law.constraintContract, 'law');

  assert.notEqual(contract, null, 'Law must expose a constraintContract.');

  return {
    law,
    domainLock,
    contract,
  };
}

function verifyGovernanceDomainLock() {
  const { law, domainLock } = getLawArtifacts();

  assert.equal(domainLock.lockId, 'governance-domain-lock.v1', 'governance domain lock ID mismatch.');
  assert.equal(domainLock.runtimeDomainId, 'governance', 'governance domain lock runtimeDomainId mismatch.');
  assert.equal(
    domainLock.conceptPacketDomainIds.includes(law.domain),
    true,
    'governance domain lock must cover the law concept packet domain.',
  );
  assert.deepEqual(
    domainLock.liveKernelConceptIds,
    LIVE_CONCEPT_IDS,
    'governance domain lock liveKernelConceptIds must exactly match admission-state liveConceptIds.',
  );
  assert.equal(
    domainLock.outOfScopeTopics.includes('psychology'),
    true,
    'governance domain lock must list psychology as out of scope.',
  );
  assert.equal(
    domainLock.outOfScopeTopics.includes('emotion'),
    true,
    'governance domain lock must list emotion as out of scope.',
  );
  assert.equal(
    domainLock.outOfScopeTopics.includes('informal_morality'),
    true,
    'governance domain lock must list informal_morality as out of scope.',
  );

  process.stdout.write('PASS governance_domain_lock_live_kernel_locked\n');
}

function verifyLawConstraintContractStructure() {
  const { contract, domainLock } = getLawArtifacts();

  assert.equal(contract.domainLockRef, domainLock.lockId, 'law constraintContract domainLockRef mismatch.');
  assert.equal(contract.templateRole, 'template_seeding_source_like', 'law templateRole mismatch.');
  assert.equal(
    contract.expectedSourceKind,
    'binding_normative_source',
    'law expectedSourceKind mismatch.',
  );
  assert.deepEqual(
    contract.requiredFields,
    ['domain', 'sourceKind', 'governanceOrder'],
    'law requiredFields mismatch.',
  );
  assert.deepEqual(
    contract.allowedRelations,
    [
      { relationType: 'grounds', targetConceptId: 'duty' },
      { relationType: 'structures', targetConceptId: 'authority' },
      { relationType: 'is_evaluated_by', targetConceptId: 'legitimacy' },
    ],
    'law allowedRelations mismatch.',
  );
  assert.deepEqual(
    contract.forbiddenRelations,
    [
      { relationType: 'equivalent_to', targetConceptId: 'duty', failureCode: 'LAW_COLLAPSES_TO_DUTY' },
      { relationType: 'equivalent_to', targetConceptId: 'authority', failureCode: 'LAW_COLLAPSES_TO_AUTHORITY' },
      { relationType: 'equivalent_to', targetConceptId: 'legitimacy', failureCode: 'LAW_COLLAPSES_TO_LEGITIMACY' },
    ],
    'law forbiddenRelations mismatch.',
  );
  assert.deepEqual(
    contract.invariants.map((entry) => entry.id),
    [
      'law_is_binding_normative_source',
      'law_is_not_required_conduct',
      'law_is_not_directive_standing',
      'law_is_not_justified_validity',
      'law_remains_source_when_contested',
    ],
    'law invariant IDs mismatch.',
  );
  assert.deepEqual(
    contract.structuralFailures.invariantBreaches.map((entry) => entry.code),
    [
      'LAW_SOURCE_KIND_MISMATCH',
      'LAW_COLLAPSES_TO_DUTY',
      'LAW_COLLAPSES_TO_AUTHORITY',
      'LAW_COLLAPSES_TO_LEGITIMACY',
    ],
    'law invariant-breach codes mismatch.',
  );
  assert.deepEqual(
    contract.structuralFailures.refusals.map((entry) => entry.code),
    [
      'LAW_NON_GOVERNANCE_DOMAIN',
      'LAW_OUT_OF_SCOPE_TOPIC',
      'LAW_UNSUPPORTED_RELATION',
    ],
    'law refusal codes mismatch.',
  );

  const relationTargetIds = [
    ...contract.allowedRelations.map((entry) => entry.targetConceptId),
    ...contract.forbiddenRelations.map((entry) => entry.targetConceptId),
  ];
  relationTargetIds.forEach((conceptId) => {
    assert.equal(
      LIVE_CONCEPT_IDS.includes(conceptId),
      true,
      `law constraintContract relation target "${conceptId}" must remain in the live kernel.`,
    );
  });

  process.stdout.write('PASS law_constraint_contract_structure_locked\n');
}

function verifyValidCases() {
  const { law, domainLock } = getLawArtifacts();
  const validCases = [
    {
      name: 'law_source_only',
      input: {
        domain: 'governance',
        sourceKind: 'binding_normative_source',
        governanceOrder: 'constitutional_order',
      },
    },
    {
      name: 'law_grounds_duty',
      input: {
        domain: 'governance',
        sourceKind: 'binding_normative_source',
        governanceOrder: 'constitutional_order',
        relationType: 'grounds',
        relatedConceptId: 'duty',
      },
    },
  ];

  validCases.forEach((testCase) => {
    const result = evaluateLawConstraintCase(testCase.input, law, domainLock);
    assert.deepEqual(
      result,
      {
        resolution: 'valid',
        code: 'LAW_CONTRACT_VALID',
        message: 'Law contract input satisfies the governance-domain source rules.',
      },
      `${testCase.name} valid result mismatch.`,
    );
  });

  process.stdout.write('PASS law_constraint_contract_valid_cases\n');
}

function verifyInvalidCases() {
  const { law, domainLock } = getLawArtifacts();
  const missingRequiredField = evaluateLawConstraintCase(
    {
      domain: 'governance',
      sourceKind: 'binding_normative_source',
    },
    law,
    domainLock,
  );

  assert.equal(missingRequiredField.resolution, 'invalid', 'missing field case must be invalid.');
  assert.equal(missingRequiredField.code, 'LAW_MISSING_REQUIRED_FIELD', 'missing field code mismatch.');

  const relationTargetMismatch = evaluateLawConstraintCase(
    {
      domain: 'governance',
      sourceKind: 'binding_normative_source',
      governanceOrder: 'constitutional_order',
      relationType: 'grounds',
    },
    law,
    domainLock,
  );

  assert.equal(relationTargetMismatch.resolution, 'invalid', 'relation target mismatch must be invalid.');
  assert.equal(
    relationTargetMismatch.code,
    'LAW_RELATION_TARGET_MISMATCH',
    'relation target mismatch code mismatch.',
  );

  process.stdout.write('PASS law_constraint_contract_invalid_cases\n');
}

function verifyRefusalCases() {
  const { law, domainLock } = getLawArtifacts();
  const nonGovernanceDomain = evaluateLawConstraintCase(
    {
      domain: 'psychology',
      sourceKind: 'binding_normative_source',
      governanceOrder: 'constitutional_order',
    },
    law,
    domainLock,
  );

  assert.equal(nonGovernanceDomain.resolution, 'refused', 'non-governance law case must be refused.');
  assert.equal(nonGovernanceDomain.code, 'LAW_NON_GOVERNANCE_DOMAIN', 'non-governance refusal code mismatch.');

  const explicitOutOfScopeTopic = evaluateLawConstraintCase(
    {
      domain: 'governance',
      sourceKind: 'binding_normative_source',
      governanceOrder: 'constitutional_order',
      outOfScopeTopic: 'informal_morality',
    },
    law,
    domainLock,
  );

  assert.equal(explicitOutOfScopeTopic.resolution, 'refused', 'out-of-scope topic must be refused.');
  assert.equal(explicitOutOfScopeTopic.code, 'LAW_OUT_OF_SCOPE_TOPIC', 'out-of-scope refusal code mismatch.');

  const unsupportedRelation = evaluateLawConstraintCase(
    {
      domain: 'governance',
      sourceKind: 'binding_normative_source',
      governanceOrder: 'constitutional_order',
      relationType: 'equivalent_to',
      relatedConceptId: 'power',
    },
    law,
    domainLock,
  );

  assert.equal(unsupportedRelation.resolution, 'refused', 'unsupported relation must be refused.');
  assert.equal(unsupportedRelation.code, 'LAW_UNSUPPORTED_RELATION', 'unsupported relation refusal code mismatch.');

  process.stdout.write('PASS law_constraint_contract_refusal_cases\n');
}

function verifyConflictCases() {
  const { law, domainLock } = getLawArtifacts();
  const sourceKindMismatch = evaluateLawConstraintCase(
    {
      domain: 'governance',
      sourceKind: 'directive_standing',
      governanceOrder: 'constitutional_order',
    },
    law,
    domainLock,
  );

  assert.equal(sourceKindMismatch.resolution, 'conflict', 'sourceKind mismatch must be conflict.');
  assert.equal(sourceKindMismatch.code, 'LAW_SOURCE_KIND_MISMATCH', 'sourceKind mismatch code mismatch.');

  const dutyCollapse = evaluateLawConstraintCase(
    {
      domain: 'governance',
      sourceKind: 'binding_normative_source',
      governanceOrder: 'constitutional_order',
      relationType: 'equivalent_to',
      relatedConceptId: 'duty',
    },
    law,
    domainLock,
  );

  assert.equal(dutyCollapse.resolution, 'conflict', 'law duty collapse must be conflict.');
  assert.equal(dutyCollapse.code, 'LAW_COLLAPSES_TO_DUTY', 'law duty collapse code mismatch.');

  process.stdout.write('PASS law_constraint_contract_conflict_cases\n');
}

function main() {
  verifyGovernanceDomainLock();
  verifyLawConstraintContractStructure();
  verifyValidCases();
  verifyInvalidCases();
  verifyRefusalCases();
  verifyConflictCases();
  process.stdout.write('ChatPDM law constraint-contract verification passed.\n');
}

main();

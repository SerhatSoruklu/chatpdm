'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { LIVE_CONCEPT_IDS } = require('../src/modules/concepts/admission-state');
const { compareConceptProfiles } = require('../src/modules/concepts/concept-profile-comparator');
const { getConceptById } = require('../src/modules/concepts/concept-loader');
const { loadStoredConceptRelationshipSnapshot } = require('../src/modules/concepts/concept-overlap-snapshot');
const { normalizeConceptToProfile } = require('../src/modules/concepts/concept-structural-profile');
const {
  evaluateConstraintContractCase,
  loadGovernanceDomainLock,
  validateConstraintContractShape,
} = require('../src/modules/concepts/constraint-contract');

const exclusionMatrixPath = path.resolve(
  __dirname,
  '../../data/constraint-contracts/governance-duty-responsibility-violation-exclusion-matrix.json',
);
const temporalSeparationPath = path.resolve(
  __dirname,
  '../../data/constraint-contracts/governance-duty-responsibility-violation-temporal-separation.json',
);
const familySnapshotPath = path.resolve(
  __dirname,
  '../../data/constraint-contracts/governance-duty-responsibility-violation-snapshot.json',
);

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getFamilyArtifacts() {
  const duty = getConceptById('duty');
  const responsibility = getConceptById('responsibility');
  const violation = getConceptById('violation');

  assert.notEqual(duty, null, 'Duty concept packet must load.');
  assert.notEqual(responsibility, null, 'Responsibility concept packet must load.');
  assert.notEqual(violation, null, 'Violation concept packet must load.');

  return {
    duty,
    responsibility,
    violation,
    domainLock: loadGovernanceDomainLock(),
  };
}

function verifyConductFamilyDomainLock() {
  const { duty, responsibility, violation, domainLock } = getFamilyArtifacts();

  [duty, responsibility, violation].forEach((concept) => {
    assert.equal(
      domainLock.conceptPacketDomainIds.includes(concept.domain),
      true,
      `governance domain lock must cover ${concept.conceptId} packet domain.`,
    );
  });

  process.stdout.write('PASS governance_conduct_family_domain_lock\n');
}

function verifyConceptContractStructure(conceptId, expected) {
  const concept = getConceptById(conceptId);
  assert.notEqual(concept, null, `${conceptId} concept packet must load.`);

  const contract = validateConstraintContractShape(concept.constraintContract, conceptId);
  assert.notEqual(contract, null, `${conceptId} must expose a constraintContract.`);
  assert.equal(contract.expectedSourceKind, null, `${conceptId} must remain an identity contract, not a source contract.`);

  assert.deepEqual(
    {
      domainLockRef: contract.domainLockRef,
      templateRole: contract.templateRole,
      expectedIdentityKind: contract.expectedIdentityKind,
      requiredFields: contract.requiredFields,
      requiredRelations: contract.requiredRelations ?? null,
      allowedRelations: contract.allowedRelations,
      forbiddenRelations: contract.forbiddenRelations,
      invariantIds: contract.invariants.map((entry) => entry.id),
      invariantFailureCodes: contract.structuralFailures.invariantBreaches.map((entry) => entry.code),
      refusalCodes: contract.structuralFailures.refusals.map((entry) => entry.code),
    },
    expected,
    `${conceptId} constraint contract structure mismatch.`,
  );

  [
    ...(contract.requiredRelations ?? []),
    ...contract.allowedRelations,
    ...contract.forbiddenRelations,
  ].forEach((entry) => {
    assert.equal(
      LIVE_CONCEPT_IDS.includes(entry.targetConceptId),
      true,
      `${conceptId} contract target "${entry.targetConceptId}" must remain in the live kernel.`,
    );
  });
}

function verifyConductFamilyContractStructures() {
  verifyConceptContractStructure('duty', {
    domainLockRef: 'governance-domain-lock.v1',
    templateRole: 'family_seed_required_conduct',
    expectedIdentityKind: 'required_conduct',
    requiredFields: ['domain', 'identityKind', 'governanceOrder'],
    requiredRelations: null,
    allowedRelations: [
      { relationType: 'is_grounded_in', targetConceptId: 'law' },
      { relationType: 'may_be_breached_as', targetConceptId: 'violation' },
      { relationType: 'may_ground_answerability_in', targetConceptId: 'responsibility' },
    ],
    forbiddenRelations: [
      { relationType: 'equivalent_to', targetConceptId: 'responsibility', failureCode: 'DUTY_COLLAPSES_TO_RESPONSIBILITY' },
      { relationType: 'equivalent_to', targetConceptId: 'violation', failureCode: 'DUTY_COLLAPSES_TO_VIOLATION' },
    ],
    invariantIds: [
      'duty_is_required_conduct',
      'duty_exists_before_breach_assessment',
      'duty_is_not_answerability',
      'duty_is_not_failure_state',
      'duty_can_exist_without_violation',
    ],
    invariantFailureCodes: [
      'DUTY_IDENTITY_KIND_MISMATCH',
      'DUTY_COLLAPSES_TO_RESPONSIBILITY',
      'DUTY_COLLAPSES_TO_VIOLATION',
    ],
    refusalCodes: [
      'DUTY_NON_GOVERNANCE_DOMAIN',
      'DUTY_OUT_OF_SCOPE_TOPIC',
      'DUTY_UNSUPPORTED_RELATION',
    ],
  });

  verifyConceptContractStructure('responsibility', {
    domainLockRef: 'governance-domain-lock.v1',
    templateRole: 'family_seed_answerability',
    expectedIdentityKind: 'answerable_attribution',
    requiredFields: ['domain', 'identityKind', 'governanceOrder'],
    requiredRelations: null,
    allowedRelations: [
      { relationType: 'may_answer_for_breach_of', targetConceptId: 'duty' },
      { relationType: 'may_answer_for', targetConceptId: 'violation' },
    ],
    forbiddenRelations: [
      { relationType: 'equivalent_to', targetConceptId: 'duty', failureCode: 'RESPONSIBILITY_COLLAPSES_TO_DUTY' },
      { relationType: 'equivalent_to', targetConceptId: 'violation', failureCode: 'RESPONSIBILITY_COLLAPSES_TO_VIOLATION' },
    ],
    invariantIds: [
      'responsibility_is_answerable_attribution',
      'responsibility_is_not_required_conduct',
      'responsibility_is_not_breach_state',
      'responsibility_applies_after_attribution_is_in_question',
      'responsibility_may_follow_violation_without_defining_it',
    ],
    invariantFailureCodes: [
      'RESPONSIBILITY_IDENTITY_KIND_MISMATCH',
      'RESPONSIBILITY_COLLAPSES_TO_DUTY',
      'RESPONSIBILITY_COLLAPSES_TO_VIOLATION',
    ],
    refusalCodes: [
      'RESPONSIBILITY_NON_GOVERNANCE_DOMAIN',
      'RESPONSIBILITY_OUT_OF_SCOPE_TOPIC',
      'RESPONSIBILITY_UNSUPPORTED_RELATION',
    ],
  });

  verifyConceptContractStructure('violation', {
    domainLockRef: 'governance-domain-lock.v1',
    templateRole: 'family_seed_breach_state',
    expectedIdentityKind: 'unmet_duty_state',
    requiredFields: ['domain', 'identityKind', 'governanceOrder'],
    requiredRelations: [
      { relationType: 'breaches', targetConceptId: 'duty' },
    ],
    allowedRelations: [
      { relationType: 'breaches', targetConceptId: 'duty' },
    ],
    forbiddenRelations: [
      { relationType: 'equivalent_to', targetConceptId: 'duty', failureCode: 'VIOLATION_COLLAPSES_TO_DUTY' },
      { relationType: 'equivalent_to', targetConceptId: 'responsibility', failureCode: 'VIOLATION_COLLAPSES_TO_RESPONSIBILITY' },
    ],
    invariantIds: [
      'violation_is_unmet_duty_state',
      'violation_requires_applicable_duty',
      'violation_occurs_after_duty_at_assessment',
      'violation_is_not_answerability',
      'violation_precedes_sanction_or_enforcement',
    ],
    invariantFailureCodes: [
      'VIOLATION_IDENTITY_KIND_MISMATCH',
      'VIOLATION_COLLAPSES_TO_DUTY',
      'VIOLATION_COLLAPSES_TO_RESPONSIBILITY',
    ],
    refusalCodes: [
      'VIOLATION_NON_GOVERNANCE_DOMAIN',
      'VIOLATION_OUT_OF_SCOPE_TOPIC',
      'VIOLATION_UNSUPPORTED_RELATION',
    ],
  });

  process.stdout.write('PASS governance_conduct_family_contract_structures\n');
}

function verifyPairwiseExclusionMatrix() {
  const matrix = loadJson(exclusionMatrixPath);

  assert.equal(matrix.version, 1, 'governance conduct family exclusion matrix version mismatch.');
  assert.equal(matrix.familyId, 'governance-duty-responsibility-violation.v1', 'conduct family exclusion matrix familyId mismatch.');
  assert.deepEqual(matrix.conceptIds, ['duty', 'responsibility', 'violation'], 'conduct family exclusion matrix conceptIds mismatch.');
  assert.deepEqual(
    matrix.pairs.map((entry) => entry.pairId),
    ['duty_vs_responsibility', 'duty_vs_violation', 'responsibility_vs_violation'],
    'conduct family exclusion matrix pairId sequence mismatch.',
  );

  process.stdout.write('PASS governance_conduct_family_exclusion_matrix\n');
}

function verifyTemporalAndFunctionalSeparation() {
  const temporalSeparation = loadJson(temporalSeparationPath);
  const { duty, responsibility, violation } = getFamilyArtifacts();

  assert.equal(temporalSeparation.version, 1, 'conduct family temporal separation version mismatch.');
  assert.equal(temporalSeparation.familyId, 'governance-duty-responsibility-violation.v1', 'conduct family temporal separation familyId mismatch.');
  assert.deepEqual(
    temporalSeparation.separation,
    {
      duty: {
        temporalRole: 'pre-action requirement',
        functionalRole: 'defines required conduct or restraint under a binding source',
        existsWhen: 'a binding governance source places conduct or restraint under requirement before assessment or breach',
      },
      responsibility: {
        temporalRole: 'post-attribution answerability',
        functionalRole: 'assigns who can be called to account for attributable conduct, omission, role, or outcome',
        existsWhen: 'conduct, omission, role, or outcome is attributable to an actor and answerability is in question',
      },
      violation: {
        temporalRole: 'post-assessment breach state',
        functionalRole: 'records that duty-required conduct or conditions are unmet at the relevant assessment point',
        existsWhen: 'an applicable duty is in force, the relevant assessment point has been reached, and the actual state fails to satisfy what the duty requires',
      },
    },
    'conduct family temporal separation mismatch.',
  );

  assert.equal(duty.structuralProfile.temporalRole, 'pre-action requirement', 'duty temporal role mismatch.');
  assert.equal(responsibility.structuralProfile.temporalRole, 'post-action or post-outcome answerability', 'responsibility temporal role mismatch.');
  assert.equal(violation.structuralProfile.temporalRole, 'post-assessment failure state', 'violation temporal role mismatch.');

  process.stdout.write('PASS governance_conduct_family_temporal_separation\n');
}

function runCase(name, concept, input, expected) {
  const result = evaluateConstraintContractCase(input, concept);
  assert.deepEqual(result, expected, `${name} result mismatch.`);
}

function verifyFamilyPressureTests() {
  const { duty, responsibility, violation } = getFamilyArtifacts();

  runCase('duty_valid_grounded_in_law', duty, {
    domain: 'governance',
    identityKind: 'required_conduct',
    governanceOrder: 'constitutional_order',
    relationType: 'is_grounded_in',
    relatedConceptId: 'law',
  }, {
    resolution: 'valid',
    code: 'DUTY_CONTRACT_VALID',
    message: 'Duty contract input satisfies the governance-domain identity rules.',
  });

  runCase('responsibility_valid_answer_for_violation', responsibility, {
    domain: 'governance',
    identityKind: 'answerable_attribution',
    governanceOrder: 'constitutional_order',
    relationType: 'may_answer_for',
    relatedConceptId: 'violation',
  }, {
    resolution: 'valid',
    code: 'RESPONSIBILITY_CONTRACT_VALID',
    message: 'Responsibility contract input satisfies the governance-domain identity rules.',
  });

  runCase('violation_valid_breaches_duty', violation, {
    domain: 'governance',
    identityKind: 'unmet_duty_state',
    governanceOrder: 'constitutional_order',
    relationType: 'breaches',
    relatedConceptId: 'duty',
  }, {
    resolution: 'valid',
    code: 'VIOLATION_CONTRACT_VALID',
    message: 'Violation contract input satisfies the governance-domain identity rules.',
  });

  runCase('duty_invalid_missing_governance_order', duty, {
    domain: 'governance',
    identityKind: 'required_conduct',
  }, {
    resolution: 'invalid',
    code: 'DUTY_MISSING_REQUIRED_FIELD',
    message: 'Duty contract input is missing required field "governanceOrder".',
  });

  runCase('responsibility_invalid_relation_target_mismatch', responsibility, {
    domain: 'governance',
    identityKind: 'answerable_attribution',
    governanceOrder: 'constitutional_order',
    relationType: 'may_answer_for',
  }, {
    resolution: 'invalid',
    code: 'RESPONSIBILITY_RELATION_TARGET_MISMATCH',
    message: 'Responsibility contract input must provide relationType and relatedConceptId together.',
  });

  runCase('violation_invalid_missing_required_relation', violation, {
    domain: 'governance',
    identityKind: 'unmet_duty_state',
    governanceOrder: 'constitutional_order',
  }, {
    resolution: 'invalid',
    code: 'VIOLATION_MISSING_REQUIRED_RELATION',
    message: 'Violation contract input must provide one of the declared required relations.',
  });

  runCase('violation_invalid_required_relation_mismatch', violation, {
    domain: 'governance',
    identityKind: 'unmet_duty_state',
    governanceOrder: 'constitutional_order',
    relationType: 'may_answer_for',
    relatedConceptId: 'responsibility',
  }, {
    resolution: 'invalid',
    code: 'VIOLATION_REQUIRED_RELATION_MISMATCH',
    message: 'Violation contract input must match a declared required relation.',
  });

  runCase('duty_refused_non_governance_domain', duty, {
    domain: 'psychology',
    identityKind: 'required_conduct',
    governanceOrder: 'constitutional_order',
  }, {
    resolution: 'refused',
    code: 'DUTY_NON_GOVERNANCE_DOMAIN',
    message: 'Duty is locked to governance-domain meaning in ChatPDM v1.',
  });

  runCase('responsibility_refused_out_of_scope_topic', responsibility, {
    domain: 'governance',
    identityKind: 'answerable_attribution',
    governanceOrder: 'constitutional_order',
    outOfScopeTopic: 'emotion',
  }, {
    resolution: 'refused',
    code: 'RESPONSIBILITY_OUT_OF_SCOPE_TOPIC',
    message: 'The governance domain lock excludes that topic from the responsibility contract.',
  });

  runCase('duty_conflict_responsibility_collapse', duty, {
    domain: 'governance',
    identityKind: 'required_conduct',
    governanceOrder: 'constitutional_order',
    relationType: 'equivalent_to',
    relatedConceptId: 'responsibility',
  }, {
    resolution: 'conflict',
    code: 'DUTY_COLLAPSES_TO_RESPONSIBILITY',
    message: 'Duty must not collapse into responsibility.',
  });

  runCase('duty_conflict_violation_collapse', duty, {
    domain: 'governance',
    identityKind: 'required_conduct',
    governanceOrder: 'constitutional_order',
    relationType: 'equivalent_to',
    relatedConceptId: 'violation',
  }, {
    resolution: 'conflict',
    code: 'DUTY_COLLAPSES_TO_VIOLATION',
    message: 'Duty must not collapse into violation.',
  });

  runCase('responsibility_conflict_duty_collapse', responsibility, {
    domain: 'governance',
    identityKind: 'answerable_attribution',
    governanceOrder: 'constitutional_order',
    relationType: 'equivalent_to',
    relatedConceptId: 'duty',
  }, {
    resolution: 'conflict',
    code: 'RESPONSIBILITY_COLLAPSES_TO_DUTY',
    message: 'Responsibility must not collapse into duty.',
  });

  runCase('responsibility_conflict_violation_collapse', responsibility, {
    domain: 'governance',
    identityKind: 'answerable_attribution',
    governanceOrder: 'constitutional_order',
    relationType: 'equivalent_to',
    relatedConceptId: 'violation',
  }, {
    resolution: 'conflict',
    code: 'RESPONSIBILITY_COLLAPSES_TO_VIOLATION',
    message: 'Responsibility must not collapse into violation.',
  });

  runCase('violation_conflict_duty_collapse', violation, {
    domain: 'governance',
    identityKind: 'unmet_duty_state',
    governanceOrder: 'constitutional_order',
    relationType: 'equivalent_to',
    relatedConceptId: 'duty',
  }, {
    resolution: 'conflict',
    code: 'VIOLATION_COLLAPSES_TO_DUTY',
    message: 'Violation must not collapse into duty.',
  });

  runCase('violation_conflict_responsibility_collapse', violation, {
    domain: 'governance',
    identityKind: 'unmet_duty_state',
    governanceOrder: 'constitutional_order',
    relationType: 'equivalent_to',
    relatedConceptId: 'responsibility',
  }, {
    resolution: 'conflict',
    code: 'VIOLATION_COLLAPSES_TO_RESPONSIBILITY',
    message: 'Violation must not collapse into responsibility.',
  });

  process.stdout.write('PASS governance_conduct_family_pressure\n');
}

function verifyFamilySnapshot() {
  const snapshot = loadJson(familySnapshotPath);
  const storedRelationshipSnapshot = loadStoredConceptRelationshipSnapshot();

  assert.equal(snapshot.version, 1, 'conduct family snapshot version mismatch.');
  assert.equal(snapshot.familyId, 'governance-duty-responsibility-violation.v1', 'conduct family snapshot familyId mismatch.');
  assert.equal(snapshot.directionality, 'directional', 'conduct family snapshot must remain directional.');

  const expectedPairs = [
    { conceptId: 'duty', otherConceptId: 'responsibility', classification: 'distinct' },
    { conceptId: 'duty', otherConceptId: 'violation', classification: 'distinct' },
    { conceptId: 'responsibility', otherConceptId: 'duty', classification: 'distinct' },
    { conceptId: 'responsibility', otherConceptId: 'violation', classification: 'distinct' },
    { conceptId: 'violation', otherConceptId: 'duty', classification: 'distinct' },
    { conceptId: 'violation', otherConceptId: 'responsibility', classification: 'distinct' },
  ];

  assert.deepEqual(snapshot.baselinePairs, expectedPairs, 'conduct family baseline snapshot mismatch.');

  expectedPairs.forEach((entry) => {
    const leftConcept = getConceptById(entry.conceptId);
    const rightConcept = getConceptById(entry.otherConceptId);

    const comparatorResult = compareConceptProfiles(
      normalizeConceptToProfile(leftConcept),
      normalizeConceptToProfile(rightConcept),
    );

    assert.equal(
      comparatorResult.classification,
      entry.classification,
      `${entry.conceptId}->${entry.otherConceptId} comparator classification drifted.`,
    );

    const storedPair = storedRelationshipSnapshot.authoredPairs.find((candidate) => (
      candidate.conceptId === entry.conceptId
      && candidate.otherConceptId === entry.otherConceptId
    ));

    assert.notEqual(
      storedPair,
      undefined,
      `${entry.conceptId}->${entry.otherConceptId} must exist in stored overlap snapshot authoredPairs.`,
    );
    assert.equal(
      storedPair.classification,
      entry.classification,
      `${entry.conceptId}->${entry.otherConceptId} stored overlap snapshot classification drifted.`,
    );
  });

  process.stdout.write('PASS governance_conduct_family_snapshot\n');
}

function main() {
  verifyConductFamilyDomainLock();
  verifyConductFamilyContractStructures();
  verifyPairwiseExclusionMatrix();
  verifyTemporalAndFunctionalSeparation();
  verifyFamilyPressureTests();
  verifyFamilySnapshot();
}

main();

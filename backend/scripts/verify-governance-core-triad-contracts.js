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
const {
  STRUCTURAL_FAILURE_KINDS,
  classifyConstraintContractFailure,
} = require('../src/modules/concepts/structural-failure-layer');

const exclusionMatrixPath = path.resolve(
  __dirname,
  '../../data/constraint-contracts/governance-authority-power-legitimacy-exclusion-matrix.json',
);
const familySnapshotPath = path.resolve(
  __dirname,
  '../../data/constraint-contracts/governance-authority-power-legitimacy-snapshot.json',
);

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getTriadArtifacts() {
  const authority = getConceptById('authority');
  const power = getConceptById('power');
  const legitimacy = getConceptById('legitimacy');

  assert.notEqual(authority, null, 'Authority concept packet must load.');
  assert.notEqual(power, null, 'Power concept packet must load.');
  assert.notEqual(legitimacy, null, 'Legitimacy concept packet must load.');

  return {
    authority,
    power,
    legitimacy,
    domainLock: loadGovernanceDomainLock(),
  };
}

function verifyGovernanceTriadDomainLock() {
  const {
    authority,
    power,
    legitimacy,
    domainLock,
  } = getTriadArtifacts();

  assert.equal(
    domainLock.conceptPacketDomainIds.includes(authority.domain),
    true,
    'governance domain lock must cover authority packet domain.',
  );
  assert.equal(
    domainLock.conceptPacketDomainIds.includes(power.domain),
    true,
    'governance domain lock must cover power packet domain.',
  );
  assert.equal(
    domainLock.conceptPacketDomainIds.includes(legitimacy.domain),
    true,
    'governance domain lock must cover legitimacy packet domain.',
  );
  assert.equal(
    domainLock.outOfScopeTopics.includes('psychology'),
    true,
    'governance domain lock must keep psychology out of scope.',
  );
  assert.equal(
    domainLock.outOfScopeTopics.includes('emotion'),
    true,
    'governance domain lock must keep emotion out of scope.',
  );
  assert.equal(
    domainLock.outOfScopeTopics.includes('informal_morality'),
    true,
    'governance domain lock must keep informal_morality out of scope.',
  );

  process.stdout.write('PASS governance_core_triad_domain_lock\n');
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
      allowedRelations: contract.allowedRelations,
      forbiddenRelations: contract.forbiddenRelations,
      invariantIds: contract.invariants.map((entry) => entry.id),
      invariantFailureCodes: contract.structuralFailures.invariantBreaches.map((entry) => entry.code),
      refusalCodes: contract.structuralFailures.refusals.map((entry) => entry.code),
      contractIncompleteCodes: contract.structuralFailures.contractIncompletes?.map((entry) => entry.code) ?? null,
      runtimeBoundaryCodes: contract.structuralFailures.runtimeBoundaries?.map((entry) => entry.code) ?? null,
    },
    expected,
    `${conceptId} constraint contract structure mismatch.`,
  );

  [
    ...contract.allowedRelations.map((entry) => entry.targetConceptId),
    ...contract.forbiddenRelations.map((entry) => entry.targetConceptId),
  ].forEach((targetConceptId) => {
    assert.equal(
      LIVE_CONCEPT_IDS.includes(targetConceptId),
      true,
      `${conceptId} contract target "${targetConceptId}" must remain in the live kernel.`,
    );
  });
}

function verifyGovernanceTriadContractStructures() {
  verifyConceptContractStructure('authority', {
    domainLockRef: 'governance-domain-lock.v1',
    templateRole: 'family_seed_directive_standing',
    expectedIdentityKind: 'recognized_directive_standing',
    requiredFields: ['domain', 'identityKind', 'governanceOrder'],
    allowedRelations: [
      { relationType: 'is_structured_by', targetConceptId: 'law' },
      { relationType: 'may_channel', targetConceptId: 'power' },
      { relationType: 'is_evaluated_by', targetConceptId: 'legitimacy' },
    ],
    forbiddenRelations: [
      { relationType: 'equivalent_to', targetConceptId: 'power', failureCode: 'AUTHORITY_COLLAPSES_TO_POWER' },
      { relationType: 'equivalent_to', targetConceptId: 'legitimacy', failureCode: 'AUTHORITY_COLLAPSES_TO_LEGITIMACY' },
    ],
    invariantIds: [
      'authority_is_recognized_directive_standing',
      'authority_is_not_operative_capacity',
      'authority_is_not_validity_assessment',
      'authority_can_exist_without_effective_control',
      'authority_can_persist_while_legitimacy_is_contested',
    ],
    invariantFailureCodes: [
      'AUTHORITY_IDENTITY_KIND_MISMATCH',
      'AUTHORITY_COLLAPSES_TO_POWER',
      'AUTHORITY_COLLAPSES_TO_LEGITIMACY',
    ],
    refusalCodes: [
      'AUTHORITY_NON_GOVERNANCE_DOMAIN',
      'AUTHORITY_OUT_OF_SCOPE_TOPIC',
      'AUTHORITY_UNSUPPORTED_RELATION',
    ],
    contractIncompleteCodes: ['AUTHORITY_CONTRACT_INCOMPLETE'],
    runtimeBoundaryCodes: ['AUTHORITY_NON_LIVE_CONCEPT'],
  });

  verifyConceptContractStructure('power', {
    domainLockRef: 'governance-domain-lock.v1',
    templateRole: 'family_seed_operative_capacity',
    expectedIdentityKind: 'operative_outcome_capacity',
    requiredFields: ['domain', 'identityKind', 'governanceOrder'],
    allowedRelations: [
      { relationType: 'may_be_channeled_by', targetConceptId: 'authority' },
      { relationType: 'may_operate_without', targetConceptId: 'authority' },
      { relationType: 'may_operate_without', targetConceptId: 'legitimacy' },
    ],
    forbiddenRelations: [
      { relationType: 'equivalent_to', targetConceptId: 'authority', failureCode: 'POWER_COLLAPSES_TO_AUTHORITY' },
      { relationType: 'equivalent_to', targetConceptId: 'legitimacy', failureCode: 'POWER_COLLAPSES_TO_LEGITIMACY' },
    ],
    invariantIds: [
      'power_is_operative_capacity',
      'power_is_not_directive_standing',
      'power_is_not_validity_assessment',
      'power_can_exist_without_authority',
      'power_can_exist_without_legitimacy',
    ],
    invariantFailureCodes: [
      'POWER_IDENTITY_KIND_MISMATCH',
      'POWER_COLLAPSES_TO_AUTHORITY',
      'POWER_COLLAPSES_TO_LEGITIMACY',
    ],
    refusalCodes: [
      'POWER_NON_GOVERNANCE_DOMAIN',
      'POWER_OUT_OF_SCOPE_TOPIC',
      'POWER_UNSUPPORTED_RELATION',
    ],
    contractIncompleteCodes: ['POWER_CONTRACT_INCOMPLETE'],
    runtimeBoundaryCodes: ['POWER_NON_LIVE_CONCEPT'],
  });

  verifyConceptContractStructure('legitimacy', {
    domainLockRef: 'governance-domain-lock.v1',
    templateRole: 'family_seed_validity_assessment',
    expectedIdentityKind: 'accepted_justified_validity',
    requiredFields: ['domain', 'identityKind', 'governanceOrder'],
    allowedRelations: [
      { relationType: 'evaluates', targetConceptId: 'authority' },
      { relationType: 'evaluates', targetConceptId: 'law' },
      { relationType: 'may_justify_exercise_of', targetConceptId: 'power' },
    ],
    forbiddenRelations: [
      { relationType: 'equivalent_to', targetConceptId: 'authority', failureCode: 'LEGITIMACY_COLLAPSES_TO_AUTHORITY' },
      { relationType: 'equivalent_to', targetConceptId: 'power', failureCode: 'LEGITIMACY_COLLAPSES_TO_POWER' },
    ],
    invariantIds: [
      'legitimacy_is_validity_assessment',
      'legitimacy_is_not_directive_standing',
      'legitimacy_is_not_operative_capacity',
      'legitimacy_can_be_absent_while_authority_persists',
      'legitimacy_can_be_absent_while_power_operates',
    ],
    invariantFailureCodes: [
      'LEGITIMACY_IDENTITY_KIND_MISMATCH',
      'LEGITIMACY_COLLAPSES_TO_AUTHORITY',
      'LEGITIMACY_COLLAPSES_TO_POWER',
    ],
    refusalCodes: [
      'LEGITIMACY_NON_GOVERNANCE_DOMAIN',
      'LEGITIMACY_OUT_OF_SCOPE_TOPIC',
      'LEGITIMACY_UNSUPPORTED_RELATION',
    ],
    contractIncompleteCodes: ['LEGITIMACY_CONTRACT_INCOMPLETE'],
    runtimeBoundaryCodes: ['LEGITIMACY_NON_LIVE_CONCEPT'],
  });

  process.stdout.write('PASS governance_core_triad_contract_structures\n');
}

function verifyPairwiseExclusionMatrix() {
  const matrix = loadJson(exclusionMatrixPath);

  assert.equal(matrix.version, 1, 'governance core triad exclusion matrix version mismatch.');
  assert.equal(matrix.familyId, 'governance-authority-power-legitimacy.v1', 'exclusion matrix familyId mismatch.');
  assert.deepEqual(matrix.conceptIds, ['authority', 'power', 'legitimacy'], 'exclusion matrix conceptIds mismatch.');
  assert.equal(matrix.pairs.length, 3, 'exclusion matrix must define exactly three pair records.');

  assert.deepEqual(
    matrix.pairs.map((entry) => entry.pairId),
    ['authority_vs_power', 'authority_vs_legitimacy', 'power_vs_legitimacy'],
    'exclusion matrix pairId sequence mismatch.',
  );

  matrix.pairs.forEach((entry) => {
    assert.equal(typeof entry.distinction, 'string', `${entry.pairId} distinction must be a string.`);
    assert.equal(entry.distinction.trim().length > 0, true, `${entry.pairId} distinction must be non-empty.`);
    assert.equal(Array.isArray(entry.cannotCoexist), true, `${entry.pairId} cannotCoexist must be an array.`);
    assert.equal(Array.isArray(entry.conflictCauses), true, `${entry.pairId} conflictCauses must be an array.`);
    assert.equal(entry.cannotCoexist.length >= 1, true, `${entry.pairId} must define at least one non-coexistence rule.`);
    assert.equal(entry.conflictCauses.length >= 1, true, `${entry.pairId} must define at least one conflict cause.`);
  });

  process.stdout.write('PASS governance_core_triad_exclusion_matrix\n');
}

function runCase(name, concept, input, expected) {
  const result = evaluateConstraintContractCase(input, concept);
  assert.deepEqual(result, expected, `${name} result mismatch.`);
}

function verifyFamilyPressureTests() {
  const { authority, power, legitimacy } = getTriadArtifacts();

  runCase('authority_valid_channels_power', authority, {
    domain: 'governance',
    identityKind: 'recognized_directive_standing',
    governanceOrder: 'constitutional_order',
    relationType: 'may_channel',
    relatedConceptId: 'power',
  }, {
    resolution: 'valid',
    code: 'AUTHORITY_CONTRACT_VALID',
    message: 'Authority contract input satisfies the governance-domain identity rules.',
  });

  runCase('power_valid_without_legitimacy', power, {
    domain: 'governance',
    identityKind: 'operative_outcome_capacity',
    governanceOrder: 'constitutional_order',
    relationType: 'may_operate_without',
    relatedConceptId: 'legitimacy',
  }, {
    resolution: 'valid',
    code: 'POWER_CONTRACT_VALID',
    message: 'Power contract input satisfies the governance-domain identity rules.',
  });

  runCase('legitimacy_valid_evaluates_authority', legitimacy, {
    domain: 'governance',
    identityKind: 'accepted_justified_validity',
    governanceOrder: 'constitutional_order',
    relationType: 'evaluates',
    relatedConceptId: 'authority',
  }, {
    resolution: 'valid',
    code: 'LEGITIMACY_CONTRACT_VALID',
    message: 'Legitimacy contract input satisfies the governance-domain identity rules.',
  });

  runCase('authority_invalid_missing_governance_order', authority, {
    domain: 'governance',
    identityKind: 'recognized_directive_standing',
  }, {
    resolution: 'invalid',
    code: 'AUTHORITY_MISSING_REQUIRED_FIELD',
    message: 'Authority contract input is missing required field "governanceOrder".',
  });

  runCase('power_invalid_relation_target_mismatch', power, {
    domain: 'governance',
    identityKind: 'operative_outcome_capacity',
    governanceOrder: 'constitutional_order',
    relationType: 'may_operate_without',
  }, {
    resolution: 'invalid',
    code: 'POWER_RELATION_TARGET_MISMATCH',
    message: 'Power contract input must provide relationType and relatedConceptId together.',
  });

  runCase('legitimacy_refused_non_governance_domain', legitimacy, {
    domain: 'psychology',
    identityKind: 'accepted_justified_validity',
    governanceOrder: 'constitutional_order',
  }, {
    resolution: 'refused',
    code: 'LEGITIMACY_NON_GOVERNANCE_DOMAIN',
    message: 'Legitimacy is locked to governance-domain meaning in ChatPDM v1.',
  });

  runCase('authority_refused_unsupported_relation', authority, {
    domain: 'governance',
    identityKind: 'recognized_directive_standing',
    governanceOrder: 'constitutional_order',
    relationType: 'grounds',
    relatedConceptId: 'violation',
  }, {
    resolution: 'refused',
    code: 'AUTHORITY_UNSUPPORTED_RELATION',
    message: 'This authority contract admits only recognized-standing relations inside the governance cluster.',
  });

  runCase('authority_conflict_identity_mismatch', authority, {
    domain: 'governance',
    identityKind: 'operative_outcome_capacity',
    governanceOrder: 'constitutional_order',
  }, {
    resolution: 'conflict',
    code: 'AUTHORITY_IDENTITY_KIND_MISMATCH',
    message: 'Authority must remain recognized directive standing.',
  });

  runCase('authority_conflict_power_collapse', authority, {
    domain: 'governance',
    identityKind: 'recognized_directive_standing',
    governanceOrder: 'constitutional_order',
    relationType: 'equivalent_to',
    relatedConceptId: 'power',
  }, {
    resolution: 'conflict',
    code: 'AUTHORITY_COLLAPSES_TO_POWER',
    message: 'Authority must not collapse into power.',
  });

  runCase('authority_conflict_legitimacy_collapse', authority, {
    domain: 'governance',
    identityKind: 'recognized_directive_standing',
    governanceOrder: 'constitutional_order',
    relationType: 'equivalent_to',
    relatedConceptId: 'legitimacy',
  }, {
    resolution: 'conflict',
    code: 'AUTHORITY_COLLAPSES_TO_LEGITIMACY',
    message: 'Authority must not collapse into legitimacy.',
  });

  runCase('power_conflict_authority_collapse', power, {
    domain: 'governance',
    identityKind: 'operative_outcome_capacity',
    governanceOrder: 'constitutional_order',
    relationType: 'equivalent_to',
    relatedConceptId: 'authority',
  }, {
    resolution: 'conflict',
    code: 'POWER_COLLAPSES_TO_AUTHORITY',
    message: 'Power must not collapse into authority.',
  });

  runCase('power_conflict_legitimacy_collapse', power, {
    domain: 'governance',
    identityKind: 'operative_outcome_capacity',
    governanceOrder: 'constitutional_order',
    relationType: 'equivalent_to',
    relatedConceptId: 'legitimacy',
  }, {
    resolution: 'conflict',
    code: 'POWER_COLLAPSES_TO_LEGITIMACY',
    message: 'Power must not collapse into legitimacy.',
  });

  runCase('legitimacy_conflict_authority_collapse', legitimacy, {
    domain: 'governance',
    identityKind: 'accepted_justified_validity',
    governanceOrder: 'constitutional_order',
    relationType: 'equivalent_to',
    relatedConceptId: 'authority',
  }, {
    resolution: 'conflict',
    code: 'LEGITIMACY_COLLAPSES_TO_AUTHORITY',
    message: 'Legitimacy must not collapse into authority.',
  });

  runCase('legitimacy_conflict_power_collapse', legitimacy, {
    domain: 'governance',
    identityKind: 'accepted_justified_validity',
    governanceOrder: 'constitutional_order',
    relationType: 'equivalent_to',
    relatedConceptId: 'power',
  }, {
    resolution: 'conflict',
    code: 'LEGITIMACY_COLLAPSES_TO_POWER',
    message: 'Legitimacy must not collapse into power.',
  });

  process.stdout.write('PASS governance_core_triad_family_pressure\n');
}

function verifyStructuralFailureCoverage() {
  const { authority, power, legitimacy } = getTriadArtifacts();
  const triadConcepts = [authority, power, legitimacy];

  ['contract_incomplete', 'unsupported_relation', 'non_live_concept'].forEach((kind) => {
    assert.equal(
      STRUCTURAL_FAILURE_KINDS.includes(kind),
      true,
      `structural failure kinds must include ${kind}.`,
    );
  });

  triadConcepts.forEach((concept) => {
    const contractLabel = concept.conceptId.toUpperCase();
    const contractIncomplete = concept.constraintContract.structuralFailures.contractIncompletes[0];
    const nonLiveConcept = concept.constraintContract.structuralFailures.runtimeBoundaries[0];
    const unsupportedRelation = concept.constraintContract.structuralFailures.refusals.find((entry) => (
      entry.code === `${contractLabel}_UNSUPPORTED_RELATION`
    ));

    assert.equal(
      classifyConstraintContractFailure({
        resolution: 'invalid',
        code: contractIncomplete.code,
        message: contractIncomplete.reason,
      }),
      'contract_incomplete',
      `${concept.conceptId} contract-incomplete failure must map to contract_incomplete.`,
    );
    assert.equal(
      classifyConstraintContractFailure({
        resolution: 'refused',
        code: unsupportedRelation.code,
        message: unsupportedRelation.reason,
      }),
      'unsupported_relation',
      `${concept.conceptId} unsupported relation must map to unsupported_relation.`,
    );
    assert.equal(
      classifyConstraintContractFailure({
        resolution: 'refused',
        code: nonLiveConcept.code,
        message: nonLiveConcept.reason,
      }),
      'non_live_concept',
      `${concept.conceptId} non-live misuse must map to non_live_concept.`,
    );
  });

  process.stdout.write('PASS governance_core_triad_structural_failure_coverage\n');
}

function verifyFamilySnapshot() {
  const snapshot = loadJson(familySnapshotPath);
  const storedRelationshipSnapshot = loadStoredConceptRelationshipSnapshot();

  assert.equal(snapshot.version, 1, 'governance core triad family snapshot version mismatch.');
  assert.equal(snapshot.familyId, 'governance-authority-power-legitimacy.v1', 'governance core triad familyId mismatch.');
  assert.equal(snapshot.directionality, 'directional', 'governance core triad snapshot must remain directional.');

  const expectedPairs = [
    { conceptId: 'authority', otherConceptId: 'legitimacy', classification: 'adjacent' },
    { conceptId: 'authority', otherConceptId: 'power', classification: 'adjacent' },
    { conceptId: 'legitimacy', otherConceptId: 'authority', classification: 'adjacent' },
    { conceptId: 'legitimacy', otherConceptId: 'power', classification: 'requires_explicit_boundary_note' },
    { conceptId: 'power', otherConceptId: 'authority', classification: 'adjacent' },
    { conceptId: 'power', otherConceptId: 'legitimacy', classification: 'requires_explicit_boundary_note' },
  ];

  assert.deepEqual(snapshot.baselinePairs, expectedPairs, 'governance core triad baseline snapshot mismatch.');

  expectedPairs.forEach((entry) => {
    const leftConcept = getConceptById(entry.conceptId);
    const rightConcept = getConceptById(entry.otherConceptId);
    assert.notEqual(leftConcept, null, `${entry.conceptId} must load for family snapshot verification.`);
    assert.notEqual(rightConcept, null, `${entry.otherConceptId} must load for family snapshot verification.`);

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

  process.stdout.write('PASS governance_core_triad_family_snapshot\n');
}

function main() {
  verifyGovernanceTriadDomainLock();
  verifyGovernanceTriadContractStructures();
  verifyPairwiseExclusionMatrix();
  verifyFamilyPressureTests();
  verifyStructuralFailureCoverage();
  verifyFamilySnapshot();
}

main();

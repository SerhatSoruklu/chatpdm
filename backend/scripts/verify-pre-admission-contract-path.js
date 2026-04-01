'use strict';

const assert = require('node:assert/strict');

const {
  RUNTIME_RESOLUTION_STATES,
  assertSingleRuntimeResolutionState,
  getPreAdmissionContractPath,
  loadPreAdmissionContractPathRegistry,
  resolveConceptQuery,
} = require('../src/modules/concepts');

function verifyRegistryLoadsAndCoversRejectedConcepts() {
  const registry = loadPreAdmissionContractPathRegistry();
  const conceptIds = registry.conceptPaths.map((entry) => entry.conceptId).sort();

  assert.equal(registry.version, 1, 'pre-admission contract path registry version mismatch.');
  assert.equal(
    registry.runtimeExposurePolicy,
    'rejection_registry_only',
    'pre-admission contract path runtime exposure policy mismatch.',
  );
  assert.deepEqual(
    conceptIds,
    ['enforcement', 'obligation'],
    'pre-admission contract path registry must only cover concepts with active promotion paths.',
  );

  process.stdout.write('PASS pre_admission_contract_path_registry_loaded\n');
}

function verifyObligationAndEnforcementPaths() {
  const obligation = getPreAdmissionContractPath('obligation');
  const enforcement = getPreAdmissionContractPath('enforcement');

  assert.deepEqual(
    obligation.comparisonTargets,
    ['duty', 'responsibility'],
    'obligation pre-admission comparison targets mismatch.',
  );
  assert.deepEqual(
    enforcement.comparisonTargets,
    ['duty', 'responsibility'],
    'enforcement pre-admission comparison targets mismatch.',
  );
  assert.equal(
    obligation.requiredArtifacts.includes('constraint_contract'),
    true,
    'obligation pre-admission path must require a constraint contract artifact.',
  );
  assert.equal(
    enforcement.requiredArtifacts.includes('overlap_report_against_live_kernel'),
    true,
    'enforcement pre-admission path must require a live-kernel overlap report.',
  );

  process.stdout.write('PASS pre_admission_contract_path_entries\n');
}

function verifyRejectedConceptsRemainRuntimeIsolated() {
  ['obligation', 'enforcement', 'claim', 'liability', 'jurisdiction', 'defeasibility'].forEach((conceptId) => {
    const response = resolveConceptQuery(conceptId);
    const runtimeResolutionState = assertSingleRuntimeResolutionState(response);

    assert.equal(response.type, 'rejected_concept', `${conceptId} must remain rejected in runtime.`);
    assert.equal(
      runtimeResolutionState,
      'refused',
      `${conceptId} must remain isolated behind the refused runtime state.`,
    );
  });

  assert.deepEqual(
    [...RUNTIME_RESOLUTION_STATES],
    ['allowed', 'invalid', 'conflict', 'refused'],
    'runtime resolution-state vocabulary drifted unexpectedly.',
  );

  process.stdout.write('PASS pre_admission_contract_path_runtime_isolation\n');
}

function verifyPermanentRejectionsRemainOutsidePromotionPathRegistry() {
  ['claim', 'liability', 'jurisdiction', 'defeasibility'].forEach((conceptId) => {
    assert.throws(
      () => getPreAdmissionContractPath(conceptId),
      /No pre-admission contract path found/,
      `${conceptId} must not receive a pre-admission promotion path.`,
    );
  });

  process.stdout.write('PASS pre_admission_contract_path_permanent_rejections\n');
}

function main() {
  verifyRegistryLoadsAndCoversRejectedConcepts();
  verifyObligationAndEnforcementPaths();
  verifyPermanentRejectionsRemainOutsidePromotionPathRegistry();
  verifyRejectedConceptsRemainRuntimeIsolated();
  process.stdout.write('Pre-admission contract path verification passed.\n');
}

main();

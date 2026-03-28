import assert from 'node:assert/strict';

import { POLICY_SURFACE_DATA } from '../src/app/policies/policy-surface.data.ts';

function main(): void {
  const termsTruth = POLICY_SURFACE_DATA.terms.termsTruth;

  assert.ok(termsTruth, 'Terms truth must exist on the terms surface.');
  assert.equal(
    POLICY_SURFACE_DATA.privacy.termsTruth,
    undefined,
    'Privacy must not gain terms truth rows.',
  );
  assert.equal(
    POLICY_SURFACE_DATA.cookies.termsTruth,
    undefined,
    'Cookies must not gain terms truth rows.',
  );

  assert.equal(termsTruth.endpointContracts.length, 2);
  assert.equal(termsTruth.fieldContracts.length, 22);
  assert.equal(termsTruth.platformRules.length, 1);
  assert.equal(termsTruth.runtimeBoundaries.length, 1);
  assert.equal(termsTruth.refusalBoundaries.length, 8);

  assert.deepEqual(
    termsTruth.endpointContracts,
    [
      {
        claimId: 'terms-1',
        operation: 'concept_resolution',
        method: 'GET',
        path: '/api/v1/concepts/resolve',
        requiredQueryParam: 'q',
        evidence: POLICY_SURFACE_DATA.terms.claims.find((claim) => claim.id === 'terms-1')!.traces,
      },
      {
        claimId: 'terms-2',
        operation: 'feedback_submission',
        method: 'POST',
        path: '/api/v1/feedback',
        evidence: POLICY_SURFACE_DATA.terms.claims.find((claim) => claim.id === 'terms-2')!.traces,
      },
    ],
    'Endpoint contracts must remain separate, typed rows.',
  );

  const requestFields = termsTruth.fieldContracts.filter(
    (fact) => fact.fieldContractType === 'request_field',
  );
  const enumValues = termsTruth.fieldContracts.filter((fact) => fact.fieldContractType === 'enum_value');
  const conditionalOptions = termsTruth.fieldContracts.filter(
    (fact) => fact.fieldContractType === 'conditional_option',
  );

  assert.equal(requestFields.length, 12, 'Feedback request fields must remain request_field rows.');
  assert.equal(enumValues.length, 3, 'Allowed response types must remain enum_value rows.');
  assert.equal(
    conditionalOptions.length,
    7,
    'Allowed feedback options must remain conditional_option rows.',
  );

  assert.deepEqual(
    termsTruth.platformRules,
    [
      {
        claimId: 'terms-25',
        ruleType: 'cors_origin_allowlist',
        subject: 'cross_origin_request',
        effect: 'reject_outside_normalized_allowed_origin_set',
        evidence: POLICY_SURFACE_DATA.terms.claims.find((claim) => claim.id === 'terms-25')!.traces,
      },
    ],
    'Platform rules must remain separate from refusal and runtime boundaries.',
  );

  assert.deepEqual(
    termsTruth.runtimeBoundaries,
    [
      {
        claimId: 'terms-34',
        boundaryType: 'comparison_output_allowlist',
        subject: 'comparison_output',
        effect: 'blocked',
        condition: 'non_allowlisted_concept_pairs',
        evidence: POLICY_SURFACE_DATA.terms.claims.find((claim) => claim.id === 'terms-34')!.traces,
      },
    ],
    'Runtime boundaries must remain separate from endpoint and field contract rows.',
  );

  const ambiguousMinimum = termsTruth.refusalBoundaries.find((fact) => fact.claimId === 'terms-31');

  assert.deepEqual(
    ambiguousMinimum,
    {
      claimId: 'terms-31',
      boundaryType: 'minimum_candidate_ids',
      scope: 'feedback_submission',
      fieldName: 'candidateConceptIds',
      conditionField: 'responseType',
      conditionValue: 'ambiguous_match',
      minimumCount: 2,
      evidence: POLICY_SURFACE_DATA.terms.claims.find((claim) => claim.id === 'terms-31')!.traces,
    },
    'Refusal boundaries must carry their own typed condition and minimum semantics.',
  );

  console.log('PASS policy_terms_truth');
}

main();

import assert from 'node:assert/strict';

import { POLICY_SURFACE_DATA } from '../src/app/policies/policy-surface.data.ts';
import { buildTermsPageViewModel } from '../src/app/pages/terms-page/terms-page.view-model.ts';

function main(): void {
  const viewModel = buildTermsPageViewModel(POLICY_SURFACE_DATA.terms);

  assert.equal(viewModel.inspectRoute, '/inspect/terms');
  assert.equal(
    viewModel.summaryLine,
    'Current modeled scope shows 2 public endpoints, 22 field rules, 1 platform rule, 1 runtime boundary, and 8 refusal boundaries.',
  );
  assert.deepEqual(
    viewModel.badges,
    [
      { label: 'Endpoints', value: '2 public' },
      { label: 'Field rules', value: '22 typed' },
      { label: 'Platform rules', value: '1 active' },
      { label: 'Boundaries', value: '9 mapped' },
    ],
    'Terms hero badges must be derived from typed terms truth.',
  );

  assert.deepEqual(
    viewModel.endpointRows,
    [
      {
        claimId: 'terms-1',
        operation: 'concept resolution',
        method: 'GET',
        path: '/api/v1/concepts/resolve',
        input: 'query: q',
        evidence: 'backend/src/routes/api/v1/concepts.route.js:16-31',
      },
      {
        claimId: 'terms-2',
        operation: 'feedback submission',
        method: 'POST',
        path: '/api/v1/feedback',
        input: 'request body',
        evidence: 'backend/src/routes/api/v1/feedback.route.js:16-19',
      },
    ],
    'Endpoint contract rows must remain separate from field and boundary rows.',
  );

  assert.equal(viewModel.requestFieldRows.length, 12);
  assert.equal(viewModel.acceptedValueRows.length, 10);
  assert.deepEqual(
    viewModel.platformRuleRows,
    [
      {
        claimId: 'terms-25',
        rule: 'CORS origin allowlist',
        effect: 'requests outside the normalized allowed origin set are rejected',
        evidence: 'backend/src/security/cors.js:7-20',
      },
    ],
    'Platform rules must remain separate rows.',
  );
  assert.deepEqual(
    viewModel.runtimeBoundaryRows,
    [
      {
        claimId: 'terms-34',
        boundary: 'comparison output allowlist',
        condition: 'non-allowlisted concept pairs',
        effect: 'comparison output is blocked',
        evidence: 'backend/src/modules/concepts/comparison-resolver.js:20-22,46-55',
      },
    ],
    'Runtime boundaries must remain separate from refusal boundaries.',
  );

  const ambiguousMinimum = viewModel.refusalBoundaryRows.find((row) => row.claimId === 'terms-31');

  assert.deepEqual(
    ambiguousMinimum,
    {
      claimId: 'terms-31',
      boundary: 'candidateConceptIds minimum',
      condition: 'responseType = ambiguous_match; minimum 2',
      effect: 'insufficient candidate IDs are rejected',
      evidence: 'backend/src/modules/feedback/service.js:100-105',
    },
    'Refusal boundaries must preserve their own typed condition and effect semantics.',
  );

  console.log('PASS terms_page_view_model');
}

main();

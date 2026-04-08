import assert from 'node:assert/strict';

import { POLICY_SURFACE_DATA } from '../src/app/policies/policy-surface.data.ts';
import { buildTermsPageViewModel } from '../src/app/pages/terms-page/terms-page.view-model.ts';

function main(): void {
  const viewModel = buildTermsPageViewModel(POLICY_SURFACE_DATA.terms);

  assert.equal(viewModel.inspectRoute, '/inspect/terms');
  assert.equal(viewModel.eyebrow, 'API Reference');
  assert.equal(viewModel.title, 'Current runtime contract for public endpoints and feedback boundaries.');
  assert.equal(
    viewModel.summaryLine,
    'Current API surface shows 2 public endpoints, 22 field rules, 1 platform rule, 1 runtime boundary, and 8 refusal boundaries.',
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
        evidence: 'backend/src/routes/api/v1/feedback.route.js:20-23',
      },
    ],
    'Endpoint contract rows must remain separate from field and boundary rows.',
  );

  assert.equal(viewModel.riskMappingTitle, 'Risk Mapping Governance API');
  assert.equal(
    viewModel.riskMappingIntro,
    'Risk Mapping Governance is exposed separately as a bounded API surface. The entity stays authoritative for evidence-pack lookup, while queryText is optional and used only for classification and framing detection.',
  );
  assert.deepEqual(
    viewModel.riskMappingEndpointRows,
    [
      {
        claimId: 'rmg-api-1',
        operation: 'resolve surface',
        method: 'GET',
        path: '/api/v1/risk-mapping/resolve',
        input: 'query: entity, timeHorizon, scenarioType, domain, scope, evidenceSetVersion',
        evidence: 'backend/src/routes/api/v1/risk-mapping.route.js:97-100',
      },
      {
        claimId: 'rmg-api-2',
        operation: 'explain surface',
        method: 'GET',
        path: '/api/v1/risk-mapping/explain',
        input: 'query: entity, timeHorizon, scenarioType, domain, scope, evidenceSetVersion, queryText',
        evidence: 'backend/src/routes/api/v1/risk-mapping.route.js:67-70',
      },
      {
        claimId: 'rmg-api-3',
        operation: 'audit surface',
        method: 'GET',
        path: '/api/v1/risk-mapping/audit',
        input: 'query: entity, timeHorizon, scenarioType, domain, scope, evidenceSetVersion, queryText',
        evidence: 'backend/src/routes/api/v1/risk-mapping.route.js:82-85',
      },
      {
        claimId: 'rmg-api-4',
        operation: 'node registry',
        method: 'GET',
        path: '/api/v1/risk-mapping/registries/nodes',
        input: 'query: domain',
        evidence: 'backend/src/routes/api/v1/risk-mapping.route.js:158-160',
      },
      {
        claimId: 'rmg-api-5',
        operation: 'threat registry',
        method: 'GET',
        path: '/api/v1/risk-mapping/registries/threats',
        input: 'query: domain',
        evidence: 'backend/src/routes/api/v1/risk-mapping.route.js:162-164',
      },
      {
        claimId: 'rmg-api-6',
        operation: 'compatibility registry',
        method: 'GET',
        path: '/api/v1/risk-mapping/registries/compatibility',
        input: 'query: domain',
        evidence: 'backend/src/routes/api/v1/risk-mapping.route.js:166-168',
      },
      {
        claimId: 'rmg-api-7',
        operation: 'falsifier registry',
        method: 'GET',
        path: '/api/v1/risk-mapping/registries/falsifiers',
        input: 'query: domain',
        evidence: 'backend/src/routes/api/v1/risk-mapping.route.js:170-172',
      },
    ],
    'Risk Mapping endpoint rows must remain explicit and separate from the core terms contract.',
  );
  assert.deepEqual(
    viewModel.riskMappingFieldRows,
    [
      {
        claimId: 'rmg-field-1',
        field: 'entity',
        rule: 'accepted field',
        condition: 'authoritative evidence-pack lookup key',
        evidence: 'backend/src/modules/risk-mapping/contracts/riskMapQueryContract.js',
      },
      {
        claimId: 'rmg-field-2',
        field: 'queryText',
        rule: 'accepted field',
        condition: 'optional framing channel; classification only',
        evidence: 'backend/src/modules/risk-mapping/contracts/riskMapQueryContract.js',
      },
    ],
    'Risk Mapping request fields must keep entity lookup separate from framing detection.',
  );
  assert.equal(viewModel.riskMappingTrustRoute, '/risk-mapping-governance');

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

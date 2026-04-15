import assert from 'node:assert/strict';

import { POLICY_SURFACE_DATA } from '../src/app/policies/policy-surface.data.ts';
import { buildTermsPageViewModel } from '../src/app/pages/terms-page/terms-page.view-model.ts';

function main(): void {
  const viewModel = buildTermsPageViewModel(POLICY_SURFACE_DATA.terms);

  assert.equal(viewModel.inspectRoute, '/inspect/terms');
  assert.equal(viewModel.eyebrow, 'API Reference');
  assert.equal(viewModel.title, 'Current public API reference.');
  assert.equal(
    viewModel.intro,
    'This page models the public API as a scoped runtime section plus separate Risk Mapping Governance, Military Constraints Compiler, and ZEE surfaces. The hero counts are scoped to the runtime section only.',
  );
  assert.equal(
    viewModel.summaryLine,
    'Runtime section shows 8 public endpoints, 22 field rules, 1 platform rule, 1 runtime boundary, and 8 refusal boundaries.',
  );
  assert.deepEqual(
    viewModel.sectionGroups.map((group) => group.label),
    [
      'Overview',
      'Concepts',
      'Feedback',
      'Risk Mapping Governance',
      'Military Constraints Compiler',
      'ZeroGlare Evidence Engine',
      'Support / Notes',
    ],
  );
  assert.deepEqual(viewModel.sectionGroups.map((group) => group.sections.length), [
    1, 1, 1, 1, 1, 1, 3,
  ]);
  assert.deepEqual(viewModel.sectionOrder.map((section) => section.id), [
    'overview',
    'endpoint-contract',
    'field-contract',
    'risk-mapping-governance',
    'military-constraints',
    'zee-api',
    'platform-rules',
    'runtime-boundaries',
    'refusal-boundaries',
  ]);
  assert.equal(viewModel.sectionOrder[0].title, 'Current public API reference.');
  assert.equal(
    viewModel.sectionOrder[0].summary,
    'This page models the public API as a scoped runtime section plus separate Risk Mapping Governance, Military Constraints Compiler, and ZEE surfaces. The hero counts are scoped to the runtime section only.',
  );
  assert.equal(viewModel.sectionOrder[3].title, 'Risk Mapping Governance API');
  assert.equal(
    viewModel.sectionOrder[3].summary,
    'Risk Mapping Governance is exposed separately as a bounded API surface. The current route set includes discovery, governance, diff, explain, resolve, and registry endpoints. The query contract accepts entity, timeHorizon, scenarioType, domain, scope, evidenceSetVersion, and optional queryText; queryText is normalized by the contract but not forwarded by the route handler.',
  );
  assert.equal(viewModel.sectionOrder[4].title, 'Military Constraints Compiler API');
  assert.equal(
    viewModel.sectionOrder[4].summary,
    'Military Constraints Compiler is exposed as a deterministic admissibility surface under validated packs. It accepts structured facts only, fails closed, and returns ALLOWED, REFUSED, or REFUSED_INCOMPLETE. The current backend exposes discovery, pack catalog, pack detail, and evaluation routes only; pack metadata now includes admitted/planned/umbrella registry state. No /schema or /examples routes are implemented.',
  );
  assert.equal(viewModel.sectionOrder[5].title, 'ZeroGlare Evidence Engine API');
  assert.equal(
    viewModel.sectionOrder[5].summary,
    'ZeroGlare Evidence Engine is exposed through a read-only ZEE scaffold and a separate zeroglare analysis route. The ZEE scaffold exposes discovery, contract, explain, and audit metadata only; the zeroglare analysis route accepts structured text input through q or input and returns bounded diagnostics.',
  );
  assert.deepEqual(
    viewModel.badges,
    [
      { label: 'Endpoints', value: '8 public' },
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
        claimId: 'terms-40',
        operation: 'concept discovery',
        method: 'GET',
        path: '/api/v1/concepts',
        input: 'none',
        evidence: 'backend/src/routes/api/v1/concepts.route.js:33-39',
      },
      {
        claimId: 'terms-1',
        operation: 'concept resolution',
        method: 'GET',
        path: '/api/v1/concepts/resolve',
        input: 'query: q',
        evidence: 'backend/src/routes/api/v1/concepts.route.js:16-31',
      },
      {
        claimId: 'terms-35',
        operation: 'concept resolution',
        method: 'POST',
        path: '/api/v1/concepts/resolve',
        input: 'request body',
        evidence: 'backend/src/routes/api/v1/concepts.route.js:49-55',
      },
      {
        claimId: 'terms-36',
        operation: 'concept detail',
        method: 'GET',
        path: '/api/v1/concepts/:conceptId',
        input: 'route: conceptId',
        evidence: 'backend/src/routes/api/v1/concepts.route.js:57-93',
      },
      {
        claimId: 'terms-37',
        operation: 'feedback index',
        method: 'GET',
        path: '/api/v1/feedback',
        input: 'none',
        evidence: 'backend/src/routes/api/v1/feedback.route.js:12-18',
      },
      {
        claimId: 'terms-2',
        operation: 'feedback submission',
        method: 'POST',
        path: '/api/v1/feedback',
        input: 'request body',
        evidence: 'backend/src/routes/api/v1/feedback.route.js:20-23',
      },
      {
        claimId: 'terms-38',
        operation: 'feedback export',
        method: 'GET',
        path: '/api/v1/feedback/session/:sessionId/export',
        input: 'route: sessionId',
        evidence: 'backend/src/routes/api/v1/feedback.route.js:45-68',
      },
      {
        claimId: 'terms-39',
        operation: 'feedback delete',
        method: 'DELETE',
        path: '/api/v1/feedback/session/:sessionId',
        input: 'route: sessionId',
        evidence: 'backend/src/routes/api/v1/feedback.route.js:70-93',
      },
    ],
    'Endpoint contract rows must remain separate from field and boundary rows.',
  );

  assert.equal(viewModel.riskMappingTitle, 'Risk Mapping Governance API');
  assert.equal(
    viewModel.riskMappingIntro,
    'Risk Mapping Governance is exposed separately as a bounded API surface. The current route set includes discovery, governance, diff, explain, resolve, and registry endpoints. The query contract accepts entity, timeHorizon, scenarioType, domain, scope, evidenceSetVersion, and optional queryText; queryText is normalized by the contract but not forwarded by the route handler.',
  );
  assert.deepEqual(
    viewModel.riskMappingEndpointRows,
    [
      {
        claimId: 'rmg-api-0',
        operation: 'surface summary',
        method: 'GET',
        path: '/api/v1/risk-mapping/',
        input: 'none',
        evidence: 'backend/src/routes/api/v1/risk-mapping.route.js:147-153',
      },
      {
        claimId: 'rmg-api-8',
        operation: 'governance report',
        method: 'GET',
        path: '/api/v1/risk-mapping/governance',
        input: 'none',
        evidence: 'backend/src/routes/api/v1/risk-mapping.route.js:115-122',
      },
      {
        claimId: 'rmg-api-9',
        operation: 'artifact diff',
        method: 'GET',
        path: '/api/v1/risk-mapping/diff',
        input: 'none',
        evidence: 'backend/src/routes/api/v1/risk-mapping.route.js:124-136',
      },
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
        input: 'query: entity, timeHorizon, scenarioType, domain, scope, evidenceSetVersion',
        evidence: 'backend/src/routes/api/v1/risk-mapping.route.js:67-70',
      },
      {
        claimId: 'rmg-api-3',
        operation: 'audit surface',
        method: 'GET',
        path: '/api/v1/risk-mapping/audit',
        input: 'query: entity, timeHorizon, scenarioType, domain, scope, evidenceSetVersion',
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
        rule: 'required request field',
        condition: 'authoritative entity lookup key',
        evidence: 'backend/src/modules/risk-mapping/contracts/riskMapQueryContract.js:46-74',
      },
      {
        claimId: 'rmg-field-2',
        field: 'timeHorizon',
        rule: 'required request field',
        condition: 'temporal horizon selector',
        evidence: 'backend/src/modules/risk-mapping/contracts/riskMapQueryContract.js:46-74',
      },
      {
        claimId: 'rmg-field-3',
        field: 'scenarioType',
        rule: 'required request field',
        condition: 'scenario classifier',
        evidence: 'backend/src/modules/risk-mapping/contracts/riskMapQueryContract.js:46-74',
      },
      {
        claimId: 'rmg-field-4',
        field: 'domain',
        rule: 'required request field',
        condition: 'domain scoping key',
        evidence: 'backend/src/modules/risk-mapping/contracts/riskMapQueryContract.js:46-74',
      },
      {
        claimId: 'rmg-field-5',
        field: 'scope',
        rule: 'required request field',
        condition: 'non-empty string array',
        evidence: 'backend/src/modules/risk-mapping/contracts/riskMapQueryContract.js:62-72',
      },
      {
        claimId: 'rmg-field-6',
        field: 'evidenceSetVersion',
        rule: 'required request field',
        condition: 'evidence set version key',
        evidence: 'backend/src/modules/risk-mapping/contracts/riskMapQueryContract.js:46-74',
      },
      {
        claimId: 'rmg-field-7',
        field: 'queryText',
        rule: 'optional request field',
        condition: 'accepted by the contract and normalized when present; not forwarded by the route handler',
        evidence:
          'backend/src/modules/risk-mapping/contracts/riskMapQueryContract.js:46-74 | backend/src/modules/risk-mapping/normalizers/normalizeRiskMapQuery.js:23-43',
      },
    ],
    'Risk Mapping request fields must keep entity lookup separate from framing detection.',
  );
  assert.deepEqual(
    viewModel.riskMappingBoundaryRows,
    [
      {
        claimId: 'rmg-boundary-1',
        boundary: 'invalid query contract',
        condition:
          'missing or malformed entity, timeHorizon, scenarioType, domain, scope, evidenceSetVersion, or optional queryText',
        effect: 'rejected with invalid_risk_map_query',
        evidence:
          'backend/src/routes/api/v1/risk-mapping.route.js:70-113 | backend/src/modules/risk-mapping/contracts/riskMapQueryContract.js:38-74',
      },
      {
        claimId: 'rmg-boundary-2',
        boundary: 'registry domain required',
        condition: 'registry routes omit domain or supply an empty domain',
        effect: 'rejected with invalid_risk_map_query',
        evidence: 'backend/src/routes/api/v1/risk-mapping.route.js:161-203',
      },
      {
        claimId: 'rmg-boundary-3',
        boundary: 'diff artifact unavailable',
        condition: 'no generated diff report is present',
        effect: 'rejected with risk_map_diff_unavailable',
        evidence: 'backend/src/routes/api/v1/risk-mapping.route.js:124-136',
      },
    ],
  );
  assert.equal(viewModel.riskMappingTrustRoute, '/risk-mapping-governance');
  assert.equal(viewModel.militaryConstraintsTrustRoute, '/military-constraints-compiler');
  assert.equal(viewModel.zeeApiTitle, 'ZeroGlare Evidence Engine API');
  assert.equal(
    viewModel.zeeApiIntro,
    'ZeroGlare Evidence Engine is exposed through a read-only ZEE scaffold and a separate zeroglare analysis route. The ZEE scaffold exposes discovery, contract, explain, and audit metadata only; the zeroglare analysis route accepts structured text input through q or input and returns bounded diagnostics.',
  );
  assert.deepEqual(
    viewModel.zeeApiEndpointRows,
    [
      {
        claimId: 'zee-api-0',
        operation: 'surface summary',
        method: 'GET',
        path: '/api/v1/zee',
        input: 'none',
        evidence: 'backend/src/routes/api/v1/zee.route.js:36-43',
      },
      {
        claimId: 'zee-api-1',
        operation: 'contract surface',
        method: 'GET',
        path: '/api/v1/zee/contract',
        input: 'none',
        evidence: 'backend/src/routes/api/v1/zee.route.js:45-53',
      },
      {
        claimId: 'zee-api-2',
        operation: 'explain surface',
        method: 'GET',
        path: '/api/v1/zee/explain',
        input: 'none',
        evidence: 'backend/src/routes/api/v1/zee.route.js:55-74',
      },
      {
        claimId: 'zee-api-3',
        operation: 'audit surface',
        method: 'GET',
        path: '/api/v1/zee/audit',
        input: 'none',
        evidence: 'backend/src/routes/api/v1/zee.route.js:76-88',
      },
    ],
    'ZEE endpoint rows must remain a separate bounded API section.',
  );
  assert.deepEqual(
    viewModel.zeroglareEndpointRows,
    [
      {
        claimId: 'zg-api-0',
        operation: 'surface summary',
        method: 'GET',
        path: '/api/v1/zeroglare',
        input: 'none',
        evidence: 'backend/src/routes/api/v1/zeroglare.route.js:56-63',
      },
      {
        claimId: 'zg-api-1',
        operation: 'analysis surface',
        method: 'GET',
        path: '/api/v1/zeroglare/analyze',
        input: 'query: q',
        evidence: 'backend/src/routes/api/v1/zeroglare.route.js:65-71',
      },
      {
        claimId: 'zg-api-2',
        operation: 'analysis surface',
        method: 'POST',
        path: '/api/v1/zeroglare/analyze',
        input: 'query: q or body: input',
        evidence: 'backend/src/routes/api/v1/zeroglare.route.js:12-22,73-79',
      },
    ],
  );
  assert.deepEqual(
    viewModel.zeroglareFieldRows,
    [
      {
        claimId: 'zg-field-1',
        field: 'q',
        rule: 'required query field for GET analyze; accepted on POST analyze',
        condition: 'must be a non-empty string',
        evidence: 'backend/src/routes/api/v1/zeroglare.route.js:12-22,65-79',
      },
      {
        claimId: 'zg-field-2',
        field: 'input',
        rule: 'required body field for POST analyze when q is absent',
        condition: 'must be a non-empty string',
        evidence: 'backend/src/routes/api/v1/zeroglare.route.js:12-22,73-79',
      },
    ],
  );
  assert.deepEqual(
    viewModel.zeroglareBoundaryRows,
    [
      {
        claimId: 'zg-boundary-1',
        boundary: 'missing analysis input',
        condition: 'q and input are both missing or empty',
        effect: 'rejected with invalid_zeroglare_input',
        evidence: 'backend/src/routes/api/v1/zeroglare.route.js:24-33,65-79',
      },
      {
        claimId: 'zg-boundary-2',
        boundary: 'oversized analysis input',
        condition: 'input exceeds 1,000,000 characters',
        effect: 'rejected with INPUT_TOO_LARGE',
        evidence: 'backend/src/routes/api/v1/zeroglare.route.js:35-40',
      },
    ],
  );
  assert.equal(viewModel.zeeApiTrustRoute, '/zeroglare-evidence-engine');

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

import { describe, expect, it } from 'vitest';

import { POLICY_SURFACE_DATA } from '../../policies/policy-surface.data';
import { buildTermsPageViewModel } from './terms-page.view-model';

describe('buildTermsPageViewModel', () => {
  it('adds a separate Risk Mapping Governance contract section without changing the core terms surface', () => {
    const viewModel = buildTermsPageViewModel(POLICY_SURFACE_DATA.terms);

    expect(viewModel.title).toBe('Current public API reference.');
    expect(viewModel.intro).toBe(
      'This page models the public API as a scoped runtime section plus separate Risk Mapping Governance, Military Constraints Compiler, and ZEE surfaces. The hero counts are scoped to the runtime section only.',
    );
    expect(viewModel.sectionGroups.map((group) => group.label)).toEqual([
      'Overview',
      'Concepts',
      'Feedback',
      'Risk Mapping Governance',
      'Military Constraints Compiler',
      'ZeroGlare Evidence Engine',
      'Support / Notes',
    ]);
    expect(viewModel.sectionGroups.map((group) => group.sections.length)).toEqual([
      1, 1, 1, 1, 1, 1, 3,
    ]);
    expect(viewModel.sectionOrder.map((section) => section.id)).toEqual([
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
    expect(viewModel.sectionOrder[0]).toMatchObject({
      id: 'overview',
      groupId: 'overview',
      groupLabel: 'Overview',
      sectionLabel: 'Overview',
      title: 'Current public API reference.',
      summary:
        'This page models the public API as a scoped runtime section plus separate Risk Mapping Governance, Military Constraints Compiler, and ZEE surfaces. The hero counts are scoped to the runtime section only.',
    });
    expect(viewModel.sectionOrder[3]).toMatchObject({
      id: 'risk-mapping-governance',
      groupId: 'risk-mapping-governance',
      groupLabel: 'Risk Mapping Governance',
      sectionLabel: 'Risk Mapping Governance API',
      title: 'Risk Mapping Governance API',
      summary:
        'Risk Mapping Governance is exposed separately as a bounded API surface. The current route set includes discovery, governance, diff, explain, resolve, and registry endpoints. The query contract accepts entity, timeHorizon, scenarioType, domain, scope, evidenceSetVersion, and optional queryText; queryText is normalized by the contract but not forwarded by the route handler.',
    });
    expect(viewModel.sectionOrder[4]).toMatchObject({
      id: 'military-constraints',
      groupId: 'military-constraints',
      groupLabel: 'Military Constraints Compiler',
      sectionLabel: 'Military Constraints Compiler API',
      title: 'Military Constraints Compiler API',
      summary:
        'Military Constraints Compiler is exposed as a deterministic admissibility surface under validated packs. It accepts structured facts only, fails closed, and returns ALLOWED, REFUSED, or REFUSED_INCOMPLETE. The current backend exposes discovery, pack catalog, pack detail, and evaluation routes only; no /schema or /examples routes are implemented.',
    });
    expect(viewModel.sectionOrder[5]).toMatchObject({
      id: 'zee-api',
      groupId: 'zee-api',
      groupLabel: 'ZeroGlare Evidence Engine',
      sectionLabel: 'ZeroGlare Evidence Engine API',
      title: 'ZeroGlare Evidence Engine API',
      summary:
        'ZeroGlare Evidence Engine is exposed through a read-only ZEE scaffold and a separate zeroglare analysis route. The ZEE scaffold exposes discovery, contract, explain, and audit metadata only; the zeroglare analysis route accepts structured text input through q or input and returns bounded diagnostics.',
    });
    expect(viewModel.badges).toEqual(
      [
        { label: 'Endpoints', value: '8 public' },
        { label: 'Field rules', value: '22 typed' },
        { label: 'Platform rules', value: '1 active' },
        { label: 'Boundaries', value: '9 mapped' },
      ],
      'Terms hero badges must be derived from typed terms truth.',
    );
    expect(viewModel.endpointRows).toEqual(
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
    expect(viewModel.riskMappingTitle).toBe('Risk Mapping Governance API');
    expect(viewModel.riskMappingTrustRoute).toBe('/risk-mapping-governance');
    expect(viewModel.riskMappingEndpointRows.map((row) => row.path)).toEqual([
      '/api/v1/risk-mapping/',
      '/api/v1/risk-mapping/governance',
      '/api/v1/risk-mapping/diff',
      '/api/v1/risk-mapping/resolve',
      '/api/v1/risk-mapping/explain',
      '/api/v1/risk-mapping/audit',
      '/api/v1/risk-mapping/registries/nodes',
      '/api/v1/risk-mapping/registries/threats',
      '/api/v1/risk-mapping/registries/compatibility',
      '/api/v1/risk-mapping/registries/falsifiers',
    ]);
    expect(viewModel.riskMappingFieldRows).toEqual([
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
    ]);
    expect(viewModel.riskMappingBoundaryRows).toEqual([
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
    ]);
    expect(viewModel.militaryConstraintsTitle).toBe('Military Constraints Compiler API');
    expect(viewModel.militaryConstraintsIntro).toBe(
      'Military Constraints Compiler is exposed as a deterministic admissibility surface under validated packs. It accepts structured facts only, fails closed, and returns ALLOWED, REFUSED, or REFUSED_INCOMPLETE. The current backend exposes discovery, pack catalog, pack detail, and evaluation routes only; no /schema or /examples routes are implemented.',
    );
    expect(viewModel.militaryConstraintsHighlights).toEqual([
      {
        label: 'Decision contract',
        value: 'ALLOWED / REFUSED / REFUSED_INCOMPLETE',
      },
      {
        label: 'Input',
        value: 'Structured facts only',
      },
      {
        label: 'Posture',
        value: 'Refusal-first',
      },
      {
        label: 'Scope',
        value: 'Validated packs only',
      },
      {
        label: 'Not',
        value: 'Prose interpreter or tactical advice',
      },
    ]);
    expect(viewModel.militaryConstraintsEndpointRows).toEqual([
      {
        claimId: 'mc-api-1',
        operation: 'surface summary',
        method: 'GET',
        path: '/api/v1/military-constraints',
        input: 'none',
        evidence: 'backend/src/routes/api/v1/military-constraints.route.js:101-107',
      },
      {
        claimId: 'mc-api-2',
        operation: 'pack catalog',
        method: 'GET',
        path: '/api/v1/military-constraints/packs',
        input: 'none',
        evidence: 'backend/src/routes/api/v1/military-constraints.route.js:110-115',
      },
      {
        claimId: 'mc-api-3',
        operation: 'pack detail',
        method: 'GET',
        path: '/api/v1/military-constraints/packs/:packId',
        input: 'route: packId',
        evidence: 'backend/src/routes/api/v1/military-constraints.route.js:118-146',
      },
      {
        claimId: 'mc-api-4',
        operation: 'evaluate surface',
        method: 'POST',
        path: '/api/v1/military-constraints/evaluate',
        input: 'body: packId, facts',
        evidence: 'backend/src/routes/api/v1/military-constraints.route.js:149-207',
      },
    ]);
    expect(viewModel.militaryConstraintsFieldRows).toEqual([
      {
        claimId: 'mc-field-1',
        field: 'packId',
        rule: 'required request field',
        condition: 'must match one of the locked v1 pack identifiers',
        evidence: 'backend/src/routes/api/v1/military-constraints.route.js:149-181',
      },
      {
        claimId: 'mc-field-2',
        field: 'facts',
        rule: 'required request field',
        condition: 'must be a plain object and must pass the military-constraints fact schema',
        evidence: 'backend/src/routes/api/v1/military-constraints.route.js:149-205',
      },
    ]);
    expect(viewModel.militaryConstraintsBoundaryRows).toEqual([
      {
        claimId: 'mc-boundary-1',
        boundary: 'missing packId or facts',
        condition: 'request body does not contain only packId and facts',
        effect: 'rejected with invalid_military_constraints_request',
        evidence: 'backend/src/routes/api/v1/military-constraints.route.js:149-176',
      },
      {
        claimId: 'mc-boundary-2',
        boundary: 'unknown packId',
        condition: 'packId does not match a locked v1 pack',
        effect: 'rejected with military_constraints_pack_not_found',
        evidence: 'backend/src/routes/api/v1/military-constraints.route.js:178-182',
      },
      {
        claimId: 'mc-boundary-3',
        boundary: 'unsupported request shape',
        condition: 'top-level request body contains extra keys or freeform prose',
        effect: 'rejected with invalid_military_constraints_request',
        evidence: 'backend/src/routes/api/v1/military-constraints.route.js:154-176',
      },
      {
        claimId: 'mc-boundary-4',
        boundary: 'malformed facts payload',
        condition: 'facts is not a plain object or does not match the fact schema',
        effect: 'rejected with invalid_military_constraints_facts',
        evidence: 'backend/src/routes/api/v1/military-constraints.route.js:164-197',
      },
      {
        claimId: 'mc-boundary-5',
        boundary: 'invalid enum values',
        condition: 'fact schema enum values do not match declared allowed values',
        effect: 'rejected with invalid_military_constraints_facts',
        evidence: 'backend/src/routes/api/v1/military-constraints.route.js:195-197 | backend/src/modules/military-constraints/military-constraint-fact.schema.json',
      },
    ]);
    expect(viewModel.militaryConstraintsTrustRoute).toBe('/military-constraints-compiler');
    expect(viewModel.zeeApiTitle).toBe('ZeroGlare Evidence Engine API');
    expect(viewModel.zeeApiIntro).toBe(
      'ZeroGlare Evidence Engine is exposed through a read-only ZEE scaffold and a separate zeroglare analysis route. The ZEE scaffold exposes discovery, contract, explain, and audit metadata only; the zeroglare analysis route accepts structured text input through q or input and returns bounded diagnostics.',
    );
    expect(viewModel.zeeApiEndpointRows).toEqual([
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
    ]);
    expect(viewModel.zeroglareEndpointRows).toEqual([
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
    ]);
    expect(viewModel.zeroglareFieldRows).toEqual([
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
    ]);
    expect(viewModel.zeroglareBoundaryRows).toEqual([
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
    ]);
    expect(viewModel.zeeApiTrustRoute).toBe('/zeroglare-evidence-engine');
    expect(viewModel.summaryLine).toBe(
      'Runtime section shows 8 public endpoints, 22 field rules, 1 platform rule, 1 runtime boundary, and 8 refusal boundaries.',
    );
  });
});

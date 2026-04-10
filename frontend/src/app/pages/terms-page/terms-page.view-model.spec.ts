import { describe, expect, it } from 'vitest';

import { POLICY_SURFACE_DATA } from '../../policies/policy-surface.data';
import { buildTermsPageViewModel } from './terms-page.view-model';

describe('buildTermsPageViewModel', () => {
  it('adds a separate Risk Mapping Governance contract section without changing the core terms surface', () => {
    const viewModel = buildTermsPageViewModel(POLICY_SURFACE_DATA.terms);

    expect(viewModel.title).toBe('Current public API reference.');
    expect(viewModel.intro).toBe(
      'This page models the public API as a scoped runtime section plus separate Risk Mapping Governance and ZEE surfaces. The hero counts are scoped to the runtime section only.',
    );
    expect(viewModel.sectionGroups.map((group) => group.label)).toEqual([
      'Overview',
      'Concepts',
      'Feedback',
      'Risk Mapping Governance',
      'Support / Notes',
    ]);
    expect(viewModel.sectionGroups.map((group) => group.sections.length)).toEqual([1, 1, 1, 1, 4]);
    expect(viewModel.sectionOrder.map((section) => section.id)).toEqual([
      'overview',
      'endpoint-contract',
      'field-contract',
      'risk-mapping-governance',
      'platform-rules',
      'runtime-boundaries',
      'refusal-boundaries',
      'zee-api',
    ]);
    expect(viewModel.sectionOrder[0]).toMatchObject({
      id: 'overview',
      groupId: 'overview',
      groupLabel: 'Overview',
      sectionLabel: 'Overview',
      title: 'Current public API reference.',
      summary:
        'This page models the public API as a scoped runtime section plus separate Risk Mapping Governance and ZEE surfaces. The hero counts are scoped to the runtime section only.',
    });
    expect(viewModel.sectionOrder[3]).toMatchObject({
      id: 'risk-mapping-governance',
      groupId: 'risk-mapping-governance',
      groupLabel: 'Risk Mapping Governance',
      sectionLabel: 'Risk Mapping Governance API',
      title: 'Risk Mapping Governance API',
      summary:
        'Risk Mapping Governance is exposed separately as a bounded API surface. The current public route resolves only entity, timeHorizon, scenarioType, domain, scope, and evidenceSetVersion. queryText is not forwarded by the route handler.',
    });
    expect(viewModel.sectionOrder[7]).toMatchObject({
      id: 'zee-api',
      groupId: 'support-notes',
      groupLabel: 'Support / Notes',
      sectionLabel: 'ZeroGlare Evidence Engine API',
      title: 'ZeroGlare Evidence Engine API',
      summary:
        'ZEE is exposed separately as a bounded read-only contract surface. These endpoints exist for inspectability and contract framing only. They do not perform live evidence analysis and are not part of ChatPDM runtime resolution.',
    });
    expect(viewModel.riskMappingTitle).toBe('Risk Mapping Governance API');
    expect(viewModel.riskMappingTrustRoute).toBe('/risk-mapping-governance');
    expect(viewModel.riskMappingEndpointRows.map((row) => row.path)).toEqual([
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
        rule: 'accepted field',
        condition: 'authoritative evidence-pack lookup key',
        evidence: 'backend/src/modules/risk-mapping/contracts/riskMapQueryContract.js',
      },
    ]);
    expect(viewModel.zeeApiTitle).toBe('ZeroGlare Evidence Engine API');
    expect(viewModel.zeeApiIntro).toBe(
      'ZEE is exposed separately as a bounded read-only contract surface. These endpoints exist for inspectability and contract framing only. They do not perform live evidence analysis and are not part of ChatPDM runtime resolution.',
    );
    expect(viewModel.zeeApiEndpointRows).toEqual([
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
    expect(viewModel.summaryLine).toBe(
      'Runtime section shows 7 public endpoints, 22 field rules, 1 platform rule, 1 runtime boundary, and 8 refusal boundaries.',
    );
  });
});

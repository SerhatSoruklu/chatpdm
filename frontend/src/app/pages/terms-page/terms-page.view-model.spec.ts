import { describe, expect, it } from 'vitest';

import { POLICY_SURFACE_DATA } from '../../policies/policy-surface.data';
import { buildTermsPageViewModel } from './terms-page.view-model';

describe('buildTermsPageViewModel', () => {
  it('adds a separate Risk Mapping Governance contract section without changing the core terms surface', () => {
    const viewModel = buildTermsPageViewModel(POLICY_SURFACE_DATA.terms);

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
      {
        claimId: 'rmg-field-2',
        field: 'queryText',
        rule: 'accepted field',
        condition: 'optional framing channel; classification only',
        evidence: 'backend/src/modules/risk-mapping/contracts/riskMapQueryContract.js',
      },
    ]);
    expect(viewModel.summaryLine).toBe(
      'Current API surface shows 2 public endpoints, 22 field rules, 1 platform rule, 1 runtime boundary, and 8 refusal boundaries.',
    );
  });
});

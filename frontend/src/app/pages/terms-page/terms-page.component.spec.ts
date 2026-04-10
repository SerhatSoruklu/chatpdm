import '@angular/compiler';

import { describe, expect, it } from 'vitest';

import { resolveActiveTermsPageSectionId } from './terms-page.component';

describe('resolveActiveTermsPageSectionId', () => {
  it('keeps the earliest section active until the next section crosses the activation offset', () => {
    expect(
      resolveActiveTermsPageSectionId(
        [
          { id: 'overview', top: 0 },
          { id: 'endpoint-contract', top: 340 },
          { id: 'field-contract', top: 760 },
        ],
        120,
      ),
    ).toBe('overview');
  });

  it('selects the last section whose top is above the activation offset', () => {
    expect(
      resolveActiveTermsPageSectionId(
        [
          { id: 'overview', top: -620 },
          { id: 'endpoint-contract', top: -140 },
          { id: 'field-contract', top: 84 },
          { id: 'risk-mapping-governance', top: 420 },
        ],
        120,
      ),
    ).toBe('field-contract');
  });

  it('returns an empty value when no section metrics are available', () => {
    expect(resolveActiveTermsPageSectionId([], 120)).toBe('');
  });
});

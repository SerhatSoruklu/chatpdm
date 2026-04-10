import { describe, expect, it } from 'vitest';

import { ZEE_PAGE_CONTENT } from './zeroglare-evidence-engine-page.model';

describe('ZEE page content', () => {
  it('describes the public surface with explicit support policy and replay manifest wording', () => {
    expect(ZEE_PAGE_CONTENT.whatItIs.title).toBe('A deterministic evidence surface with a public contract.');
    expect(ZEE_PAGE_CONTENT.whatItIs.intro).toContain('cross-kind support rule');
    expect(ZEE_PAGE_CONTENT.coreContract.cards.some((card) => card.title === 'Outcome taxonomy')).toBe(true);
    expect(ZEE_PAGE_CONTENT.coreContract.cards.some((card) => card.title === 'Replay manifest')).toBe(true);
    expect(ZEE_PAGE_CONTENT.coreContract.cards.some((card) => card.copy.includes('schema, taxonomy, support-rule, and policy versions'))).toBe(true);
    expect(ZEE_PAGE_CONTENT.boundaryFraming.closing).toContain('replay manifest');
    expect(ZEE_PAGE_CONTENT.boundaryFraming.closing).toContain('support policy');
  });
});

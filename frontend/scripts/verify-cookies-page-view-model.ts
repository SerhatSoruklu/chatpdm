import assert from 'node:assert/strict';

import { POLICY_SURFACE_DATA } from '../src/app/policies/policy-surface.data.ts';
import { buildCookiesPageViewModel } from '../src/app/pages/cookies-page/cookies-page.view-model.ts';

function main(): void {
  const viewModel = buildCookiesPageViewModel(POLICY_SURFACE_DATA.cookies);

  assert.equal(viewModel.inspectRoute, '/inspect/cookies');
  assert.deepEqual(
    viewModel.badges,
    [
      { label: 'Coverage', value: 'essential within the current configured scope' },
      { label: 'SSR relevance', value: 'direct' },
      { label: 'Mechanisms', value: 'cookie header | set-cookie header' },
      { label: 'Browser context', value: 'request origin | response target' },
    ],
    'Cookies hero badges must be driven directly from typed cookies truth.',
  );

  assert.deepEqual(
    viewModel.requestRows.map((row) => ({
      claimId: row.claimId,
      mechanism: row.mechanism,
      behavior: row.behavior,
      essentiality: row.essentiality,
      ssr: row.ssr,
      browser: row.browser,
    })),
    [
      {
        claimId: 'cookies-1',
        mechanism: 'cookie header',
        behavior: 'forwarded when present',
        essentiality: 'essential',
        ssr: 'direct SSR',
        browser: 'request origin',
      },
      {
        claimId: 'cookies-3',
        mechanism: 'cookie header',
        behavior: 'not forwarded when omitted',
        essentiality: 'essential',
        ssr: 'direct SSR',
        browser: 'request origin',
      },
    ],
    'Request transport rows must come from request-side typed cookies truth only.',
  );

  assert.deepEqual(
    viewModel.responseRows.map((row) => ({
      claimId: row.claimId,
      mechanism: row.mechanism,
      behavior: row.behavior,
      essentiality: row.essentiality,
      ssr: row.ssr,
      browser: row.browser,
    })),
    [
      {
        claimId: 'cookies-2',
        mechanism: 'set-cookie header',
        behavior: 'returned when present',
        essentiality: 'essential',
        ssr: 'direct SSR',
        browser: 'response target',
      },
      {
        claimId: 'cookies-4',
        mechanism: 'set-cookie header',
        behavior: 'not returned when omitted',
        essentiality: 'essential',
        ssr: 'direct SSR',
        browser: 'response target',
      },
    ],
    'Response transport rows must come from response-side typed cookies truth only.',
  );

  assert.deepEqual(
    viewModel.browserNotes,
    [
      'Incoming cookie header handling is modeled at the browser request origin.',
      'Upstream set-cookie handling is modeled at the browser response target.',
    ],
    'Browser notes must remain tightly constrained to direct typed browser relevance.',
  );

  console.log('PASS cookies_page_view_model');
}

main();

import assert from 'node:assert/strict';

import { POLICY_SURFACE_DATA } from '../src/app/policies/policy-surface.data.ts';

function main(): void {
  const cookiesSurface = POLICY_SURFACE_DATA.cookies;

  assert.ok(cookiesSurface.cookiesTruth, 'Expected cookiesTruth contract on the cookies surface.');
  assert.equal(
    cookiesSurface.cookiesTruth.length,
    cookiesSurface.claims.length,
    'Cookies truth facts must remain one-to-one with current cookies claims.',
  );

  assert.deepEqual(
    cookiesSurface.cookiesTruth,
    [
      {
        claimId: 'cookies-1',
        flowType: 'request_forward',
        mechanism: 'cookie_header',
        essentiality: 'essential',
        ssrRelevance: 'direct',
        browserRelevance: 'request_origin',
        transportPlacement: 'browser_to_upstream_via_ssr',
        transportRole: 'request_transport',
        browserNoteRelevance: 'direct',
        evidence: [
          {
            source: 'frontend/src/server.ts:123-135',
            path: 'frontend/src/server.ts',
            lines: '123-135',
          },
        ],
      },
      {
        claimId: 'cookies-2',
        flowType: 'response_forward',
        mechanism: 'set_cookie_header',
        essentiality: 'essential',
        ssrRelevance: 'direct',
        browserRelevance: 'response_target',
        transportPlacement: 'upstream_to_browser_via_ssr',
        transportRole: 'response_transport',
        browserNoteRelevance: 'direct',
        evidence: [
          {
            source: 'frontend/src/server.ts:129-135',
            path: 'frontend/src/server.ts',
            lines: '129-135',
          },
        ],
      },
      {
        claimId: 'cookies-3',
        flowType: 'request_omit',
        mechanism: 'cookie_header',
        essentiality: 'essential',
        ssrRelevance: 'direct',
        browserRelevance: 'request_origin',
        transportPlacement: 'browser_to_upstream_via_ssr',
        transportRole: 'request_transport',
        browserNoteRelevance: 'direct',
        evidence: [
          {
            source: 'frontend/src/server.ts:123-135',
            path: 'frontend/src/server.ts',
            lines: '123-135',
          },
        ],
      },
      {
        claimId: 'cookies-4',
        flowType: 'response_omit',
        mechanism: 'set_cookie_header',
        essentiality: 'essential',
        ssrRelevance: 'direct',
        browserRelevance: 'response_target',
        transportPlacement: 'upstream_to_browser_via_ssr',
        transportRole: 'response_transport',
        browserNoteRelevance: 'direct',
        evidence: [
          {
            source: 'frontend/src/server.ts:114-119',
            path: 'frontend/src/server.ts',
            lines: '114-119',
          },
        ],
      },
    ],
    'Cookies typed truth must remain explicit, transport-shaped, and grounded in evidence.',
  );

  assert.equal(
    POLICY_SURFACE_DATA.privacy.cookiesTruth,
    undefined,
    'Privacy surface must not gain cookies truth rows.',
  );
  assert.equal(
    POLICY_SURFACE_DATA.terms.cookiesTruth,
    undefined,
    'Terms surface must not gain cookies truth rows.',
  );

  console.log('PASS policy_cookies_truth');
}

main();

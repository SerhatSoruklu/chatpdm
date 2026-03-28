import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCookiesPageViewModel } from '../src/app/pages/cookies-page/cookies-page.view-model.ts';
import { buildTermsPageViewModel } from '../src/app/pages/terms-page/terms-page.view-model.ts';
import { POLICY_SURFACE_DATA } from '../src/app/policies/policy-surface.data.ts';

const currentDir = dirname(fileURLToPath(import.meta.url));
const appRoutesPath = join(currentDir, '../src/app/app.routes.ts');
const publicPageTypesPath = join(currentDir, '../src/app/pages/public-page/public-page.types.ts');
const seoLegalPath = join(currentDir, '../src/app/seo/registry/seo.legal.ts');

function main(): void {
  const routeSource = readFileSync(appRoutesPath, 'utf8');
  const publicPageTypesSource = readFileSync(publicPageTypesPath, 'utf8');
  const seoLegalSource = readFileSync(seoLegalPath, 'utf8');

  assertRouteIdentity(routeSource);
  assertPublicPageBoundary(publicPageTypesSource);
  assertSeoParity(seoLegalSource);
  assertSurfaceTruthIdentity();
  assertPublicInspectParity();

  console.log('PASS policy_surface_split');
}

function assertRouteIdentity(routeSource: string): void {
  assertBlock(
    routeSource,
    'privacy public route',
    /path:\s*'privacy'[\s\S]*?component:\s*PublicPageComponent[\s\S]*?pageRouteData\('privacy',\s*'legal\.privacy'\)/,
  );
  assertBlock(
    routeSource,
    'terms public route',
    /path:\s*'terms'[\s\S]*?component:\s*TermsPageComponent[\s\S]*?seoRouteData\('legal\.terms'\)/,
  );
  assertBlock(
    routeSource,
    'cookies public route',
    /path:\s*'cookies'[\s\S]*?component:\s*CookiesPageComponent[\s\S]*?seoRouteData\('legal\.cookies'\)/,
  );

  assertBlock(
    routeSource,
    'privacy inspect redirect',
    /path:\s*'privacy\/inspect'[\s\S]*?redirectTo:\s*'inspect\/privacy'/,
  );
  assertBlock(
    routeSource,
    'terms inspect redirect',
    /path:\s*'terms\/inspect'[\s\S]*?redirectTo:\s*'inspect\/terms'/,
  );
  assertBlock(
    routeSource,
    'cookies inspect redirect',
    /path:\s*'cookies\/inspect'[\s\S]*?redirectTo:\s*'inspect\/cookies'/,
  );

  assertBlock(
    routeSource,
    'privacy inspect route',
    /path:\s*'inspect\/privacy'[\s\S]*?component:\s*PolicyPageComponent[\s\S]*?policyRouteData\('privacy',\s*'legal\.privacy\.inspect'\)/,
  );
  assertBlock(
    routeSource,
    'terms inspect route',
    /path:\s*'inspect\/terms'[\s\S]*?component:\s*PolicyPageComponent[\s\S]*?policyRouteData\('terms',\s*'legal\.terms\.inspect'\)/,
  );
  assertBlock(
    routeSource,
    'cookies inspect route',
    /path:\s*'inspect\/cookies'[\s\S]*?component:\s*PolicyPageComponent[\s\S]*?policyRouteData\('cookies',\s*'legal\.cookies\.inspect'\)/,
  );
  assertBlock(
    routeSource,
    'inspect index route',
    /path:\s*'inspect'[\s\S]*?component:\s*InspectIndexPageComponent[\s\S]*?seoRouteData\('legal\.inspect'\)/,
  );
}

function assertPublicPageBoundary(publicPageTypesSource: string): void {
  assert.match(
    publicPageTypesSource,
    /\|\s*'privacy'/,
    'Public page types must still include privacy as the public human-readable route.',
  );
  assert.doesNotMatch(
    publicPageTypesSource,
    /\|\s*'terms'/,
    'Terms must not drift back into the generic public-page surface.',
  );
  assert.doesNotMatch(
    publicPageTypesSource,
    /\|\s*'cookies'/,
    'Cookies must not drift back into the generic public-page surface.',
  );
}

function assertSeoParity(seoLegalSource: string): void {
  assertBlock(
    seoLegalSource,
    'privacy SEO',
    /'legal\.privacy':\s*\{[\s\S]*?canonicalPath:\s*'\/privacy'/,
  );
  assertBlock(
    seoLegalSource,
    'terms SEO',
    /'legal\.terms':\s*\{[\s\S]*?canonicalPath:\s*'\/terms'/,
  );
  assertBlock(
    seoLegalSource,
    'cookies SEO',
    /'legal\.cookies':\s*\{[\s\S]*?canonicalPath:\s*'\/cookies'/,
  );
  assertBlock(
    seoLegalSource,
    'privacy inspect SEO',
    /'legal\.privacy\.inspect':\s*\{[\s\S]*?canonicalPath:\s*'\/inspect\/privacy'/,
  );
  assertBlock(
    seoLegalSource,
    'terms inspect SEO',
    /'legal\.terms\.inspect':\s*\{[\s\S]*?canonicalPath:\s*'\/inspect\/terms'/,
  );
  assertBlock(
    seoLegalSource,
    'cookies inspect SEO',
    /'legal\.cookies\.inspect':\s*\{[\s\S]*?canonicalPath:\s*'\/inspect\/cookies'/,
  );
}

function assertSurfaceTruthIdentity(): void {
  const { privacy, cookies, terms } = POLICY_SURFACE_DATA;

  assert.equal(privacy.route, '/inspect/privacy');
  assert.equal(cookies.route, '/inspect/cookies');
  assert.equal(terms.route, '/inspect/terms');

  assert.equal(privacy.cookiesTruth, undefined, 'Privacy must not gain cookies truth.');
  assert.equal(privacy.termsTruth, undefined, 'Privacy must not gain terms truth.');
  assert.ok(cookies.cookiesTruth && cookies.cookiesTruth.length > 0, 'Cookies truth must exist.');
  assert.equal(cookies.termsTruth, undefined, 'Cookies must not gain terms truth.');
  assert.ok(terms.termsTruth, 'Terms truth must exist.');
  assert.equal(terms.cookiesTruth, undefined, 'Terms must not gain cookies truth.');

  assert.ok(
    cookies.claims.every((claim) => claim.policyFile === 'cookies.md'),
    'Cookies surface claims must remain cookies-backed.',
  );
  assert.ok(
    terms.claims.every((claim) => claim.policyFile === 'terms.md'),
    'Terms surface claims must remain terms-backed.',
  );

  for (const fact of cookies.cookiesTruth ?? []) {
    assert.ok(
      cookies.claims.some((claim) => claim.id === fact.claimId),
      `Cookies truth fact ${fact.claimId} must reference a live cookies claim.`,
    );
  }

  const termsTruth = terms.termsTruth;

  assert.ok(termsTruth, 'Terms truth must remain available for surface validation.');

  const liveTermsClaimIds = new Set(terms.claims.map((claim) => claim.id));
  const allTermsTruthClaimIds = [
    ...termsTruth.endpointContracts.map((row) => row.claimId),
    ...termsTruth.fieldContracts.map((row) => row.claimId),
    ...termsTruth.platformRules.map((row) => row.claimId),
    ...termsTruth.runtimeBoundaries.map((row) => row.claimId),
    ...termsTruth.refusalBoundaries.map((row) => row.claimId),
  ];

  for (const claimId of allTermsTruthClaimIds) {
    assert.ok(
      liveTermsClaimIds.has(claimId),
      `Terms truth row ${claimId} must reference a live terms claim.`,
    );
  }
}

function assertPublicInspectParity(): void {
  const cookiesViewModel = buildCookiesPageViewModel(POLICY_SURFACE_DATA.cookies);
  const termsViewModel = buildTermsPageViewModel(POLICY_SURFACE_DATA.terms);

  assert.equal(
    cookiesViewModel.inspectRoute,
    POLICY_SURFACE_DATA.cookies.route,
    'Cookies public surface must link back to the canonical inspect surface.',
  );
  assert.equal(
    termsViewModel.inspectRoute,
    POLICY_SURFACE_DATA.terms.route,
    'Terms public surface must link back to the canonical inspect surface.',
  );

  assert.equal(
    cookiesViewModel.requestRows.length + cookiesViewModel.responseRows.length,
    POLICY_SURFACE_DATA.cookies.cookiesTruth?.length ?? 0,
    'Cookies public surface rows must stay in parity with typed cookies truth.',
  );

  assert.equal(
    termsViewModel.endpointRows.length,
    POLICY_SURFACE_DATA.terms.termsTruth?.endpointContracts.length ?? 0,
    'Terms endpoint rows must stay in parity with typed endpoint contracts.',
  );
  assert.equal(
    termsViewModel.requestFieldRows.length + termsViewModel.acceptedValueRows.length,
    POLICY_SURFACE_DATA.terms.termsTruth?.fieldContracts.length ?? 0,
    'Terms field rows must stay in parity with typed field contracts.',
  );
  assert.equal(
    termsViewModel.platformRuleRows.length,
    POLICY_SURFACE_DATA.terms.termsTruth?.platformRules.length ?? 0,
    'Terms platform rule rows must stay in parity with typed platform rules.',
  );
  assert.equal(
    termsViewModel.runtimeBoundaryRows.length,
    POLICY_SURFACE_DATA.terms.termsTruth?.runtimeBoundaries.length ?? 0,
    'Terms runtime boundary rows must stay in parity with typed runtime boundaries.',
  );
  assert.equal(
    termsViewModel.refusalBoundaryRows.length,
    POLICY_SURFACE_DATA.terms.termsTruth?.refusalBoundaries.length ?? 0,
    'Terms refusal boundary rows must stay in parity with typed refusal boundaries.',
  );
}

function assertBlock(source: string, label: string, pattern: RegExp): void {
  assert.match(source, pattern, `Missing or malformed ${label}.`);
}

main();

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getPublicPageContent } from '../src/app/pages/public-page/public-page.content.ts';
import { POLICY_COMPANION_DATA } from '../src/app/policies/policy-companion.data.ts';
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
    /path:\s*'terms'[\s\S]*?component:\s*PublicPageComponent[\s\S]*?pageRouteData\('terms',\s*'legal\.terms'\)/,
  );
  assertBlock(
    routeSource,
    'acceptable use public route',
    /path:\s*'acceptable-use'[\s\S]*?component:\s*PublicPageComponent[\s\S]*?pageRouteData\('acceptable-use',\s*'legal\.acceptable-use'\)/,
  );
  assertBlock(
    routeSource,
    'data retention public route',
    /path:\s*'data-retention'[\s\S]*?component:\s*PublicPageComponent[\s\S]*?pageRouteData\('data-retention',\s*'legal\.data-retention'\)/,
  );
  assertBlock(
    routeSource,
    'cookies public redirect',
    /path:\s*'cookies'[\s\S]*?redirectTo:\s*'inspect\/cookies'/,
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
    'acceptable use inspect redirect',
    /path:\s*'acceptable-use\/inspect'[\s\S]*?redirectTo:\s*'inspect\/acceptable-use'/,
  );
  assertBlock(
    routeSource,
    'data retention inspect redirect',
    /path:\s*'data-retention\/inspect'[\s\S]*?redirectTo:\s*'inspect\/data-retention'/,
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
    'acceptable use inspect route',
    /path:\s*'inspect\/acceptable-use'[\s\S]*?component:\s*PolicyCompanionPageComponent[\s\S]*?policyCompanionRouteData\('acceptable-use',\s*'legal\.acceptable-use\.inspect'\)/,
  );
  assertBlock(
    routeSource,
    'data retention inspect route',
    /path:\s*'inspect\/data-retention'[\s\S]*?component:\s*PolicyCompanionPageComponent[\s\S]*?policyCompanionRouteData\('data-retention',\s*'legal\.data-retention\.inspect'\)/,
  );
  assertBlock(
    routeSource,
    'cookies inspect route',
    /path:\s*'inspect\/cookies'[\s\S]*?component:\s*PolicyPageComponent[\s\S]*?policyRouteData\('cookies',\s*'legal\.cookies\.inspect'\)/,
  );
}

function assertPublicPageBoundary(publicPageTypesSource: string): void {
  assert.match(
    publicPageTypesSource,
    /\|\s*'privacy'/,
    'Public page types must include privacy as a readable public route.',
  );
  assert.match(
    publicPageTypesSource,
    /\|\s*'terms'/,
    'Public page types must include terms as a readable public route.',
  );
  assert.match(
    publicPageTypesSource,
    /\|\s*'acceptable-use'/,
    'Public page types must include acceptable-use as a readable public route.',
  );
  assert.match(
    publicPageTypesSource,
    /\|\s*'data-retention'/,
    'Public page types must include data-retention as a readable public route.',
  );
  assert.doesNotMatch(
    publicPageTypesSource,
    /\|\s*'cookies'/,
    'Cookies must remain inspect-canonical rather than drifting back into the generic public-page surface.',
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
    'acceptable use SEO',
    /'legal\.acceptable-use':\s*\{[\s\S]*?canonicalPath:\s*'\/acceptable-use'/,
  );
  assertBlock(
    seoLegalSource,
    'data retention SEO',
    /'legal\.data-retention':\s*\{[\s\S]*?canonicalPath:\s*'\/data-retention'/,
  );
  assertBlock(
    seoLegalSource,
    'cookies SEO',
    /'legal\.cookies':\s*\{[\s\S]*?canonicalPath:\s*'\/inspect\/cookies'/,
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
    'acceptable use inspect SEO',
    /'legal\.acceptable-use\.inspect':\s*\{[\s\S]*?canonicalPath:\s*'\/inspect\/acceptable-use'/,
  );
  assertBlock(
    seoLegalSource,
    'data retention inspect SEO',
    /'legal\.data-retention\.inspect':\s*\{[\s\S]*?canonicalPath:\s*'\/inspect\/data-retention'/,
  );
  assertBlock(
    seoLegalSource,
    'cookies inspect SEO',
    /'legal\.cookies\.inspect':\s*\{[\s\S]*?canonicalPath:\s*'\/inspect\/cookies'/,
  );
}

function assertSurfaceTruthIdentity(): void {
  const { privacy, cookies, terms } = POLICY_SURFACE_DATA;
  const acceptableUse = POLICY_COMPANION_DATA['acceptable-use'];
  const dataRetention = POLICY_COMPANION_DATA['data-retention'];

  assert.equal(privacy.route, '/inspect/privacy');
  assert.equal(cookies.route, '/inspect/cookies');
  assert.equal(terms.route, '/inspect/terms');
  assert.equal(acceptableUse.route, '/inspect/acceptable-use');
  assert.equal(dataRetention.route, '/inspect/data-retention');

  assert.equal(privacy.cookiesTruth, undefined, 'Privacy must not gain cookies truth.');
  assert.equal(privacy.termsTruth, undefined, 'Privacy must not gain terms truth.');
  assert.ok(cookies.cookiesTruth && cookies.cookiesTruth.length > 0, 'Cookies truth must exist.');
  assert.equal(cookies.termsTruth, undefined, 'Cookies must not gain terms truth.');
  assert.ok(terms.termsTruth, 'Terms truth must exist.');
  assert.equal(terms.cookiesTruth, undefined, 'Terms must not gain cookies truth.');

  assert.equal(
    acceptableUse.publicRoute,
    '/acceptable-use',
    'Acceptable use companion surface must map back to the readable public route.',
  );
  assert.equal(
    dataRetention.publicRoute,
    '/data-retention',
    'Data retention companion surface must map back to the readable public route.',
  );
  assert.ok(acceptableUse.sections.length > 0, 'Acceptable use companion surface must include inspect sections.');
  assert.ok(dataRetention.sections.length > 0, 'Data retention companion surface must include inspect sections.');
}

function assertPublicInspectParity(): void {
  const privacyContent = getPublicPageContent('privacy');
  const termsContent = getPublicPageContent('terms');
  const acceptableUseContent = getPublicPageContent('acceptable-use');
  const dataRetentionContent = getPublicPageContent('data-retention');

  assert.equal(
    privacyContent.action?.route,
    POLICY_SURFACE_DATA.privacy.route,
    'Privacy public surface must link back to the canonical inspect surface.',
  );
  assert.equal(
    termsContent.action?.route,
    POLICY_SURFACE_DATA.terms.route,
    'Terms public surface must link back to the canonical inspect surface.',
  );
  assert.equal(
    acceptableUseContent.action?.route,
    POLICY_COMPANION_DATA['acceptable-use'].route,
    'Acceptable use public surface must link back to its companion inspect surface.',
  );
  assert.equal(
    dataRetentionContent.action?.route,
    POLICY_COMPANION_DATA['data-retention'].route,
    'Data retention public surface must link back to its companion inspect surface.',
  );
}

function assertBlock(source: string, label: string, pattern: RegExp): void {
  assert.match(source, pattern, `Missing or malformed ${label}.`);
}

main();

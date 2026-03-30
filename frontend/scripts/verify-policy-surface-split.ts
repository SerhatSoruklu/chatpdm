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
const generatePolicySurfacePath = join(currentDir, './generate-policy-surface.ts');

interface PolicyRouteSpec {
  key: keyof typeof POLICY_SURFACE_DATA;
  publicPath: string;
  inspectPath: string;
  inspectSeoKey: string;
  policyFile: string;
}

const routeSpecs: readonly PolicyRouteSpec[] = [
  {
    key: 'privacy',
    publicPath: '/privacy',
    inspectPath: '/inspect/privacy',
    inspectSeoKey: 'legal.privacy.inspect',
    policyFile: 'privacy.md',
  },
  {
    key: 'data-retention',
    publicPath: '/data-retention',
    inspectPath: '/inspect/data-retention',
    inspectSeoKey: 'legal.data-retention.inspect',
    policyFile: 'data-retention.md',
  },
  {
    key: 'acceptable-use',
    publicPath: '/acceptable-use',
    inspectPath: '/inspect/acceptable-use',
    inspectSeoKey: 'legal.acceptable-use.inspect',
    policyFile: 'acceptable-use.md',
  },
  {
    key: 'terms',
    publicPath: '/terms',
    inspectPath: '/inspect/terms',
    inspectSeoKey: 'legal.terms.inspect',
    policyFile: 'terms.md',
  },
  {
    key: 'cookies',
    publicPath: '/cookies',
    inspectPath: '/inspect/cookies',
    inspectSeoKey: 'legal.cookies.inspect',
    policyFile: 'cookies.md',
  },
] as const;

function main(): void {
  const routeSource = readFileSync(appRoutesPath, 'utf8');
  const publicPageTypesSource = readFileSync(publicPageTypesPath, 'utf8');
  const seoLegalSource = readFileSync(seoLegalPath, 'utf8');
  const generatePolicySurfaceSource = readFileSync(generatePolicySurfacePath, 'utf8');

  assertRouteIdentity(routeSource);
  assertPublicPageBoundary(publicPageTypesSource);
  assertSeoParity(seoLegalSource);
  assertClaimRegistrySource(generatePolicySurfaceSource);
  assertSurfaceTruthIdentity();
  assertPublicInspectParity();

  console.log('PASS policy_surface_split');
}

function assertClaimRegistrySource(generatePolicySurfaceSource: string): void {
  assert.match(
    generatePolicySurfaceSource,
    /loadPolicyClaimRegistry/,
    'Policy surface generator must load structured claim registry data.',
  );
  assert.doesNotMatch(
    generatePolicySurfaceSource,
    /POLICY_AUDIT_PHASE_D\.md/,
    'Policy surface generator must not treat POLICY_AUDIT_PHASE_D.md as claim truth.',
  );
  assert.doesNotMatch(
    generatePolicySurfaceSource,
    /parsePhaseD|parseTraceTable/,
    'Policy surface generator must not reconstruct claims from markdown trace tables.',
  );
}

function assertRouteIdentity(routeSource: string): void {
  assertBlock(
    routeSource,
    'privacy public route',
    /path:\s*'privacy'[\s\S]*?component:\s*PublicPageComponent[\s\S]*?pageRouteData\('privacy',\s*'legal\.privacy'\)/,
  );
  assertBlock(
    routeSource,
    'data-retention public route',
    /path:\s*'data-retention'[\s\S]*?component:\s*PublicPageComponent[\s\S]*?pageRouteData\('data-retention',\s*'legal\.data-retention'\)/,
  );
  assertBlock(
    routeSource,
    'acceptable-use public route',
    /path:\s*'acceptable-use'[\s\S]*?component:\s*PublicPageComponent[\s\S]*?pageRouteData\('acceptable-use',\s*'legal\.acceptable-use'\)/,
  );
  assertBlock(
    routeSource,
    'terms public route',
    /path:\s*'terms'[\s\S]*?component:\s*PublicPageComponent[\s\S]*?pageRouteData\('terms',\s*'legal\.terms'\)/,
  );
  assertBlock(
    routeSource,
    'api public route',
    /path:\s*'api'[\s\S]*?component:\s*TermsPageComponent[\s\S]*?seoRouteData\('api\.index'\)/,
  );
  assertBlock(
    routeSource,
    'cookies public route',
    /path:\s*'cookies'[\s\S]*?component:\s*PublicPageComponent[\s\S]*?pageRouteData\('cookies',\s*'legal\.cookies'\)/,
  );

  for (const spec of routeSpecs) {
    const publicSlug = spec.publicPath.slice(1);
    const inspectSlug = spec.inspectPath.slice(1);

    assertBlock(
      routeSource,
      `${spec.key} inspect redirect`,
      new RegExp(`path:\\s*'${escapeRegExp(publicSlug)}\\/inspect'[\\s\\S]*?redirectTo:\\s*'${escapeRegExp(inspectSlug)}'`),
    );
    assertBlock(
      routeSource,
      `${spec.key} inspect route`,
      new RegExp(`path:\\s*'${escapeRegExp(inspectSlug)}'[\\s\\S]*?component:\\s*PolicyPageComponent[\\s\\S]*?policyRouteData\\('${escapeRegExp(spec.key)}',\\s*'${escapeRegExp(spec.inspectSeoKey)}'\\)`),
    );
  }
  assertBlock(
    routeSource,
    'inspect index route',
    /path:\s*'inspect'[\s\S]*?component:\s*InspectIndexPageComponent[\s\S]*?seoRouteData\('legal\.inspect'\)/,
  );
}

function assertPublicPageBoundary(publicPageTypesSource: string): void {
  assert.match(
    publicPageTypesSource,
    /\|\s*'terms'/,
    'Public page types must include terms as the public human-readable route.',
  );
  assert.match(
    publicPageTypesSource,
    /\|\s*'cookies'/,
    'Public page types must include cookies as the public human-readable route.',
  );
  assert.match(
    publicPageTypesSource,
    /\|\s*'privacy'/,
    'Public page types must still include privacy as the public human-readable route.',
  );
  assert.doesNotMatch(
    publicPageTypesSource,
    /\|\s*'api'/,
    'API must not drift back into the generic public-page surface.',
  );
  assert.match(
    publicPageTypesSource,
    /\|\s*'data-retention'/,
    'Public page types must include data-retention as the public human-readable route.',
  );
  assert.match(
    publicPageTypesSource,
    /\|\s*'acceptable-use'/,
    'Public page types must include acceptable-use as the public human-readable route.',
  );
}

function assertSeoParity(seoLegalSource: string): void {
  for (const spec of routeSpecs) {
    assertBlock(
      seoLegalSource,
      `${spec.key} SEO`,
      new RegExp(`'${escapeRegExp(spec.inspectSeoKey.replace(/\.inspect$/, ''))}':\\s*\\{[\\s\\S]*?canonicalPath:\\s*'${escapeRegExp(spec.publicPath)}'`),
    );
    assertBlock(
      seoLegalSource,
      `${spec.key} inspect SEO`,
      new RegExp(`'${escapeRegExp(spec.inspectSeoKey)}':\\s*\\{[\\s\\S]*?canonicalPath:\\s*'${escapeRegExp(spec.inspectPath)}'`),
    );
  }
}

function assertSurfaceTruthIdentity(): void {
  for (const spec of routeSpecs) {
    const surface = POLICY_SURFACE_DATA[spec.key];
    assert.equal(surface.route, spec.inspectPath);
    assert.ok(
      surface.claims.every((claim) => claim.policyFile === spec.policyFile),
      `${spec.key} surface claims must remain ${spec.policyFile}-backed.`,
    );
    assert.ok(
      surface.claims.every((claim) => claim.state === 'published'),
      `${spec.key} surface claims must remain published registry claims only.`,
    );
    assert.ok(
      surface.claims.every((claim) => Number.isInteger(claim.version) && claim.version > 0),
      `${spec.key} surface claims must carry explicit positive integer versions.`,
    );
  }

  const { privacy, 'data-retention': dataRetention, 'acceptable-use': acceptableUse, cookies, terms } =
    POLICY_SURFACE_DATA;

  assert.equal(privacy.cookiesTruth, undefined, 'Privacy must not gain cookies truth.');
  assert.equal(privacy.termsTruth, undefined, 'Privacy must not gain terms truth.');
  assert.equal(dataRetention.cookiesTruth, undefined, 'Data-retention must not gain cookies truth.');
  assert.equal(dataRetention.termsTruth, undefined, 'Data-retention must not gain terms truth.');
  assert.equal(acceptableUse.cookiesTruth, undefined, 'Acceptable-use must not gain cookies truth.');
  assert.equal(acceptableUse.termsTruth, undefined, 'Acceptable-use must not gain terms truth.');
  assert.ok(cookies.cookiesTruth && cookies.cookiesTruth.length > 0, 'Cookies truth must exist.');
  assert.equal(cookies.termsTruth, undefined, 'Cookies must not gain terms truth.');
  assert.ok(terms.termsTruth, 'Terms truth must exist.');
  assert.equal(terms.cookiesTruth, undefined, 'Terms must not gain cookies truth.');

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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

main();

import { Routes } from '@angular/router';
import { AboutPageComponent } from './pages/about-page/about-page.component';
import { ControlledComparisonsPageComponent } from './pages/controlled-comparisons-page/controlled-comparisons-page.component';
import { HowItWorksPageComponent } from './pages/how-it-works-page/how-it-works-page.component';
import { InspectIndexPageComponent } from './pages/inspect-index-page/inspect-index-page.component';
import { LandingPageComponent } from './pages/landing/landing-page.component';
import { LiveConceptsPageComponent } from './pages/live-concepts-page/live-concepts-page.component';
import { RiskMappingGovernancePageComponent } from './pages/risk-mapping-governance-page/risk-mapping-governance-page.component';
import { PolicyPageComponent } from './pages/policy-page/policy-page.component';
import { PublicPageComponent } from './pages/public-page/public-page.component';
import { ZeroglareEvidenceEnginePageComponent } from './pages/zeroglare-evidence-engine-page/zeroglare-evidence-engine-page.component';
import { ZEE_ROUTE_SEGMENT, ZEE_SEO_KEY } from './pages/zeroglare-evidence-engine-page/zeroglare-evidence-engine-page.constants';
import { ZeroglareComponent } from './zeroglare/zeroglare.component';
import { ReasoningStructurePageComponent } from './pages/reasoning-structure-page/reasoning-structure-page.component';
import { ResolutionContractPageComponent } from './pages/resolution-contract-page/resolution-contract-page.component';
import { RuntimePageComponent } from './pages/runtime-page/runtime-page.component';
import { TermsPageComponent } from './pages/terms-page/terms-page.component';
import { VersionPolicyPageComponent } from './pages/version-policy-page/version-policy-page.component';
import { VisionPageComponent } from './pages/vision-page/vision-page.component';
import { VocabularyPageComponent } from './pages/vocabulary-page/vocabulary-page.component';
import { vocabularyBoundaryResolver } from './core/vocabulary/vocabulary-boundary.resolver';
import type { PolicySurfaceKey } from './policies/policy-surface.types';
import { type SeoRegistryKey, seoRouteData } from './seo/seo.registry';

function pageRouteData(pageKey: string, seoKey: SeoRegistryKey) {
  return {
    pageKey,
    ...seoRouteData(seoKey),
  };
}

function policyRouteData(policyKey: PolicySurfaceKey, seoKey: SeoRegistryKey) {
  return {
    policyKey,
    ...seoRouteData(seoKey),
  };
}

export const routes: Routes = [
  {
    path: '',
    component: LandingPageComponent,
    data: seoRouteData('static.home'),
    resolve: {
      vocabularyBoundary: vocabularyBoundaryResolver,
    },
  },
  {
    path: 'about',
    component: AboutPageComponent,
    data: seoRouteData('static.about'),
  },
  {
    path: 'what-is-chatpdm',
    component: PublicPageComponent,
    data: pageRouteData('what-is-chatpdm', 'static.what-is-chatpdm'),
  },
  {
    path: 'zeroglare',
    component: ZeroglareComponent,
    data: seoRouteData('static.zeroglare'),
  },
  {
    path: ZEE_ROUTE_SEGMENT,
    component: ZeroglareEvidenceEnginePageComponent,
    data: seoRouteData(ZEE_SEO_KEY),
  },
  {
    path: 'runtime',
    component: RuntimePageComponent,
    data: seoRouteData('static.runtime'),
  },
  {
    path: 'live-concepts',
    component: LiveConceptsPageComponent,
    data: seoRouteData('static.live-concepts'),
  },
  {
    path: 'controlled-comparisons',
    component: ControlledComparisonsPageComponent,
    data: seoRouteData('static.controlled-comparisons'),
  },
  {
    path: 'how-it-works',
    component: HowItWorksPageComponent,
    data: seoRouteData('static.how-it-works'),
  },
  {
    path: 'risk-mapping-governance',
    component: RiskMappingGovernancePageComponent,
    data: seoRouteData('static.risk-mapping-governance'),
  },
  {
    path: 'vision',
    component: VisionPageComponent,
    data: seoRouteData('static.vision'),
  },
  {
    path: 'reasoning-structure',
    component: ReasoningStructurePageComponent,
    data: seoRouteData('static.reasoning-structure'),
  },
  {
    path: 'faq',
    component: PublicPageComponent,
    data: pageRouteData('faq', 'faq.index'),
  },
  {
    path: 'contact',
    component: PublicPageComponent,
    data: pageRouteData('contact', 'static.contact'),
  },
  {
    path: 'privacy',
    component: PublicPageComponent,
    data: pageRouteData('privacy', 'legal.privacy'),
  },
  {
    path: 'data-retention',
    component: PublicPageComponent,
    data: pageRouteData('data-retention', 'legal.data-retention'),
  },
  {
    path: 'acceptable-use',
    component: PublicPageComponent,
    data: pageRouteData('acceptable-use', 'legal.acceptable-use'),
  },
  {
    path: 'privacy/inspect',
    redirectTo: 'inspect/privacy',
    pathMatch: 'full',
  },
  {
    path: 'data-retention/inspect',
    redirectTo: 'inspect/data-retention',
    pathMatch: 'full',
  },
  {
    path: 'acceptable-use/inspect',
    redirectTo: 'inspect/acceptable-use',
    pathMatch: 'full',
  },
  {
    path: 'terms',
    component: PublicPageComponent,
    data: pageRouteData('terms', 'legal.terms'),
  },
  {
    path: 'terms/inspect',
    redirectTo: 'inspect/terms',
    pathMatch: 'full',
  },
  {
    path: 'cookies',
    component: PublicPageComponent,
    data: pageRouteData('cookies', 'legal.cookies'),
  },
  {
    path: 'cookies/inspect',
    redirectTo: 'inspect/cookies',
    pathMatch: 'full',
  },
  {
    path: 'inspect/privacy',
    component: PolicyPageComponent,
    data: policyRouteData('privacy', 'legal.privacy.inspect'),
  },
  {
    path: 'inspect/data-retention',
    component: PolicyPageComponent,
    data: policyRouteData('data-retention', 'legal.data-retention.inspect'),
  },
  {
    path: 'inspect/acceptable-use',
    component: PolicyPageComponent,
    data: policyRouteData('acceptable-use', 'legal.acceptable-use.inspect'),
  },
  {
    path: 'inspect/terms',
    component: PolicyPageComponent,
    data: policyRouteData('terms', 'legal.terms.inspect'),
  },
  {
    path: 'inspect/cookies',
    component: PolicyPageComponent,
    data: policyRouteData('cookies', 'legal.cookies.inspect'),
  },
  {
    path: 'inspect',
    component: InspectIndexPageComponent,
    data: seoRouteData('legal.inspect'),
  },
  {
    path: 'docs',
    component: PublicPageComponent,
    data: pageRouteData('docs', 'docs.index'),
  },
  {
    path: 'scope-model',
    component: PublicPageComponent,
    data: pageRouteData('scope-model', 'docs.scope-model'),
  },
  {
    path: 'developers',
    component: PublicPageComponent,
    data: pageRouteData('developers', 'developer.index'),
  },
  {
    path: 'version-policy',
    component: VersionPolicyPageComponent,
    data: seoRouteData('docs.version-policy'),
  },
  {
    path: 'handbooks',
    component: PublicPageComponent,
    data: pageRouteData('handbooks', 'handbooks.index'),
  },
  {
    path: 'handbooks/concept-authoring',
    component: PublicPageComponent,
    data: pageRouteData('handbooks-concept-authoring', 'handbooks.concept-authoring'),
  },
  {
    path: 'handbooks/review-admission',
    component: PublicPageComponent,
    data: pageRouteData('handbooks-review-admission', 'handbooks.review-admission'),
  },
  {
    path: 'handbooks/source-usage',
    component: PublicPageComponent,
    data: pageRouteData('handbooks-source-usage', 'handbooks.source-usage'),
  },
  {
    path: 'handbooks/rejection-handling',
    component: PublicPageComponent,
    data: pageRouteData('handbooks-rejection-handling', 'handbooks.rejection-handling'),
  },
  {
    path: 'handbooks/comparison-authoring',
    component: PublicPageComponent,
    data: pageRouteData('handbooks-comparison-authoring', 'handbooks.comparison-authoring'),
  },
  {
    path: 'handbooks/runtime-discipline',
    component: PublicPageComponent,
    data: pageRouteData('handbooks-runtime-discipline', 'handbooks.runtime-discipline'),
  },
  {
    path: 'source-model',
    component: PublicPageComponent,
    data: pageRouteData('source-model', 'docs.source-model'),
  },
  {
    path: 'api',
    component: TermsPageComponent,
    data: seoRouteData('api.index'),
  },
  {
    path: 'resolution-contract',
    component: ResolutionContractPageComponent,
    data: seoRouteData('docs.resolution-contract'),
  },
  {
    path: 'vocabulary',
    component: VocabularyPageComponent,
    data: seoRouteData('docs.vocabulary-boundary'),
    resolve: {
      vocabularyBoundary: vocabularyBoundaryResolver,
    },
  },
  {
    path: '**',
    component: PublicPageComponent,
    data: pageRouteData('not-found', 'not-found.default'),
  },
];

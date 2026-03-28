import { Routes } from '@angular/router';
import { InspectIndexPageComponent } from './pages/inspect-index-page/inspect-index-page.component';
import { LandingPageComponent } from './pages/landing/landing-page.component';
import { PolicyPageComponent } from './pages/policy-page/policy-page.component';
import { PublicPageComponent } from './pages/public-page/public-page.component';
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
  },
  {
    path: 'about',
    component: PublicPageComponent,
    data: pageRouteData('about', 'static.about'),
  },
  {
    path: 'how-it-works',
    component: PublicPageComponent,
    data: pageRouteData('how-it-works', 'static.how-it-works'),
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
    path: 'privacy/inspect',
    redirectTo: 'inspect/privacy',
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
    path: 'developers',
    component: PublicPageComponent,
    data: pageRouteData('developers', 'developer.index'),
  },
  {
    path: 'handbooks',
    component: PublicPageComponent,
    data: pageRouteData('handbooks', 'handbooks.index'),
  },
  {
    path: 'api',
    component: PublicPageComponent,
    data: pageRouteData('api', 'api.index'),
  },
  {
    path: '**',
    component: PublicPageComponent,
    data: pageRouteData('not-found', 'not-found.default'),
  },
];

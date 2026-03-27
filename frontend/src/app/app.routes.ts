import { Routes } from '@angular/router';
import { LandingPageComponent } from './pages/landing/landing-page.component';
import { seoRouteData } from './seo/seo.registry';

export const routes: Routes = [
  {
    path: '',
    component: LandingPageComponent,
    data: seoRouteData('static.home'),
  },
];

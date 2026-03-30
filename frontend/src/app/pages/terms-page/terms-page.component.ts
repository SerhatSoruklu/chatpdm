import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SITE_LEGAL_EMAIL } from '../../core/layout/site-navigation.data';
import { POLICY_SURFACE_DATA } from '../../policies/policy-surface.data';
import { buildTermsPageViewModel } from './terms-page.view-model';

@Component({
  selector: 'app-terms-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './terms-page.component.html',
  styleUrl: './terms-page.component.css',
})
export class TermsPageComponent {
  protected readonly legalEmail = SITE_LEGAL_EMAIL;
  protected readonly viewModel = computed(() => buildTermsPageViewModel(POLICY_SURFACE_DATA.terms));
}

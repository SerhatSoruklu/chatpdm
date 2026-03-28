import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';

import { POLICY_SURFACE_DATA } from '../../policies/policy-surface.data';
import { buildCookiesPageViewModel } from './cookies-page.view-model';

@Component({
  selector: 'app-cookies-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cookies-page.component.html',
  styleUrl: './cookies-page.component.css',
})
export class CookiesPageComponent {
  protected readonly viewModel = computed(() => buildCookiesPageViewModel(POLICY_SURFACE_DATA.cookies));
}

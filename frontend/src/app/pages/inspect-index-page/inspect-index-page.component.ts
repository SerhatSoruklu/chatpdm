import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { POLICY_SURFACE_DATA } from '../../policies/policy-surface.data';
import { buildInspectIndexPageViewModel } from './inspect-index-page.view-model';

@Component({
  selector: 'app-inspect-index-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './inspect-index-page.component.html',
  styleUrl: './inspect-index-page.component.css',
})
export class InspectIndexPageComponent {
  protected readonly viewModel = computed(() => buildInspectIndexPageViewModel(POLICY_SURFACE_DATA));
}

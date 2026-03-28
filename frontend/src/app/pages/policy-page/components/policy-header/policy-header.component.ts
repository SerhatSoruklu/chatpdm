import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';

import { formatPolicyClaimClass } from '../../../../policies/policy-inline-code.util';
import type { PolicySurfaceDefinition } from '../../../../policies/policy-surface.types';

interface HeaderStat {
  label: string;
  value: string;
  detail: string;
}

@Component({
  selector: 'app-policy-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './policy-header.component.html',
  styleUrl: './policy-header.component.css',
})
export class PolicyHeaderComponent {
  readonly surface = input.required<PolicySurfaceDefinition>();

  protected readonly stats = computed<HeaderStat[]>(() => {
    const surface = this.surface();
    const stats: HeaderStat[] = [
      {
        label: 'Total claims',
        value: String(surface.summary.totalClaims),
        detail: 'current rendered claim units',
      },
      {
        label: 'Mapped claims',
        value: String(surface.summary.mappedClaims),
        detail: 'traceable to implementation',
      },
      {
        label: 'Claim classes',
        value: String(surface.summary.claimClasses.length),
        detail: surface.summary.claimClasses.map((claimClass) => formatPolicyClaimClass(claimClass)).join(' | '),
      },
    ];

    if (surface.summary.internalTransportNoteCount > 0) {
      stats.push({
        label: 'Internal transport notes',
        value: String(surface.summary.internalTransportNoteCount),
        detail: 'SSR transport only',
      });
    }

    return stats;
  });
}

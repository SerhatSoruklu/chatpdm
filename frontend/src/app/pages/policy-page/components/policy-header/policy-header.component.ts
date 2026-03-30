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
  readonly visibleClaimCount = input(0);
  readonly visibleMappedClaimCount = input(0);
  readonly visibleInternalTransportCount = input(0);
  readonly activeSearch = input('');
  readonly activeClaimId = input('');

  protected readonly stats = computed<HeaderStat[]>(() => {
    const surface = this.surface();
    const mappedCoverage = surface.summary.totalClaims > 0
      ? Math.round((surface.summary.mappedClaims / surface.summary.totalClaims) * 100)
      : 0;
    const stats: HeaderStat[] = [
      {
        label: 'Mapped coverage',
        value: `${mappedCoverage}%`,
        detail: `${surface.summary.mappedClaims} of ${surface.summary.totalClaims} claims mapped to implementation`,
      },
      {
        label: 'Visible now',
        value: String(this.visibleClaimCount()),
        detail: this.visibleDetail(),
      },
      {
        label: 'Claim classes',
        value: String(surface.summary.claimClasses.length),
        detail: surface.summary.claimClasses.map((claimClass) => formatPolicyClaimClass(claimClass)).join(' | '),
      },
    ];

    if (surface.summary.internalTransportNoteCount > 0) {
      stats.push({
        label: 'Internal SSR notes',
        value: String(this.visibleInternalTransportCount()),
        detail: `${surface.summary.internalTransportNoteCount} annotated claims in this surface`,
      });
    }

    if (this.visibleMappedClaimCount() !== this.visibleClaimCount()) {
      stats.push({
        label: 'Visible mapped',
        value: String(this.visibleMappedClaimCount()),
        detail: 'current filtered slice traceable to implementation',
      });
    }

    return stats;
  });

  protected readonly inspectFocus = computed(() => {
    const fragments = [];
    const search = this.activeSearch().trim();
    const claimId = this.activeClaimId().trim();

    if (search) {
      fragments.push(`query "${search}"`);
    }

    if (claimId) {
      fragments.push(`claim ${claimId}`);
    }

    return fragments.join(' · ');
  });

  private visibleDetail(): string {
    if (this.activeClaimId().trim()) {
      return `inspect focus: ${this.activeClaimId().trim()}`;
    }

    if (this.activeSearch().trim()) {
      return `filtered by search query "${this.activeSearch().trim()}"`;
    }

    return 'claims visible in the current inspect slice';
  }
}

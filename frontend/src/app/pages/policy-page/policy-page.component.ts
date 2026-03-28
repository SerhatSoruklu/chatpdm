import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { POLICY_SURFACE_DATA } from '../../policies/policy-surface.data';
import type { PolicyClaim, PolicySurfaceDefinition, PolicySurfaceKey } from '../../policies/policy-surface.types';
import { PolicyClaimListComponent } from './components/policy-claim-list/policy-claim-list.component';
import { PolicyFilterBarComponent } from './components/policy-filter-bar/policy-filter-bar.component';
import { PolicyHeaderComponent } from './components/policy-header/policy-header.component';

@Component({
  selector: 'app-policy-page',
  standalone: true,
  imports: [
    CommonModule,
    PolicyHeaderComponent,
    PolicyFilterBarComponent,
    PolicyClaimListComponent,
  ],
  templateUrl: './policy-page.component.html',
  styleUrl: './policy-page.component.css',
})
export class PolicyPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly routeData = toSignal(this.route.data, {
    initialValue: this.route.snapshot.data,
  });

  protected readonly searchQuery = signal('');
  protected readonly activeClaimClass = signal('');
  protected readonly activeSection = signal('');
  protected readonly internalTransportOnly = signal(false);

  protected readonly surface = computed<PolicySurfaceDefinition>(() => {
    const policyKey = this.routeData()['policyKey'] as PolicySurfaceKey;
    return POLICY_SURFACE_DATA[policyKey];
  });

  protected readonly claimClasses = computed(() => this.surface().summary.claimClasses);
  protected readonly sections = computed(() =>
    Array.from(new Set(this.surface().claims.map((claim) => claim.section))),
  );

  protected readonly filteredClaims = computed(() => {
    const surface = this.surface();
    const query = this.searchQuery().trim().toLowerCase();

    return surface.claims.filter((claim) => this.matchesClaim(claim, query));
  });

  protected updateSearch(value: string): void {
    this.searchQuery.set(value);
  }

  protected updateClaimClass(value: string): void {
    this.activeClaimClass.set(value);
  }

  protected updateSection(value: string): void {
    this.activeSection.set(value);
  }

  protected updateInternalTransportOnly(value: boolean): void {
    this.internalTransportOnly.set(value);
  }

  protected clearFilters(): void {
    this.searchQuery.set('');
    this.activeClaimClass.set('');
    this.activeSection.set('');
    this.internalTransportOnly.set(false);
  }

  private matchesClaim(claim: PolicyClaim, query: string): boolean {
    if (this.activeClaimClass() && claim.claimClass !== this.activeClaimClass()) {
      return false;
    }

    if (this.activeSection() && claim.section !== this.activeSection()) {
      return false;
    }

    if (this.internalTransportOnly() && !claim.hasInternalTransportNote) {
      return false;
    }

    if (!query) {
      return true;
    }

    const searchableFields = [
      claim.policySentence,
      claim.canonicalClaim,
      claim.section,
      claim.claimClass,
      claim.notes,
      claim.systemMapping,
      ...claim.traces.map((trace) => trace.path),
      ...claim.specialNotes,
    ];

    return searchableFields.some((field) => field.toLowerCase().includes(query));
  }
}

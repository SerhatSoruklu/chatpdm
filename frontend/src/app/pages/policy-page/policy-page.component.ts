import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { formatPolicyClaimClass } from '../../policies/policy-inline-code.util';
import { POLICY_SURFACE_DATA } from '../../policies/policy-surface.data';
import type { PolicyClaim, PolicySurfaceDefinition, PolicySurfaceKey } from '../../policies/policy-surface.types';
import { PolicyClaimListComponent } from './components/policy-claim-list/policy-claim-list.component';
import {
  PolicyFilterBarComponent,
  type PolicyFilterOption,
} from './components/policy-filter-bar/policy-filter-bar.component';
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
  private readonly document = inject(DOCUMENT);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly routeData = toSignal(this.route.data, {
    initialValue: this.route.snapshot.data,
  });
  private readonly routeQueryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  private lastFocusedClaimId = '';

  protected readonly searchQuery = signal('');
  protected readonly activeClaimClass = signal('');
  protected readonly activeSection = signal('');
  protected readonly internalTransportOnly = signal(false);
  protected readonly activeClaimId = signal('');

  protected readonly surface = computed<PolicySurfaceDefinition>(() => {
    const policyKey = this.routeData()['policyKey'] as PolicySurfaceKey;
    return POLICY_SURFACE_DATA[policyKey];
  });

  protected readonly claimClassOptions = computed<PolicyFilterOption[]>(() => {
    const counts = new Map<string, number>();

    this.surface().claims.forEach((claim) => {
      counts.set(claim.claimClass, (counts.get(claim.claimClass) || 0) + 1);
    });

    return [...counts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([value, count]) => ({
        value,
        label: formatPolicyClaimClass(value),
        count,
      }));
  });

  protected readonly sectionOptions = computed<PolicyFilterOption[]>(() => {
    const counts = new Map<string, number>();

    this.surface().claims.forEach((claim) => {
      counts.set(claim.section, (counts.get(claim.section) || 0) + 1);
    });

    return [...counts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([value, count]) => ({
        value,
        label: value,
        count,
      }));
  });

  protected readonly filteredClaims = computed(() => {
    const surface = this.surface();
    const query = this.searchQuery().trim().toLowerCase();
    const activeClaimId = this.activeClaimId();
    const matchingClaims = surface.claims.filter(
      (claim) => claim.id === activeClaimId || this.matchesClaim(claim, query),
    );

    if (!activeClaimId) {
      return matchingClaims;
    }

    const selectedClaim = matchingClaims.find((claim) => claim.id === activeClaimId);

    if (!selectedClaim) {
      return matchingClaims;
    }

    return [
      selectedClaim,
      ...matchingClaims.filter((claim) => claim.id !== activeClaimId),
    ];
  });

  protected readonly visibleMappedClaimCount = computed(() =>
    this.filteredClaims().filter((claim) => claim.status === 'mapped').length,
  );

  protected readonly visibleInternalTransportCount = computed(() =>
    this.filteredClaims().filter((claim) => claim.hasInternalTransportNote).length,
  );

  constructor() {
    effect(() => {
      const queryParams = this.routeQueryParams();
      const claimId = queryParams.get('claim') ?? '';

      this.searchQuery.set(queryParams.get('q') ?? '');
      this.activeClaimClass.set(queryParams.get('claimClass') ?? '');
      this.activeSection.set(queryParams.get('section') ?? '');
      this.internalTransportOnly.set(queryParams.get('internal') === '1');
      this.activeClaimId.set(claimId);

      if (claimId && claimId !== this.lastFocusedClaimId) {
        this.lastFocusedClaimId = claimId;
        this.focusClaim(claimId);
      }

      if (!claimId) {
        this.lastFocusedClaimId = '';
      }
    });
  }

  protected updateSearch(value: string): void {
    this.searchQuery.set(value);
    this.syncQueryParams();
  }

  protected updateClaimClass(value: string): void {
    this.activeClaimClass.set(value);
    this.syncQueryParams();
  }

  protected updateSection(value: string): void {
    this.activeSection.set(value);
    this.syncQueryParams();
  }

  protected updateInternalTransportOnly(value: boolean): void {
    this.internalTransportOnly.set(value);
    this.syncQueryParams();
  }

  protected clearFilters(): void {
    this.searchQuery.set('');
    this.activeClaimClass.set('');
    this.activeSection.set('');
    this.internalTransportOnly.set(false);
    this.activeClaimId.set('');
    this.syncQueryParams();
  }

  protected toggleInspectClaim(claimId: string): void {
    const nextClaimId = this.activeClaimId() === claimId ? '' : claimId;

    this.activeClaimId.set(nextClaimId);
    this.syncQueryParams();

    if (nextClaimId) {
      this.focusClaim(nextClaimId);
    }
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
      claim.id,
      claim.policySentence,
      claim.canonicalClaim,
      claim.section,
      claim.claimClass,
      claim.notes,
      claim.systemMapping,
      claim.status,
      claim.policyFile,
      claim.lifecycle.lifecycleClass,
      ...claim.traces.map((trace) => trace.path),
      ...claim.traces.map((trace) => trace.source),
      ...claim.specialNotes,
    ];

    return searchableFields.some((field) => field.toLowerCase().includes(query));
  }

  private syncQueryParams(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: this.searchQuery().trim() || null,
        claimClass: this.activeClaimClass().trim() || null,
        section: this.activeSection().trim() || null,
        internal: this.internalTransportOnly() ? '1' : null,
        claim: this.activeClaimId().trim() || null,
      },
      replaceUrl: true,
    });
  }

  private focusClaim(claimId: string): void {
    if (!this.document) {
      return;
    }

    setTimeout(() => {
      const element = this.document.getElementById(`pdm-policy-claim-${claimId}`) as HTMLElement | null;

      if (!element) {
        return;
      }

      element.scrollIntoView({
        block: 'start',
        behavior: 'smooth',
      });
      element.focus({
        preventScroll: true,
      });
    }, 0);
  }
}

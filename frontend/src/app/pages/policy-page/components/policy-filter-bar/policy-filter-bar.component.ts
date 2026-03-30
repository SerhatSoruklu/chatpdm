import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';

export interface PolicyFilterOption {
  value: string;
  label: string;
  count: number;
}

@Component({
  selector: 'app-policy-filter-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './policy-filter-bar.component.html',
  styleUrl: './policy-filter-bar.component.css',
})
export class PolicyFilterBarComponent {
  readonly search = input('');
  readonly activeClaimClass = input('');
  readonly activeSection = input('');
  readonly internalTransportOnly = input(false);
  readonly activeClaimId = input('');
  readonly claimClassOptions = input<readonly PolicyFilterOption[]>([]);
  readonly sectionOptions = input<readonly PolicyFilterOption[]>([]);
  readonly visibleClaimCount = input(0);
  readonly visibleMappedClaimCount = input(0);
  readonly visibleInternalTransportCount = input(0);
  readonly totalClaimCount = input(0);

  readonly searchChange = output<string>();
  readonly claimClassChange = output<string>();
  readonly sectionChange = output<string>();
  readonly internalTransportChange = output<boolean>();
  readonly clearFilters = output<void>();

  protected onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchChange.emit(target.value);
  }

  protected onClaimClassInput(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.claimClassChange.emit(target.value);
  }

  protected onSectionInput(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.sectionChange.emit(target.value);
  }

  protected onInternalToggle(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.internalTransportChange.emit(target.checked);
  }

  protected hasActiveFilters(): boolean {
    return Boolean(
      this.search().trim() ||
        this.activeClaimClass().trim() ||
        this.activeSection().trim() ||
        this.internalTransportOnly() ||
        this.activeClaimId().trim(),
    );
  }

  protected toggleClaimClass(value: string): void {
    this.claimClassChange.emit(this.activeClaimClass() === value ? '' : value);
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { VOCABULARY_PANEL_WARNING_TEXT } from '../../core/concepts/vocabulary-panel/vocabulary-panel.model';
import { PdmDropdownComponent } from '../../core/ui/dropdown/pdm-dropdown.component';
import { PdmProductEventsService } from '../../core/telemetry/pdm-product-events.service';
import type {
  VocabularyBoundaryBuckets,
  VocabularyBoundaryEntry,
  VocabularyBoundaryResolvedState,
} from '../../core/vocabulary/vocabulary-boundary.types';
import {
  buildVocabularyRegistryFilterOptions,
  buildVocabularyRegistryItems,
  buildVocabularyRegistryPageTokens,
  clampVocabularyRegistryPage,
  filterVocabularyRegistryEntries,
  formatVocabularyRegistryTerm,
  paginateVocabularyRegistryEntries,
  VOCABULARY_BOUNDARY_LIST_NOTE,
  VOCABULARY_BUCKET_LABELS,
  VOCABULARY_REGISTRY_PAGE_SIZE_DEFAULT,
  VOCABULARY_REGISTRY_PAGE_SIZE_OPTIONS,
  type VocabularyRegistryPageSize,
  type VocabularyRegistryFilterKey,
  type VocabularyRegistryFilterOption,
  type VocabularyRegistryPageToken,
  type VocabularyRegistryItem,
} from './vocabulary-page.model';

interface VocabularyBucketRow {
  readonly key: keyof VocabularyBoundaryBuckets;
  readonly label: string;
  readonly count: number;
}

@Component({
  selector: 'app-vocabulary-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PdmDropdownComponent],
  templateUrl: './vocabulary-page.component.html',
  styleUrl: './vocabulary-page.component.css',
})
export class VocabularyPageComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly routeData = toSignal(this.route.data, {
    initialValue: this.route.snapshot.data,
  });
  private readonly productEvents = inject(PdmProductEventsService);
  private readonly countFormatter = new Intl.NumberFormat('en-US');
  private searchTelemetryTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly warningText = VOCABULARY_PANEL_WARNING_TEXT;
  protected readonly listNote = VOCABULARY_BOUNDARY_LIST_NOTE;
  protected readonly searchQuery = signal('');
  protected readonly selectedCategoryFilter = signal<VocabularyRegistryFilterKey>('all');
  protected readonly currentPage = signal(1);
  protected readonly pageSize = signal(VOCABULARY_REGISTRY_PAGE_SIZE_DEFAULT);
  protected readonly boundaryState = computed(() => (
    this.routeData()['vocabularyBoundary'] as VocabularyBoundaryResolvedState | undefined
  ) ?? {
    status: 'error',
    data: null,
    errorMessage: 'The vocabulary boundary could not be loaded from the public API.',
  } satisfies VocabularyBoundaryResolvedState);
  protected readonly boundaryData = computed(() => {
    const state = this.boundaryState();
    return state.status === 'ready' ? state.data : null;
  });
  protected readonly registryFilterOptions = computed<readonly VocabularyRegistryFilterOption[]>(() => {
    const data = this.boundaryData();

    if (!data) {
      return [];
    }

    return buildVocabularyRegistryFilterOptions({
      total: data.total,
      buckets: data.buckets,
    });
  });
  protected readonly filteredEntries = computed<readonly VocabularyBoundaryEntry[]>(() => {
    const data = this.boundaryData();

    if (!data) {
      return [];
    }

    return filterVocabularyRegistryEntries(
      data.entries,
      this.searchQuery(),
      this.selectedCategoryFilter(),
    );
  });
  protected readonly filteredEntryCount = computed(() => this.filteredEntries().length);
  protected readonly totalPages = computed(() => {
    const total = this.filteredEntryCount();

    if (total === 0) {
      return 0;
    }

    return Math.ceil(total / this.pageSize());
  });
  protected readonly activePage = computed(() => {
    const totalPages = this.totalPages();

    if (totalPages === 0) {
      return 1;
    }

    return clampVocabularyRegistryPage(this.currentPage(), totalPages);
  });
  protected readonly visibleEntries = computed<readonly VocabularyBoundaryEntry[]>(() => {
    const entries = this.filteredEntries();

    if (entries.length === 0) {
      return [];
    }

    return paginateVocabularyRegistryEntries(entries, this.activePage(), this.pageSize());
  });
  protected readonly registryItems = computed<readonly VocabularyRegistryItem[]>(() => {
    const entries = this.visibleEntries();

    if (entries.length === 0) {
      return [];
    }

    return buildVocabularyRegistryItems(
      entries.map((entry) => ({
        term: entry.term,
        definition: entry.definition ?? null,
      })),
    );
  });
  protected readonly boundaryErrorMessage = computed(() => {
    const state = this.boundaryState();
    return state.status === 'error' ? state.errorMessage : null;
  });
  protected readonly bucketRows = computed<VocabularyBucketRow[]>(() => {
    const data = this.boundaryData();

    if (!data) {
      return [];
    }

    return (Object.keys(VOCABULARY_BUCKET_LABELS) as Array<keyof VocabularyBoundaryBuckets>).map((key) => ({
      key,
      label: VOCABULARY_BUCKET_LABELS[key],
      count: data.buckets[key],
    }));
  });
  protected readonly pageTokens = computed<readonly VocabularyRegistryPageToken[]>(() => {
    const totalPages = this.totalPages();

    if (totalPages === 0) {
      return [];
    }

    return buildVocabularyRegistryPageTokens(this.activePage(), totalPages);
  });
  protected readonly pageRangeStart = computed(() => {
    const count = this.filteredEntryCount();

    if (count === 0) {
      return 0;
    }

    return ((this.activePage() - 1) * this.pageSize()) + 1;
  });
  protected readonly pageRangeEnd = computed(() => {
    const count = this.filteredEntryCount();

    if (count === 0) {
      return 0;
    }

    return Math.min(this.pageRangeStart() + this.visibleEntries().length - 1, count);
  });
  protected readonly hasRegistryResults = computed(() => this.filteredEntryCount() > 0);
  protected readonly canGoFirst = computed(() => this.activePage() > 1);
  protected readonly canGoPrevious = computed(() => this.activePage() > 1);
  protected readonly canGoNext = computed(() => this.activePage() < this.totalPages());
  protected readonly canGoLast = computed(() => this.activePage() < this.totalPages());
  protected readonly pageSizeOptions = VOCABULARY_REGISTRY_PAGE_SIZE_OPTIONS;
  protected readonly pageSizeDropdownOptions = VOCABULARY_REGISTRY_PAGE_SIZE_OPTIONS.map((value) => ({
    value,
    label: String(value),
  }));

  protected formatCount(value: number | null | undefined): string {
    if (typeof value !== 'number') {
      return '—';
    }

    return this.countFormatter.format(value);
  }

  protected formatTerm(term: string): string {
    return formatVocabularyRegistryTerm(term);
  }

  protected onSearchQueryChange(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
    this.scheduleSearchTelemetry();
  }

  protected onCategoryFilterChange(value: VocabularyRegistryFilterKey): void {
    if (this.selectedCategoryFilter() === value) {
      return;
    }

    this.selectedCategoryFilter.set(value);
    this.currentPage.set(1);
    this.productEvents.track('vocabulary_filter_changed', {
      filter: value,
    });
  }

  protected onPageSizeChange(value: number | string): void {
    const nextPageSize = typeof value === 'number' ? value : Number(value);

    if (!Number.isInteger(nextPageSize) || !this.pageSizeOptions.includes(nextPageSize as VocabularyRegistryPageSize)) {
      return;
    }

    if (this.pageSize() === nextPageSize) {
      return;
    }

    this.pageSize.set(nextPageSize);
    this.currentPage.set(1);
    this.productEvents.track('vocabulary_page_size_changed', {
      pageSize: nextPageSize,
      filter: this.selectedCategoryFilter(),
      hasQuery: this.searchQuery().trim().length > 0,
    });
  }

  protected goToFirstPage(): void {
    if (this.totalPages() === 0) {
      return;
    }

    this.currentPage.set(1);
    this.trackPageChange(1);
  }

  protected goToPreviousPage(): void {
    if (!this.canGoPrevious()) {
      return;
    }

    const nextPage = this.activePage() - 1;
    this.currentPage.set(nextPage);
    this.trackPageChange(nextPage);
  }

  protected goToPage(page: number): void {
    const totalPages = this.totalPages();

    if (totalPages === 0) {
      return;
    }

    const nextPage = clampVocabularyRegistryPage(page, totalPages);
    this.currentPage.set(nextPage);
    this.trackPageChange(nextPage);
  }

  protected goToNextPage(): void {
    if (!this.canGoNext()) {
      return;
    }

    const nextPage = this.activePage() + 1;
    this.currentPage.set(nextPage);
    this.trackPageChange(nextPage);
  }

  protected goToLastPage(): void {
    const totalPages = this.totalPages();

    if (totalPages === 0) {
      return;
    }

    this.currentPage.set(totalPages);
    this.trackPageChange(totalPages);
  }

  ngOnDestroy(): void {
    if (this.searchTelemetryTimer !== null) {
      clearTimeout(this.searchTelemetryTimer);
      this.searchTelemetryTimer = null;
    }
  }

  private scheduleSearchTelemetry(): void {
    if (this.searchTelemetryTimer !== null) {
      clearTimeout(this.searchTelemetryTimer);
    }

    this.searchTelemetryTimer = setTimeout(() => {
      this.searchTelemetryTimer = null;
      this.productEvents.track('vocabulary_search_submitted', {
        queryLength: this.searchQuery().trim().length,
        hasQuery: this.searchQuery().trim().length > 0,
        hasResults: this.filteredEntryCount() > 0,
        resultCount: this.filteredEntryCount(),
        filter: this.selectedCategoryFilter(),
      });
    }, 300);
  }

  private trackPageChange(page: number): void {
    this.productEvents.track('vocabulary_page_changed', {
      page,
      pageSize: this.pageSize(),
      filter: this.selectedCategoryFilter(),
      hasQuery: this.searchQuery().trim().length > 0,
    });
  }
}

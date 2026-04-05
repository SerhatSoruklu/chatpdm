import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { VOCABULARY_PANEL_WARNING_TEXT } from '../../core/concepts/vocabulary-panel/vocabulary-panel.model';
import { InspectableItemDisclosureComponent } from '../../core/concepts/inspectable-item-disclosure/inspectable-item-disclosure.component';
import type {
  VocabularyBoundaryBuckets,
  VocabularyBoundaryResolvedState,
} from '../../core/vocabulary/vocabulary-boundary.types';
import {
  buildVocabularyPaginationTokens,
  buildVocabularyRegistryFilterOptions,
  buildVocabularySearchSummary,
  clampVocabularyPage,
  filterVocabularyEntries,
  getVocabularyPageCount,
  paginateVocabularyEntries,
  VOCABULARY_BOUNDARY_LIST_NOTE,
  VOCABULARY_BUCKET_LABELS,
  VOCABULARY_PAGE_SIZE_DEFAULT,
  VOCABULARY_PAGE_SIZE_OPTIONS,
  type VocabularyRegistryFilterKey,
} from './vocabulary-page.model';

interface VocabularyBucketRow {
  readonly key: keyof VocabularyBoundaryBuckets;
  readonly label: string;
  readonly count: number;
}

@Component({
  selector: 'app-vocabulary-page',
  standalone: true,
  imports: [CommonModule, InspectableItemDisclosureComponent],
  templateUrl: './vocabulary-page.component.html',
  styleUrl: './vocabulary-page.component.css',
})
export class VocabularyPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly routeData = toSignal(this.route.data, {
    initialValue: this.route.snapshot.data,
  });
  private readonly countFormatter = new Intl.NumberFormat('en-US');

  protected readonly warningText = VOCABULARY_PANEL_WARNING_TEXT;
  protected readonly listNote = VOCABULARY_BOUNDARY_LIST_NOTE;
  protected readonly pageSizeOptions = VOCABULARY_PAGE_SIZE_OPTIONS;
  protected readonly searchQuery = signal('');
  protected readonly selectedFilter = signal<VocabularyRegistryFilterKey>('all');
  protected readonly pageSize = signal(VOCABULARY_PAGE_SIZE_DEFAULT);
  protected readonly currentPage = signal(1);
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
  protected readonly registryEntries = computed(() => this.boundaryData()?.entries ?? []);
  protected readonly filteredEntries = computed(() => (
    filterVocabularyEntries(this.registryEntries(), this.searchQuery(), this.selectedFilter())
  ));
  protected readonly pageCount = computed(() => getVocabularyPageCount(
    this.filteredEntries().length,
    this.pageSize(),
  ));
  protected readonly activePage = computed(() => clampVocabularyPage(this.currentPage(), this.pageCount()));
  protected readonly visibleEntries = computed(() => paginateVocabularyEntries(
    this.filteredEntries(),
    this.activePage(),
    this.pageSize(),
  ));
  protected readonly pageTokens = computed(() => buildVocabularyPaginationTokens(
    this.activePage(),
    this.pageCount(),
  ));
  protected readonly filterOptions = computed(() => {
    const data = this.boundaryData();

    return data
      ? buildVocabularyRegistryFilterOptions(data.total, data.buckets)
      : [];
  });
  protected readonly activeFilterOption = computed(() => (
    this.filterOptions().find((option) => option.key === this.selectedFilter()) ?? null
  ));
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
  protected readonly resultsSummary = computed(() => {
    const data = this.boundaryData();

    if (!data) {
      return 'Boundary index unavailable.';
    }

    const visibleCount = this.visibleEntries().length;
    const filteredCount = this.filteredEntries().length;
    const currentPage = this.activePage();
    const pageCount = this.pageCount();

    return buildVocabularySearchSummary(visibleCount, filteredCount, currentPage, pageCount);
  });
  protected readonly pageSummary = computed(() => {
    const pageCount = this.pageCount();

    if (pageCount === 0) {
      return 'No pages available.';
    }

    return `Page ${this.formatCount(this.activePage())} of ${this.formatCount(pageCount)}`;
  });
  protected readonly visibleRangeSummary = computed(() => {
    const filteredCount = this.filteredEntries().length;
    if (filteredCount === 0) {
      return 'No terms matched the current search and filter.';
    }

    const start = (this.activePage() - 1) * this.pageSize() + 1;
    const end = Math.min(filteredCount, start + this.pageSize() - 1);

    return `Showing ${this.formatCount(start)}–${this.formatCount(end)} of ${this.formatCount(filteredCount)} matched terms`;
  });

  protected formatCount(value: number | null | undefined): string {
    if (typeof value !== 'number') {
      return '—';
    }

    return this.countFormatter.format(value);
  }

  protected onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
  }

  protected selectFilter(filterKey: VocabularyRegistryFilterKey): void {
    this.selectedFilter.set(filterKey);
    this.currentPage.set(1);
  }

  protected selectPageSize(pageSize: number): void {
    if (this.pageSize() === pageSize) {
      return;
    }

    this.pageSize.set(pageSize);
    this.currentPage.set(1);
  }

  protected selectPage(page: number): void {
    this.currentPage.set(clampVocabularyPage(page, this.pageCount()));
  }
}

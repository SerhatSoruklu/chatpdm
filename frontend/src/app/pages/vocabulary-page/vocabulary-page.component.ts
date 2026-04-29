import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';

import { VOCABULARY_PANEL_WARNING_TEXT } from '../../core/concepts/vocabulary-panel/vocabulary-panel.model';
import { InspectableItemDisclosureComponent } from '../../core/concepts/inspectable-item-disclosure/inspectable-item-disclosure.component';
import type {
  VocabularyBoundaryBuckets,
  VocabularyBoundaryEntry,
  VocabularyBoundaryMeaningSource,
  VocabularyBoundaryResolvedState,
} from '../../core/vocabulary/vocabulary-boundary.types';
import {
  buildVocabularyRegistryFilterOptions,
  buildVocabularySearchSummary,
  buildVocabularySearchIndex,
  displayVocabularyTerm,
  filterVocabularySearchIndex,
  getVocabularyMeaningInLawCount,
  hasVocabularyDisplayTermAlias,
  hasVocabularyMeaningInLaw,
  shouldRenderVocabularyBoundaryNote,
  sortVocabularyEntries,
  VOCABULARY_BOUNDARY_LIST_NOTE,
  VOCABULARY_BUCKET_LABELS,
  VOCABULARY_REGISTRY_SORT_OPTIONS,
  type VocabularyRegistryFilterKey,
  type VocabularyRegistrySortKey,
} from './vocabulary-page.model';

interface VocabularyBucketRow {
  readonly key: keyof VocabularyBoundaryBuckets;
  readonly label: string;
  readonly count: number;
}

interface VocabularyPageStats {
  readonly publishedConceptPackets: number | null;
  readonly liveRuntimeConcepts: number | null;
  readonly recognizedLegalVocabularyTerms: number | null;
  readonly meaningInLawCount: number;
}

@Component({
  selector: 'app-vocabulary-page',
  standalone: true,
  imports: [CommonModule, MatIconModule, InspectableItemDisclosureComponent],
  templateUrl: './vocabulary-page.component.html',
  styleUrl: './vocabulary-page.component.css',
})
export class VocabularyPageComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly routeData = toSignal(this.route.data, {
    initialValue: this.route.snapshot.data,
  });
  private readonly countFormatter = new Intl.NumberFormat('en-US');
  private readonly virtualItemSize = 182;
  private readonly virtualWindowSize = 24;
  private searchDebounceHandle: ReturnType<typeof setTimeout> | null = null;

  protected readonly warningText = VOCABULARY_PANEL_WARNING_TEXT;
  protected readonly listNote = VOCABULARY_BOUNDARY_LIST_NOTE;
  protected readonly sortOptions = VOCABULARY_REGISTRY_SORT_OPTIONS;
  protected readonly rawSearchQuery = signal('');
  protected readonly searchQuery = signal('');
  protected readonly selectedFilter = signal<VocabularyRegistryFilterKey>('all');
  protected readonly selectedSort = signal<VocabularyRegistrySortKey>('term_az');
  protected readonly selectedEntryTerm = signal<string | null>(null);
  protected readonly virtualScrollTop = signal(0);
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
  protected readonly indexedEntries = computed(() => buildVocabularySearchIndex(this.registryEntries()));
  protected readonly boundaryStats = computed<VocabularyPageStats>(() => {
    const data = this.boundaryData();

    return {
      publishedConceptPackets: data?.surfaceCounts?.publishedConceptPackets ?? null,
      liveRuntimeConcepts: data?.surfaceCounts?.liveRuntimeConcepts ?? null,
      recognizedLegalVocabularyTerms: data?.total ?? null,
      meaningInLawCount: getVocabularyMeaningInLawCount(this.registryEntries()),
    };
  });
  protected readonly meaningInLawCount = computed(() => this.boundaryStats().meaningInLawCount);
  protected readonly filteredEntries = computed(() => {
    const filteredEntries = filterVocabularySearchIndex(
      this.indexedEntries(),
      this.searchQuery(),
      this.selectedFilter(),
    );

    return sortVocabularyEntries(filteredEntries, this.selectedSort());
  });
  protected readonly selectedSortLabel = computed(() => (
    this.sortOptions.find((option) => option.key === this.selectedSort())?.label ?? 'A-Z'
  ));
  protected readonly sortMenuOpen = signal(false);
  protected readonly selectedEntry = computed(() => {
    const term = this.selectedEntryTerm();
    if (!term) return null;

    return this.filteredEntries().find((entry) => entry.term === term) ?? null;
  });
  protected readonly virtualStartIndex = computed(() => {
    const filteredCount = this.filteredEntries().length;
    const requestedStart = Math.max(0, Math.floor(this.virtualScrollTop() / this.virtualItemSize) - 6);
    const maxStart = Math.max(0, filteredCount - this.virtualWindowSize);

    return Math.min(requestedStart, maxStart);
  });
  protected readonly virtualEntries = computed(() => {
    const start = this.virtualStartIndex();

    return this.filteredEntries().slice(start, start + this.virtualWindowSize);
  });
  protected readonly virtualTopPadding = computed(() => this.virtualStartIndex() * this.virtualItemSize);
  protected readonly virtualBottomPadding = computed(() => {
    const renderedCount = this.virtualEntries().length;
    const remainingCount = Math.max(0, this.filteredEntries().length - this.virtualStartIndex() - renderedCount);

    return remainingCount * this.virtualItemSize;
  });
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

    const filteredCount = this.filteredEntries().length;

    return buildVocabularySearchSummary(filteredCount);
  });
  protected readonly visibleRangeSummary = computed(() => {
    const filteredCount = this.filteredEntries().length;
    if (filteredCount === 0) {
      return 'No terms matched the current search and filter.';
    }

    return `Virtualized list over ${this.formatCount(filteredCount)} matched terms`;
  });

  ngOnDestroy(): void {
    if (this.searchDebounceHandle) {
      clearTimeout(this.searchDebounceHandle);
    }
  }

  protected formatCount(value: number | null | undefined): string {
    if (typeof value !== 'number') {
      return '—';
    }

    return this.countFormatter.format(value);
  }

  protected shouldRenderBoundaryNote(entry: VocabularyBoundaryEntry): boolean {
    return shouldRenderVocabularyBoundaryNote(entry);
  }

  protected hasMeaningInLaw(entry: VocabularyBoundaryEntry): boolean {
    return hasVocabularyMeaningInLaw(entry);
  }

  protected displayTerm(term: string): string {
    return displayVocabularyTerm(term);
  }

  protected hasDisplayTermAlias(term: string): boolean {
    return hasVocabularyDisplayTermAlias(term);
  }

  protected trackVocabularyEntry(_index: number, entry: VocabularyBoundaryEntry): string {
    return entry.term;
  }

  protected trackMeaningSource(index: number, source: VocabularyBoundaryMeaningSource): string {
    return `${source.sourceId}:${source.page}:${source.lineNumber ?? 'none'}:${source.headword ?? 'none'}:${index}`;
  }

  protected onSearchChange(value: string): void {
    this.rawSearchQuery.set(value);

    if (this.searchDebounceHandle) {
      clearTimeout(this.searchDebounceHandle);
    }

    this.searchDebounceHandle = setTimeout(() => {
      this.searchQuery.set(value);
      this.resetVirtualViewport();
      this.selectedEntryTerm.set(null);
    }, 180);
  }

  protected clearSearch(input: HTMLInputElement): void {
    if (this.searchDebounceHandle) {
      clearTimeout(this.searchDebounceHandle);
      this.searchDebounceHandle = null;
    }

    this.rawSearchQuery.set('');
    this.searchQuery.set('');
    this.resetVirtualViewport();
    this.selectedEntryTerm.set(null);
    input.focus();
  }

  protected onVirtualScroll(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLElement) {
      this.virtualScrollTop.set(target.scrollTop);
    }
  }

  protected toggleSelectedEntry(entry: VocabularyBoundaryEntry): void {
    const nextTerm = this.selectedEntryTerm() === entry.term ? null : entry.term;

    this.selectedEntryTerm.set(nextTerm);

    if (nextTerm) {
      this.scrollSelectedDetailIntoView();
    }
  }

  protected selectFilter(filterKey: VocabularyRegistryFilterKey): void {
    this.selectedFilter.set(filterKey);
    this.resetVirtualViewport();
    this.selectedEntryTerm.set(null);
  }

  protected selectSort(sortKey: string): void {
    const nextSort = this.sortOptions.find((option) => option.key === sortKey)?.key;

    if (!nextSort) {
      return;
    }

    this.selectedSort.set(nextSort);
    this.sortMenuOpen.set(false);
    this.resetVirtualViewport();
    this.selectedEntryTerm.set(null);
  }

  protected toggleSortMenu(): void {
    this.sortMenuOpen.update((open) => !open);
  }

  protected closeSortMenuOnFocusOut(event: FocusEvent): void {
    const currentTarget = event.currentTarget;
    const nextTarget = event.relatedTarget;

    if (currentTarget instanceof HTMLElement && nextTarget instanceof Node && currentTarget.contains(nextTarget)) {
      return;
    }

    this.sortMenuOpen.set(false);
  }

  private resetVirtualViewport(): void {
    this.virtualScrollTop.set(0);

    setTimeout(() => {
      if (typeof document === 'undefined') {
        return;
      }

      const viewport = document.querySelector<HTMLElement>('.pdm-vocabulary-page__term-viewport');
      if (viewport) {
        viewport.scrollTop = 0;
      }
    }, 0);
  }

  private scrollSelectedDetailIntoView(): void {
    setTimeout(() => {
      if (typeof document === 'undefined') {
        return;
      }

      document
        .querySelector<HTMLElement>('[data-vocabulary-selected-detail="true"]')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
    }, 0);
  }
}

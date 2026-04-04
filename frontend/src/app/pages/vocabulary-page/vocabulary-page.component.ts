import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { VOCABULARY_PANEL_WARNING_TEXT } from '../../core/concepts/vocabulary-panel/vocabulary-panel.model';
import type {
  VocabularyBoundaryBuckets,
  VocabularyBoundaryResolvedState,
} from '../../core/vocabulary/vocabulary-boundary.types';
import {
  filterVocabularyTerms,
  VOCABULARY_BOUNDARY_LIST_NOTE,
  VOCABULARY_BUCKET_LABELS,
} from './vocabulary-page.model';

interface VocabularyBucketRow {
  readonly key: keyof VocabularyBoundaryBuckets;
  readonly label: string;
  readonly count: number;
}

@Component({
  selector: 'app-vocabulary-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  protected readonly searchQuery = signal('');
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
  protected readonly filteredTerms = computed(() => {
    const data = this.boundaryData();
    return data ? filterVocabularyTerms(data.terms, this.searchQuery()) : [];
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

  protected formatCount(value: number | null | undefined): string {
    if (typeof value !== 'number') {
      return '—';
    }

    return this.countFormatter.format(value);
  }
}

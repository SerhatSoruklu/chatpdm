import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { ConceptResolverService } from '../../core/concepts/concept-resolver.service';
import {
  ComparisonAxis,
  ComparisonAxisValue,
  ComparisonResponse,
} from '../../core/concepts/concept-resolver.types';
import { LIVE_RUNTIME_CONCEPT_IDS } from '../../core/concepts/public-runtime.catalog';

interface AdmittedComparison {
  key: string;
  query: string;
  conceptA: string;
  conceptB: string;
  title: string;
  axes: ComparisonAxis[];
  oneLineDistinction: string;
}

interface ComparisonMatrixCell {
  rowConceptId: string;
  columnConceptId: string;
  isDiagonal: boolean;
  isAdmitted: boolean;
  isMirroredPair: boolean;
  pairKey: string | null;
}

interface ControlledComparisonsState {
  status: 'loading' | 'ready' | 'error';
  pairs: readonly AdmittedComparison[];
  matrixRows: readonly ComparisonMatrixCell[][];
  errorMessage?: string;
}

@Component({
  selector: 'app-controlled-comparisons-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './controlled-comparisons-page.component.html',
  styleUrl: './controlled-comparisons-page.component.css',
})
export class ControlledComparisonsPageComponent implements OnInit {
  private readonly resolver = inject(ConceptResolverService);

  protected readonly liveConceptIds = LIVE_RUNTIME_CONCEPT_IDS;
  protected readonly pageState = signal<ControlledComparisonsState>({
    status: 'loading',
    pairs: [],
    matrixRows: [],
  });

  ngOnInit(): void {
    this.loadControlledComparisons();
  }

  protected pairSectionId(pairKey: string): string {
    return `comparison-pair-${pairKey.replaceAll('::', '-')}`;
  }

  protected formatConceptLabel(conceptId: string): string {
    return conceptId
      .split(/[-_]/)
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  }

  protected axisLabel(axis: string): string {
    return axis.replaceAll('_', ' ');
  }

  protected comparisonAxisHasValues(axis: ComparisonAxis): boolean {
    return this.isComparisonAxisValue(axis);
  }

  protected comparisonAxisValue(axis: ComparisonAxis, side: 'A' | 'B'): string {
    return this.isComparisonAxisValue(axis) ? axis[side] : '';
  }

  protected comparisonAxisStatement(axis: ComparisonAxis): string {
    return this.isComparisonAxisValue(axis) ? '' : axis.statement;
  }

  protected admittedPairCount(): number {
    return this.pageState().pairs.length;
  }

  protected scrollToPair(pairKey: string): void {
    if (typeof document === 'undefined') {
      return;
    }

    const target = document.getElementById(this.pairSectionId(pairKey));

    if (!target) {
      return;
    }

    target.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  private loadControlledComparisons(): void {
    const pairQueries = this.buildCandidatePairQueries();

    this.pageState.set({
      status: 'loading',
      pairs: [],
      matrixRows: [],
    });

    forkJoin(
      pairQueries.map(({ query }) => this.resolver.resolve(query)),
    ).subscribe({
      next: (responses) => {
        const admittedPairs = responses
          .filter((response): response is ComparisonResponse => response.type === 'comparison')
          .map((response) => this.toAdmittedComparison(response))
          .sort((left, right) => left.title.localeCompare(right.title));

        const admittedKeySet = new Set(admittedPairs.map((pair) => pair.key));

        this.pageState.set({
          status: 'ready',
          pairs: admittedPairs,
          matrixRows: this.buildMatrixRows(admittedKeySet),
        });
      },
      error: (error: unknown) => {
        this.pageState.set({
          status: 'error',
          pairs: [],
          matrixRows: [],
          errorMessage: this.describeError(error),
        });
      },
    });
  }

  private buildCandidatePairQueries(): Array<{ query: string; pairKey: string }> {
    const pairs: Array<{ query: string; pairKey: string }> = [];

    for (let leftIndex = 0; leftIndex < LIVE_RUNTIME_CONCEPT_IDS.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < LIVE_RUNTIME_CONCEPT_IDS.length; rightIndex += 1) {
        const left = LIVE_RUNTIME_CONCEPT_IDS[leftIndex];
        const right = LIVE_RUNTIME_CONCEPT_IDS[rightIndex];
        pairs.push({
          query: `${left} vs ${right}`,
          pairKey: this.pairKey(left, right),
        });
      }
    }

    return pairs;
  }

  private toAdmittedComparison(response: ComparisonResponse): AdmittedComparison {
    const key = this.pairKey(response.comparison.conceptA, response.comparison.conceptB);
    const axes = response.comparison.axes.slice(0, 3);
    const oneLineDistinction = response.comparison.axes.find((axis) => 'statement' in axis)?.statement
      ?? `${this.formatConceptLabel(response.comparison.conceptA)} remains distinct from ${this.formatConceptLabel(response.comparison.conceptB)} in the current runtime.`;

    return {
      key,
      query: `${response.comparison.conceptA} vs ${response.comparison.conceptB}`,
      conceptA: response.comparison.conceptA,
      conceptB: response.comparison.conceptB,
      title: `${this.formatConceptLabel(response.comparison.conceptA)} vs ${this.formatConceptLabel(response.comparison.conceptB)}`,
      axes,
      oneLineDistinction,
    };
  }

  private buildMatrixRows(admittedKeySet: Set<string>): ComparisonMatrixCell[][] {
    return LIVE_RUNTIME_CONCEPT_IDS.map((rowConceptId, rowIndex) => (
      LIVE_RUNTIME_CONCEPT_IDS.map((columnConceptId, columnIndex) => {
        const isDiagonal = rowConceptId === columnConceptId;
        const pairKey = isDiagonal ? null : this.pairKey(rowConceptId, columnConceptId);
        const isKnownPair = pairKey ? admittedKeySet.has(pairKey) : false;
        const isCanonicalCell = rowIndex < columnIndex;

        return {
          rowConceptId,
          columnConceptId,
          isDiagonal,
          isAdmitted: Boolean(pairKey && isKnownPair && isCanonicalCell),
          isMirroredPair: Boolean(pairKey && isKnownPair && !isCanonicalCell),
          pairKey,
        };
      })
    ));
  }

  private pairKey(left: string, right: string): string {
    return [left, right].sort((a, b) => a.localeCompare(b)).join('::');
  }

  private isComparisonAxisValue(axis: ComparisonAxis): axis is ComparisonAxisValue {
    return 'A' in axis && 'B' in axis;
  }

  private describeError(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return 'The controlled comparison catalog is unavailable. Check that the ChatPDM backend is running on port 4301.';
    }

    return 'The controlled comparison catalog could not be loaded from the public runtime.';
  }
}

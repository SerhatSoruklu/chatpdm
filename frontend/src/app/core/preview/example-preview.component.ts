import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';

import { ConceptResolverService } from '../concepts/concept-resolver.service';
import {
  ComparisonAxis,
  ComparisonAxisStatement,
  ComparisonAxisValue,
  ComparisonResponse,
  NoExactMatchResponse,
} from '../concepts/concept-resolver.types';

const SEEDED_COMPARISON_QUERY = 'authority vs power';
const SEEDED_REFUSAL_QUERY = 'authority vs charisma';
const PREVIEW_TRACE_CHIPS = ['comparison mode', 'deterministic runtime', 'bounded scope'] as const;

interface ComparisonPreview {
  query: string;
  conceptA: string;
  conceptB: string;
  conceptADefinition: string;
  conceptBDefinition: string;
  traceChips: readonly string[];
  boundaryStatement: string | null;
}

interface RefusalPreview {
  query: string;
  message: string;
}

type PreviewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; comparison: ComparisonPreview; refusal: RefusalPreview };

@Component({
  selector: 'app-example-preview',
  standalone: true,
  templateUrl: './example-preview.component.html',
  styleUrl: './example-preview.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamplePreviewComponent implements OnInit {
  private readonly resolver = inject(ConceptResolverService);

  protected readonly previewState = signal<PreviewState>({ status: 'loading' });
  protected readonly previewTitle = computed(() => {
    switch (this.previewState().status) {
      case 'ready':
        return 'Comparison result';
      case 'error':
        return 'Runtime preview unavailable';
      default:
        return 'Loading runtime preview';
    }
  });
  protected readonly previewStatus = computed(() => {
    switch (this.previewState().status) {
      case 'ready':
        return 'Resolved within scope';
      case 'error':
        return 'Preview unavailable';
      default:
        return 'Resolving seeded queries';
    }
  });

  async ngOnInit(): Promise<void> {
    await this.loadPreview();
  }

  private async loadPreview(): Promise<void> {
    this.previewState.set({ status: 'loading' });

    try {
      const { comparison, refusal } = await firstValueFrom(
        forkJoin({
          comparison: this.resolver.resolve(SEEDED_COMPARISON_QUERY),
          refusal: this.resolver.resolve(SEEDED_REFUSAL_QUERY),
        }),
      );

      if (comparison.type !== 'comparison') {
        throw new Error('Seeded comparison query did not return comparison output.');
      }

      if (refusal.type !== 'no_exact_match' || refusal.queryType !== 'comparison_query') {
        throw new Error('Seeded refusal query did not return comparison refusal output.');
      }

      this.previewState.set({
        status: 'ready',
        comparison: this.mapComparisonPreview(comparison),
        refusal: this.mapRefusalPreview(refusal),
      });
    } catch {
      this.previewState.set({
        status: 'error',
        message: 'Seeded runtime examples could not be loaded from the live resolver.',
      });
    }
  }

  private mapComparisonPreview(response: ComparisonResponse): ComparisonPreview {
    const coreNatureAxis = this.findValueAxis(response.comparison.axes, 'core_nature')
      ?? this.findFirstValueAxis(response.comparison.axes);
    const boundaryStatement = this.findStatementAxis(response.comparison.axes, 'not_equivalent')?.statement
      ?? null;

    return {
      query: response.query,
      conceptA: response.comparison.conceptA,
      conceptB: response.comparison.conceptB,
      conceptADefinition: coreNatureAxis?.A ?? 'Resolved meaning unavailable.',
      conceptBDefinition: coreNatureAxis?.B ?? 'Resolved meaning unavailable.',
      traceChips: PREVIEW_TRACE_CHIPS,
      boundaryStatement,
    };
  }

  private mapRefusalPreview(response: NoExactMatchResponse): RefusalPreview {
    return {
      query: response.query,
      message: response.interpretation?.message?.trim() || response.message,
    };
  }

  private findValueAxis(
    axes: ComparisonAxis[],
    axisName: string,
  ): ComparisonAxisValue | null {
    for (const axis of axes) {
      if (axis.axis === axisName && this.isValueAxis(axis)) {
        return axis;
      }
    }

    return null;
  }

  private findFirstValueAxis(axes: ComparisonAxis[]): ComparisonAxisValue | null {
    for (const axis of axes) {
      if (this.isValueAxis(axis)) {
        return axis;
      }
    }

    return null;
  }

  private findStatementAxis(
    axes: ComparisonAxis[],
    axisName: string,
  ): ComparisonAxisStatement | null {
    for (const axis of axes) {
      if (axis.axis === axisName && this.isStatementAxis(axis)) {
        return axis;
      }
    }

    return null;
  }

  private isValueAxis(axis: ComparisonAxis): axis is ComparisonAxisValue {
    return 'A' in axis && 'B' in axis;
  }

  private isStatementAxis(axis: ComparisonAxis): axis is ComparisonAxisStatement {
    return 'statement' in axis;
  }
}

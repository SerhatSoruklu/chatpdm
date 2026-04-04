import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { catchError, forkJoin, firstValueFrom, map, of } from 'rxjs';

import { ConceptResolverService } from '../concepts/concept-resolver.service';
import {
  buildExamplePreviewState,
  classifyComparisonSeedResponse,
  classifyRefusalSeedResponse,
  ExamplePreviewState,
  SEEDED_COMPARISON_QUERY,
  SEEDED_REFUSAL_QUERY,
  SeededPreviewIssue,
} from './example-preview.view-model';

@Component({
  selector: 'app-example-preview',
  standalone: true,
  templateUrl: './example-preview.component.html',
  styleUrl: './example-preview.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamplePreviewComponent implements OnInit {
  private readonly resolver = inject(ConceptResolverService);

  protected readonly previewState = signal<ExamplePreviewState>({ status: 'loading' });
  protected readonly previewTitle = computed(() => {
    switch (this.previewState().status) {
      case 'ready':
        return 'Comparison result';
      case 'partial':
        return 'Seeded runtime preview';
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
      case 'partial':
        return 'Partial result';
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
          comparison: this.resolvedComparisonSeed(),
          refusal: this.resolvedRefusalSeed(),
        }),
      );

      this.previewState.set(buildExamplePreviewState(comparison, refusal));
    } catch (error) {
      this.previewState.set(this.buildErrorState(error));
    }
  }

  private resolvedComparisonSeed() {
    return this.resolver.resolve(SEEDED_COMPARISON_QUERY).pipe(
      map((response) => classifyComparisonSeedResponse(response)),
      catchError(() =>
        of({
          kind: 'issue',
          issue: this.buildTransportIssue('comparison seed'),
        } as const),
      ),
    );
  }

  private resolvedRefusalSeed() {
    return this.resolver.resolve(SEEDED_REFUSAL_QUERY).pipe(
      map((response) => classifyRefusalSeedResponse(response)),
      catchError(() =>
        of({
          kind: 'issue',
          issue: this.buildTransportIssue('refusal seed'),
        } as const),
      ),
    );
  }

  private buildTransportIssue(seedLabel: SeededPreviewIssue['seedLabel']): SeededPreviewIssue {
    return {
      seedLabel,
      message: `Seeded ${seedLabel} could not reach the live resolver.`,
      details: ['transport_error'],
    };
  }

  private buildErrorState(error: unknown): ExamplePreviewState {
    if (error instanceof Error && error.message) {
      return {
        status: 'error',
        message: error.message,
      };
    }

    return {
      status: 'error',
      message: 'Seeded runtime examples could not be loaded from the live resolver.',
    };
  }
}

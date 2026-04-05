import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { ConceptResolverService } from '../../core/concepts/concept-resolver.service';
import {
  ConceptMatchResponse,
  ConceptSource,
  RelatedConcept,
} from '../../core/concepts/concept-resolver.types';
import { InspectableItemDisclosureComponent } from '../../core/concepts/inspectable-item-disclosure/inspectable-item-disclosure.component';
import {
  LIVE_RUNTIME_CONCEPT_IDS,
  RUNTIME_SCOPE_BY_CONCEPT,
} from '../../core/concepts/public-runtime.catalog';

interface LiveConceptCatalogState {
  status: 'loading' | 'ready' | 'error';
  concepts: readonly ConceptMatchResponse[];
  errorMessage?: string;
}

@Component({
  selector: 'app-live-concepts-page',
  standalone: true,
  imports: [CommonModule, InspectableItemDisclosureComponent],
  templateUrl: './live-concepts-page.component.html',
  styleUrl: './live-concepts-page.component.css',
})
export class LiveConceptsPageComponent implements OnInit {
  private readonly resolver = inject(ConceptResolverService);
  private readonly liveConceptIdSet = new Set(LIVE_RUNTIME_CONCEPT_IDS);

  protected readonly liveConceptIds = LIVE_RUNTIME_CONCEPT_IDS;
  protected readonly catalogState = signal<LiveConceptCatalogState>({
    status: 'loading',
    concepts: [],
  });

  ngOnInit(): void {
    this.loadCatalog();
  }

  protected conceptSectionId(conceptId: string): string {
    return `live-concept-${conceptId}`;
  }

  protected scopeLabel(conceptId: string): string {
    return RUNTIME_SCOPE_BY_CONCEPT[conceptId] ?? 'Bounded runtime v1';
  }

  protected relationLabel(relationType: string): string {
    switch (relationType) {
      case 'contrast':
        return 'Contrast';
      case 'extension':
        return 'Extension';
      case 'prerequisite':
        return 'Prerequisite';
      case 'see_also':
        return 'See also';
      default:
        return relationType;
    }
  }

  protected sourceTypeLabel(type: ConceptSource['type']): string {
    switch (type) {
      case 'dictionary':
        return 'Dictionary';
      case 'book':
        return 'Book';
      case 'paper':
        return 'Paper';
      case 'law':
        return 'Law';
      case 'article':
        return 'Article';
      case 'internal':
        return 'Internal';
      default:
        return type;
    }
  }

  protected visibleRelatedConcepts(concept: ConceptMatchResponse): RelatedConcept[] {
    return concept.answer.relatedConcepts.filter((relatedConcept) => (
      this.liveConceptIdSet.has(relatedConcept.conceptId)
    ));
  }

  protected scrollToConcept(conceptId: string): void {
    if (typeof document === 'undefined') {
      return;
    }

    const target = document.getElementById(this.conceptSectionId(conceptId));

    if (!target) {
      return;
    }

    target.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  private loadCatalog(): void {
    this.catalogState.set({
      status: 'loading',
      concepts: [],
    });

    forkJoin(
      LIVE_RUNTIME_CONCEPT_IDS.map((conceptId) => this.resolver.resolve(conceptId)),
    ).subscribe({
      next: (responses) => {
        const concepts = responses.map((response) => {
          if (response.type !== 'concept_match') {
            throw new TypeError(`Expected concept_match for live concept ${response.query}.`);
          }

          return response;
        });

        this.catalogState.set({
          status: 'ready',
          concepts,
        });
      },
      error: (error: unknown) => {
        this.catalogState.set({
          status: 'error',
          concepts: [],
          errorMessage: this.describeError(error),
        });
      },
    });
  }

  private describeError(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return 'The live concept catalog is unavailable. Check that the ChatPDM backend is running on port 4301.';
    }

    return 'The live concept catalog could not be loaded from the public runtime.';
  }
}

import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { ConceptResolverService } from '../../core/concepts/concept-resolver.service';
import {
  AmbiguousCandidate,
  AmbiguousMatchResponse,
  ConceptMatchResponse,
  NoExactMatchResponse,
  RelatedConcept,
  ResolveProductResponse,
  Suggestion,
} from '../../core/concepts/concept-resolver.types';
import { FeedbackService } from '../../core/feedback/feedback.service';
import {
  FeedbackSubmissionContext,
  FeedbackType,
  FeedbackResponseType,
} from '../../core/feedback/feedback.types';

interface ScopeGroup {
  id: string;
  title: string;
  concepts: string[];
}

interface StarterQuery {
  label: string;
  query: string;
}

interface FeedbackOption {
  value: FeedbackType;
  label: string;
}

interface EntryFeedbackState {
  question: string;
  responseType: FeedbackResponseType;
  options: FeedbackOption[];
  context: FeedbackSubmissionContext;
  status: 'idle' | 'submitting' | 'submitted' | 'error';
  selectedOption?: FeedbackType;
  errorMessage?: string;
}

interface AmbiguousSelectionOrigin {
  kind: 'ambiguous_resolution';
  response: AmbiguousMatchResponse;
  selectedConceptId: string;
}

interface SubmitQueryOptions {
  displayQuery?: string;
  feedbackOrigin?: AmbiguousSelectionOrigin;
}

interface ConversationEntry {
  id: number;
  submittedQuery: string;
  status: 'loading' | 'success' | 'error';
  response?: ResolveProductResponse;
  feedback?: EntryFeedbackState;
  errorMessage?: string;
}

const LIVE_RUNTIME_CONCEPTS = new Set([
  'authority',
  'power',
  'legitimacy',
  'responsibility',
  'duty',
]);

const SCOPE_GROUPS: ScopeGroup[] = [
  {
    id: 'core-abstractions',
    title: 'core-abstractions',
    concepts: ['meaning', 'truth', 'identity', 'freedom', 'equality', 'responsibility'],
  },
  {
    id: 'relational-structures',
    title: 'relational-structures',
    concepts: ['authority', 'power', 'legitimacy', 'consent', 'trust', 'recognition', 'conflict'],
  },
  {
    id: 'governance-structures',
    title: 'governance-structures',
    concepts: [
      'law',
      'justice',
      'rights',
      'duty',
      'institution',
      'governance',
      'accountability',
      'hierarchy',
      'sovereignty',
      'order',
    ],
  },
];

const STARTER_QUERIES: StarterQuery[] = [
  { label: 'authority', query: 'authority' },
  { label: 'define legitimacy', query: 'define legitimacy' },
  { label: 'obligation', query: 'obligation' },
  { label: 'civic duty', query: 'civic duty' },
];

const CONCEPT_MATCH_FEEDBACK_OPTIONS: FeedbackOption[] = [
  { value: 'clear', label: 'Clear' },
  { value: 'unclear', label: 'Unclear' },
  { value: 'wrong_concept', label: 'Wrong concept' },
];

const AMBIGUOUS_MATCH_FEEDBACK_OPTIONS: FeedbackOption[] = [
  { value: 'found_right_one', label: 'Found the right one' },
  { value: 'still_not_right', label: 'Still not right' },
];

const NO_EXACT_MATCH_FEEDBACK_OPTIONS: FeedbackOption[] = [
  { value: 'expected', label: 'Expected' },
  { value: 'should_exist', label: 'Should exist' },
];

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.css',
})
export class LandingPageComponent {
  private readonly resolver = inject(ConceptResolverService);
  private readonly feedbackService = inject(FeedbackService);

  protected readonly queryDraft = signal('');
  protected readonly entries = signal<ConversationEntry[]>([]);
  protected readonly isSubmitting = signal(false);
  protected readonly scopePanelOpen = signal(false);
  protected readonly scopeGroups = SCOPE_GROUPS;
  protected readonly starterQueries = STARTER_QUERIES;
  protected readonly liveConceptCount = LIVE_RUNTIME_CONCEPTS.size;
  protected readonly scopedConceptCount = SCOPE_GROUPS.reduce(
    (count, group) => count + group.concepts.length,
    0,
  );
  protected readonly hasConversation = computed(() => this.entries().length > 0);
  protected readonly latestEntryId = computed(() => this.entries().at(-1)?.id ?? null);

  private nextEntryId = 1;

  protected async submitDraft(): Promise<void> {
    if (!this.queryDraft().trim()) {
      return;
    }

    const draft = this.queryDraft();
    this.queryDraft.set('');
    await this.submitQuery(draft);
  }

  protected async submitQuery(query: string, options: SubmitQueryOptions = {}): Promise<void> {
    if (this.isSubmitting()) {
      return;
    }

    this.scopePanelOpen.set(false);

    const entryId = this.nextEntryId++;
    this.isSubmitting.set(true);
    this.entries.update((entries) => [
      ...entries,
      {
        id: entryId,
        submittedQuery: options.displayQuery ?? query,
        status: 'loading',
      },
    ]);

    try {
      const response = await firstValueFrom(this.resolver.resolve(query));
      this.updateEntry(entryId, {
        status: 'success',
        response,
        feedback: this.buildFeedbackState(response, options.feedbackOrigin),
      });
    } catch (error) {
      this.updateEntry(entryId, {
        status: 'error',
        errorMessage: this.describeError(error),
      });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected isLiveConcept(concept: string): boolean {
    return LIVE_RUNTIME_CONCEPTS.has(concept);
  }

  protected toggleScopePanel(): void {
    this.scopePanelOpen.update((currentValue) => !currentValue);
  }

  protected async resolveRelatedConcept(relatedConcept: RelatedConcept): Promise<void> {
    await this.submitQuery(`concept:${relatedConcept.conceptId}`, {
      displayQuery: relatedConcept.title,
    });
  }

  protected async resolveSuggestedConcept(suggestion: Suggestion): Promise<void> {
    await this.submitQuery(`concept:${suggestion.conceptId}`, {
      displayQuery: suggestion.title,
    });
  }

  protected async resolveAmbiguousCandidate(
    response: AmbiguousMatchResponse,
    candidate: AmbiguousCandidate,
  ): Promise<void> {
    await this.submitQuery(`concept:${candidate.conceptId}`, {
      displayQuery: candidate.title,
      feedbackOrigin: {
        kind: 'ambiguous_resolution',
        response,
        selectedConceptId: candidate.conceptId,
      },
    });
  }

  protected async submitFeedback(entryId: number, option: FeedbackOption): Promise<void> {
    const entry = this.entries().find((candidateEntry) => candidateEntry.id === entryId);

    if (!entry?.feedback || entry.feedback.status === 'submitting' || entry.feedback.status === 'submitted') {
      return;
    }

    this.updateFeedback(entryId, {
      status: 'submitting',
      selectedOption: option.value,
      errorMessage: undefined,
    });

    try {
      await firstValueFrom(this.feedbackService.submit({
        ...entry.feedback.context,
        feedbackType: option.value,
      }));

      this.updateFeedback(entryId, {
        status: 'submitted',
        selectedOption: option.value,
      });
    } catch {
      this.updateFeedback(entryId, {
        status: 'error',
        selectedOption: option.value,
        errorMessage: 'Feedback was not recorded. Try again.',
      });
    }
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

  protected responseLabel(response: ResolveProductResponse): string {
    switch (response.type) {
      case 'concept_match':
        return 'Canonical concept';
      case 'ambiguous_match':
        return 'Need a precise choice';
      case 'no_exact_match':
        return 'No exact match';
      default:
        return 'Response';
    }
  }

  protected suggestionReason(reason: string): string {
    switch (reason) {
      case 'broader_topic':
        return 'Broader topic';
      case 'related_concept':
        return 'Related concept';
      case 'similar_term':
        return 'Similar term';
      default:
        return reason;
    }
  }

  protected methodLabel(method: string): string {
    switch (method) {
      case 'exact_alias':
        return 'Exact alias';
      case 'normalized_alias':
        return 'Normalized alias';
      case 'canonical_id':
        return 'Canonical ID';
      case 'author_defined_disambiguation':
        return 'Authored disambiguation';
      case 'ambiguous_alias':
        return 'Ambiguous alias';
      case 'ambiguous_normalized_alias':
        return 'Ambiguous normalized alias';
      case 'no_exact_match':
        return 'No exact match';
      default:
        return method;
    }
  }

  protected isPastEntry(entry: ConversationEntry): boolean {
    return this.latestEntryId() !== entry.id;
  }

  protected contextUsages(context: { label: string; appliesTo: string[] }): string[] {
    return context.appliesTo.filter(
      (usage) => usage.toLowerCase() !== context.label.toLowerCase(),
    );
  }

  protected feedbackOptionLabel(entryFeedback: EntryFeedbackState): string {
    const selectedOption = entryFeedback.options.find(
      (option) => option.value === entryFeedback.selectedOption,
    );

    return selectedOption?.label ?? 'Recorded';
  }

  protected trackByEntry(index: number, entry: ConversationEntry): number {
    return entry.id;
  }

  protected asConceptMatch(response: ResolveProductResponse): ConceptMatchResponse {
    return response as ConceptMatchResponse;
  }

  protected asAmbiguousMatch(response: ResolveProductResponse): AmbiguousMatchResponse {
    return response as AmbiguousMatchResponse;
  }

  protected asNoExactMatch(response: ResolveProductResponse): NoExactMatchResponse {
    return response as NoExactMatchResponse;
  }

  private buildFeedbackState(
    response: ResolveProductResponse,
    feedbackOrigin?: AmbiguousSelectionOrigin,
  ): EntryFeedbackState | undefined {
    if (response.type === 'concept_match') {
      if (feedbackOrigin?.kind === 'ambiguous_resolution') {
        return {
          question: 'After choosing one:',
          responseType: 'ambiguous_match',
          options: AMBIGUOUS_MATCH_FEEDBACK_OPTIONS,
          status: 'idle',
          context: {
            rawQuery: feedbackOrigin.response.query,
            normalizedQuery: feedbackOrigin.response.normalizedQuery,
            responseType: 'ambiguous_match',
            resolvedConceptId: feedbackOrigin.selectedConceptId,
            candidateConceptIds: feedbackOrigin.response.candidates.map(
              (candidate) => candidate.conceptId,
            ),
            suggestionConceptIds: [],
            contractVersion: feedbackOrigin.response.contractVersion,
            normalizerVersion: feedbackOrigin.response.normalizerVersion,
            matcherVersion: feedbackOrigin.response.matcherVersion,
            conceptSetVersion: feedbackOrigin.response.conceptSetVersion,
          },
        };
      }

      return {
        question: 'Was this response:',
        responseType: 'concept_match',
        options: CONCEPT_MATCH_FEEDBACK_OPTIONS,
        status: 'idle',
        context: {
          rawQuery: response.query,
          normalizedQuery: response.normalizedQuery,
          responseType: 'concept_match',
          resolvedConceptId: response.resolution.conceptId,
          candidateConceptIds: [],
          suggestionConceptIds: [],
          contractVersion: response.contractVersion,
          normalizerVersion: response.normalizerVersion,
          matcherVersion: response.matcherVersion,
          conceptSetVersion: response.conceptSetVersion,
        },
      };
    }

    if (response.type === 'no_exact_match') {
      return {
        question: 'Was this outcome:',
        responseType: 'no_exact_match',
        options: NO_EXACT_MATCH_FEEDBACK_OPTIONS,
        status: 'idle',
        context: {
          rawQuery: response.query,
          normalizedQuery: response.normalizedQuery,
          responseType: 'no_exact_match',
          resolvedConceptId: null,
          candidateConceptIds: [],
          suggestionConceptIds: response.suggestions.map((suggestion) => suggestion.conceptId),
          contractVersion: response.contractVersion,
          normalizerVersion: response.normalizerVersion,
          matcherVersion: response.matcherVersion,
          conceptSetVersion: response.conceptSetVersion,
        },
      };
    }

    return undefined;
  }

  private updateEntry(
    entryId: number,
    patch: Partial<Pick<ConversationEntry, 'status' | 'response' | 'errorMessage' | 'feedback'>>,
  ): void {
    this.entries.update((entries) =>
      entries.map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry)),
    );
  }

  private updateFeedback(
    entryId: number,
    patch: Partial<Pick<EntryFeedbackState, 'status' | 'selectedOption' | 'errorMessage'>>,
  ): void {
    this.entries.update((entries) =>
      entries.map((entry) => {
        if (entry.id !== entryId || !entry.feedback) {
          return entry;
        }

        return {
          ...entry,
          feedback: {
            ...entry.feedback,
            ...patch,
          },
        };
      }),
    );
  }

  private describeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 400) {
        return 'Enter a concept query to continue.';
      }

      if (error.status === 0) {
        return 'Resolver unavailable. Check that the ChatPDM backend is running on port 4301.';
      }
    }

    return 'ChatPDM could not return a product response for this request.';
  }
}

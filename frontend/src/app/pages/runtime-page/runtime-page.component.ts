import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { ConceptResolverService } from '../../core/concepts/concept-resolver.service';
import {
  AmbiguousCandidate,
  AmbiguousMatchResponse,
  ComparisonAxis,
  ComparisonAxisValue,
  ComparisonResponse,
  ConceptDetailResponse,
  ConceptMatchResponse,
  ConceptSource,
  GovernanceState,
  NoExactMatchResponse,
  RelatedConcept,
  ResolveProductResponse,
  ReviewState,
  Suggestion,
} from '../../core/concepts/concept-resolver.types';
import {
  LIVE_RUNTIME_CONCEPT_IDS,
  REVIEWED_CONCEPT_IDS,
  RUNTIME_SCOPE_BY_CONCEPT,
} from '../../core/concepts/public-runtime.catalog';
import { FeedbackService } from '../../core/feedback/feedback.service';
import type {
  FeedbackResponseType,
  FeedbackSubmissionContext,
  FeedbackType,
} from '../../core/feedback/feedback.types';

const REVIEWED_NOT_LIVE_ADMISSIONS = new Set<ReviewState['admission']>([
  'phase1_passed',
  'phase2_stable',
]);

const STARTER_QUERY_OPTIONS = Object.freeze([
  {
    label: 'authority vs power',
    query: 'authority vs power',
  },
  {
    label: 'define legitimacy',
    query: 'define legitimacy',
  },
]);

const CONCEPT_MATCH_FEEDBACK_OPTIONS = [
  { value: 'clear', label: 'Clear' },
  { value: 'unclear', label: 'Unclear' },
  { value: 'wrong_concept', label: 'Wrong concept' },
] as const satisfies readonly RuntimeFeedbackOption[];

const AMBIGUOUS_MATCH_FEEDBACK_OPTIONS = [
  { value: 'found_right_one', label: 'Found the right one' },
  { value: 'still_not_right', label: 'Still not right' },
] as const satisfies readonly RuntimeFeedbackOption[];

const NO_EXACT_MATCH_FEEDBACK_OPTIONS = [
  { value: 'expected', label: 'Expected' },
  { value: 'should_exist', label: 'Should exist' },
] as const satisfies readonly RuntimeFeedbackOption[];

type QueryClassification =
  | 'empty'
  | 'direct_concept'
  | 'canonical_lookup'
  | 'controlled_comparison'
  | 'unsupported';

type RuntimeDisplayState =
  | 'concept_match'
  | 'comparison'
  | 'ambiguous_match'
  | 'reviewed_not_live'
  | 'blocked'
  | 'refused';

interface RuntimeQueryAssessment {
  classification: QueryClassification;
  status: 'idle' | 'valid' | 'invalid';
  label: string;
  message: string;
  canSubmit: boolean;
}

interface RuntimeFeedbackOption {
  value: FeedbackType;
  label: string;
}

interface RuntimeFeedbackState {
  question: string;
  responseType: FeedbackResponseType;
  options: readonly RuntimeFeedbackOption[];
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

interface RuntimeEntry {
  submittedQuery: string;
  status: 'loading' | 'success' | 'error';
  response?: ResolveProductResponse;
  detail?: ConceptDetailResponse | null;
  feedback?: RuntimeFeedbackState;
  errorMessage?: string;
}

interface SubmitRuntimeQueryOptions {
  displayQuery?: string;
  feedbackOrigin?: AmbiguousSelectionOrigin;
}

interface RefusalBoundaryState {
  label: string;
  copy: string;
}

interface RefusalAtlasEntry {
  key: 'not_admitted' | 'blocked' | 'comparison_not_allowlisted' | 'unsupported_composition';
  query: string;
  classLabel: string;
  classMeaning: string;
  outcome: string;
  interpretation: string;
  reason: string;
  queryType: string;
  resolution: string;
  message: string;
}

interface RefusalBehaviorState {
  status: 'loading' | 'ready' | 'error';
  examples: readonly RefusalAtlasEntry[];
  errorMessage?: string;
}

const REFUSAL_ATLAS_QUERIES = Object.freeze([
  'law',
  'violation',
  'authority vs duty',
  'who should hold legitimate authority in a democracy',
]);

const REFUSAL_BOUNDARY_STATES = Object.freeze<RefusalBoundaryState[]>([
  {
    label: 'Live',
    copy: 'Admitted concepts resolve with authored output.',
  },
  {
    label: 'Reviewed',
    copy: 'Lifecycle evidence can exist before runtime admission.',
  },
  {
    label: 'Blocked',
    copy: 'Concept is prevented from entering public runtime.',
  },
  {
    label: 'Unsupported',
    copy: 'No admitted structure exists for the current query form.',
  },
]);

@Component({
  selector: 'app-runtime-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './runtime-page.component.html',
  styleUrl: './runtime-page.component.css',
})
export class RuntimePageComponent implements OnInit {
  private readonly resolver = inject(ConceptResolverService);
  private readonly feedbackService = inject(FeedbackService);
  private readonly directConceptPattern = /^[a-z]+(?:[ -][a-z]+){0,3}$/i;
  private readonly canonicalLookupPattern = /^define\s+[a-z]+(?:[ -][a-z]+){0,3}$/i;
  private readonly controlledComparisonPattern =
    /^[a-z]+(?:[ -][a-z]+){0,3}\s+vs\s+[a-z]+(?:[ -][a-z]+){0,3}$/i;

  protected readonly queryDraft = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly activeEntry = signal<RuntimeEntry | null>(null);
  protected readonly validationTraceVisible = signal(false);
  protected readonly refusalBehaviorState = signal<RefusalBehaviorState>({
    status: 'loading',
    examples: [],
  });
  protected readonly refusalBoundaryStates = REFUSAL_BOUNDARY_STATES;
  protected readonly liveConceptIds = LIVE_RUNTIME_CONCEPT_IDS;
  protected readonly reviewedConceptIds = REVIEWED_CONCEPT_IDS;
  protected readonly starterQueryOptions = STARTER_QUERY_OPTIONS;
  protected readonly queryAssessment = computed(() => this.classifyQuery(this.queryDraft()));

  ngOnInit(): void {
    void this.loadRefusalBehavior();
  }

  protected canSubmitDraft(): boolean {
    return this.queryAssessment().canSubmit && !this.isSubmitting();
  }

  protected resultDisplayState(entry: RuntimeEntry | null): RuntimeDisplayState | null {
    if (!entry?.response) {
      return null;
    }

    if (entry.response.type === 'concept_match') {
      return 'concept_match';
    }

    if (entry.response.type === 'comparison') {
      return 'comparison';
    }

    if (entry.response.type === 'ambiguous_match') {
      return 'ambiguous_match';
    }

    if (this.isReviewedNotLive(entry.detail)) {
      return 'reviewed_not_live';
    }

    if (this.isBlockedConcept(entry.response, entry.detail)) {
      return 'blocked';
    }

    return 'refused';
  }

  protected async submitDraft(): Promise<void> {
    if (!this.canSubmitDraft()) {
      return;
    }

    const query = this.queryDraft();
    this.queryDraft.set('');
    await this.submitQuery(query);
  }

  protected async submitQuery(
    query: string,
    options: SubmitRuntimeQueryOptions = {},
  ): Promise<void> {
    if (this.isSubmitting()) {
      return;
    }

    const submittedQuery = options.displayQuery ?? query.trim();

    this.isSubmitting.set(true);
    this.validationTraceVisible.set(false);
    this.activeEntry.set({
      submittedQuery,
      status: 'loading',
    });

    try {
      const response = await firstValueFrom(this.resolver.resolve(query));
      const detail = await this.loadConceptDetail(query, response);

      this.activeEntry.set({
        submittedQuery,
        status: 'success',
        response,
        detail,
        feedback: this.buildFeedbackState(response, detail, options.feedbackOrigin),
      });
      this.scheduleScrollToResult();
    } catch (error) {
      this.activeEntry.set({
        submittedQuery,
        status: 'error',
        errorMessage: this.describeError(error),
      });
      this.scheduleScrollToResult();
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected async submitScopedConcept(conceptId: string): Promise<void> {
    await this.submitQuery(conceptId, {
      displayQuery: this.formatConceptLabel(conceptId),
    });
  }

  protected async submitStarterQuery(query: string): Promise<void> {
    await this.submitQuery(query);
  }

  protected async resolveSuggestedConcept(suggestion: Suggestion): Promise<void> {
    await this.submitQuery(`concept:${suggestion.conceptId}`, {
      displayQuery: suggestion.title,
    });
  }

  protected async resolveRelatedConcept(relatedConcept: RelatedConcept): Promise<void> {
    await this.submitQuery(`concept:${relatedConcept.conceptId}`, {
      displayQuery: relatedConcept.title,
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

  protected async submitFeedback(option: RuntimeFeedbackOption): Promise<void> {
    const entry = this.activeEntry();

    if (!entry?.feedback || entry.feedback.status === 'submitting' || entry.feedback.status === 'submitted') {
      return;
    }

    this.updateFeedback({
      status: 'submitting',
      selectedOption: option.value,
      errorMessage: undefined,
    });

    try {
      await firstValueFrom(this.feedbackService.submit({
        ...entry.feedback.context,
        feedbackType: option.value,
      }));

      this.updateFeedback({
        status: 'submitted',
        selectedOption: option.value,
      });
    } catch {
      this.updateFeedback({
        status: 'error',
        selectedOption: option.value,
        errorMessage: 'Feedback was not recorded. Try again.',
      });
    }
  }

  protected resolutionTypeLabel(response: ResolveProductResponse): string {
    switch (response.type) {
      case 'concept_match':
        return 'Exact canonical match';
      case 'comparison':
        return 'Allowlisted comparison';
      case 'ambiguous_match':
        return 'Selection required';
      case 'rejected_concept':
        return 'Structurally rejected';
      case 'no_exact_match':
        return 'Refused';
      default:
        return 'Resolution';
    }
  }

  protected executionStateLabel(response: ResolveProductResponse): string {
    if (response.type === 'concept_match' || response.type === 'comparison') {
      return 'Executable';
    }

    if (response.type === 'rejected_concept') {
      return 'Rejected';
    }

    if (response.type === 'no_exact_match' && response.interpretation?.interpretationType === 'out_of_scope') {
      return 'Out-of-scope';
    }

    return 'Blocked';
  }

  protected runtimeScopeLabel(response: ResolveProductResponse): string {
    if (response.type === 'concept_match') {
      return this.scopeLabelForConcept(response.resolution.conceptId);
    }

    if (response.type === 'comparison') {
      const scopeA = this.scopeLabelForConcept(response.comparison.conceptA);
      const scopeB = this.scopeLabelForConcept(response.comparison.conceptB);

      return scopeA === scopeB ? scopeA : 'Bounded runtime v1';
    }

    return 'Bounded runtime v1';
  }

  protected reviewAdmissionLabel(admission: ReviewState['admission']): string {
    switch (admission) {
      case 'blocked':
        return 'Blocked';
      case 'phase1_passed':
        return 'Phase 1 Passed';
      case 'phase2_stable':
        return 'Phase 2 Stable';
      default:
        return admission;
    }
  }

  protected reviewValidationLabel(detail: ConceptDetailResponse): string {
    if (detail.reviewState?.validationSource === 'manual_review') {
      return detail.governanceState.available ? 'Manual Review + System Checks' : 'Manual Review';
    }

    return 'System Checks';
  }

  protected validationTraceToggleLabel(): string {
    return this.validationTraceVisible() ? 'Hide validation trace' : 'View validation trace';
  }

  protected toggleValidationTrace(): void {
    this.validationTraceVisible.update((value) => !value);
  }

  protected validationTraceRows(detail: ConceptDetailResponse): Array<{ label: string; value: string }> {
    return [
      {
        label: 'Admission',
        value: detail.reviewState ? this.reviewAdmissionLabel(detail.reviewState.admission) : 'Unavailable',
      },
      {
        label: 'Validation source',
        value: detail.reviewState?.validationSource === 'manual_review' ? 'Manual Review' : 'System Checks',
      },
      {
        label: 'Last validated',
        value: detail.reviewState?.lastValidatedAt ?? 'Unavailable',
      },
      {
        label: 'Runtime source',
        value: this.runtimeTraceSourceLabel(detail.governanceState),
      },
      {
        label: 'Runtime state',
        value: this.runtimeTraceStateLabel(detail.governanceState),
      },
    ];
  }

  protected reviewConceptTitle(detail: ConceptDetailResponse): string {
    return detail.title ?? this.formatConceptLabel(detail.conceptId);
  }

  protected reviewedNotLiveTitle(detail: ConceptDetailResponse): string {
    if (detail.reviewState?.admission === 'phase2_stable') {
      return 'Reviewed and stable, not yet live';
    }

    return 'Reviewed, not yet live';
  }

  protected reviewedNotLiveBody(detail: ConceptDetailResponse): string {
    if (detail.reviewState?.admission === 'phase2_stable') {
      return 'This concept has passed internal review and remains stable, but is not yet admitted to the live public runtime.';
    }

    return 'This concept has passed Phase 1 review but is not yet admitted to the live public runtime.';
  }

  protected blockedTitle(detail: ConceptDetailResponse | null | undefined): string {
    return detail?.reviewState?.admission === 'blocked'
      ? 'Blocked before runtime admission'
      : 'Structurally rejected';
  }

  protected blockedBody(
    response: NoExactMatchResponse | ResolveProductResponse,
    detail: ConceptDetailResponse | null | undefined,
  ): string {
    if (detail?.reviewState?.admission === 'blocked') {
      return 'This concept is currently blocked and is not admitted to the live public runtime.';
    }

    if (response.type === 'rejected_concept') {
      return response.message;
    }

    return this.noExactMatchPrimaryMessage(response as NoExactMatchResponse);
  }

  protected genericNoExactMatchTitle(response: NoExactMatchResponse): string {
    if (response.interpretation?.interpretationType === 'comparison_not_supported') {
      return 'Comparison pair not admitted';
    }

    if (response.interpretation?.interpretationType === 'canonical_lookup_not_found') {
      return 'No canonical lookup resolved';
    }

    return 'No canonical concept resolved';
  }

  protected noExactMatchPrimaryMessage(response: NoExactMatchResponse): string {
    return response.interpretation?.message ?? response.message;
  }

  protected noExactMatchSupportCopy(
    response: NoExactMatchResponse,
    detail: ConceptDetailResponse | null | undefined,
  ): string {
    if (this.isReviewedNotLive(detail)) {
      return 'Only live concepts resolve in the current public runtime.';
    }

    if (this.isBlockedConcept(response, detail)) {
      return 'Blocked concepts do not enter the live public runtime.';
    }

    if (response.interpretation?.interpretationType === 'comparison_not_supported') {
      return 'Comparison output is available only for authored, allowlisted pairs.';
    }

    return 'No exact concept exists in the current authored set for this query.';
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
      case 'rejection_registry':
        return 'Rejection registry';
      default:
        return method;
    }
  }

  protected queryTypeLabel(queryType: string): string {
    return queryType.replaceAll('_', ' ');
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

  protected feedbackOptionLabel(entryFeedback: RuntimeFeedbackState): string {
    const selectedOption = entryFeedback.options.find(
      (option) => option.value === entryFeedback.selectedOption,
    );

    return selectedOption?.label ?? 'Recorded';
  }

  protected formatConceptLabel(conceptId: string): string {
    return conceptId
      .split(/[-_]/)
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  }

  protected definitionParagraphs(fullDefinition: string): string[] {
    return fullDefinition.split('\n\n');
  }

  protected asConceptMatch(response: ResolveProductResponse): ConceptMatchResponse {
    return response as ConceptMatchResponse;
  }

  protected asComparison(response: ResolveProductResponse): ComparisonResponse {
    return response as ComparisonResponse;
  }

  protected asAmbiguousMatch(response: ResolveProductResponse): AmbiguousMatchResponse {
    return response as AmbiguousMatchResponse;
  }

  protected asNoExactMatch(response: ResolveProductResponse): NoExactMatchResponse {
    return response as NoExactMatchResponse;
  }

  protected comparisonAxisHasValues(axis: ComparisonAxis): axis is ComparisonAxisValue {
    return 'A' in axis && 'B' in axis;
  }

  protected refusalContractFields(): Array<{ label: string; value: string }> {
    return [
      {
        label: 'queryType',
        value: 'classifies the request form before resolution.',
      },
      {
        label: 'interpretation',
        value: 'records why the runtime refused the request.',
      },
      {
        label: 'resolution',
        value: 'keeps the public refusal method explicit.',
      },
      {
        label: 'message',
        value: 'returns bounded human-readable refusal text.',
      },
    ];
  }

  private classifyQuery(query: string): RuntimeQueryAssessment {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return {
        classification: 'empty',
        status: 'idle',
        label: 'Awaiting input',
        message: 'Enter a concept, canonical lookup, or allowlisted comparison.',
        canSubmit: false,
      };
    }

    if (trimmedQuery.startsWith('concept:')) {
      return {
        classification: 'direct_concept',
        status: 'valid',
        label: 'Direct concept',
        message: 'Internal canonical lookup will resolve through the live runtime path.',
        canSubmit: true,
      };
    }

    if (this.controlledComparisonPattern.test(trimmedQuery)) {
      return {
        classification: 'controlled_comparison',
        status: 'valid',
        label: 'Controlled comparison',
        message: 'Structured comparison recognized for deterministic execution.',
        canSubmit: true,
      };
    }

    if (this.canonicalLookupPattern.test(trimmedQuery)) {
      return {
        classification: 'canonical_lookup',
        status: 'valid',
        label: 'Canonical lookup',
        message: 'Structured lookup recognized for deterministic execution.',
        canSubmit: true,
      };
    }

    if (this.directConceptPattern.test(trimmedQuery)) {
      return {
        classification: 'direct_concept',
        status: 'valid',
        label: 'Direct concept',
        message: 'Structured concept query recognized for deterministic execution.',
        canSubmit: true,
      };
    }

    return {
      classification: 'unsupported',
      status: 'invalid',
      label: 'Unsupported',
      message: 'This input does not match a supported runtime query form.',
      canSubmit: false,
    };
  }

  private scopeLabelForConcept(conceptId: string): string {
    return RUNTIME_SCOPE_BY_CONCEPT[conceptId] ?? 'Bounded runtime v1';
  }

  private isReviewedNotLive(detail: ConceptDetailResponse | null | undefined): boolean {
    const admission = detail?.reviewState?.admission;
    return admission ? REVIEWED_NOT_LIVE_ADMISSIONS.has(admission) : false;
  }

  private isBlockedConcept(
    response: ResolveProductResponse,
    detail: ConceptDetailResponse | null | undefined,
  ): boolean {
    return response.type === 'rejected_concept' || detail?.reviewState?.admission === 'blocked';
  }

  private updateFeedback(
    patch: Partial<Pick<RuntimeFeedbackState, 'status' | 'selectedOption' | 'errorMessage'>>,
  ): void {
    this.activeEntry.update((entry) => {
      if (!entry?.feedback) {
        return entry;
      }

      return {
        ...entry,
        feedback: {
          ...entry.feedback,
          ...patch,
        },
      };
    });
  }

  private buildFeedbackState(
    response: ResolveProductResponse,
    detail: ConceptDetailResponse | null,
    feedbackOrigin?: AmbiguousSelectionOrigin,
  ): RuntimeFeedbackState | undefined {
    if (detail?.reviewState) {
      return undefined;
    }

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

  private describeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 400) {
        return 'Enter a concept query to continue.';
      }

      if (error.status === 0) {
        return 'Runtime unavailable. Check that the ChatPDM backend is running on port 4301.';
      }
    }

    return 'ChatPDM could not return a runtime response for this request.';
  }

  private async loadRefusalBehavior(): Promise<void> {
    this.refusalBehaviorState.set({
      status: 'loading',
      examples: [],
    });

    try {
      const examples = await Promise.all(
        REFUSAL_ATLAS_QUERIES.map(async (query) => {
          const response = await firstValueFrom(this.resolver.resolve(query));
          const detail = await this.loadConceptDetail(query, response);
          return this.buildRefusalAtlasEntry(query, response, detail);
        }),
      );

      this.refusalBehaviorState.set({
        status: 'ready',
        examples,
      });
    } catch {
      this.refusalBehaviorState.set({
        status: 'error',
        examples: [],
        errorMessage: 'Refusal examples are unavailable until the public runtime can be reached.',
      });
    }
  }

  private scheduleScrollToResult(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.requestAnimationFrame(() => {
      this.scrollToResult();
    });
  }

  private scrollToResult(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const element = document.getElementById('pdm-runtime-result');

    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const elementTop = rect.top + window.scrollY;
    const viewportHeight = window.innerHeight;
    let y = elementTop - (viewportHeight * 0.16);
    const maxOffset = elementTop - 40;
    y = Math.min(y, maxOffset);
    const maxY = Math.max(document.documentElement.scrollHeight - viewportHeight, 0);

    window.scrollTo({
      top: Math.min(Math.max(y, 0), maxY),
      behavior: 'smooth',
    });
  }

  private buildRefusalAtlasEntry(
    query: string,
    response: ResolveProductResponse,
    detail: ConceptDetailResponse | null,
  ): RefusalAtlasEntry {
    if (this.isReviewedNotLive(detail)) {
      return {
        key: 'not_admitted',
        query,
        classLabel: 'Not admitted to runtime',
        classMeaning: 'The concept exists but is not admitted to the public runtime.',
        outcome: 'not_admitted',
        interpretation: detail?.reviewState ? `review_state.${detail.reviewState.admission}` : 'review_state',
        reason: 'Concept exists but is not admitted to the public runtime.',
        queryType: response.queryType,
        resolution: this.refusalResolutionMethod(response),
        message: response.interpretation?.message ?? this.refusalMessage(response),
      };
    }

    if (this.isBlockedConcept(response, detail)) {
      return {
        key: 'blocked',
        query,
        classLabel: 'Blocked concept',
        classMeaning: 'The concept is blocked before runtime admission and remains a refusal in public output.',
        outcome: 'blocked',
        interpretation: detail?.reviewState ? `review_state.${detail.reviewState.admission}` : response.type,
        reason: 'Concept is blocked before runtime admission.',
        queryType: response.queryType,
        resolution: this.refusalResolutionMethod(response),
        message: response.interpretation?.message ?? this.refusalMessage(response),
      };
    }

    if (response.type === 'no_exact_match' && response.interpretation?.interpretationType === 'comparison_not_supported') {
      return {
        key: 'comparison_not_allowlisted',
        query,
        classLabel: 'Comparison not allowlisted',
        classMeaning: 'Comparison output appears only for authored, allowlisted pairs in the current runtime.',
        outcome: 'comparison_refused',
        interpretation: response.interpretation.interpretationType,
        reason: 'Comparison output is available only for authored, allowlisted pairs.',
        queryType: response.queryType,
        resolution: response.resolution.method,
        message: response.interpretation.message,
      };
    }

    return {
      key: 'unsupported_composition',
      query,
      classLabel: 'Unsupported composition',
      classMeaning: 'The query uses a request form the current runtime does not admit.',
      outcome: 'unsupported',
      interpretation: response.type === 'no_exact_match'
        ? (response.interpretation?.interpretationType ?? response.queryType)
        : response.type,
      reason: response.type === 'no_exact_match'
        ? (response.interpretation?.message ?? response.message)
        : this.refusalMessage(response),
      queryType: response.queryType,
      resolution: this.refusalResolutionMethod(response),
      message: this.refusalMessage(response),
    };
  }

  private refusalResolutionMethod(response: ResolveProductResponse): string {
    return 'resolution' in response ? response.resolution.method : response.type;
  }

  private refusalMessage(response: ResolveProductResponse): string {
    return 'message' in response ? response.message : 'Structured runtime output returned.';
  }

  private async loadConceptDetail(
    query: string,
    response: ResolveProductResponse,
  ): Promise<ConceptDetailResponse | null> {
    const conceptId = this.detailConceptId(query, response);

    if (!conceptId) {
      return null;
    }

    try {
      return await firstValueFrom(this.resolver.detail(conceptId));
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        return null;
      }

      return null;
    }
  }

  private detailConceptId(query: string, response: ResolveProductResponse): string | null {
    if (response.type === 'concept_match' || response.type === 'rejected_concept') {
      return response.resolution.conceptId;
    }

    if (response.type !== 'no_exact_match') {
      return null;
    }

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return null;
    }

    if (trimmedQuery.startsWith('concept:')) {
      const conceptId = trimmedQuery.slice('concept:'.length).trim();
      return conceptId || null;
    }

    if (this.canonicalLookupPattern.test(trimmedQuery)) {
      return trimmedQuery.replace(/^define\s+/i, '').trim() || null;
    }

    if (this.directConceptPattern.test(trimmedQuery)) {
      return trimmedQuery;
    }

    return null;
  }

  private runtimeTraceSourceLabel(governanceState: GovernanceState): string {
    return governanceState.source === 'validator_artifact' ? 'Validator Artifact' : 'Unavailable';
  }

  private runtimeTraceStateLabel(governanceState: GovernanceState): string {
    if (governanceState.systemValidationState) {
      return governanceState.systemValidationState.replaceAll('_', ' ');
    }

    if (governanceState.trace.unavailableReason) {
      return governanceState.trace.unavailableReason.replaceAll('_', ' ');
    }

    return 'Unavailable';
  }
}

import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
  RefusalResponse,
  RelatedConcept,
  ResolveProductResponse,
  ReviewState,
  Suggestion,
} from '../../core/concepts/concept-resolver.types';
import {
  DETAIL_BACKED_CONCEPT_IDS,
  LIVE_RUNTIME_CONCEPT_IDS,
  REJECTED_CONCEPT_IDS,
  RUNTIME_SCOPE_BY_CONCEPT,
  VISIBLE_ONLY_PUBLIC_CONCEPT_IDS,
} from '../../core/concepts/public-runtime.catalog';
import { VocabularyPanelComponent } from '../../core/concepts/vocabulary-panel/vocabulary-panel.component';
import { InspectableItemDisclosureComponent } from '../../core/concepts/inspectable-item-disclosure/inspectable-item-disclosure.component';
import {
  buildInspectableItemDisclosureCoreData,
  type InspectableItemDisclosureCoreData,
} from '../../core/concepts/inspectable-item-disclosure/inspectable-item-disclosure.model';
import { FeedbackService } from '../../core/feedback/feedback.service';
import type {
  FeedbackResponseType,
  FeedbackSubmissionContext,
  FeedbackType,
} from '../../core/feedback/feedback.types';

const REVIEWED_NOT_LIVE_ADMISSIONS = new Set<ReviewState['admission']>([
  'visible_only_derived',
  'phase1_passed',
  'phase2_stable',
  'pending_overlap_scan',
  'overlap_scan_passed',
  'overlap_scan_failed_conflict',
  'overlap_scan_failed_duplicate',
  'overlap_scan_failed_compression',
  'overlap_scan_boundary_required',
]);
const DETAIL_BACKED_CONCEPTS = new Set(DETAIL_BACKED_CONCEPT_IDS);
const VISIBLE_ONLY_PUBLIC_CONCEPTS = new Set(VISIBLE_ONLY_PUBLIC_CONCEPT_IDS);
const VOCABULARY_TERM_IDS = new Set<string>(['obligation', 'liability', 'jurisdiction']);

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
  | 'ready';

type RuntimeDisplayState =
  | 'concept_match'
  | 'comparison'
  | 'ambiguous_match'
  | 'reviewed_not_live'
  | 'visible_only'
  | 'blocked'
  | 'refused';

interface RuntimeQueryAssessment {
  classification: QueryClassification;
  status: 'idle' | 'valid';
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
  key:
    | 'visible_only'
    | 'not_admitted'
    | 'blocked'
    | 'vocabulary'
    | 'comparison_not_allowlisted'
    | 'unsupported_composition';
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
  'obligation',
  'what is charisma',
  'authority vs duty',
  'who creates law?',
]);

const REFUSAL_BOUNDARY_STATES = Object.freeze<RefusalBoundaryState[]>([
  {
    label: 'Live',
    copy: 'Admitted concepts resolve with authored output.',
  },
  {
    label: 'Visible only',
    copy: 'Authored concept detail may stay inspectable without runtime admission.',
  },
  {
    label: 'Rejected',
    copy: 'Structurally rejected concepts remain visible as refusal surfaces only.',
  },
  {
    label: 'Unsupported',
    copy: 'No admitted structure exists for the current query form.',
  },
]);

@Component({
  selector: 'app-runtime-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    VocabularyPanelComponent,
    InspectableItemDisclosureComponent,
  ],
  templateUrl: './runtime-page.component.html',
  styleUrl: './runtime-page.component.css',
})
export class RuntimePageComponent implements OnInit {
  private readonly resolver = inject(ConceptResolverService);
  private readonly feedbackService = inject(FeedbackService);

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
  protected readonly visibleOnlyConceptIds = VISIBLE_ONLY_PUBLIC_CONCEPT_IDS;
  protected readonly rejectedConceptIds = REJECTED_CONCEPT_IDS.filter(
    (conceptId) => !VOCABULARY_TERM_IDS.has(conceptId),
  );
  protected readonly queryAssessment = computed(() => this.classifyQuery(this.queryDraft()));
  protected readonly liveConceptCount = LIVE_RUNTIME_CONCEPT_IDS.length;

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

    if (this.isVisibleOnlyConcept(entry.detail)) {
      return 'visible_only';
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
      case 'VOCABULARY_DETECTED':
        return 'Vocabulary detected';
      case 'rejected_concept':
        return 'Structurally rejected';
      case 'no_exact_match':
        return 'No exact match';
      case 'invalid_query':
        return 'Invalid query input';
      case 'unsupported_query_type':
        return 'Unsupported query type';
      default:
        return 'Resolution';
    }
  }

  protected executionStateLabel(response: ResolveProductResponse): string {
    if (response.type === 'concept_match' || response.type === 'comparison') {
      return 'Executable';
    }

    if (response.type === 'VOCABULARY_DETECTED') {
      return 'Excluded';
    }

    if (response.type === 'rejected_concept') {
      return 'Rejected';
    }

    if (response.type === 'invalid_query' || response.type === 'unsupported_query_type') {
      return 'Refused';
    }

    if (response.type === 'no_exact_match' && response.interpretation?.interpretationType === 'out_of_scope') {
      return 'Out-of-scope';
    }

    const guardLabel = this.preResolutionGuardStatusLabel(response.interpretation?.interpretationType);

    if (guardLabel) {
      return guardLabel;
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
      case 'visible_only_derived':
        return 'Derived from duty evaluation';
      case 'phase1_passed':
        return 'Phase 1 Passed';
      case 'phase2_stable':
        return 'Phase 2 Stable';
      case 'pending_overlap_scan':
        return 'Pending Overlap Scan';
      case 'overlap_scan_passed':
        return 'Overlap Scan Passed';
      case 'overlap_scan_failed_conflict':
        return 'Overlap Scan Failed: Conflict';
      case 'overlap_scan_failed_duplicate':
        return 'Overlap Scan Failed: Duplicate';
      case 'overlap_scan_failed_compression':
        return 'Overlap Scan Failed: Compression';
      case 'overlap_scan_boundary_required':
        return 'Overlap Scan: Boundary Proof Required';
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
    if (detail.reviewState?.admission === 'visible_only_derived') {
      return 'Derived concept, inspectable only';
    }

    if (detail.reviewState?.admission === 'phase2_stable') {
      return 'Reviewed and stable, not yet live';
    }

    return 'Reviewed, not yet live';
  }

  protected reviewedNotLiveBody(detail: ConceptDetailResponse): string {
    if (detail.reviewState?.admission === 'visible_only_derived') {
      return 'This concept is derived from duty evaluation and remains inspectable without entering the live public runtime.';
    }

    if (detail.reviewState?.admission === 'phase2_stable') {
      return 'This concept has passed internal review and remains stable, but is not yet admitted to the live public runtime.';
    }

    return 'This concept has passed Phase 1 review but is not yet admitted to the live public runtime.';
  }

  protected visibleOnlyTitle(detail: ConceptDetailResponse): string {
    return detail.title ?? this.formatConceptLabel(detail.conceptId);
  }

  protected visibleOnlyDisclosureData(detail: ConceptDetailResponse): InspectableItemDisclosureCoreData | null {
    return buildInspectableItemDisclosureCoreData(detail);
  }

  protected visibleOnlySupportCopy(detail?: ConceptDetailResponse): string {
    if (detail?.reviewState?.admission === 'visible_only_derived') {
      return 'Derived concepts remain visible only for inspection and explanation; they do not enter live runtime resolution or comparison support.';
    }

    return 'Visible-only concepts expose authored detail without entering live runtime resolution or comparison support.';
  }

  protected visibleOnlyScopeLabel(detail: ConceptDetailResponse): string {
    return this.scopeLabelForConcept(detail.conceptId);
  }

  protected blockedTitle(detail: ConceptDetailResponse | null | undefined): string {
    return detail?.reviewState?.admission === 'blocked'
      ? 'Blocked before runtime admission'
      : 'Structurally rejected';
  }

  protected blockedSectionLabel(
    response: NoExactMatchResponse | ResolveProductResponse,
    detail: ConceptDetailResponse | null | undefined,
  ): string {
    return detail?.reviewState?.admission === 'blocked' || response.type !== 'rejected_concept'
      ? 'Blocked concept'
      : 'Rejected concept';
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

    return this.refusalPrimaryMessage(response as RefusalResponse);
  }

  protected blockedSupportCopy(
    response: NoExactMatchResponse | ResolveProductResponse,
    detail: ConceptDetailResponse | null | undefined,
  ): string {
    return detail?.reviewState?.admission === 'blocked'
      ? 'Refusal is the correct public output for blocked concepts.'
      : 'Refusal is the correct public output for structurally rejected concepts.';
  }

  protected genericNoExactMatchTitle(response: NoExactMatchResponse): string {
    if (response.interpretation?.interpretationType === 'visible_only_public_concept') {
      return 'Visible in public scope, not live';
    }

    if (response.interpretation?.interpretationType === 'comparison_not_supported') {
      return 'Comparison pair not admitted';
    }

    if (response.interpretation?.interpretationType === 'canonical_lookup_not_found') {
      return 'No canonical lookup resolved';
    }

    const guardTitle = this.preResolutionGuardTitle(response.interpretation?.interpretationType);

    if (guardTitle) {
      return guardTitle;
    }

    return 'No canonical concept resolved';
  }

  protected refusalTitle(response: RefusalResponse): string {
    if (response.type === 'VOCABULARY_DETECTED') {
      return 'Recognized term, excluded from resolution';
    }

    if (response.type === 'invalid_query') {
      return 'Invalid query input';
    }

    if (response.type === 'unsupported_query_type') {
      return 'Unsupported query type';
    }

    return this.genericNoExactMatchTitle(response);
  }

  protected refusalPrimaryMessage(response: RefusalResponse): string {
    return response.interpretation?.message ?? response.message;
  }

  protected refusalSupportCopy(
    response: RefusalResponse,
    detail: ConceptDetailResponse | null | undefined,
  ): string {
    if (response.type === 'VOCABULARY_DETECTED') {
      return 'Vocabulary can be classified and displayed, but it never enters deterministic resolution.';
    }

    if (this.isVisibleOnlyRefusal(response, detail)) {
      return this.visibleOnlySupportCopy(detail ?? undefined);
    }

    if (this.isReviewedNotLive(detail)) {
      return 'Only live concepts resolve in the current public runtime.';
    }

    if (this.isBlockedConcept(response, detail)) {
      return 'Blocked concepts do not enter the live public runtime.';
    }

    if (response.type === 'invalid_query') {
      return 'The runtime does not infer missing meaning from noise input.';
    }

    if (response.type === 'unsupported_query_type') {
      return 'This runtime supports exact concept resolution and allowlisted comparisons only.';
    }

    const guardSupportCopy = this.preResolutionGuardSupportCopy(response.interpretation?.interpretationType);

    if (guardSupportCopy) {
      return guardSupportCopy;
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
      case 'invalid_query':
        return 'Invalid query';
      case 'rejection_registry':
        return 'Rejection registry';
      case 'vocabulary_guard':
        return 'Vocabulary guard';
      case 'unsupported_query_type':
        return 'Unsupported query type';
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

  protected asConceptMatch(response: ResolveProductResponse): ConceptMatchResponse {
    return response as ConceptMatchResponse;
  }

  protected asComparison(response: ResolveProductResponse): ComparisonResponse {
    return response as ComparisonResponse;
  }

  protected asAmbiguousMatch(response: ResolveProductResponse): AmbiguousMatchResponse {
    return response as AmbiguousMatchResponse;
  }

  protected asRefusal(response: ResolveProductResponse): RefusalResponse {
    return response as RefusalResponse;
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
    if (!query.trim()) {
      return {
        classification: 'empty',
        status: 'idle',
        label: 'Waiting for a question',
        message: 'Enter a question or request to see how the runtime responds.',
        canSubmit: false,
      };
    }

    return {
      classification: 'ready',
      status: 'valid',
      label: 'Ready to check',
      message: 'This question is ready for the live runtime to check.',
      canSubmit: true,
    };
  }

  private scopeLabelForConcept(conceptId: string): string {
    return RUNTIME_SCOPE_BY_CONCEPT[conceptId] ?? 'Bounded runtime v1';
  }

  private isReviewedNotLive(detail: ConceptDetailResponse | null | undefined): boolean {
    const admission = detail?.reviewState?.admission;
    return admission ? REVIEWED_NOT_LIVE_ADMISSIONS.has(admission) : false;
  }

  private isVisibleOnlyConcept(detail: ConceptDetailResponse | null | undefined): boolean {
    return detail?.conceptId ? VISIBLE_ONLY_PUBLIC_CONCEPTS.has(detail.conceptId) : false;
  }

  private isVisibleOnlyRefusal(
    response: RefusalResponse | ResolveProductResponse,
    detail: ConceptDetailResponse | null | undefined,
  ): boolean {
    return this.isVisibleOnlyConcept(detail)
      || (response.type === 'no_exact_match'
        && response.interpretation?.interpretationType === 'visible_only_public_concept');
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

    const normalizedCandidate = response.normalizedQuery.trim();
    if (DETAIL_BACKED_CONCEPTS.has(normalizedCandidate)) {
      return normalizedCandidate;
    }

    return null;
  }

  protected refusalHasSuggestions(response: RefusalResponse): response is NoExactMatchResponse {
    return response.type === 'no_exact_match' && response.suggestions.length > 0;
  }

  protected refusalSuggestions(response: RefusalResponse): Suggestion[] {
    return response.type === 'no_exact_match' ? response.suggestions : [];
  }

  private buildFeedbackState(
    response: ResolveProductResponse,
    detail: ConceptDetailResponse | null,
    feedbackOrigin?: AmbiguousSelectionOrigin,
  ): RuntimeFeedbackState | undefined {
    if (
      detail?.reviewState
      || this.isVisibleOnlyConcept(detail)
      || (response.type === 'no_exact_match'
        && response.interpretation?.interpretationType === 'visible_only_public_concept')
    ) {
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
        return 'Enter any non-empty query to continue.';
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
    if (response.type === 'no_exact_match' && response.interpretation?.interpretationType === 'visible_only_public_concept') {
      return {
        key: 'visible_only',
        query,
        classLabel: 'Visible-only concept',
        classMeaning: 'The concept is publicly visible and inspectable, but it is not admitted to the live public runtime.',
        outcome: 'visible_only',
        interpretation: response.interpretation.interpretationType,
        reason: response.interpretation.message,
        queryType: response.queryType,
        resolution: response.resolution.method,
        message: response.interpretation.message,
      };
    }

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

    if (response.type === 'VOCABULARY_DETECTED') {
      return {
        key: 'vocabulary',
        query,
        classLabel: 'Vocabulary detected',
        classMeaning: 'The term is recognized, classified, and kept outside the core resolver.',
        outcome: 'vocabulary_refused',
        interpretation: 'vocabulary_only',
        reason: response.message,
        queryType: response.queryType,
        resolution: response.resolution.method,
        message: response.message,
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

    const guardTitle = response.type === 'no_exact_match'
      ? this.preResolutionGuardTitle(response.interpretation?.interpretationType)
      : null;

    if (guardTitle) {
      return {
        key: 'unsupported_composition',
        query,
        classLabel: guardTitle,
        classMeaning: this.preResolutionGuardSupportCopy(response.interpretation?.interpretationType)
          ?? 'The runtime refuses this input before concept resolution.',
        outcome: 'refused',
        interpretation: response.interpretation?.interpretationType ?? response.type,
        reason: response.interpretation?.message ?? this.refusalMessage(response),
        queryType: response.queryType,
        resolution: this.refusalResolutionMethod(response),
        message: response.interpretation?.message ?? this.refusalMessage(response),
      };
    }

    return {
      key: 'unsupported_composition',
      query,
      classLabel: response.type === 'invalid_query' ? 'Invalid query input' : 'Unsupported composition',
      classMeaning: response.type === 'invalid_query'
        ? 'No recognizable concept or supported query structure was detected.'
        : 'The query uses a request form the current runtime does not admit.',
      outcome: response.type === 'invalid_query' ? 'invalid_query' : 'unsupported',
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

  private preResolutionGuardStatusLabel(interpretationType: string | undefined): string | null {
    switch (interpretationType) {
      case 'unresolved_domain':
        return 'Unresolved domain';
      case 'unsupported_semantic_bridge':
        return 'Unsupported bridge';
      case 'domain_boundary_violation':
        return 'Domain boundary';
      case 'causal_overreach':
        return 'Causal overreach';
      default:
        return null;
    }
  }

  private preResolutionGuardTitle(interpretationType: string | undefined): string | null {
    switch (interpretationType) {
      case 'unresolved_domain':
        return 'Unresolved domain refused';
      case 'unsupported_semantic_bridge':
        return 'Unsupported semantic bridge';
      case 'domain_boundary_violation':
        return 'Domain boundary violation';
      case 'causal_overreach':
        return 'Causal overreach';
      default:
        return null;
    }
  }

  private preResolutionGuardSupportCopy(interpretationType: string | undefined): string | null {
    switch (interpretationType) {
      case 'unresolved_domain':
        return 'The runtime refuses unresolved domains instead of trying to infer a meaning.';
      case 'unsupported_semantic_bridge':
        return 'The runtime refuses unsupported bridges instead of promoting a leap between claims.';
      case 'domain_boundary_violation':
        return 'The runtime refuses cross-domain jumps without a validated bridge.';
      case 'causal_overreach':
        return 'The runtime refuses causal overreach instead of treating correlation as proof.';
      default:
        return null;
    }
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

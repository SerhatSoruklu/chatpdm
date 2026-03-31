import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ConceptResolverService } from '../../core/concepts/concept-resolver.service';
import {
  AmbiguousCandidate,
  AmbiguousMatchResponse,
  ComparisonAxis,
  ComparisonAxisValue,
  ConceptDetailResponse,
  ConceptMatchResponse,
  ConceptSource,
  GovernanceState,
  ReadingRegisters,
  NoExactMatchResponse,
  RejectedConceptResponse,
  RelatedConcept,
  ReviewState,
  ResolveProductResponse,
  Suggestion,
} from '../../core/concepts/concept-resolver.types';
import { AiAdvisoryComponent } from '../../core/ai/ai-advisory/ai-advisory.component';
import { AiTrackingEventType, AiTrackingService } from '../../core/ai/ai-tracking.service';
import { ExamplePreviewComponent } from '../../core/preview/example-preview.component';
import { PdmTooltipDirective } from '../../core/ui/tooltip/pdm-tooltip.directive';
import {
  CANONICAL_VISUAL_ANCHOR_HASH_LENGTH,
  READING_LENS_FALLBACK_COPY,
  READING_LENS_OPTIONS,
  READING_LENS_TRUST_COPY,
  ReadingLensMode,
} from '../../core/concepts/derived-explanation-reading-lens-ui.policy';
import {
  DETAIL_BACKED_CONCEPT_IDS,
  LIVE_RUNTIME_CONCEPT_IDS,
  REVIEWED_CONCEPT_IDS,
  RUNTIME_SCOPE_BY_CONCEPT,
} from '../../core/concepts/public-runtime.catalog';
import { FeedbackService } from '../../core/feedback/feedback.service';
import type {
  AmbiguousSelectionOrigin,
  EntryFeedbackState,
  FeedbackOption,
  HomepageStep,
  LandingComparisonResponse,
  LinkAction,
  ResolverEntry,
  ScopeGroup,
  StarterQuery,
  SubmitQueryOptions,
} from './landing-page.types';

const LIVE_RUNTIME_CONCEPTS = new Set(LIVE_RUNTIME_CONCEPT_IDS);
const REVIEWED_CONCEPTS = new Set(REVIEWED_CONCEPT_IDS);
const DETAIL_BACKED_CONCEPTS = new Set(DETAIL_BACKED_CONCEPT_IDS);
const REVIEWED_NOT_LIVE_ADMISSIONS = new Set<ReviewState['admission']>([
  'phase1_passed',
  'phase2_stable',
]);

const SCOPE_GROUPS: ScopeGroup[] = [
  {
    id: 'core-abstractions',
    title: 'Core abstractions',
    concepts: ['meaning', 'truth', 'identity', 'freedom', 'equality', 'responsibility'],
  },
  {
    id: 'relational-structures',
    title: 'Relational structures',
    concepts: ['authority', 'power', 'legitimacy', 'consent', 'trust', 'recognition', 'conflict'],
  },
  {
    id: 'governance-structures',
    title: 'Governance structures',
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
  { label: 'authority vs power', query: 'authority vs power' },
  { label: 'authority', query: 'authority' },
  { label: 'legitimacy', query: 'legitimacy' },
  { label: 'duty', query: 'duty' },
  { label: 'responsibility', query: 'responsibility' },
];

type QueryClassification =
  | 'empty'
  | 'direct_concept'
  | 'canonical_lookup'
  | 'controlled_comparison'
  | 'unsupported';

interface QueryEntryMode {
  label: string;
  example: string;
}

interface QueryAssessment {
  classification: QueryClassification;
  status: 'idle' | 'valid' | 'invalid';
  label: string;
  line: string;
  message: string;
  canSubmit: boolean;
}

interface ActiveReadingFields {
  shortDefinition: string;
  coreMeaning: string;
  fullDefinition: string;
}

const QUERY_ENTRY_MODES: QueryEntryMode[] = [
  { label: 'Direct concept', example: 'authority' },
  { label: 'Canonical lookup', example: 'define legitimacy' },
  { label: 'Controlled comparison', example: 'authority vs power' },
];

const HOMEPAGE_STEPS: HomepageStep[] = [
  {
    id: 'enter',
    sequence: '01',
    label: 'Input',
    title: 'Input is normalized',
    copy: 'Incoming queries are normalized inside the authored runtime.',
  },
  {
    id: 'classify',
    sequence: '02',
    label: 'Routing',
    title: 'Query shape is classified',
    copy: 'Query shape routes to canonical match, comparison, ambiguity, or refusal.',
  },
  {
    id: 'return',
    sequence: '03',
    label: 'Output',
    title: 'Runtime resolves or refuses',
    copy: 'The system returns authored output or explicit refusal.',
  },
];

const REFERENCE_LINKS: LinkAction[] = [
  { label: 'Docs', route: '/docs' },
  { label: 'API', route: '/api' },
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
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    AiAdvisoryComponent,
    ExamplePreviewComponent,
    PdmTooltipDirective,
  ],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.css',
})
export class LandingPageComponent {
  private readonly resolver = inject(ConceptResolverService);
  private readonly aiTracking = inject(AiTrackingService);
  private readonly feedbackService = inject(FeedbackService);
  private readonly directConceptPattern = /^[a-z]+(?:[ -][a-z]+){0,3}$/i;
  private readonly canonicalLookupPattern = /^define\s+[a-z]+(?:[ -][a-z]+){0,3}$/i;
  private readonly controlledComparisonPattern =
    /^[a-z]+(?:[ -][a-z]+){0,3}\s+vs\s+[a-z]+(?:[ -][a-z]+){0,3}$/i;

  protected readonly queryDraft = signal('');
  protected readonly activeEntry = signal<ResolverEntry | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly scopeGroups = SCOPE_GROUPS;
  protected readonly starterQueries = STARTER_QUERIES;
  protected readonly queryEntryModes = QUERY_ENTRY_MODES;
  protected readonly homepageSteps = HOMEPAGE_STEPS;
  protected readonly referenceLinks = REFERENCE_LINKS;
  protected readonly liveRuntimeConceptIds = LIVE_RUNTIME_CONCEPT_IDS;
  protected readonly reviewedConceptIds = REVIEWED_CONCEPT_IDS;
  protected readonly readingLensOptions = READING_LENS_OPTIONS;
  protected readonly readingLensTrustCopy = READING_LENS_TRUST_COPY;
  protected readonly readingLensFallbackCopy = READING_LENS_FALLBACK_COPY;
  protected readonly queryAssessment = computed(() => this.classifyQuery(this.queryDraft()));
  protected readonly liveConceptCount = LIVE_RUNTIME_CONCEPTS.size;
  protected readonly scopedConceptCount = SCOPE_GROUPS.reduce(
    (count, group) => count + group.concepts.length,
    0,
  );
  protected readonly activeReadingLens = signal<ReadingLensMode>('standard');
  protected readonly validationTraceVisible = signal(false);

  protected async submitDraft(): Promise<void> {
    if (!this.canSubmitDraft()) {
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

    const submittedQuery = options.displayQuery ?? query.trim();

    this.activeReadingLens.set('standard');
    this.validationTraceVisible.set(false);
    this.isSubmitting.set(true);
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

    const element = document.querySelector<HTMLElement>('.pdm-home__response-card')
      ?? document.querySelector<HTMLElement>('.pdm-home__state-card');

    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const elementTop = rect.top + window.scrollY;
    const viewportHeight = window.innerHeight;
    let y = elementTop - (viewportHeight * 0.35);
    const maxOffset = elementTop - 60;
    y = Math.min(y, maxOffset);
    const maxY = Math.max(document.documentElement.scrollHeight - viewportHeight, 0);

    window.scrollTo({
      top: Math.min(Math.max(y, 0), maxY),
      behavior: 'smooth',
    });
  }

  protected isLiveConcept(concept: string): boolean {
    return LIVE_RUNTIME_CONCEPTS.has(concept);
  }

  protected isKnownConceptDetail(concept: string): boolean {
    return DETAIL_BACKED_CONCEPTS.has(concept);
  }

  protected isReviewedConcept(concept: string): boolean {
    return REVIEWED_CONCEPTS.has(concept);
  }

  protected fillStarterQuery(query: string): void {
    this.queryDraft.set(query);
  }

  protected canSubmitDraft(): boolean {
    return this.queryAssessment().canSubmit && !this.isSubmitting();
  }

  protected submitButtonTooltip(): string | null {
    if (this.isSubmitting()) {
      return null;
    }

    if (this.queryAssessment().canSubmit) {
      return null;
    }

    return 'Enter a valid concept or structured query';
  }

  protected async submitScopedConcept(concept: string): Promise<void> {
    if (!this.isLiveConcept(concept) && !this.isKnownConceptDetail(concept)) {
      return;
    }

    await this.submitQuery(concept, {
      displayQuery: this.formatConceptLabel(concept),
    });
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

  protected async submitFeedback(option: FeedbackOption): Promise<void> {
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

  protected resolutionTypeLabel(response: ResolveProductResponse): string {
    switch (response.type) {
      case 'concept_match':
        return 'Exact canonical match';
      case 'rejected_concept':
        return 'Structurally rejected';
      case 'comparison':
        return 'Comparison mode';
      case 'ambiguous_match':
        return 'Selection required';
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

  protected sourceRankLabel(index: number): string {
    return index === 0 ? 'Primary source' : 'Reference source';
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

  protected sourceTypeCode(type: ConceptSource['type']): string {
    switch (type) {
      case 'dictionary':
        return 'D';
      case 'book':
        return 'B';
      case 'paper':
        return 'P';
      case 'law':
        return 'L';
      case 'article':
        return 'A';
      case 'internal':
        return 'I';
      default:
        return '?';
    }
  }

  protected responseLabel(response: ResolveProductResponse): string {
    switch (response.type) {
      case 'comparison':
        return 'Controlled comparison';
      case 'concept_match':
        return 'Canonical concept';
      case 'rejected_concept':
        return 'Governed refusal';
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
      case 'rejection_registry':
        return 'Rejection registry';
      default:
        return method;
    }
  }

  protected feedbackOptionLabel(entryFeedback: EntryFeedbackState): string {
    const selectedOption = entryFeedback.options.find(
      (option) => option.value === entryFeedback.selectedOption,
    );

    return selectedOption?.label ?? 'Recorded';
  }

  protected contextUsages(context: { label: string; appliesTo: string[] }): string[] {
    return context.appliesTo.filter(
      (usage) => usage.toLowerCase() !== context.label.toLowerCase(),
    );
  }

  protected queryTypeLabel(queryType: string): string {
    return queryType.replaceAll('_', ' ');
  }

  protected axisLabel(axis: string): string {
    return axis.replaceAll('_', ' ');
  }

  protected formatConceptLabel(conceptId: string): string {
    return conceptId
      .split(/[-_]/)
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  }

  protected comparisonAxisHasValues(axis: ComparisonAxis): axis is ComparisonAxisValue {
    return 'A' in axis && 'B' in axis;
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

  protected asRejectedConcept(response: ResolveProductResponse): RejectedConceptResponse {
    return response as RejectedConceptResponse;
  }

  protected asComparison(response: ResolveProductResponse): LandingComparisonResponse {
    return response as LandingComparisonResponse;
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

  protected isReviewedNotLive(detail: ConceptDetailResponse | null | undefined): boolean {
    const admission = detail?.reviewState?.admission;
    return admission ? REVIEWED_NOT_LIVE_ADMISSIONS.has(admission) : false;
  }

  protected noExactMatchStripLabel(detail: ConceptDetailResponse | null | undefined): string {
    return this.isReviewedNotLive(detail) ? 'Runtime' : 'Resolution';
  }

  protected noExactMatchResolutionValue(
    response: NoExactMatchResponse,
    detail: ConceptDetailResponse | null | undefined,
  ): string {
    return this.isReviewedNotLive(detail) ? 'Not yet live' : this.resolutionTypeLabel(response);
  }

  protected noExactMatchExecutionValue(
    response: NoExactMatchResponse,
    detail: ConceptDetailResponse | null | undefined,
  ): string {
    return this.isReviewedNotLive(detail) ? 'Not admitted' : this.executionStateLabel(response);
  }

  protected noExactMatchResponseLabel(detail: ConceptDetailResponse | null | undefined): string {
    return this.isReviewedNotLive(detail) ? 'Reviewed concept' : 'No exact match';
  }

  protected noExactMatchTitle(detail: ConceptDetailResponse | null | undefined): string {
    switch (detail?.reviewState?.admission) {
      case 'phase2_stable':
        return 'Reviewed and stable, not yet live';
      case 'phase1_passed':
        return 'Reviewed, not yet live';
      default:
        return 'No canonical concept resolved';
    }
  }

  protected noExactMatchBody(
    response: NoExactMatchResponse,
    detail: ConceptDetailResponse | null | undefined,
  ): string {
    switch (detail?.reviewState?.admission) {
      case 'phase2_stable':
        return 'This concept has passed internal review and remains stable, but is not yet admitted to the live public runtime.';
      case 'phase1_passed':
        return 'This concept has passed Phase 1 review but is not yet admitted to the live public runtime.';
      default:
        return response.message;
    }
  }

  protected noExactMatchSupportCopy(detail: ConceptDetailResponse | null | undefined): string {
    return this.isReviewedNotLive(detail)
      ? 'Only live concepts resolve in the current public runtime.'
      : 'No exact concept exists in the current authored set for this query.';
  }

  protected noExactMatchMetaChips(
    response: NoExactMatchResponse,
    detail: ConceptDetailResponse | null | undefined,
  ): string[] {
    if (this.isReviewedNotLive(detail)) {
      return ['Review-backed', response.contractVersion];
    }

    return [
      this.methodLabel(response.resolution.method),
      this.queryTypeLabel(response.queryType),
      response.contractVersion,
    ];
  }

  protected validationTraceToggleLabel(): string {
    return this.validationTraceVisible() ? 'Hide validation trace' : 'View validation trace';
  }

  protected toggleValidationTrace(): void {
    this.validationTraceVisible.update((visible) => !visible);
  }

  protected validationTraceRows(detail: ConceptDetailResponse): Array<{ label: string; value: string }> {
    const rows = [
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

    return rows;
  }

  protected selectReadingLens(mode: ReadingLensMode): void {
    this.activeReadingLens.set(mode);
  }

  protected readingLensesAvailable(response: ConceptMatchResponse): boolean {
    return this.exposedReadingLensModes(response).length > 1;
  }

  protected visibleReadingLensOptions(response: ConceptMatchResponse) {
    const exposedRegisters = this.exposedReadingLensModes(response);
    return this.readingLensOptions.filter((lens) => exposedRegisters.includes(lens.mode));
  }

  protected activeReadingFields(response: ConceptMatchResponse): ActiveReadingFields {
    const registers = this.readingRegisters(response);

    if (!registers) {
      return this.canonicalReadingFields(response);
    }

    const activeMode = registers[this.activeReadingMode(response)];

    return {
      shortDefinition: activeMode.shortDefinition,
      coreMeaning: activeMode.coreMeaning,
      fullDefinition: activeMode.fullDefinition,
    };
  }

  protected definitionParagraphs(fullDefinition: string): string[] {
    return fullDefinition.split('\n\n');
  }

  protected canonicalHashShort(response: ConceptMatchResponse): string {
    const registers = this.readingRegisters(response);

    if (!registers) {
      return 'Unavailable';
    }

    return registers.canonicalBinding.canonicalHash.slice(
      0,
      CANONICAL_VISUAL_ANCHOR_HASH_LENGTH,
    );
  }

  protected sourceAnchor(response: ConceptMatchResponse): string | null {
    return response.answer.sources[0]?.id ?? null;
  }

  protected trackAiAdvisoryEvent(
    eventType: AiTrackingEventType,
    response: ConceptMatchResponse,
    submittedQuery: string,
  ): void {
    this.aiTracking.track({
      eventType,
      surface: 'landing_runtime_ai_advisory',
      conceptId: response.resolution.conceptId,
      query: submittedQuery,
      details: {
        contractVersion: response.contractVersion,
        queryType: response.queryType,
      },
    });
  }

  private buildFeedbackState(
    response: ResolveProductResponse,
    detail: ConceptDetailResponse | null,
    feedbackOrigin?: AmbiguousSelectionOrigin,
  ): EntryFeedbackState | undefined {
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

  private updateFeedback(
    patch: Partial<Pick<EntryFeedbackState, 'status' | 'selectedOption' | 'errorMessage'>>,
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

  private classifyQuery(query: string): QueryAssessment {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return {
        classification: 'empty',
        status: 'idle',
        label: 'Awaiting input',
        line: 'Query type: Awaiting input',
        message: 'Enter a concept, canonical lookup, or controlled comparison.',
        canSubmit: false,
      };
    }

    if (this.controlledComparisonPattern.test(trimmedQuery)) {
      return {
        classification: 'controlled_comparison',
        status: 'valid',
        label: 'Controlled comparison',
        line: 'Query type: Controlled comparison',
        message: 'Structured comparison recognized for deterministic execution.',
        canSubmit: true,
      };
    }

    if (this.canonicalLookupPattern.test(trimmedQuery)) {
      return {
        classification: 'canonical_lookup',
        status: 'valid',
        label: 'Canonical lookup',
        line: 'Query type: Canonical lookup',
        message: 'Structured lookup recognized for deterministic execution.',
        canSubmit: true,
      };
    }

    if (this.directConceptPattern.test(trimmedQuery)) {
      return {
        classification: 'direct_concept',
        status: 'valid',
        label: 'Direct concept',
        line: 'Query type: Direct concept',
        message: 'Structured concept query recognized for deterministic execution.',
        canSubmit: true,
      };
    }

    return {
      classification: 'unsupported',
      status: 'invalid',
      label: 'Unsupported',
      line: 'Query type: Unsupported -> will be refused',
      message: 'This query is outside the current runtime scope.',
      canSubmit: false,
    };
  }

  private scopeLabelForConcept(conceptId: string): string {
    return RUNTIME_SCOPE_BY_CONCEPT[conceptId] ?? 'Bounded runtime v1';
  }

  private canonicalReadingFields(response: ConceptMatchResponse): ActiveReadingFields {
    return {
      shortDefinition: response.answer.shortDefinition,
      coreMeaning: response.answer.coreMeaning,
      fullDefinition: response.answer.fullDefinition,
    };
  }

  protected activeReadingMode(response: ConceptMatchResponse): ReadingLensMode {
    const exposedRegisters = this.exposedReadingLensModes(response);
    return exposedRegisters.includes(this.activeReadingLens()) ? this.activeReadingLens() : 'standard';
  }

  private exposedReadingLensModes(response: ConceptMatchResponse): ReadingLensMode[] {
    const registers = this.readingRegisters(response);
    const exposedRegisters = registers?.validation?.availableModes ?? [];

    return exposedRegisters.filter((mode): mode is ReadingLensMode => (
      this.readingLensOptions.some((option) => option.mode === mode)
    ));
  }

  private readingRegisters(response: ConceptMatchResponse): ReadingRegisters | null {
    const registers = response.answer.registers;

    if (!registers || typeof registers !== 'object' || Array.isArray(registers)) {
      return null;
    }

    if (
      !registers.canonicalBinding
      || !registers.validation
      || !registers.standard
      || !registers.simplified
      || !registers.formal
    ) {
      return null;
    }

    return registers;
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

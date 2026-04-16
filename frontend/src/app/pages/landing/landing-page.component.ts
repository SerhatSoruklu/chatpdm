import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
  RefusalResponse,
  RejectedConceptResponse,
  RelatedConcept,
  ReviewState,
  ResolveProductResponse,
  Suggestion,
} from '../../core/concepts/concept-resolver.types';
import { AiAdvisoryComponent } from '../../core/ai/ai-advisory/ai-advisory.component';
import { AiTrackingEventType, AiTrackingService } from '../../core/ai/ai-tracking.service';
import { InspectableItemDisclosureComponent } from '../../core/concepts/inspectable-item-disclosure/inspectable-item-disclosure.component';
import {
  buildInspectableItemDisclosureCoreData,
  type InspectableItemDisclosureCoreData,
} from '../../core/concepts/inspectable-item-disclosure/inspectable-item-disclosure.model';
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
  REJECTED_CONCEPT_IDS,
  RUNTIME_SCOPE_BY_CONCEPT,
  VISIBLE_ONLY_PUBLIC_CONCEPT_IDS,
} from '../../core/concepts/public-runtime.catalog';
import { VocabularyPanelComponent } from '../../core/concepts/vocabulary-panel/vocabulary-panel.component';
import { FeedbackService } from '../../core/feedback/feedback.service';
import type { VocabularyBoundaryResolvedState } from '../../core/vocabulary/vocabulary-boundary.types';
import {
  HOMEPAGE_WALKTHROUGH_MODE_OPTIONS,
  buildHomepageWalkthroughCards,
} from './landing-page.model';
import type {
  AmbiguousSelectionOrigin,
  EntryFeedbackState,
  FeedbackOption,
  HomepageStep,
  LandingComparisonResponse,
  ReferenceLinkGroup,
  ResolverEntry,
  ScopeGroup,
  HomepageWalkthroughMode,
  SubmitQueryOptions,
} from './landing-page.types';
import { VOCABULARY_BOUNDARY_HOME_NOTE } from '../vocabulary-page/vocabulary-page.model';

const LIVE_RUNTIME_CONCEPTS = new Set<string>(LIVE_RUNTIME_CONCEPT_IDS);
const VISIBLE_ONLY_PUBLIC_CONCEPTS = new Set<string>(VISIBLE_ONLY_PUBLIC_CONCEPT_IDS);
const VOCABULARY_TERM_IDS = new Set<string>(['obligation', 'liability', 'jurisdiction']);
const REJECTED_CONCEPTS = new Set<string>(
  REJECTED_CONCEPT_IDS.filter((conceptId) => !VOCABULARY_TERM_IDS.has(conceptId)),
);
const DETAIL_BACKED_CONCEPTS = new Set<string>(DETAIL_BACKED_CONCEPT_IDS);
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

const SCOPE_GROUPS: ScopeGroup[] = [
  {
    id: 'core-abstractions',
    title: 'Core abstractions',
    concepts: ['responsibility'],
  },
  {
    id: 'relational-structures',
    title: 'Relational structures',
    concepts: ['authority', 'power', 'legitimacy'],
  },
  {
    id: 'governance-structures',
    title: 'Governance structures',
    concepts: [
      'law',
      'duty',
      'obligation',
      'enforcement',
      'violation',
    ],
  },
  {
    id: 'interaction-primitives',
    title: 'Interaction primitives',
    concepts: [
      'agreement',
    ],
  },
];

const FILTERED_SCOPE_GROUPS: ScopeGroup[] = SCOPE_GROUPS
  .map((group) => ({
    ...group,
    concepts: group.concepts.filter((conceptId) => !VOCABULARY_TERM_IDS.has(conceptId)),
  }))
  .filter((group) => group.concepts.length > 0);

type QueryClassification =
  | 'empty'
  | 'ready';

interface QueryAssessment {
  classification: QueryClassification;
  status: 'idle' | 'valid';
  canSubmit: boolean;
}

interface ActiveReadingFields {
  shortDefinition: string;
  coreMeaning: string;
  fullDefinition: string;
}

const HOMEPAGE_STEPS: HomepageStep[] = [
  {
    id: 'enter',
    sequence: '01',
    label: 'Input',
    title: 'Normalize',
    copy: 'Normalize the raw query into canonical form.',
    resultLine: 'Produces canonical query',
    contractField: 'normalizedQuery',
  },
  {
    id: 'classify',
    sequence: '02',
    label: 'Routing',
    title: 'Classify',
    copy: 'Route the query into match, comparison, ambiguity, or refusal.',
    resultLine: 'Determines query type',
    contractField: 'queryType',
  },
  {
    id: 'return',
    sequence: '03',
    label: 'Output',
    title: 'Resolve / Refuse',
    copy: 'Return a bounded result or explicit refusal.',
    resultLine: 'Returns result or explicit refusal',
    contractField: 'type',
  },
];

const REFERENCE_SURFACE_GROUPS: ReferenceLinkGroup[] = [
  {
    label: 'Runtime surfaces',
    links: [
      { label: 'Runtime', route: '/runtime' },
      { label: 'Live concepts', route: '/live-concepts' },
      { label: 'Controlled comparisons', route: '/controlled-comparisons' },
      { label: 'Resolution contract', route: '/resolution-contract' },
    ],
  },
  {
    label: 'System',
    links: [
      { label: 'Scope model', route: '/scope-model' },
      { label: 'Zeroglare', route: '/zeroglare' },
      { label: 'Source model', route: '/source-model' },
      { label: 'Version policy', route: '/version-policy' },
    ],
  },
  {
    label: 'Contracts',
    links: [{ label: 'API', route: '/api' }],
  },
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
    InspectableItemDisclosureComponent,
    ExamplePreviewComponent,
    PdmTooltipDirective,
    VocabularyPanelComponent,
  ],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.css',
})
export class LandingPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly routeData = toSignal(this.route.data, {
    initialValue: this.route.snapshot.data,
  });
  private readonly resolver = inject(ConceptResolverService);
  private readonly aiTracking = inject(AiTrackingService);
  private readonly feedbackService = inject(FeedbackService);
  private readonly countFormatter = new Intl.NumberFormat('en-US');

  protected readonly queryDraft = signal('');
  protected readonly activeEntry = signal<ResolverEntry | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly scopeGroups = FILTERED_SCOPE_GROUPS;
  protected readonly homepageSteps = HOMEPAGE_STEPS;
  protected readonly walkthroughModeOptions = HOMEPAGE_WALKTHROUGH_MODE_OPTIONS;
  protected readonly walkthroughMode = signal<HomepageWalkthroughMode>('plain');
  protected readonly walkthroughCards = computed(() =>
    buildHomepageWalkthroughCards(this.walkthroughMode()),
  );
  protected readonly referenceSurfaceGroups = REFERENCE_SURFACE_GROUPS;
  protected readonly liveRuntimeConceptIds = LIVE_RUNTIME_CONCEPT_IDS;
  protected readonly visibleOnlyConceptIds = VISIBLE_ONLY_PUBLIC_CONCEPT_IDS;
  protected readonly rejectedConceptIds = REJECTED_CONCEPT_IDS.filter(
    (conceptId) => !VOCABULARY_TERM_IDS.has(conceptId),
  );
  protected readonly readingLensOptions = READING_LENS_OPTIONS;
  protected readonly readingLensTrustCopy = READING_LENS_TRUST_COPY;
  protected readonly readingLensFallbackCopy = READING_LENS_FALLBACK_COPY;
  protected readonly queryAssessment = computed(() => this.classifyQuery(this.queryDraft()));
  protected readonly liveConceptCount = LIVE_RUNTIME_CONCEPTS.size;
  protected readonly vocabularyBoundaryState = computed(() => (
    this.routeData()['vocabularyBoundary'] as VocabularyBoundaryResolvedState | undefined
  ) ?? {
    status: 'error',
    data: null,
    errorMessage: 'The vocabulary boundary could not be loaded from the public API.',
  } satisfies VocabularyBoundaryResolvedState);
  protected readonly publishedConceptPacketCount = computed(() => {
    const state = this.vocabularyBoundaryState();
    return state.status === 'ready' ? state.data.surfaceCounts.publishedConceptPackets : null;
  });
  protected readonly recognizedVocabularyCount = computed(() => {
    const state = this.vocabularyBoundaryState();
    return state.status === 'ready' ? state.data.total : null;
  });
  protected readonly vocabularyBoundaryHomeNote = VOCABULARY_BOUNDARY_HOME_NOTE;
  protected readonly activeReadingLens = signal<ReadingLensMode>('standard');
  protected readonly validationTraceVisible = signal(false);

  protected formatBoundaryCount(value: number | null): string {
    if (typeof value !== 'number') {
      return '—';
    }

    return this.countFormatter.format(value);
  }

  protected setWalkthroughMode(mode: HomepageWalkthroughMode): void {
    this.walkthroughMode.set(mode);
  }

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

  protected returnToHeroInput(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const input = document.getElementById('hero-input') as HTMLInputElement | null;
    if (!input) {
      return;
    }

    input.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        input.focus({ preventScroll: true });
      });
    });
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

  protected isVisibleOnlyConceptId(concept: string): boolean {
    return VISIBLE_ONLY_PUBLIC_CONCEPTS.has(concept);
  }

  protected isRejectedConcept(concept: string): boolean {
    return REJECTED_CONCEPTS.has(concept);
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

    return 'Enter any query to continue';
  }

  protected async submitScopedConcept(concept: string): Promise<void> {
    if (
      !this.isLiveConcept(concept)
      && !this.isVisibleOnlyConceptId(concept)
      && !this.isRejectedConcept(concept)
      && !DETAIL_BACKED_CONCEPTS.has(concept)
    ) {
      return;
    }

    await this.submitQuery(concept, {
      displayQuery: this.formatConceptLabel(concept),
    });
  }

  protected populateHeroQueryFromScope(concept: string): void {
    if (!this.isLiveConcept(concept)) {
      return;
    }

    this.queryDraft.set(concept);
    this.returnToHeroInput();
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
      case 'VOCABULARY_DETECTED':
        return 'Vocabulary detected';
      case 'rejected_concept':
        return 'Structurally rejected';
      case 'comparison':
        return 'Comparison mode';
      case 'ambiguous_match':
        return 'Selection required';
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
      case 'VOCABULARY_DETECTED':
        return 'Vocabulary insight';
      case 'rejected_concept':
        return 'Governed refusal';
      case 'ambiguous_match':
        return 'Need a precise choice';
      case 'no_exact_match':
        return 'No exact match';
      case 'invalid_query':
        return 'Invalid query input';
      case 'unsupported_query_type':
        return 'Unsupported query type';
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

  protected asRefusal(response: ResolveProductResponse): RefusalResponse {
    return response as RefusalResponse;
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

  protected isReviewedNotLive(detail: ConceptDetailResponse | null | undefined): boolean {
    const admission = detail?.reviewState?.admission;
    return admission ? REVIEWED_NOT_LIVE_ADMISSIONS.has(admission) : false;
  }

  protected isVisibleOnlyDetail(detail: ConceptDetailResponse | null | undefined): boolean {
    return detail?.conceptId ? VISIBLE_ONLY_PUBLIC_CONCEPTS.has(detail.conceptId) : false;
  }

  protected isDerivedVisibleOnlyDetail(detail: ConceptDetailResponse | null | undefined): boolean {
    return detail?.reviewState?.admission === 'visible_only_derived';
  }

  protected visibleOnlyDisclosureData(detail: ConceptDetailResponse): InspectableItemDisclosureCoreData | null {
    return buildInspectableItemDisclosureCoreData(detail);
  }

  protected isVisibleOnlyRefusal(
    response: RefusalResponse,
    detail: ConceptDetailResponse | null | undefined,
  ): boolean {
    return this.isVisibleOnlyDetail(detail)
      || response.interpretation?.interpretationType === 'visible_only_public_concept';
  }

  protected noExactMatchStripLabel(detail: ConceptDetailResponse | null | undefined): string {
    if (this.isVisibleOnlyDetail(detail)) {
      return 'Public scope';
    }

    return this.isReviewedNotLive(detail) ? 'Runtime' : 'Resolution';
  }

  protected noExactMatchResolutionValue(
    response: RefusalResponse,
    detail: ConceptDetailResponse | null | undefined,
  ): string {
    if (this.isVisibleOnlyRefusal(response, detail)) {
      return 'Visible only';
    }

    return this.isReviewedNotLive(detail) ? 'Not yet live' : this.resolutionTypeLabel(response);
  }

  protected noExactMatchScopeValue(
    response: ResolveProductResponse,
    detail: ConceptDetailResponse | null | undefined,
  ): string {
    if (detail?.conceptId) {
      return this.scopeLabelForConcept(detail.conceptId);
    }

    return this.runtimeScopeLabel(response);
  }

  protected noExactMatchExecutionValue(
    response: RefusalResponse,
    detail: ConceptDetailResponse | null | undefined,
  ): string {
    if (this.isVisibleOnlyRefusal(response, detail)) {
      return 'Not admitted';
    }

    return this.isReviewedNotLive(detail) ? 'Not admitted' : this.executionStateLabel(response);
  }

  protected noExactMatchResponseLabel(
    response: RefusalResponse,
    detail: ConceptDetailResponse | null | undefined,
  ): string {
    if (response.type === 'VOCABULARY_DETECTED') {
      return 'Vocabulary insight';
    }

    if (this.isVisibleOnlyRefusal(response, detail)) {
      return 'Visible-only concept';
    }

    return this.isReviewedNotLive(detail) ? 'Reviewed concept' : this.resolutionTypeLabel(response);
  }

  protected noExactMatchTitle(
    response: RefusalResponse,
    detail: ConceptDetailResponse | null | undefined,
  ): string {
    if (response.type === 'VOCABULARY_DETECTED') {
      return 'Recognized term, excluded from resolution';
    }

    if (this.isVisibleOnlyRefusal(response, detail)) {
      if (this.isDerivedVisibleOnlyDetail(detail)) {
        return 'Derived concept, inspectable only';
      }

      return 'Visible in public scope, not live';
    }

    switch (detail?.reviewState?.admission) {
      case 'phase2_stable':
        return 'Reviewed and stable, not yet live';
      case 'phase1_passed':
        return 'Reviewed, not yet live';
      default:
        if (response.type === 'invalid_query') {
          return 'Invalid query input';
        }

        if (response.type === 'unsupported_query_type') {
          return 'Unsupported query type';
        }

        return 'No canonical concept resolved';
    }
  }

  protected noExactMatchBody(
    response: RefusalResponse,
    detail: ConceptDetailResponse | null | undefined,
  ): string {
    if (response.type === 'VOCABULARY_DETECTED') {
      return response.message;
    }

    if (this.isVisibleOnlyRefusal(response, detail)) {
      if (this.isDerivedVisibleOnlyDetail(detail)) {
        return 'Violation remains inspectable as a derived concept computed from duty evaluation, but it is not admitted to the live public runtime.';
      }

      return 'This concept is publicly visible and inspectable, but it is not admitted to the live public runtime.';
    }

    switch (detail?.reviewState?.admission) {
      case 'phase2_stable':
        return 'This concept has passed internal review and remains stable, but is not yet admitted to the live public runtime.';
      case 'phase1_passed':
        return 'This concept has passed Phase 1 review but is not yet admitted to the live public runtime.';
      default:
        return response.message;
    }
  }

  protected noExactMatchSupportCopy(
    response: RefusalResponse,
    detail: ConceptDetailResponse | null | undefined,
  ): string {
    if (response.type === 'VOCABULARY_DETECTED') {
      return 'Vocabulary can be classified and displayed, but it never enters deterministic resolution.';
    }

    if (this.isVisibleOnlyRefusal(response, detail)) {
      if (this.isDerivedVisibleOnlyDetail(detail)) {
        return 'Derived concepts remain visible only for inspection and explanation; they do not enter live runtime resolution or comparison support.';
      }

      return 'Visible-only concepts expose authored detail without entering live runtime resolution or comparison support.';
    }

    if (this.isReviewedNotLive(detail)) {
      return 'Only live concepts resolve in the current public runtime.';
    }

    if (response.type === 'invalid_query') {
      return 'The runtime does not infer missing meaning from noise input.';
    }

    if (response.type === 'unsupported_query_type') {
      return 'This runtime supports exact concept resolution and allowlisted comparisons only.';
    }

    return 'No exact concept exists in the current authored set for this query.';
  }

  protected noExactMatchMetaChips(
    response: RefusalResponse,
    detail: ConceptDetailResponse | null | undefined,
  ): string[] {
    if (response.type === 'VOCABULARY_DETECTED') {
      return ['Vocabulary only', response.contractVersion];
    }

    if (this.isVisibleOnlyRefusal(response, detail)) {
      return ['Visible only', response.contractVersion];
    }

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

    const activeMode = this.activeReadingMode(response);
    const activeRegister = activeMode === 'simplified'
      ? registers.simplified
      : activeMode === 'formal'
        ? registers.formal
        : registers.standard;

    return {
      shortDefinition: activeRegister?.shortDefinition ?? registers.standard.shortDefinition,
      coreMeaning: activeRegister?.coreMeaning ?? registers.standard.coreMeaning,
      fullDefinition: activeRegister?.fullDefinition ?? registers.standard.fullDefinition,
    };
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
    if (detail?.reviewState || this.isVisibleOnlyDetail(detail)) {
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
        return 'Enter any non-empty query to continue.';
      }

      if (error.status === 0) {
        return 'Resolver unavailable. Check that the ChatPDM backend is running on port 4301.';
      }
    }

    return 'ChatPDM could not return a product response for this request.';
  }

  private classifyQuery(query: string): QueryAssessment {
    if (!query.trim()) {
      return {
        classification: 'empty',
        status: 'idle',
        canSubmit: false,
      };
    }

    return {
      classification: 'ready',
      status: 'valid',
      canSubmit: true,
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
      || !Array.isArray(registers.validation.availableModes)
    ) {
      return null;
    }

    const exposedModes = new Set(registers.validation.availableModes);

    if (exposedModes.has('simplified') && !registers.simplified) {
      return null;
    }

    if (exposedModes.has('formal') && !registers.formal) {
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

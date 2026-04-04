import type {
  AmbiguousMatchResponse,
  ConceptDetailResponse,
  ComparisonResponse,
  ResolveProductResponse,
} from '../../core/concepts/concept-resolver.types';
import type {
  FeedbackResponseType,
  FeedbackSubmissionContext,
  FeedbackType,
} from '../../core/feedback/feedback.types';

export interface ScopeGroup {
  id: string;
  title: string;
  concepts: string[];
}

export interface HomepageSignal {
  label: string;
}

export type HomepageWalkthroughMode = 'plain' | 'technical';

export interface HomepageWalkthroughModeOption {
  mode: HomepageWalkthroughMode;
  label: string;
}

export interface HomepageWalkthroughCardView {
  label: string;
  title: string;
  copy: string;
  resultLine: string;
  pipelineStage: string;
}

export interface HomepageWalkthroughCard {
  id: string;
  sequence: string;
  plain: HomepageWalkthroughCardView;
  technical: HomepageWalkthroughCardView;
}

export interface HomepageWalkthroughRenderedCard extends HomepageWalkthroughCard {
  view: HomepageWalkthroughCardView;
}

export interface HomepageStep {
  id: string;
  sequence: string;
  label: string;
  title: string;
  copy: string;
  resultLine: string;
  contractField: string;
}

export interface LinkAction {
  label: string;
  route: string;
}

export interface ReferenceLinkGroup {
  label: string;
  links: LinkAction[];
}

export interface FeedbackOption {
  value: FeedbackType;
  label: string;
}

export interface EntryFeedbackState {
  question: string;
  responseType: FeedbackResponseType;
  options: FeedbackOption[];
  context: FeedbackSubmissionContext;
  status: 'idle' | 'submitting' | 'submitted' | 'error';
  selectedOption?: FeedbackType;
  errorMessage?: string;
}

export interface AmbiguousSelectionOrigin {
  kind: 'ambiguous_resolution';
  response: AmbiguousMatchResponse;
  selectedConceptId: string;
}

export interface SubmitQueryOptions {
  displayQuery?: string;
  feedbackOrigin?: AmbiguousSelectionOrigin;
}

export interface ResolverEntry {
  submittedQuery: string;
  status: 'loading' | 'success' | 'error';
  response?: ResolveProductResponse;
  detail?: ConceptDetailResponse | null;
  feedback?: EntryFeedbackState;
  errorMessage?: string;
}

export type LandingComparisonResponse = ComparisonResponse;

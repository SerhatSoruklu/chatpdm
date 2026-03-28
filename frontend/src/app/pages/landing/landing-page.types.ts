import type {
  AmbiguousMatchResponse,
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

export interface StarterQuery {
  label: string;
  query: string;
}

export interface HomepageSignal {
  id: string;
  label: string;
  definition: string;
  targetId: string;
  targetLabel: string;
}

export interface HomepageStep {
  id: string;
  sequence: string;
  label: string;
  title: string;
  copy: string;
}

export interface LinkAction {
  label: string;
  route: string;
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
  feedback?: EntryFeedbackState;
  errorMessage?: string;
}

export type LandingComparisonResponse = ComparisonResponse;

export type FeedbackResponseType = 'concept_match' | 'ambiguous_match' | 'no_exact_match';

export type FeedbackType =
  | 'clear'
  | 'unclear'
  | 'wrong_concept'
  | 'found_right_one'
  | 'still_not_right'
  | 'expected'
  | 'should_exist';

export interface FeedbackSubmissionPayload {
  sessionId?: string | null;
  rawQuery: string;
  normalizedQuery: string;
  responseType: FeedbackResponseType;
  feedbackType: FeedbackType;
  resolvedConceptId?: string | null;
  candidateConceptIds?: string[];
  suggestionConceptIds?: string[];
  contractVersion: string;
  normalizerVersion: string;
  matcherVersion: string;
  conceptSetVersion: string;
}

export type FeedbackSubmissionContext = Omit<FeedbackSubmissionPayload, 'feedbackType' | 'sessionId'>;

export interface FeedbackReceipt {
  status: 'recorded';
  feedbackId: number;
  createdAt: string;
}

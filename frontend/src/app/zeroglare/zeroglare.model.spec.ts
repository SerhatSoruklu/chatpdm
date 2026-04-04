import { describe, expect, it } from 'vitest';

import {
  buildZeroglareResultCard,
  buildZeroglareGuidanceCard,
  resolveZeroglareSuggestedResponse,
  resolveZeroglareGuidanceResponse,
  type ZeroglareAnalysisResult,
} from './zeroglare.model';

function createResult(overrides: Partial<ZeroglareAnalysisResult> = {}): ZeroglareAnalysisResult {
  const status = overrides.status ?? 'clear';

  return {
    status,
    summary: overrides.summary ?? {
      state: status,
      clearCount: 1,
      pressureCount: 0,
      failCount: 0,
      markerCount: 0,
    },
    normalizedInputTruncated: false,
    markers: [],
    ...overrides,
  };
}

describe('Zeroglare result card helpers', () => {
  it('maps clear results to the review-analysis action', () => {
    const card = buildZeroglareResultCard(createResult({ status: 'clear' }));

    expect(card).toEqual(
      expect.objectContaining({
        headline: 'Clear',
        summary: 'No refusal contract matched.',
        explanation: 'Review the technical details below for the full diagnostic breakdown.',
        primaryActionLabel: 'Review analysis',
        primaryActionType: 'review_analysis',
      }),
    );
  });

  it('maps pressure results to the inspect-signals action', () => {
    const card = buildZeroglareResultCard(createResult({ status: 'pressure' }));

    expect(card).toEqual(
      expect.objectContaining({
        headline: 'Pressure detected',
        summary: 'Signal pressure is present, but no refusal contract matched.',
        primaryActionLabel: 'Inspect signals',
        primaryActionType: 'inspect_signals',
      }),
    );
  });

  it('maps fail results to the inspect-signals action', () => {
    const card = buildZeroglareResultCard(createResult({ status: 'fail' }));

    expect(card).toEqual(
      expect.objectContaining({
        headline: 'Fail boundary reached',
        summary: 'Signal pressure crossed the fail boundary, but no refusal contract matched.',
        primaryActionLabel: 'Inspect signals',
        primaryActionType: 'inspect_signals',
      }),
    );
  });

  it('maps refused results to the copy-response action and uses backend guidance first', () => {
    const card = buildZeroglareResultCard(createResult({
      status: 'refused',
      refusal: {
        reason_code: 'self_sealing_validity_claim',
        reason: 'Input converts challenge or doubt into self-confirming evidence without an independent validation path.',
      },
      conversational: {
        response: 'What would count as evidence that this is false?',
      },
    }));

    expect(card).toEqual(
      expect.objectContaining({
        headline: 'Refused',
        summary: 'ZeroGlare matched an explicit refusal contract.',
        explanation: 'Input converts challenge or doubt into self-confirming evidence without an independent validation path.',
        suggestedResponse: 'What would count as evidence that this is false?',
        primaryActionLabel: 'Copy response',
        primaryActionType: 'copy_response',
      }),
    );
  });

  it('falls back to a deterministic suggested response when backend guidance is absent', () => {
    expect(
      resolveZeroglareSuggestedResponse('unresolvable_recursive_closure', null),
    ).toBe('What is a valid way to step outside this frame?');
  });

  it('maps ambiguity guidance to a clarification response card', () => {
    const card = buildZeroglareGuidanceCard(createResult({
      status: 'pressure',
      conversational: {
        pattern: 'ambiguity_uncertain_interpretation',
        response: 'There’s no hidden implication. The claim is just this: [state claim clearly].',
        strategy: 'clarification',
        intent: 'stabilize_interpretation',
      },
    }));

    expect(card).toEqual(
      expect.objectContaining({
        label: 'Clarification guidance',
        summary: 'Stabilize interpretation before evaluating the claim.',
        response: 'There’s no hidden implication. The claim is just this: [state claim clearly].',
        actionLabel: 'Copy response',
        pattern: 'ambiguity_uncertain_interpretation',
      }),
    );
  });

  it('maps soft pressure guidance to a burden-reset response card', () => {
    const card = buildZeroglareGuidanceCard(createResult({
      status: 'clear',
      conversational: {
        pattern: 'soft_pressure_expectation_frame',
        response: 'What is the actual claim, and what supports it?',
        strategy: 'burden_reset',
        intent: 'stabilize_evaluation',
      },
    }));

    expect(card).toEqual(
      expect.objectContaining({
        label: 'Evaluation guidance',
        summary: 'Reset the burden onto the claim and evidence.',
        response: 'What is the actual claim, and what supports it?',
        actionLabel: 'Copy response',
        pattern: 'soft_pressure_expectation_frame',
      }),
    );
  });

  it('falls back to a deterministic guidance response when backend guidance is absent', () => {
    expect(
      resolveZeroglareGuidanceResponse('ambiguity_uncertain_interpretation', null),
    ).toBe('There’s no hidden implication. The claim is just this: [state claim clearly].');
  });

  it('does not build a guidance card for refused results', () => {
    expect(
      buildZeroglareGuidanceCard(createResult({
        status: 'refused',
        refusal: {
          reason_code: 'unresolvable_recursive_closure',
          reason: 'Input contains a recursive closure with no bounded exit path.',
        },
      })),
    ).toBeNull();
  });
});

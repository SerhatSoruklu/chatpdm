import { describe, expect, it } from 'vitest';

import type { ResolveProductResponse } from './concept-resolver.types';
import {
  resolverExecutionStateLabel,
  resolverRenderMode,
} from './resolver-rendering';

function createResponse(
  overrides: Record<string, unknown> = {},
): ResolveProductResponse {
  return {
    type: 'concept_match',
    query: 'duty',
    normalizedQuery: 'duty',
    contractVersion: 'v1.7',
    normalizerVersion: '2026-04-01.v2',
    matcherVersion: '2026-04-01.v4',
    conceptSetVersion: '20260401.2',
    queryType: 'exact_concept_query',
    finalState: 'valid',
    reason: null,
    failedLayer: null,
    traceId: 'trace-rendering',
    timestamp: '2026-04-23T12:00:00.000Z',
    deterministicKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    registryVersion: '20260401.2',
    policyVersion: 'v1.7',
    interpretation: null,
    resolution: {
      method: 'exact_alias',
      conceptId: 'duty',
      conceptVersion: 1,
    },
    answer: {
      title: 'Duty',
      shortDefinition: 'A bounded concept.',
      coreMeaning: 'A bounded core meaning.',
      fullDefinition: 'A bounded full definition.',
      governanceState: {
        source: 'validator_artifact',
        available: true,
        validationState: 'fully_validated',
        v3Status: 'passing',
        relationStatus: 'passing',
        lawStatus: 'passing',
        enforcementStatus: 'passing',
        systemValidationState: 'law_validated',
        isBlocked: false,
        isStructurallyIncomplete: false,
        isFullyValidated: true,
        isActionable: true,
        trace: {
          conceptId: 'duty',
          validatorSource: 'validator_artifact',
          unavailableReason: null,
          relationSource: 'authored',
          lawSource: 'authored',
          relationDataPresent: true,
          dataSource: 'authored_relation_packets',
        },
      },
      registers: {
        readOnly: true,
        canonicalBinding: {
          conceptId: 'duty',
          conceptVersion: 1,
          canonicalHash: 'abc123',
        },
        validation: {
          availableModes: ['standard'],
          modes: {
            standard: { status: 'available', reasons: [] },
            simplified: { status: 'rejected', reasons: [] },
            formal: { status: 'rejected', reasons: [] },
          },
        },
        standard: {
          shortDefinition: 'Duty short',
          coreMeaning: 'Duty core',
          fullDefinition: 'Duty full',
        },
      },
      contexts: [],
      sources: [],
      relatedConcepts: [],
    },
    ...overrides,
  } as unknown as ResolveProductResponse;
}

describe('resolverRenderMode', () => {
  it('maps each finalState to one deterministic rendering mode', () => {
    expect(resolverRenderMode(createResponse({ finalState: 'valid' }))).toBe('valid');
    expect(resolverRenderMode(createResponse({ finalState: 'refused' }))).toBe('refused');
    expect(resolverRenderMode(createResponse({ finalState: 'partial' }))).toBe('partial');
    expect(resolverRenderMode(createResponse({ finalState: 'degraded' }))).toBe('degraded');
    expect(resolverRenderMode(null)).toBeNull();
    expect(resolverRenderMode(undefined)).toBeNull();
  });

  it('does not let type override finalState', () => {
    expect(
      resolverRenderMode(createResponse({ type: 'comparison', finalState: 'valid' })),
    ).toBe('valid');
    expect(
      resolverRenderMode(createResponse({ type: 'ambiguous_match', finalState: 'refused' })),
    ).toBe('refused');
    expect(
      resolverRenderMode(createResponse({ type: 'rejected_concept', finalState: 'refused' })),
    ).toBe('refused');
    expect(
      resolverRenderMode(createResponse({ type: 'concept_match', finalState: 'partial' })),
    ).toBe('partial');
    expect(
      resolverRenderMode(createResponse({ type: 'comparison', finalState: 'degraded' })),
    ).toBe('degraded');
  });

  it('does not let failedLayer override finalState', () => {
    expect(
      resolverRenderMode(createResponse({ finalState: 'refused', failedLayer: 'semantic' })),
    ).toBe('refused');
    expect(
      resolverRenderMode(createResponse({ finalState: 'refused', failedLayer: 'registry' })),
    ).toBe('refused');
  });
});

describe('resolverExecutionStateLabel', () => {
  it('returns mode-first labels for valid, partial, and degraded states', () => {
    expect(resolverExecutionStateLabel(createResponse({ finalState: 'valid' }))).toBe('Executable');
    expect(resolverExecutionStateLabel(createResponse({ finalState: 'partial' }))).toBe('Limited');
    expect(resolverExecutionStateLabel(createResponse({ finalState: 'degraded' }))).toBe('Degraded');
  });

  it('uses reason to refine refused-state labels without changing mode', () => {
    expect(
      resolverExecutionStateLabel(createResponse({
        finalState: 'refused',
        type: 'VOCABULARY_DETECTED',
        reason: 'exposure_boundary',
        failedLayer: 'exposure',
      })),
    ).toBe('Excluded');

    expect(
      resolverExecutionStateLabel(createResponse({
        finalState: 'refused',
        type: 'rejected_concept',
        reason: 'registry_rejection',
        failedLayer: 'registry',
      })),
    ).toBe('Rejected');

    expect(
      resolverExecutionStateLabel(createResponse({
        finalState: 'refused',
        type: 'ambiguous_match',
        reason: 'semantic_ambiguous_match',
        failedLayer: 'semantic',
      })),
    ).toBe('Selection required');
  });

  it('uses interpretation subtype only as refused-state explanation', () => {
    expect(
      resolverExecutionStateLabel(createResponse({
        finalState: 'refused',
        type: 'no_exact_match',
        reason: 'semantic_no_exact_match',
        failedLayer: 'semantic',
        interpretation: {
          interpretationType: 'out_of_scope',
          message: 'Outside authored scope.',
        },
      })),
    ).toBe('Out-of-scope');

    expect(
      resolverExecutionStateLabel(createResponse({
        finalState: 'refused',
        type: 'no_exact_match',
        reason: 'semantic_no_exact_match',
        failedLayer: 'semantic',
        interpretation: {
          interpretationType: 'visible_only_public_concept',
          message: 'Visible only.',
        },
      })),
    ).toBe('Not admitted');

    expect(
      resolverExecutionStateLabel(createResponse({
        finalState: 'refused',
        type: 'no_exact_match',
        reason: 'semantic_no_exact_match',
        failedLayer: 'semantic',
        interpretation: {
          interpretationType: 'canonical_lookup_not_found',
          message: 'No exact match.',
        },
      })),
    ).toBe('Refused');
  });

  it('keeps intake and structure refusals as refused labels', () => {
    expect(
      resolverExecutionStateLabel(createResponse({
        finalState: 'refused',
        type: 'invalid_query',
        reason: 'intake_invalid_query',
        failedLayer: 'intake',
      })),
    ).toBe('Refused');

    expect(
      resolverExecutionStateLabel(createResponse({
        finalState: 'refused',
        type: 'unsupported_query_type',
        reason: 'structure_unsupported_query_type',
        failedLayer: 'structure',
      })),
    ).toBe('Refused');
  });
});

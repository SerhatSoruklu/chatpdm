import '@angular/compiler';

import {
  createEnvironmentInjector,
  runInInjectionContext,
  type EnvironmentInjector,
} from '@angular/core';
import { describe, expect, it } from 'vitest';

import type { ResolveProductResponse } from '../../core/concepts/concept-resolver.types';
import {
  resolverExecutionStateLabel,
  resolverRenderMode,
} from '../../core/concepts/resolver-rendering';
import { ConceptResolverService } from '../../core/concepts/concept-resolver.service';
import { FeedbackService } from '../../core/feedback/feedback.service';
import { RuntimePageComponent } from './runtime-page.component';

function createComponent(): RuntimePageComponent {
  const injector = createEnvironmentInjector([
    {
      provide: ConceptResolverService,
      useValue: {},
    },
    {
      provide: FeedbackService,
      useValue: {},
    },
  ], null as unknown as EnvironmentInjector);

  const component = runInInjectionContext(injector, () => new RuntimePageComponent());
  injector.destroy();

  return component;
}

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
    traceId: 'trace-runtime-page',
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

describe('RuntimePageComponent', () => {
  it('delegates render mode selection to the shared rendering law', () => {
    const component = createComponent();
    const partialResponse = createResponse({ type: 'concept_match', finalState: 'partial' });
    const degradedResponse = createResponse({ type: 'comparison', finalState: 'degraded' });

    expect(component['renderMode'](partialResponse)).toBe(resolverRenderMode(partialResponse));
    expect(component['renderMode'](degradedResponse)).toBe(resolverRenderMode(degradedResponse));
  });

  it('delegates refused-state labels to the shared rendering helper', () => {
    const component = createComponent();
    const visibleOnlyResponse = createResponse({
      type: 'no_exact_match',
      finalState: 'refused',
      reason: 'semantic_no_exact_match',
      failedLayer: 'semantic',
      interpretation: {
        interpretationType: 'visible_only_public_concept',
        message: 'Visible only.',
      },
    });

    expect(component['executionStateLabel'](visibleOnlyResponse)).toBe(
      resolverExecutionStateLabel(visibleOnlyResponse),
    );
  });
});

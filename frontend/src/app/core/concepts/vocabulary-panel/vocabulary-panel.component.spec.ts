import { describe, expect, it } from 'vitest';

import type {
  ConceptMatchResponse,
  VocabularyDetectedResponse,
} from '../concept-resolver.types';
import {
  extractVocabularyPanelData,
  vocabularyClassificationLabel,
  VOCABULARY_PANEL_WARNING_TEXT,
} from './vocabulary-panel.model';

function createVocabularyResponse(
  overrides: Partial<VocabularyDetectedResponse> = {},
): VocabularyDetectedResponse {
  return {
    type: 'VOCABULARY_DETECTED',
    query: 'obligation',
    normalizedQuery: 'obligation',
    contractVersion: 'v1.7',
    normalizerVersion: '2026-04-01.v2',
    matcherVersion: '2026-04-01.v4',
    conceptSetVersion: '20260401.2',
    queryType: 'exact_concept_query',
    finalState: 'refused',
    reason: 'exposure_boundary',
    failedLayer: 'exposure',
    traceId: 'trace-vocabulary-panel',
    timestamp: '2026-04-23T12:00:00.000Z',
    deterministicKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    registryVersion: '20260401.2',
    policyVersion: 'v1.7',
    interpretation: null,
    resolution: {
      method: 'vocabulary_guard',
    },
    message: 'Recognized term is not a core system concept and is excluded from resolution.',
    vocabulary: {
      input: 'obligation',
      normalizedInput: 'obligation',
      matched: true,
      term: 'obligation',
      classification: 'legal_term',
      relations: {
        closestConcept: 'duty',
        contrastWith: ['responsibility'],
        relatedConcepts: ['duty'],
      },
      systemFlags: {
        isCoreConcept: false,
        usableInResolver: false,
        reasoningAllowed: false,
      },
    },
    ...overrides,
  };
}

function createConceptMatchResponse(): ConceptMatchResponse {
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
    traceId: 'trace-concept-match',
    timestamp: '2026-04-23T12:00:00.000Z',
    deterministicKey: 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
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
          availableModes: ['standard', 'simplified', 'formal'],
          modes: {
            standard: { status: 'available', reasons: [] },
            simplified: { status: 'available', reasons: [] },
            formal: { status: 'available', reasons: [] },
          },
        },
        standard: {
          shortDefinition: 'Duty short',
          coreMeaning: 'Duty core',
          fullDefinition: 'Duty full',
        },
        simplified: {
          shortDefinition: 'Duty short',
          coreMeaning: 'Duty core',
          fullDefinition: 'Duty full',
        },
        formal: {
          shortDefinition: 'Duty short',
          coreMeaning: 'Duty core',
          fullDefinition: 'Duty full',
        },
      },
      contexts: [],
      sources: [],
      relatedConcepts: [],
    },
  };
}

describe('VocabularyPanelComponent helpers', () => {
  it('returns vocabulary panel data for an obligation refusal response', () => {
    const vocabulary = extractVocabularyPanelData(createVocabularyResponse());

    expect(vocabulary).not.toBeNull();
    expect(vocabulary?.term).toBe('obligation');
    expect(vocabularyClassificationLabel(vocabulary?.classification ?? null)).toBe('Legal vocabulary');
  });

  it('returns null for a normal concept resolution', () => {
    expect(extractVocabularyPanelData(createConceptMatchResponse())).toBeNull();
  });

  it('exposes the mandatory warning text exactly', () => {
    expect(VOCABULARY_PANEL_WARNING_TEXT).toBe(
      'Not a core concept. Not used for system reasoning.',
    );
  });

  it('returns the closest system concept only when present', () => {
    const obligation = extractVocabularyPanelData(createVocabularyResponse());
    expect(obligation?.relations?.closestConcept).toBe('duty');

    const jurisdiction = extractVocabularyPanelData(createVocabularyResponse({
      query: 'jurisdiction',
      normalizedQuery: 'jurisdiction',
      vocabulary: {
        input: 'jurisdiction',
        normalizedInput: 'jurisdiction',
        matched: true,
        term: 'jurisdiction',
        classification: 'legal_term',
        relations: null,
        systemFlags: {
          isCoreConcept: false,
          usableInResolver: false,
          reasoningAllowed: false,
        },
      },
    }));

    expect(jurisdiction?.relations?.closestConcept).toBeUndefined();
  });
});

'use strict';

const NON_GOVERNANCE_SIGNALS = Object.freeze({
  authority: Object.freeze([
    'epistemic',
    'moral',
    'parental',
    'professional',
    'charismatic',
  ]),
  power: Object.freeze([
    'electrical',
    'voltage',
    'watt',
    'physics',
    'statistical',
    'computing',
    'magical',
    'physical',
  ]),
  legitimacy: Object.freeze([
    'artistic',
    'religious',
    'moral',
    'social',
  ]),
});

const GOVERNANCE_ANCHOR_SIGNALS = Object.freeze([
  'governance',
  'government',
  'governing',
  'legal',
  'law',
  'institution',
  'institutional',
  'office',
  'political',
  'public order',
  'state',
  'civic',
]);

const OUT_OF_SCOPE_MESSAGE =
  'This concept is defined within the governance domain in ChatPDM and does not cover the requested usage.';

const SCOPED_CLARIFICATION_MESSAGE =
  'This concept is governance-scoped in ChatPDM. Clarify a governance-domain usage to continue.';

function isGovernanceScopedConcept(concept) {
  return Boolean(
    concept
    && concept.scope
    && concept.scope.domain === 'governance'
    && concept.scope.isUniversal === false,
  );
}

function unique(values) {
  return [...new Set(values)];
}

function extractCandidateConceptIds(match, queryClassification) {
  const conceptIds = [];

  if (match?.type === 'concept_match' && typeof match.concept?.conceptId === 'string') {
    conceptIds.push(match.concept.conceptId);
  }

  if (typeof queryClassification?.interpretation?.baseConcept === 'string') {
    conceptIds.push(queryClassification.interpretation.baseConcept);
  }

  if (Array.isArray(queryClassification?.interpretation?.concepts)) {
    conceptIds.push(...queryClassification.interpretation.concepts);
  }

  return unique(conceptIds);
}

function findSignal(normalizedQuery, conceptId) {
  const signals = NON_GOVERNANCE_SIGNALS[conceptId] || [];
  return signals.find((signal) => normalizedQuery.includes(signal)) || null;
}

function hasGovernanceAnchor(normalizedQuery) {
  return GOVERNANCE_ANCHOR_SIGNALS.some((signal) => normalizedQuery.includes(signal));
}

function buildScopeInterpretation(type, concept) {
  if (type === 'scoped_clarification') {
    return {
      interpretationType: 'scoped_clarification',
      concept: concept.conceptId,
      domain: concept.scope.domain,
      message: SCOPED_CLARIFICATION_MESSAGE,
    };
  }

  return {
    interpretationType: 'out_of_scope',
    concept: concept.conceptId,
    domain: concept.scope.domain,
    message: OUT_OF_SCOPE_MESSAGE,
  };
}

function detectGovernanceScopeEnforcement({ normalizedQuery, match, queryClassification, conceptIndex }) {
  const candidateConceptIds = extractCandidateConceptIds(match, queryClassification);

  for (const conceptId of candidateConceptIds) {
    const concept = conceptIndex.get(conceptId);

    if (!isGovernanceScopedConcept(concept)) {
      continue;
    }

    const signal = findSignal(normalizedQuery, conceptId);
    if (!signal) {
      continue;
    }

    const handling = hasGovernanceAnchor(normalizedQuery)
      && concept.scope.nonGovernanceHandling.includes('scoped_clarification')
      ? 'scoped_clarification'
      : 'out_of_scope';

    return {
      conceptId,
      signal,
      interpretation: buildScopeInterpretation(handling, concept),
      resolutionMethod: 'out_of_scope',
    };
  }

  return null;
}

module.exports = {
  detectGovernanceScopeEnforcement,
};

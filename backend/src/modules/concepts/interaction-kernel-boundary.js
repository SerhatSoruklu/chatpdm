'use strict';

const { deriveRoutingText } = require('./normalizer');

const OUT_OF_SCOPE_INTERACTION_CONCEPT_IDS = Object.freeze([
  'commitment',
  'promise',
  'undertaking',
  'breach',
]);

const GOVERNANCE_KERNEL_ANCHOR_TERMS = Object.freeze([
  'law',
  'duty',
]);

const INTERACTION_OUT_OF_SCOPE_MESSAGE =
  'This term belongs to a pre-governance interaction layer and remains outside the ChatPDM governance kernel unless explicitly anchored to law or duty.';

function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasWholeWord(normalizedQuery, term) {
  return new RegExp(`(^| )${escapePattern(term)}( |$)`).test(normalizedQuery);
}

function isOutOfScopeInteractionConceptId(conceptId) {
  return OUT_OF_SCOPE_INTERACTION_CONCEPT_IDS.includes(
    typeof conceptId === 'string' ? conceptId.trim() : '',
  );
}

function extractMentionedOutOfScopeInteractionConceptIds(normalizedQuery) {
  if (typeof normalizedQuery !== 'string' || normalizedQuery.trim() === '') {
    return [];
  }

  const routingQuery = deriveRoutingText(normalizedQuery);

  return OUT_OF_SCOPE_INTERACTION_CONCEPT_IDS.filter((conceptId) => (
    hasWholeWord(routingQuery, conceptId)
  ));
}

function hasGovernanceKernelAnchor(normalizedQuery) {
  if (typeof normalizedQuery !== 'string' || normalizedQuery.trim() === '') {
    return false;
  }

  const routingQuery = deriveRoutingText(normalizedQuery);

  return GOVERNANCE_KERNEL_ANCHOR_TERMS.some((anchor) => hasWholeWord(routingQuery, anchor));
}

function detectOutOfScopeInteractionQuery(normalizedQuery) {
  const concepts = extractMentionedOutOfScopeInteractionConceptIds(normalizedQuery);

  if (concepts.length === 0 || hasGovernanceKernelAnchor(normalizedQuery)) {
    return null;
  }

  return {
    concepts,
    targetConceptId: concepts[0],
    message: INTERACTION_OUT_OF_SCOPE_MESSAGE,
  };
}

module.exports = {
  GOVERNANCE_KERNEL_ANCHOR_TERMS,
  INTERACTION_OUT_OF_SCOPE_MESSAGE,
  OUT_OF_SCOPE_INTERACTION_CONCEPT_IDS,
  detectOutOfScopeInteractionQuery,
  extractMentionedOutOfScopeInteractionConceptIds,
  hasGovernanceKernelAnchor,
  isOutOfScopeInteractionConceptId,
};

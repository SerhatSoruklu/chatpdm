'use strict';

const {
  deriveRoutingText,
  extractCanonicalId,
  normalizeQuery,
} = require('./normalizer');
const {
  UNRESOLVED_DOMAIN_REGISTRY,
  isUnresolvedDomain,
  normalizeUnresolvedDomainTerm,
} = require('./unresolved-domain-registry');
const {
  detectSemanticOverreach,
} = require('./semantic-overreach-detector');
const {
  detectDomainBoundaryViolation,
} = require('./domain-boundary-detector');

const PRE_RESOLUTION_GUARD_REASONS = Object.freeze([
  'unresolved_domain',
  'unsupported_semantic_bridge',
  'domain_boundary_violation',
  'causal_overreach',
]);

const PRE_RESOLUTION_GUARD_MESSAGES = Object.freeze({
  unresolved_domain: 'This query refers to an unresolved domain and is refused before concept resolution.',
  unsupported_semantic_bridge: 'This query asserts an unsupported semantic bridge and is refused before concept resolution.',
  domain_boundary_violation: 'This query crosses a domain boundary without a validated bridge and is refused before concept resolution.',
  causal_overreach: 'This query turns correlation or suggestion into causation and is refused before concept resolution.',
});

const UNRESOLVED_DOMAIN_DIRECT_PREFIXES = Object.freeze([
  'what is',
  'what are',
  'what s',
  'define',
  'explain',
  'tell me about',
]);

const UNRESOLVED_DOMAIN_ESCALATION_MARKERS = Object.freeze([
  ' is ',
  ' are ',
  ' means ',
  ' imply ',
  ' implies ',
  ' therefore ',
  ' thus ',
  ' hence ',
  ' proves ',
  ' prove ',
  ' causes ',
  ' cause ',
  ' creates ',
  ' create ',
  ' generates ',
  ' generate ',
  ' continuation of ',
]);

function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeGuardText(rawQuery) {
  if (typeof rawQuery !== 'string') {
    return '';
  }

  return normalizeUnresolvedDomainTerm(
    rawQuery.replace(/[^a-z0-9]+/gi, ' '),
  );
}

function normalizeGuardSentenceText(rawQuery) {
  if (typeof rawQuery !== 'string') {
    return '';
  }

  return rawQuery
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeGuardTermText(term) {
  return normalizeUnresolvedDomainTerm(term).replace(/_/g, ' ');
}

function hasNormalizedTerm(normalizedText, term) {
  if (typeof normalizedText !== 'string' || normalizedText === '') {
    return false;
  }

  const normalizedTerm = normalizeUnresolvedDomainTerm(term);

  if (normalizedTerm === '') {
    return false;
  }

  return new RegExp(`(^|_)${escapePattern(normalizedTerm)}(_|$)`).test(normalizedText);
}

function findUnresolvedDomainMentions(rawQuery) {
  const normalizedText = normalizeGuardSentenceText(rawQuery);

  return [...UNRESOLVED_DOMAIN_REGISTRY].filter((term) => {
    const normalizedTerm = normalizeGuardTermText(term);

    if (normalizedText === normalizedTerm) {
      return true;
    }

    if (UNRESOLVED_DOMAIN_DIRECT_PREFIXES.some((prefix) => normalizedText.startsWith(`${prefix} ${normalizedTerm}`))) {
      return true;
    }

    return UNRESOLVED_DOMAIN_ESCALATION_MARKERS.some((marker) => normalizedText.includes(`${normalizedTerm}${marker}`));
  });
}

function deriveGuardQueryType(normalizedQuery, canonicalId) {
  if (canonicalId !== null) {
    return 'canonical_id_query';
  }

  return deriveRoutingText(normalizedQuery).includes(' ')
    ? 'unsupported_complex_query'
    : 'exact_concept_query';
}

function buildGuardDecision({
  normalizedQuery,
  canonicalId,
  queryType,
  reason,
  matchedReasons,
  domain,
}) {
  return Object.freeze({
    refused: true,
    normalizedQuery,
    routingQuery: deriveRoutingText(normalizedQuery),
    canonicalId,
    queryType,
    reason,
    interpretationType: reason,
    message: PRE_RESOLUTION_GUARD_MESSAGES[reason],
    matchedReasons: Object.freeze([...new Set(matchedReasons)]),
    domain: typeof domain === 'string' && domain.trim() !== '' ? domain : null,
  });
}

function evaluatePreResolutionGuard(rawQuery) {
  if (typeof rawQuery !== 'string') {
    throw new TypeError('Expected rawQuery to be a string.');
  }

  const normalizedQuery = normalizeQuery(rawQuery);
  const canonicalId = extractCanonicalId(rawQuery);
  const queryType = deriveGuardQueryType(normalizedQuery, canonicalId);
  const normalizedGuardText = normalizeGuardText(rawQuery);
  const exactUnresolvedDomain = canonicalId !== null
    ? normalizeUnresolvedDomainTerm(canonicalId)
    : normalizedGuardText;

  if (exactUnresolvedDomain !== '' && isUnresolvedDomain(exactUnresolvedDomain)) {
    return buildGuardDecision({
      normalizedQuery,
      canonicalId,
      queryType,
      reason: 'unresolved_domain',
      matchedReasons: [exactUnresolvedDomain],
      domain: exactUnresolvedDomain,
    });
  }

  const semanticOverreach = detectSemanticOverreach(rawQuery);

  if (semanticOverreach.unsupportedSemanticBridge) {
    return buildGuardDecision({
      normalizedQuery,
      canonicalId,
      queryType,
      reason: 'unsupported_semantic_bridge',
      matchedReasons: semanticOverreach.matchedReasons,
    });
  }

  const domainBoundary = detectDomainBoundaryViolation(rawQuery);

  if (domainBoundary.domainBoundaryViolation) {
    const { classification } = domainBoundary;
    const detectedDomains = Array.isArray(classification?.detectedDomains)
      ? classification.detectedDomains.filter((domain) => typeof domain === 'string' && domain.trim() !== '')
      : [];
    const domain = detectedDomains.length > 0
      ? detectedDomains.join(' -> ')
      : null;

    return buildGuardDecision({
      normalizedQuery,
      canonicalId,
      queryType,
      reason: 'domain_boundary_violation',
      matchedReasons: domainBoundary.matchedReasons,
      domain,
    });
  }

  if (semanticOverreach.causalOverreach) {
    return buildGuardDecision({
      normalizedQuery,
      canonicalId,
      queryType,
      reason: 'causal_overreach',
      matchedReasons: semanticOverreach.matchedReasons,
    });
  }

  const unresolvedDomainMentions = findUnresolvedDomainMentions(rawQuery);

  if (unresolvedDomainMentions.length > 0) {
    return buildGuardDecision({
      normalizedQuery,
      canonicalId,
      queryType,
      reason: 'unresolved_domain',
      matchedReasons: unresolvedDomainMentions,
      domain: unresolvedDomainMentions.join(', '),
    });
  }

  return Object.freeze({
    refused: false,
    normalizedQuery,
    routingQuery: deriveRoutingText(normalizedQuery),
    canonicalId,
    queryType,
    reason: null,
    interpretationType: null,
    message: null,
    matchedReasons: Object.freeze([]),
    domain: null,
  });
}

module.exports = {
  PRE_RESOLUTION_GUARD_MESSAGES,
  PRE_RESOLUTION_GUARD_REASONS,
  deriveGuardQueryType,
  evaluatePreResolutionGuard,
  findUnresolvedDomainMentions,
  hasNormalizedTerm,
  normalizeGuardText,
};

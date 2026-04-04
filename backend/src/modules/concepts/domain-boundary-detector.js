'use strict';

const DOMAIN_MODEL = Object.freeze({
  physics: Object.freeze([
    'physics',
    'quantum entanglement',
    'entanglement',
    'quantum',
    'measurement problem',
    'wave function',
    'observer effect',
  ]),
  biology: Object.freeze([
    'biology',
    'biological',
    'living systems',
    'microtubule',
    'microtubules',
    'cells',
    'organism',
    'organisms',
  ]),
  neuroscience: Object.freeze([
    'neuroscience',
    'brain',
    'neural',
    'neuron',
    'neuronal',
    'synapse',
    'cortex',
  ]),
  philosophy: Object.freeze([
    'philosophy',
    'philosophical',
    'philosophically',
  ]),
  metaphysics: Object.freeze([
    'metaphysics',
    'metaphysical',
    'cosmic consciousness',
    'observer created reality',
    'reality is observer created',
    'connected to the universe',
    'connected to universe',
    'linked across the universe',
    'minds are linked across the universe',
    'spiritual',
    'spirit',
    'soul',
    'ontology',
    'ontological',
  ]),
});

const DOMAIN_ORDER = Object.freeze([
  'physics',
  'biology',
  'neuroscience',
  'philosophy',
  'metaphysics',
]);

const EMPIRICAL_DOMAINS = Object.freeze([
  'physics',
  'biology',
  'neuroscience',
]);

const BRIDGE_CUES = Object.freeze([
  'therefore',
  'thus',
  'hence',
  'means',
  'implies',
  'imply',
  'proves',
  'prove',
  'shows',
  'show',
  'thereby',
]);

function normalizeDomainBoundaryText(text) {
  if (typeof text !== 'string') {
    return '';
  }

  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasNormalizedPhrase(normalizedText, phrase) {
  const normalizedPhrase = normalizeDomainBoundaryText(phrase);

  if (normalizedText === '' || normalizedPhrase === '') {
    return false;
  }

  return new RegExp(`(^| )${normalizedPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( |$)`).test(normalizedText);
}

function classifyDomainSignals(text) {
  const normalizedText = normalizeDomainBoundaryText(text);
  const signalsByDomain = {};
  const detectedDomains = [];

  DOMAIN_ORDER.forEach((domain) => {
    const matchedSignals = DOMAIN_MODEL[domain].filter((term) => hasNormalizedPhrase(normalizedText, term));
    signalsByDomain[domain] = Object.freeze(matchedSignals);

    if (matchedSignals.length > 0) {
      detectedDomains.push(domain);
    }
  });

  const bridgeCues = BRIDGE_CUES.filter((cue) => hasNormalizedPhrase(normalizedText, cue));

  return Object.freeze({
    normalizedText,
    detectedDomains: Object.freeze(detectedDomains),
    signalsByDomain: Object.freeze(signalsByDomain),
    bridgeCues: Object.freeze(bridgeCues),
  });
}

function detectDomainBoundaryViolation(text) {
  const classification = classifyDomainSignals(text);
  const empiricalDomains = classification.detectedDomains.filter((domain) => EMPIRICAL_DOMAINS.includes(domain));
  const metaphysicalDomains = classification.detectedDomains.filter((domain) => domain === 'metaphysics');
  const hasCrossDomainJump = empiricalDomains.length > 0
    && metaphysicalDomains.length > 0
    && classification.bridgeCues.length > 0;

  const matchedReasons = [];

  if (empiricalDomains.length > 0) {
    matchedReasons.push(`empirical_domains:${empiricalDomains.join(',')}`);
  }

  if (metaphysicalDomains.length > 0) {
    matchedReasons.push('metaphysical_domain:metaphysics');
  }

  if (classification.bridgeCues.length > 0) {
    matchedReasons.push(`bridge_cues:${classification.bridgeCues.join(',')}`);
  }

  if (hasCrossDomainJump) {
    matchedReasons.push('empirical_to_metaphysical_jump');
  }

  return Object.freeze({
    domainBoundaryViolation: hasCrossDomainJump,
    matchedReasons: Object.freeze(matchedReasons),
    classification: Object.freeze({
      ...classification,
      empiricalDomains: Object.freeze(empiricalDomains),
      metaphysicalDomains: Object.freeze(metaphysicalDomains),
    }),
  });
}

module.exports = {
  BRIDGE_CUES,
  DOMAIN_MODEL,
  DOMAIN_ORDER,
  EMPIRICAL_DOMAINS,
  classifyDomainSignals,
  detectDomainBoundaryViolation,
  hasNormalizedPhrase,
  normalizeDomainBoundaryText,
};

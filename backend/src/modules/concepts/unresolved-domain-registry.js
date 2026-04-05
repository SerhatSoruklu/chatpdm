'use strict';

const UNRESOLVED_DOMAIN_REGISTRY = Object.freeze([
  'consciousness',
  'afterlife',
  'telepathy',
  'non_local_mind',
  'observer_created_reality',
  'cosmic_consciousness',
]);

const UNRESOLVED_DOMAIN_REGISTRY_SET = new Set(UNRESOLVED_DOMAIN_REGISTRY);

function normalizeUnresolvedDomainTerm(term) {
  if (typeof term !== 'string') {
    return '';
  }

  const trimmed = term.trim().toLowerCase();
  const normalized = [];

  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index];
    const isSeparator = char === '-' || char === '_' || char.trim() === '';

    if (isSeparator) {
      if (normalized.length > 0 && normalized[normalized.length - 1] !== '_') {
        normalized.push('_');
      }
      continue;
    }

    normalized.push(char);
  }

  if (normalized[normalized.length - 1] === '_') {
    normalized.pop();
  }

  return normalized.join('');
}

function isUnresolvedDomain(term) {
  return UNRESOLVED_DOMAIN_REGISTRY_SET.has(normalizeUnresolvedDomainTerm(term));
}

module.exports = {
  UNRESOLVED_DOMAIN_REGISTRY,
  normalizeUnresolvedDomainTerm,
  isUnresolvedDomain,
};

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

  return term
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function isUnresolvedDomain(term) {
  return UNRESOLVED_DOMAIN_REGISTRY_SET.has(normalizeUnresolvedDomainTerm(term));
}

module.exports = {
  UNRESOLVED_DOMAIN_REGISTRY,
  normalizeUnresolvedDomainTerm,
  isUnresolvedDomain,
};

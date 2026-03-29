'use strict';

const CONTRACT_VERSION = 'v1.2';
const NORMALIZER_VERSION = '2026-03-27.v1';
const MATCHER_VERSION = '2026-03-27.v3';
const CONCEPT_SET_VERSION = '20260327.4';
const EMPTY_NORMALIZED_QUERY = '__empty__';

const SEED_CONCEPT_IDS = Object.freeze([
  'authority',
  'power',
  'legitimacy',
  'responsibility',
  'duty',
]);

const GOVERNANCE_CORE_TRIAD = Object.freeze([
  'authority',
  'power',
  'legitimacy',
]);

const GOVERNANCE_SCOPE_MUST_PRESERVE_IN = Object.freeze([
  'canonical_outputs',
  'comparison_outputs',
  'relation_outputs',
  'documentation',
  'ui_api_surfaces',
]);

const NON_GOVERNANCE_HANDLING_REQUIRED = Object.freeze([
  'scoped_clarification',
  'out_of_scope_refusal',
]);

const CANONICAL_GOVERNANCE_ROLES = Object.freeze([
  'Founding Canonical Steward',
  'Core Maintainer',
  'Domain Package Maintainer',
  'Source Integrity Reviewer',
  'Contrast Reviewer',
  'Release Manager',
  'Institutional Partner',
]);

const CANONICAL_GOVERNANCE_REFERENCE_PATHS = Object.freeze({
  constitutionPath: 'docs/governance/GOVERNANCE_CONSTITUTION.md',
  changeAuthorityPath: 'docs/governance/CHANGE_AUTHORITY_MATRIX.md',
  lifecyclePath: 'docs/governance/CONCEPT_LIFECYCLE.md',
});

const RESPONSE_ALLOWED_SOURCE_TYPES = Object.freeze([
  'dictionary',
  'book',
  'paper',
  'law',
  'article',
  'internal',
]);

const RESPONSE_ALLOWED_RELATION_TYPES = Object.freeze([
  'see_also',
  'prerequisite',
  'extension',
  'contrast',
]);

const PACKAGE_ALLOWED_RELATION_TYPES = Object.freeze([
  ...RESPONSE_ALLOWED_RELATION_TYPES,
  'extends-core-concept',
]);

const CLOSED_WORLD_REFUSAL_REASONS = Object.freeze([
  'undefined_in_system',
  'unknown_role',
  'not_defined_in_constitution',
  'out_of_scope',
]);

const PUNCTUATION_CHARACTERS = Object.freeze([
  '.',
  '!',
  '?',
  ',',
  ';',
  ':',
  '(',
  ')',
  '[',
  ']',
  '{',
  '}',
  '"',
  '\'',
]);

const LEADING_FILLER_PHRASES = Object.freeze([
  'what is ',
  'what are ',
  'define ',
  'meaning of ',
  'explain ',
  'tell me about ',
]);

const NO_EXACT_MATCH_MESSAGE = 'No exact canonical concept match was found for this query.';
const AMBIGUOUS_MATCH_MESSAGE = 'Multiple canonical concepts match this query. Choose one to continue.';

module.exports = {
  AMBIGUOUS_MATCH_MESSAGE,
  CANONICAL_GOVERNANCE_REFERENCE_PATHS,
  CANONICAL_GOVERNANCE_ROLES,
  CONCEPT_SET_VERSION,
  CONTRACT_VERSION,
  CLOSED_WORLD_REFUSAL_REASONS,
  EMPTY_NORMALIZED_QUERY,
  GOVERNANCE_CORE_TRIAD,
  GOVERNANCE_SCOPE_MUST_PRESERVE_IN,
  LEADING_FILLER_PHRASES,
  MATCHER_VERSION,
  NORMALIZER_VERSION,
  NON_GOVERNANCE_HANDLING_REQUIRED,
  NO_EXACT_MATCH_MESSAGE,
  PACKAGE_ALLOWED_RELATION_TYPES,
  PUNCTUATION_CHARACTERS,
  RESPONSE_ALLOWED_RELATION_TYPES,
  RESPONSE_ALLOWED_SOURCE_TYPES,
  SEED_CONCEPT_IDS,
};

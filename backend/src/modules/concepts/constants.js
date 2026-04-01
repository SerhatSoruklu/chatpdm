'use strict';

const { LIVE_CONCEPT_IDS } = require('./admission-state');

const CONTRACT_VERSION = 'v1.7';
const NORMALIZER_VERSION = '2026-04-01.v2';
const MATCHER_VERSION = '2026-04-01.v4';
const CONCEPT_SET_VERSION = '20260401.2';
const EMPTY_NORMALIZED_QUERY = '__empty__';

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

const LEADING_FILLER_PHRASES = Object.freeze([
  'what is',
  'define',
  'explain',
  'tell me',
  'can you',
]);

const NO_EXACT_MATCH_MESSAGE = 'No exact canonical concept match was found for this query.';
const INVALID_QUERY_MESSAGE = 'No recognizable concept or supported query structure was detected.';
const UNSUPPORTED_QUERY_TYPE_MESSAGE = 'This query has recognizable structure, but the current runtime does not support this query type yet.';
const AMBIGUOUS_MATCH_MESSAGE = 'Multiple canonical concepts match this query. Choose one to continue.';
const REJECTED_CONCEPT_MESSAGE = 'This concept is structurally rejected under the current system state.';
const VOCABULARY_DETECTED_MESSAGE = 'Recognized term is not a core system concept and is excluded from resolution.';

module.exports = {
  AMBIGUOUS_MATCH_MESSAGE,
  CONCEPT_SET_VERSION,
  CONTRACT_VERSION,
  EMPTY_NORMALIZED_QUERY,
  GOVERNANCE_CORE_TRIAD,
  GOVERNANCE_SCOPE_MUST_PRESERVE_IN,
  INVALID_QUERY_MESSAGE,
  LEADING_FILLER_PHRASES,
  MATCHER_VERSION,
  NORMALIZER_VERSION,
  NON_GOVERNANCE_HANDLING_REQUIRED,
  NO_EXACT_MATCH_MESSAGE,
  REJECTED_CONCEPT_MESSAGE,
  LIVE_CONCEPT_IDS,
  UNSUPPORTED_QUERY_TYPE_MESSAGE,
  VOCABULARY_DETECTED_MESSAGE,
};

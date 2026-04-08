'use strict';

const {
  ADMISSIBLE_QUERY,
  BROAD_COLLAPSE_FRAMING,
  INSUFFICIENT_EVIDENCE,
  PARTIAL_EVIDENCE_SUPPORT,
  UNSUPPORTED_DOMAIN,
  UNSUPPORTED_SCENARIO_TYPE,
  UNSUPPORTED_SCOPE,
  SCOPE_NOT_ADMITTED,
} = require('../constants/rmgReasonCodes');

const NARROW_REASON_MAP = Object.freeze({
  [BROAD_COLLAPSE_FRAMING]: 'Broad collapse framing exceeded the authored support boundary and was narrowed.',
  [PARTIAL_EVIDENCE_SUPPORT]: 'Only part of the requested scope has authored support.',
});

const REFUSAL_REASON_MAP = Object.freeze({
  [UNSUPPORTED_DOMAIN]: 'Requested domain is outside the authored support boundary.',
  [UNSUPPORTED_SCENARIO_TYPE]: 'Requested scenario type is outside the authored support boundary.',
  [UNSUPPORTED_SCOPE]: 'Requested scopes are outside the authored support boundary.',
  [SCOPE_NOT_ADMITTED]: 'Requested scope is not admitted under current authored support.',
  [INSUFFICIENT_EVIDENCE]: 'Authored evidence does not support the requested scoped structure.',
});

/**
 * @param {{ status: string, reasonCode: string }} input
 * @returns {{ whyNarrowed: string | null, whyRefused: string | null }}
 */
function buildReasonExplanation(input) {
  if (input.status === 'narrowed') {
    return Object.freeze({
      whyNarrowed: NARROW_REASON_MAP[input.reasonCode] || 'The query was narrowed to the supported structural scope.',
      whyRefused: null,
    });
  }

  if (input.status === 'refused') {
    return Object.freeze({
      whyNarrowed: null,
      whyRefused: REFUSAL_REASON_MAP[input.reasonCode] || 'The query was refused under the authored support boundary.',
    });
  }

  if (input.reasonCode === ADMISSIBLE_QUERY) {
    return Object.freeze({
      whyNarrowed: null,
      whyRefused: null,
    });
  }

  return Object.freeze({
    whyNarrowed: null,
    whyRefused: null,
  });
}

module.exports = Object.freeze({
  buildReasonExplanation,
});

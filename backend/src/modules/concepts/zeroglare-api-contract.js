'use strict';

const ZEROGLARE_API_INPUT_LIMIT = 1_000_000;
const ZEROGLARE_API_INPUT_LIMIT_LABEL = '1,000,000';

const ZEROGLARE_API_ERROR_CODES = Object.freeze({
  invalidInput: 'invalid_zeroglare_input',
  inputTooLarge: 'INPUT_TOO_LARGE',
  analysisFailed: 'zeroglare_analysis_failed',
});

const ZEROGLARE_API_ERROR_MESSAGES = Object.freeze({
  invalidQuery: 'Query parameter q must be a non-empty string.',
  invalidBody: 'Request body field "input" must be a non-empty string.',
  inputTooLarge: `Input exceeds maximum allowed length (${ZEROGLARE_API_INPUT_LIMIT_LABEL} characters).`,
  analysisFailed: 'The Zeroglare diagnostics endpoint could not produce a valid response.',
});

function buildZeroGlareErrorResponse(code, message) {
  return {
    error: {
      code,
      message,
    },
  };
}

module.exports = Object.freeze({
  ZEROGLARE_API_ERROR_CODES,
  ZEROGLARE_API_ERROR_MESSAGES,
  ZEROGLARE_API_INPUT_LIMIT,
  buildZeroGlareErrorResponse,
});

'use strict';

const assert = require('node:assert/strict');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const { connectMongo, disconnectMongo } = require('../src/config/mongoose');
const {
  CONCEPT_SET_VERSION,
  CONTRACT_VERSION,
  MATCHER_VERSION,
  NORMALIZER_VERSION,
} = require('../src/modules/concepts/constants');
const {
  clearFeedbackControlAudits,
  clearFeedbackEvents,
} = require('../src/modules/feedback/store');

const ALLOWED_ORIGIN = 'http://127.0.0.1:4200';
const DISALLOWED_ORIGIN = 'https://blocked.example';

async function request(method, url, { payload, headers } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      ...(payload ? { 'content-type': 'application/json' } : {}),
      ...(headers ?? {}),
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  let body = null;

  if (contentType.includes('application/json')) {
    body = await response.json();
  } else {
    const text = await response.text();
    body = text.length > 0 ? text : null;
  }

  return {
    status: response.status,
    headers: response.headers,
    body,
  };
}

function buildBaseFeedbackPayload(overrides = {}) {
  return {
    sessionId: 'api-verify-session',
    rawQuery: 'authority',
    normalizedQuery: 'authority',
    responseType: 'concept_match',
    feedbackType: 'clear',
    resolvedConceptId: 'authority',
    contractVersion: CONTRACT_VERSION,
    normalizerVersion: NORMALIZER_VERSION,
    matcherVersion: MATCHER_VERSION,
    conceptSetVersion: CONCEPT_SET_VERSION,
    ...overrides,
  };
}

async function withServer(run) {
  const server = app.listen(0);

  await new Promise((resolve) => {
    server.once('listening', resolve);
  });

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : null;

  if (!port) {
    throw new Error('API verification could not determine the temporary server port.');
  }

  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

async function verifyEndpointExistenceAndMethodPairing(baseUrl) {
  const conceptsResolve = await request('GET', `${baseUrl}/api/v1/concepts/resolve?q=authority`);
  assert.equal(conceptsResolve.status, 200, 'GET /api/v1/concepts/resolve should succeed.');

  const conceptsResolveWrongMethod = await request('POST', `${baseUrl}/api/v1/concepts/resolve`);
  assert.equal(conceptsResolveWrongMethod.status, 404, 'POST /api/v1/concepts/resolve should not be routed.');

  const conceptDetail = await request('GET', `${baseUrl}/api/v1/concepts/authority`);
  assert.equal(conceptDetail.status, 200, 'GET /api/v1/concepts/:conceptId should succeed for live concepts.');

  const conceptDetailWrongMethod = await request('POST', `${baseUrl}/api/v1/concepts/authority`);
  assert.equal(conceptDetailWrongMethod.status, 404, 'POST /api/v1/concepts/:conceptId should not be routed.');

  const feedbackSubmission = await request('POST', `${baseUrl}/api/v1/feedback`, {
    payload: buildBaseFeedbackPayload(),
  });
  assert.equal(feedbackSubmission.status, 201, 'POST /api/v1/feedback should accept valid feedback.');

  const feedbackExport = await request(
    'GET',
    `${baseUrl}/api/v1/feedback/session/${encodeURIComponent('api-verify-session')}/export`,
  );
  assert.equal(feedbackExport.status, 200, 'GET /api/v1/feedback/session/:sessionId/export should succeed.');

  const feedbackDelete = await request(
    'DELETE',
    `${baseUrl}/api/v1/feedback/session/${encodeURIComponent('api-verify-session')}`,
  );
  assert.equal(feedbackDelete.status, 200, 'DELETE /api/v1/feedback/session/:sessionId should succeed.');

  process.stdout.write('PASS api_endpoints_exist_with_documented_methods\n');
}

async function verifyConceptResolutionEndpoint(baseUrl) {
  const liveConcept = await request('GET', `${baseUrl}/api/v1/concepts/resolve?q=authority`);
  assert.equal(liveConcept.status, 200, 'authority resolution should return 200.');
  assert.equal(liveConcept.body.type, 'concept_match', 'authority should resolve as concept_match.');
  assert.equal(liveConcept.body.resolution.conceptId, 'authority', 'authority conceptId mismatch.');

  const outOfScope = await request(
    'GET',
    `${baseUrl}/api/v1/concepts/resolve?q=${encodeURIComponent('artistic legitimacy')}`,
  );
  assert.equal(outOfScope.status, 200, 'out-of-scope resolution should return 200.');
  assert.equal(outOfScope.body.type, 'no_exact_match', 'out-of-scope query should refuse as no_exact_match.');
  assert.equal(outOfScope.body.resolution.method, 'out_of_scope', 'out-of-scope resolution method mismatch.');
  assert.equal(outOfScope.body.interpretation.interpretationType, 'out_of_scope', 'out-of-scope interpretation mismatch.');

  const unsupported = await request(
    'GET',
    `${baseUrl}/api/v1/concepts/resolve?q=${encodeURIComponent('unknown term')}`,
  );
  assert.equal(unsupported.status, 200, 'unsupported query should return 200 with explicit refusal.');
  assert.equal(unsupported.body.type, 'unsupported_query_type', 'unsupported query should refuse as unsupported_query_type.');
  assert.equal(
    unsupported.body.interpretation.interpretationType,
    'unsupported_complex',
    'unsupported query interpretation mismatch.',
  );

  process.stdout.write('PASS api_concept_resolution_behavior_matches_runtime_contract\n');
}

async function verifyConceptDetailEndpoint(baseUrl) {
  const liveConcept = await request('GET', `${baseUrl}/api/v1/concepts/authority`);
  assert.equal(liveConcept.status, 200, 'authority detail should return 200.');
  assert.equal(liveConcept.body.conceptId, 'authority', 'authority detail conceptId mismatch.');
  assert.equal(typeof liveConcept.body.title, 'string', 'authority detail should include title.');
  assert.equal(liveConcept.body.reviewState, null, 'authority should expose null reviewState when absent.');

  const law = await request('GET', `${baseUrl}/api/v1/concepts/law`);
  assert.equal(law.status, 200, 'law detail should return 200.');
  assert.equal(law.body.conceptId, 'law', 'law detail conceptId mismatch.');
  assert.equal(law.body.reviewState.admission, 'phase2_stable', 'law reviewState mismatch.');
  assert.equal(typeof law.body.title, 'string', 'law detail should include authored title.');

  const violation = await request('GET', `${baseUrl}/api/v1/concepts/violation`);
  assert.equal(violation.status, 200, 'violation detail should return 200.');
  assert.equal(violation.body.reviewState.admission, 'visible_only_derived', 'violation reviewState mismatch.');
  assert.equal(typeof violation.body.title, 'string', 'violation detail should include authored title.');

  const missing = await request('GET', `${baseUrl}/api/v1/concepts/not-a-real-concept`);
  assert.equal(missing.status, 404, 'unknown concept detail should return 404.');
  assert.equal(missing.body.error.code, 'concept_not_found', 'unknown concept detail error code mismatch.');

  process.stdout.write('PASS api_concept_detail_behavior_matches_runtime_contract\n');
}

async function verifyFeedbackSubmissionValidation(baseUrl) {
  const conceptMatch = await request('POST', `${baseUrl}/api/v1/feedback`, {
    payload: buildBaseFeedbackPayload({
      sessionId: 'feedback-validation-session',
    }),
  });
  assert.equal(conceptMatch.status, 201, 'concept_match feedback should be accepted.');
  assert.equal(conceptMatch.body.status, 'recorded', 'concept_match feedback receipt mismatch.');
  assert.equal(typeof conceptMatch.body.feedbackId, 'string', 'feedback receipt should include feedbackId.');

  const ambiguousMatch = await request('POST', `${baseUrl}/api/v1/feedback`, {
    payload: buildBaseFeedbackPayload({
      sessionId: 'feedback-validation-session',
      rawQuery: 'obligation',
      normalizedQuery: 'obligation',
      responseType: 'ambiguous_match',
      feedbackType: 'found_right_one',
      resolvedConceptId: 'duty',
      candidateConceptIds: ['duty', 'responsibility'],
    }),
  });
  assert.equal(ambiguousMatch.status, 201, 'ambiguous_match feedback should be accepted.');

  const noExactMatch = await request('POST', `${baseUrl}/api/v1/feedback`, {
    payload: buildBaseFeedbackPayload({
      sessionId: 'feedback-validation-session',
      rawQuery: 'civic duty',
      normalizedQuery: 'civic duty',
      responseType: 'no_exact_match',
      feedbackType: 'should_exist',
      resolvedConceptId: undefined,
      suggestionConceptIds: ['duty'],
    }),
  });
  assert.equal(noExactMatch.status, 201, 'no_exact_match feedback should be accepted.');

  const extraKey = await request('POST', `${baseUrl}/api/v1/feedback`, {
    payload: {
      ...buildBaseFeedbackPayload(),
      unsupportedField: 'nope',
    },
  });
  assert.equal(extraKey.status, 400, 'extra feedback keys must be rejected.');
  assert.equal(extraKey.body.error.code, 'invalid_feedback', 'extra key rejection code mismatch.');

  const invalidResponseType = await request('POST', `${baseUrl}/api/v1/feedback`, {
    payload: buildBaseFeedbackPayload({
      responseType: 'comparison',
    }),
  });
  assert.equal(invalidResponseType.status, 400, 'invalid responseType must be rejected.');

  const invalidPairing = await request('POST', `${baseUrl}/api/v1/feedback`, {
    payload: buildBaseFeedbackPayload({
      feedbackType: 'expected',
    }),
  });
  assert.equal(invalidPairing.status, 400, 'invalid feedbackType/responseType pairing must be rejected.');

  const conceptMatchWithCandidates = await request('POST', `${baseUrl}/api/v1/feedback`, {
    payload: buildBaseFeedbackPayload({
      candidateConceptIds: ['authority', 'power'],
      suggestionConceptIds: ['legitimacy'],
    }),
  });
  assert.equal(
    conceptMatchWithCandidates.status,
    400,
    'concept_match feedback must reject candidate and suggestion IDs.',
  );

  const ambiguousMissingCandidates = await request('POST', `${baseUrl}/api/v1/feedback`, {
    payload: buildBaseFeedbackPayload({
      responseType: 'ambiguous_match',
      feedbackType: 'found_right_one',
      resolvedConceptId: 'duty',
      candidateConceptIds: ['duty'],
    }),
  });
  assert.equal(
    ambiguousMissingCandidates.status,
    400,
    'ambiguous_match feedback must require at least two candidate concept IDs.',
  );

  const ambiguousWithSuggestions = await request('POST', `${baseUrl}/api/v1/feedback`, {
    payload: buildBaseFeedbackPayload({
      responseType: 'ambiguous_match',
      feedbackType: 'still_not_right',
      resolvedConceptId: 'responsibility',
      candidateConceptIds: ['duty', 'responsibility'],
      suggestionConceptIds: ['authority'],
    }),
  });
  assert.equal(
    ambiguousWithSuggestions.status,
    400,
    'ambiguous_match feedback must reject suggestion concept IDs.',
  );

  const noExactWithCandidates = await request('POST', `${baseUrl}/api/v1/feedback`, {
    payload: buildBaseFeedbackPayload({
      responseType: 'no_exact_match',
      feedbackType: 'expected',
      resolvedConceptId: undefined,
      candidateConceptIds: ['duty', 'responsibility'],
    }),
  });
  assert.equal(
    noExactWithCandidates.status,
    400,
    'no_exact_match feedback must reject candidate concept IDs.',
  );

  process.stdout.write('PASS api_feedback_validation_rules_match_documented_contract\n');
}

async function verifyFeedbackExportDeleteBehavior(baseUrl) {
  const seededSessionId = 'feedback-controls-session';

  await request('POST', `${baseUrl}/api/v1/feedback`, {
    payload: buildBaseFeedbackPayload({
      sessionId: seededSessionId,
    }),
  });

  const exportValid = await request(
    'GET',
    `${baseUrl}/api/v1/feedback/session/${encodeURIComponent(seededSessionId)}/export`,
  );
  assert.equal(exportValid.status, 200, 'feedback export should succeed for a valid sessionId.');
  assert.equal(exportValid.body.sessionId, seededSessionId, 'feedback export sessionId mismatch.');
  assert.equal(exportValid.body.recordCount, 1, 'feedback export recordCount mismatch.');
  assert.equal(exportValid.body.records.length, 1, 'feedback export records length mismatch.');

  const exportInvalid = await request(
    'GET',
    `${baseUrl}/api/v1/feedback/session/${encodeURIComponent('   ')}/export`,
  );
  assert.equal(exportInvalid.status, 400, 'feedback export should reject blank sessionId controls.');
  assert.equal(
    exportInvalid.body.error.code,
    'invalid_feedback_session_control',
    'feedback export invalid-session error code mismatch.',
  );

  const deleteValid = await request(
    'DELETE',
    `${baseUrl}/api/v1/feedback/session/${encodeURIComponent(seededSessionId)}`,
  );
  assert.equal(deleteValid.status, 200, 'feedback delete should succeed for a valid sessionId.');
  assert.equal(deleteValid.body.sessionId, seededSessionId, 'feedback delete sessionId mismatch.');
  assert.equal(deleteValid.body.deletedCount, 1, 'feedback delete deletedCount mismatch.');
  assert.equal(deleteValid.body.status, 'deleted', 'feedback delete status mismatch.');

  const deleteInvalid = await request(
    'DELETE',
    `${baseUrl}/api/v1/feedback/session/${encodeURIComponent('   ')}`,
  );
  assert.equal(deleteInvalid.status, 400, 'feedback delete should reject blank sessionId controls.');
  assert.equal(
    deleteInvalid.body.error.code,
    'invalid_feedback_session_control',
    'feedback delete invalid-session error code mismatch.',
  );

  const exportAfterDelete = await request(
    'GET',
    `${baseUrl}/api/v1/feedback/session/${encodeURIComponent(seededSessionId)}/export`,
  );
  assert.equal(exportAfterDelete.status, 200, 'feedback export after delete should still succeed.');
  assert.equal(exportAfterDelete.body.recordCount, 0, 'feedback export after delete should show no records.');
  assert.deepEqual(exportAfterDelete.body.records, [], 'feedback export after delete should return no records.');

  process.stdout.write('PASS api_feedback_export_delete_controls_match_documented_contract\n');
}

async function verifyRuntimeComparisonBoundary(baseUrl) {
  const allowlisted = await request(
    'GET',
    `${baseUrl}/api/v1/concepts/resolve?q=${encodeURIComponent('authority vs power')}`,
  );
  assert.equal(allowlisted.status, 200, 'allowlisted comparison should return 200.');
  assert.equal(allowlisted.body.type, 'comparison', 'allowlisted comparison should return comparison output.');
  assert.equal(allowlisted.body.comparison.conceptA, 'authority', 'allowlisted comparison conceptA mismatch.');
  assert.equal(allowlisted.body.comparison.conceptB, 'power', 'allowlisted comparison conceptB mismatch.');

  const blocked = await request(
    'GET',
    `${baseUrl}/api/v1/concepts/resolve?q=${encodeURIComponent('authority vs duty')}`,
  );
  assert.equal(blocked.status, 200, 'non-allowlisted comparison should still return explicit response.');
  assert.equal(blocked.body.type, 'no_exact_match', 'non-allowlisted comparison should be blocked.');
  assert.equal(
    blocked.body.interpretation.interpretationType,
    'comparison_not_supported',
    'non-allowlisted comparison interpretation mismatch.',
  );
  assert.deepEqual(
    blocked.body.interpretation.concepts,
    ['authority', 'duty'],
    'non-allowlisted comparison should keep both live concepts visible in the refusal.',
  );

  process.stdout.write('PASS api_runtime_comparison_allowlist_boundary_verified\n');
}

async function verifyCorsPlatformBehavior(baseUrl) {
  const allowedOriginResponse = await request('GET', `${baseUrl}/api/v1/concepts/resolve?q=authority`, {
    headers: {
      Origin: ALLOWED_ORIGIN,
    },
  });
  assert.equal(
    allowedOriginResponse.headers.get('access-control-allow-origin'),
    ALLOWED_ORIGIN,
    'allowed CORS origin should be reflected for API responses.',
  );
  assert.equal(
    allowedOriginResponse.headers.get('access-control-allow-credentials'),
    'true',
    'allowed CORS origin should preserve credential support.',
  );

  const disallowedOriginResponse = await request('GET', `${baseUrl}/api/v1/concepts/resolve?q=authority`, {
    headers: {
      Origin: DISALLOWED_ORIGIN,
    },
  });
  assert.equal(
    disallowedOriginResponse.headers.get('access-control-allow-origin'),
    null,
    'disallowed CORS origins must not receive an allow-origin header.',
  );

  const deletePreflight = await request(
    'OPTIONS',
    `${baseUrl}/api/v1/feedback/session/${encodeURIComponent('cors-session')}`,
    {
      headers: {
        Origin: ALLOWED_ORIGIN,
        'Access-Control-Request-Method': 'DELETE',
      },
    },
  );
  assert.equal(deletePreflight.status, 204, 'DELETE preflight should return 204.');
  assert.equal(
    deletePreflight.headers.get('access-control-allow-origin'),
    ALLOWED_ORIGIN,
    'DELETE preflight should allow the configured frontend origin.',
  );

  const allowedMethods = deletePreflight.headers.get('access-control-allow-methods') || '';
  assert.match(
    allowedMethods,
    /DELETE/,
    'DELETE preflight must advertise DELETE in access-control-allow-methods.',
  );

  process.stdout.write('PASS api_cors_origin_allowlist_and_delete_preflight_verified\n');
}

async function main() {
  const mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  await connectMongo(process.env.MONGODB_URI);

  try {
    await clearFeedbackEvents();
    await clearFeedbackControlAudits();

    await withServer(async (baseUrl) => {
      await verifyEndpointExistenceAndMethodPairing(baseUrl);
      await verifyConceptResolutionEndpoint(baseUrl);
      await verifyConceptDetailEndpoint(baseUrl);
      await verifyFeedbackSubmissionValidation(baseUrl);
      await verifyFeedbackExportDeleteBehavior(baseUrl);
      await verifyRuntimeComparisonBoundary(baseUrl);
      await verifyCorsPlatformBehavior(baseUrl);
    });

    process.stdout.write('ChatPDM public API reference verification passed.\n');
  } finally {
    await disconnectMongo();
    await mongoServer.stop();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});

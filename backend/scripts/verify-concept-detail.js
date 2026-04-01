'use strict';

const assert = require('node:assert/strict');
const conceptsRoute = require('../src/routes/api/v1/concepts.route');
const { getConceptRuntimeGovernanceState } = require('../src/modules/concepts');

function getRouteHandler(path) {
  const layer = conceptsRoute.stack.find((candidate) => candidate.route?.path === path);

  if (!layer || !layer.route?.stack?.[0]?.handle) {
    throw new Error(`Could not find route handler for path "${path}".`);
  }

  return layer.route.stack[0].handle;
}

function invokeRoute(handler, req) {
  return new Promise((resolve, reject) => {
    const responseState = {
      statusCode: 200,
      body: null,
    };

    const res = {
      status(code) {
        responseState.statusCode = code;
        return this;
      },
      json(body) {
        responseState.body = body;
        resolve(responseState);
        return this;
      },
    };

    try {
      handler(req, res);
    } catch (error) {
      reject(error);
    }
  });
}

async function verifyViolationReturnsDerivedVisibleOnlyDetail() {
  const handler = getRouteHandler('/:conceptId');
  const { statusCode, body } = await invokeRoute(handler, {
    params: { conceptId: 'violation' },
  });

  assert.equal(statusCode, 200, 'violation detail should return 200.');
  assert.equal(body.conceptId, 'violation', 'violation detail conceptId mismatch.');
  assert.equal(body.reviewState.admission, 'visible_only_derived', 'violation reviewState admission mismatch.');
  assert.equal(typeof body.title, 'string', 'violation detail should include authored title.');
  assert.equal(typeof body.shortDefinition, 'string', 'violation detail should include authored shortDefinition.');
  assert.equal(body.rejection, null, 'violation should not expose rejection metadata.');

  process.stdout.write('PASS concept_detail_violation_visible_only_derived_detail\n');
}

async function verifyLawReturnsPhase2StableReviewState() {
  const handler = getRouteHandler('/:conceptId');
  const { statusCode, body } = await invokeRoute(handler, {
    params: { conceptId: 'law' },
  });

  assert.equal(statusCode, 200, 'law detail should return 200.');
  assert.equal(body.conceptId, 'law', 'law detail conceptId mismatch.');
  assert.equal(body.reviewState.admission, 'phase2_stable', 'law reviewState admission mismatch.');
  assert.equal(body.rejection, null, 'law should not expose rejection metadata.');

  process.stdout.write('PASS concept_detail_law_phase2_stable_review_state\n');
}

async function verifyGovernanceStateRemainsUnchangedAlongsideReviewState() {
  const handler = getRouteHandler('/:conceptId');
  const { statusCode, body } = await invokeRoute(handler, {
    params: { conceptId: 'authority' },
  });

  assert.equal(statusCode, 200, 'authority detail should return 200.');
  assert.deepEqual(
    body.governanceState,
    getConceptRuntimeGovernanceState('authority'),
    'authority governanceState should remain unchanged in detail payload.',
  );
  assert.equal(body.reviewState, null, 'authority should safely expose null reviewState when no artifact exists.');
  assert.equal(
    Object.prototype.hasOwnProperty.call(body.governanceState, 'admission'),
    false,
    'governanceState must not absorb review-state fields.',
  );

  process.stdout.write('PASS concept_detail_governance_state_unchanged_with_review_state\n');
}

async function verifyMissingReviewStateDoesNotCrash() {
  const handler = getRouteHandler('/:conceptId');
  const { statusCode, body } = await invokeRoute(handler, {
    params: { conceptId: 'authority' },
  });

  assert.equal(statusCode, 200, 'authored concept without reviewState should still return 200.');
  assert.equal(body.reviewState, null, 'missing reviewState artifact should surface as null.');

  process.stdout.write('PASS concept_detail_missing_review_state_returns_null\n');
}

async function main() {
  await verifyViolationReturnsDerivedVisibleOnlyDetail();
  await verifyLawReturnsPhase2StableReviewState();
  await verifyGovernanceStateRemainsUnchangedAlongsideReviewState();
  await verifyMissingReviewStateDoesNotCrash();
  process.stdout.write('ChatPDM concept detail verification passed.\n');
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});

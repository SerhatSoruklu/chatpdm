import assert from 'node:assert/strict';

import type { ComparisonResponse, NoExactMatchResponse } from '../src/app/core/concepts/concept-resolver.types.ts';
import {
  buildExamplePreviewState,
  classifyComparisonSeedResponse,
  classifyRefusalSeedResponse,
} from '../src/app/core/preview/example-preview.view-model.ts';

function main(): void {
  const readyComparison = classifyComparisonSeedResponse(buildComparisonResponse());
  assert.equal(readyComparison.kind, 'ready', 'comparison seed should still map to a preview when admitted.');
  if (readyComparison.kind === 'ready') {
    assert.equal(readyComparison.preview.query, 'authority vs power');
    assert.equal(readyComparison.preview.conceptA, 'authority');
    assert.equal(readyComparison.preview.conceptB, 'power');
  }

  const readyRefusal = classifyRefusalSeedResponse(buildRefusalResponse());
  assert.equal(readyRefusal.kind, 'ready', 'refusal seed should still map to a preview when admitted.');
  if (readyRefusal.kind === 'ready') {
    assert.equal(readyRefusal.preview.query, 'authority vs charisma');
  }

  const liveComparisonIssue = classifyComparisonSeedResponse(buildLiveComparisonResponse());
  assert.equal(liveComparisonIssue.kind, 'issue', 'live comparison drift should become an issue, not a hard failure.');
  if (liveComparisonIssue.kind === 'issue') {
    assert.equal(
      liveComparisonIssue.issue.message,
      'Comparison seed blocked by validator.',
      'comparison drift should be labeled as validator-blocked, not unavailable.',
    );
    assert.deepEqual(
      liveComparisonIssue.issue.details,
      ['no_exact_match', 'comparison_query', 'validation_blocked'],
      'comparison drift details must stay structural and seeded.',
    );
  }

  const liveRefusalReady = classifyRefusalSeedResponse(buildLiveRefusalResponse());
  assert.equal(liveRefusalReady.kind, 'ready', 'live refusal should still render as a refusal preview.');
  if (liveRefusalReady.kind === 'ready') {
    assert.equal(liveRefusalReady.preview.query, 'authority vs charisma');
  }

  const partialState = buildExamplePreviewState(liveComparisonIssue, liveRefusalReady);
  assert.equal(partialState.status, 'partial', 'one seeded issue should still surface partial preview state.');
  if (partialState.status === 'partial') {
    assert.equal(partialState.comparison, null);
    assert.ok(partialState.refusal);
    assert.ok(partialState.comparisonIssue);
    assert.equal(partialState.refusalIssue, null);
  }

  const readyState = buildExamplePreviewState(readyComparison, liveRefusalReady);
  assert.equal(readyState.status, 'ready', 'healthy seeded previews should still render the comparison result.');
  if (readyState.status === 'ready') {
    assert.ok(readyState.comparison);
    assert.ok(readyState.refusal);
  }

  console.log('PASS example_preview_view_model');
}

function buildComparisonResponse(): ComparisonResponse {
  return {
    type: 'comparison',
    mode: 'comparison',
    query: 'authority vs power',
    normalizedQuery: 'authority vs power',
    contractVersion: 'v1.7',
    normalizerVersion: '2026-04-01.v2',
    matcherVersion: '2026-04-01.v4',
    conceptSetVersion: '20260401.2',
    queryType: 'comparison_query',
    interpretation: null,
    comparison: {
      conceptA: 'authority',
      conceptB: 'power',
      axes: [
        { axis: 'core_nature', A: 'recognized standing to direct', B: 'capacity to act or produce effect' },
        { axis: 'depends_on', A: 'recognized social or institutional standing', B: 'effective control or force' },
        { axis: 'not_equivalent', statement: 'authority is not power; power does not require authority' },
      ],
    },
  };
}

function buildRefusalResponse(): NoExactMatchResponse {
  return {
    type: 'no_exact_match',
    query: 'authority vs charisma',
    normalizedQuery: 'authority vs charisma',
    contractVersion: 'v1.7',
    normalizerVersion: '2026-04-01.v2',
    matcherVersion: '2026-04-01.v4',
    conceptSetVersion: '20260401.2',
    queryType: 'comparison_query',
    interpretation: {
      interpretationType: 'comparison_not_supported',
      concepts: ['authority', 'charisma'],
      message: 'The live runtime does not admit a comparison output for this pair.',
    },
    resolution: {
      method: 'no_exact_match',
    },
    message: 'No exact canonical concept match was found for this query.',
    suggestions: [],
  };
}

function buildLiveComparisonResponse(): NoExactMatchResponse {
  return {
    type: 'no_exact_match',
    query: 'authority vs power',
    normalizedQuery: 'authority vs power',
    contractVersion: 'v1.7',
    normalizerVersion: '2026-04-01.v2',
    matcherVersion: '2026-04-01.v4',
    conceptSetVersion: '20260401.2',
    queryType: 'comparison_query',
    interpretation: {
      interpretationType: 'validation_blocked',
      concepts: ['authority', 'power'],
      targetConceptId: 'authority',
      message: 'The authored concept "authority" is currently blocked by validator law enforcement and is not actionable in the runtime.',
    },
    resolution: {
      method: 'no_exact_match',
    },
    message: 'No exact canonical concept match was found for this query.',
    suggestions: [],
  };
}

function buildLiveRefusalResponse(): NoExactMatchResponse {
  return {
    type: 'no_exact_match',
    query: 'authority vs charisma',
    normalizedQuery: 'authority vs charisma',
    contractVersion: 'v1.7',
    normalizerVersion: '2026-04-01.v2',
    matcherVersion: '2026-04-01.v4',
    conceptSetVersion: '20260401.2',
    queryType: 'comparison_query',
    interpretation: {
      interpretationType: 'validation_blocked',
      concepts: ['authority'],
      targetConceptId: 'authority',
      message: 'The authored concept "authority" is currently blocked by validator law enforcement and is not actionable in the runtime.',
    },
    resolution: {
      method: 'no_exact_match',
    },
    message: 'No exact canonical concept match was found for this query.',
    suggestions: [],
  };
}

main();

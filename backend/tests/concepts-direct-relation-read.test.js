'use strict';

const test = require('node:test');
const { mock } = require('node:test');
const assert = require('node:assert/strict');

const {
  loadAuthoredRelationPackets,
} = require('../src/modules/concepts/concept-relation-loader');
const {
  deriveRuntimeResolutionStateFromResponse,
} = require('../src/modules/concepts/runtime-resolution-state');

const RELATION_LOADER_MODULE = '../src/modules/concepts/concept-relation-loader';
const RESOLVER_MODULE = '../src/modules/concepts/resolver';

function loadResolveConceptQueryFresh() {
  delete require.cache[require.resolve(RESOLVER_MODULE)];
  return require(RESOLVER_MODULE).resolveConceptQuery;
}

function withMockedRelationLoader(mockReport, callback) {
  const relationLoaderModule = require(RELATION_LOADER_MODULE);
  const mockedLoader = mock.method(
    relationLoaderModule,
    'loadAuthoredRelationPackets',
    () => mockReport,
  );

  try {
    return callback(loadResolveConceptQueryFresh());
  } finally {
    mockedLoader.mock.restore();
    delete require.cache[require.resolve(RESOLVER_MODULE)];
  }
}

function buildSyntheticRelationEntry(subjectConceptId, targetConceptId, type) {
  return {
    schemaVersion: 1,
    subject: {
      conceptId: subjectConceptId,
      path: 'synthetic.subject',
      label: 'Synthetic subject',
    },
    type,
    target: {
      conceptId: targetConceptId,
      path: 'synthetic.target',
      label: 'Synthetic target',
    },
    basis: {
      kind: 'boundary_rule',
      description: 'Synthetic relation fixture for direct relation read refusal coverage.',
    },
    conditions: {
      when: ['synthetic condition'],
      unless: ['synthetic exception'],
    },
    effect: {
      kind: 'separates',
      description: 'Synthetic relation fixture for direct relation read refusal coverage.',
    },
    status: {
      active: true,
      blocking: false,
      note: 'Synthetic direct relation read fixture.',
    },
  };
}

function buildUnavailableRelationReport() {
  const authoredReport = loadAuthoredRelationPackets({
    requireAuthoredRelations: true,
    allowFallback: false,
  });

  return {
    ...authoredReport,
    source: 'unavailable',
    relationDataPresent: false,
    fallbackUsed: false,
    relations: [],
  };
}

// Keep this slice bounded: anything outside the exact direct-relation admission shape
// must stay outside the read path and remain a refusal or non-admission.
const NON_ADMITTED_RELATION_QUERIES = [
  {
    name: 'traversal-like wording',
    input: 'how does authority relate to power',
  },
  {
    name: 'chaining/composition-like wording',
    input: 'relation between authority and power through legitimacy',
  },
  {
    name: 'inference-seeking wording',
    input: 'relation between authority and power because of legitimacy',
  },
  {
    name: 'explanation-seeking wording',
    input: 'explain relation between authority and power',
  },
];

test('direct relation read queries return authored direct relation entries', () => {
  const resolveConceptQuery = loadResolveConceptQueryFresh();
  const response = resolveConceptQuery('relation between authority and power');

  assert.equal(response.queryType, 'relation_query');
  assert.equal(response.type, 'relation_read');
  assert.equal(deriveRuntimeResolutionStateFromResponse(response), 'allowed');
  assert.equal(response.interpretation, null);
  assert.equal(response.resolution.method, 'authored_direct_relation');
  assert.deepEqual(response.relation.queryConcepts, ['authority', 'power']);
  assert.equal(response.relation.entries.length, 2);
  assert.deepEqual(
    response.relation.entries.map((entry) => entry.type),
    ['REQUIRES_AUTHORITY', 'DOES_NOT_IMPLY'],
  );
  assert.deepEqual(
    response.relation.entries.map((entry) => entry.basis.kind),
    ['scope_rule', 'boundary_rule'],
  );
  assert.deepEqual(
    response.relation.entries.map((entry) => entry.subject.conceptId),
    ['power', 'power'],
  );
  assert.deepEqual(
    response.relation.entries.map((entry) => entry.target.conceptId),
    ['authority', 'authority'],
  );
});

for (const testCase of NON_ADMITTED_RELATION_QUERIES) {
  test(`direct relation read rejects ${testCase.name}`, () => {
    const resolveConceptQuery = loadResolveConceptQueryFresh();
    const response = resolveConceptQuery(testCase.input);

    assert.equal(response.queryType, 'unsupported_complex_query');
    assert.equal(response.type, 'unsupported_query_type');
    assert.equal(deriveRuntimeResolutionStateFromResponse(response), 'refused');
    assert.equal(response.interpretation.interpretationType, 'unsupported_complex');
  });
}

test('direct relation reads refuse cleanly when no authored direct relation exists', () => {
  const resolveConceptQuery = loadResolveConceptQueryFresh();
  const response = resolveConceptQuery('relation between duty and power');

  assert.equal(response.queryType, 'relation_query');
  assert.equal(response.type, 'no_exact_match');
  assert.equal(deriveRuntimeResolutionStateFromResponse(response), 'refused');
  assert.equal(response.interpretation.interpretationType, 'relation_not_supported');
  assert.deepEqual(response.interpretation.concepts, ['duty', 'power']);
  assert.match(response.interpretation.message, /no direct authored relation/i);
});

test('direct relation reads refuse cleanly when relation packets are unavailable', () => {
  const unavailableRelationReport = buildUnavailableRelationReport();

  withMockedRelationLoader(unavailableRelationReport, (resolveConceptQueryFresh) => {
    const response = resolveConceptQueryFresh('relation between authority and power');

    assert.equal(response.queryType, 'relation_query');
    assert.equal(response.type, 'no_exact_match');
    assert.equal(deriveRuntimeResolutionStateFromResponse(response), 'refused');
    assert.equal(response.interpretation.interpretationType, 'relation_not_supported');
    assert.deepEqual(response.interpretation.concepts, ['authority', 'power']);
    assert.match(response.interpretation.message, /unavailable/i);
  });
});

test('direct relation reads refuse cleanly when the relation type is unsupported in this phase', () => {
  const authoredReport = loadAuthoredRelationPackets({
    requireAuthoredRelations: true,
    allowFallback: false,
  });
  const unsupportedRelationReport = {
    ...authoredReport,
    source: 'authored',
    relationDataPresent: true,
    relations: [
      buildSyntheticRelationEntry('authority', 'power', 'WEAKENS'),
    ],
  };

  withMockedRelationLoader(unsupportedRelationReport, (resolveConceptQueryFresh) => {
    const response = resolveConceptQueryFresh('relation between authority and power');

    assert.equal(response.queryType, 'relation_query');
    assert.equal(response.type, 'no_exact_match');
    assert.equal(deriveRuntimeResolutionStateFromResponse(response), 'refused');
    assert.equal(response.interpretation.interpretationType, 'relation_not_supported');
    assert.match(response.interpretation.message, /not supported/i);
  });
});

test('relation wording with more than two concepts is not admitted', () => {
  const resolveConceptQuery = loadResolveConceptQueryFresh();
  const response = resolveConceptQuery('relation between authority and power and legitimacy');

  assert.equal(response.queryType, 'unsupported_complex_query');
  assert.equal(response.type, 'unsupported_query_type');
  assert.equal(deriveRuntimeResolutionStateFromResponse(response), 'refused');
  assert.equal(response.interpretation.interpretationType, 'unsupported_complex');
});

test('non-admitted relation concepts remain unadmitted', () => {
  const resolveConceptQuery = loadResolveConceptQueryFresh();
  const response = resolveConceptQuery('relation between authority and imagination');

  assert.equal(response.queryType, 'unsupported_complex_query');
  assert.equal(response.type, 'unsupported_query_type');
  assert.equal(deriveRuntimeResolutionStateFromResponse(response), 'refused');
  assert.equal(response.interpretation.interpretationType, 'unsupported_complex');
});

test('non-relation exact alias resolution remains unchanged', () => {
  const resolveConceptQuery = loadResolveConceptQueryFresh();
  const response = resolveConceptQuery('what is authority');

  assert.equal(response.queryType, 'exact_concept_query');
  assert.equal(response.type, 'concept_match');
  assert.equal(response.resolution.method, 'exact_alias');
  assert.equal(response.answer.itemType, 'core_concept');
});

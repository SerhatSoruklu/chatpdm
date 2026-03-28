'use strict';

const {
  AMBIGUOUS_MATCH_MESSAGE,
  CONCEPT_SET_VERSION,
  CONTRACT_VERSION,
  MATCHER_VERSION,
  NORMALIZER_VERSION,
  NO_EXACT_MATCH_MESSAGE,
} = require('./constants');
const {
  buildDerivedExplanationOverlayContract,
  loadConceptSet,
} = require('./concept-loader');
const { loadPackageRegistry } = require('./package-loader');
const { resolveDerivedExplanationOverlaysForConcept } = require('./derived-explanation-overlays');
const { loadResolveRules } = require('./resolve-rules-loader');
const { matchQuery } = require('./matcher');
const { normalizeQuery } = require('./normalizer');
const { classifyQueryShape } = require('./query-shape-classifier');
const { resolveComparisonQuery } = require('./comparison-resolver');
const { detectGovernanceScopeEnforcement } = require('./governance-scope-enforcer');
const { assertValidProductResponse } = require('../../lib/product-response-validator');

const RESPONSE_SOURCE_TYPE_FALLBACK = 'internal';
const RESPONSE_ALLOWED_SOURCE_TYPES = new Set([
  'dictionary',
  'book',
  'paper',
  'law',
  'article',
  'internal',
]);
const RESPONSE_ALLOWED_RELATION_TYPES = new Set([
  'see_also',
  'prerequisite',
  'extension',
  'contrast',
]);
const PACKAGE_RELATION_TYPE_MAP = Object.freeze({
  'extends-core-concept': 'extension',
});

function buildContextPayload(context) {
  const appliesTo = Array.isArray(context.appliesTo) && context.appliesTo.length > 0
    ? context.appliesTo
    : typeof context.explanation === 'string' && context.explanation.trim() !== ''
      ? [context.explanation]
      : [context.label];

  return {
    label: context.label,
    appliesTo,
  };
}

function normalizePackageRelationType(relationType, relatedConceptId) {
  if (RESPONSE_ALLOWED_RELATION_TYPES.has(relationType)) {
    return relationType;
  }

  const mappedRelationType = PACKAGE_RELATION_TYPE_MAP[relationType];

  if (mappedRelationType) {
    return mappedRelationType;
  }

  throw new Error(`Unsupported package relationType "${relationType}" for related concept "${relatedConceptId}".`);
}

function buildRelatedConceptPayload(relatedConcept, conceptIndex) {
  const related = conceptIndex.get(relatedConcept.conceptId);

  if (!related) {
    throw new Error(`Unknown related concept "${relatedConcept.conceptId}" in active package boundary.`);
  }

  return {
    conceptId: relatedConcept.conceptId,
    title: related.title,
    relationType: normalizePackageRelationType(relatedConcept.relationType, relatedConcept.conceptId),
  };
}

function normalizePackageSourceType(sourceType) {
  if (RESPONSE_ALLOWED_SOURCE_TYPES.has(sourceType)) {
    return sourceType;
  }

  return RESPONSE_SOURCE_TYPE_FALLBACK;
}

function buildPackageConceptVersion(versionString) {
  const versionParts = `${versionString}`.split('.').map((value) => Number.parseInt(value, 10));

  if (versionParts.length !== 3 || versionParts.some((value) => !Number.isInteger(value) || value < 0)) {
    throw new Error(`Invalid package manifest version "${versionString}" for package response construction.`);
  }

  const [major, minor, patch] = versionParts;
  return (major * 1000000) + (minor * 1000) + patch;
}

function derivePackageCoreMeaning(concept, coreConceptIndex) {
  if (typeof concept.coreEquivalent === 'string') {
    const coreEquivalent = coreConceptIndex.get(concept.coreEquivalent);

    if (!coreEquivalent) {
      throw new Error(`Unknown coreEquivalent "${concept.coreEquivalent}" referenced by package concept "${concept.conceptId}".`);
    }

    return coreEquivalent.coreMeaning;
  }

  return concept.shortDefinition;
}

function buildPackageOverlayContract(concept, packageRecord, coreConceptIndex) {
  return buildDerivedExplanationOverlayContract({
    conceptId: concept.conceptId,
    version: buildPackageConceptVersion(packageRecord.manifest.version),
    shortDefinition: concept.shortDefinition,
    coreMeaning: derivePackageCoreMeaning(concept, coreConceptIndex),
    fullDefinition: concept.fullDefinition,
  });
}

function buildAnswerPayload(concept, conceptIndex, packageRecord, coreConceptIndex) {
  if (!concept.packageId) {
    return {
      title: concept.title,
      shortDefinition: concept.shortDefinition,
      coreMeaning: concept.coreMeaning,
      fullDefinition: concept.fullDefinition,
      derivedExplanationOverlays: resolveDerivedExplanationOverlaysForConcept(concept),
      contexts: concept.contexts.map(buildContextPayload),
      sources: concept.sources.map((source) => ({
        id: source.id,
        label: source.label,
        type: source.type,
        usedFor: source.usedFor,
      })),
      relatedConcepts: concept.relatedConcepts.map((relatedConcept) => (
        buildRelatedConceptPayload(relatedConcept, conceptIndex)
      )),
    };
  }

  if (!packageRecord || packageRecord.packageId !== concept.packageId) {
    throw new Error(`Package concept "${concept.conceptId}" was resolved outside its active package boundary.`);
  }

  return {
    title: concept.title,
    shortDefinition: concept.shortDefinition,
    coreMeaning: derivePackageCoreMeaning(concept, coreConceptIndex),
    fullDefinition: concept.fullDefinition,
    derivedExplanationOverlays: buildPackageOverlayContract(concept, packageRecord, coreConceptIndex),
    contexts: concept.contexts.map(buildContextPayload),
    sources: concept.sources.map((source) => ({
      id: source.id,
      label: source.label,
      type: normalizePackageSourceType(source.type),
      usedFor: source.usedFor,
    })),
    relatedConcepts: concept.relatedConcepts.map((relatedConcept) => (
      buildRelatedConceptPayload(relatedConcept, conceptIndex)
    )),
  };
}

function buildBaseResponse(query, normalizedQuery, queryClassification) {
  return {
    query,
    normalizedQuery,
    contractVersion: CONTRACT_VERSION,
    normalizerVersion: NORMALIZER_VERSION,
    matcherVersion: MATCHER_VERSION,
    conceptSetVersion: CONCEPT_SET_VERSION,
    queryType: queryClassification.queryType,
    interpretation: queryClassification.interpretation,
  };
}

function normalizeResolveRequest(request, options = {}) {
  if (typeof request === 'string') {
    return {
      rawQuery: request,
      packageContext: typeof options === 'object' && options !== null
        ? options.packageContext ?? null
        : options ?? null,
    };
  }

  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    throw new TypeError('Expected resolver input to be a string or an object.');
  }

  const rawQuery = typeof request.query === 'string'
    ? request.query
    : typeof request.conceptId === 'string'
      ? request.conceptId.startsWith('concept:')
        ? request.conceptId
        : `concept:${request.conceptId}`
      : request.conceptId;

  return {
    rawQuery,
    packageContext: request.packageContext ?? null,
  };
}

function assertNoDuplicateActiveConceptIds(activeConcepts, packageContext) {
  const seenConceptIds = new Set();
  const boundaryLabel = packageContext ?? 'core-only';

  for (const concept of activeConcepts) {
    if (seenConceptIds.has(concept.conceptId)) {
      throw new Error(`Duplicate conceptId "${concept.conceptId}" in active package boundary "${boundaryLabel}".`);
    }

    seenConceptIds.add(concept.conceptId);
  }
}

function assertNoCorePackageOverlap(coreConceptIndex, packageRecord) {
  if (!packageRecord) {
    return;
  }

  for (const concept of packageRecord.concepts) {
    if (coreConceptIndex.has(concept.conceptId)) {
      throw new Error(`Package concept "${concept.conceptId}" overlaps core concept inside active package boundary "${packageRecord.packageId}".`);
    }
  }
}

function resolveActiveConceptSet(packageContext) {
  const coreConcepts = loadConceptSet();
  const coreConceptIndex = new Map(coreConcepts.map((concept) => [concept.conceptId, concept]));
  const activeConcepts = [...coreConcepts];

  if (packageContext === null) {
    assertNoDuplicateActiveConceptIds(activeConcepts, null);

    return {
      coreConceptIndex,
      concepts: activeConcepts,
      packageRecord: null,
    };
  }

  if (typeof packageContext !== 'string' || packageContext.trim() === '') {
    throw new TypeError('packageContext must be null or a non-empty packageId string.');
  }

  const packageRegistry = loadPackageRegistry(coreConcepts.map((concept) => concept.conceptId));
  const packageRecord = packageRegistry.packagesById[packageContext];

  if (!packageRecord) {
    throw new Error(`Unknown packageContext "${packageContext}".`);
  }

  activeConcepts.push(...packageRecord.concepts);
  assertNoCorePackageOverlap(coreConceptIndex, packageRecord);
  assertNoDuplicateActiveConceptIds(activeConcepts, packageContext);

  return {
    coreConceptIndex,
    concepts: activeConcepts,
    packageRecord,
  };
}

function resolveConcept(request) {
  const { rawQuery, packageContext } = normalizeResolveRequest(request);

  if (typeof rawQuery !== 'string') {
    throw new TypeError('Expected query to be a string.');
  }

  if (rawQuery.length === 0) {
    throw new TypeError('Expected query to be a non-empty string.');
  }

  const {
    coreConceptIndex,
    concepts,
    packageRecord,
  } = resolveActiveConceptSet(packageContext);
  const resolveRules = loadResolveRules();
  const conceptIndex = new Map(concepts.map((concept) => [concept.conceptId, concept]));
  const normalizedQuery = normalizeQuery(rawQuery);
  const match = matchQuery({
    rawQuery,
    normalizedQuery,
    concepts,
    resolveRules,
  });
  const queryClassification = classifyQueryShape({
    rawQuery,
    normalizedQuery,
    concepts,
    resolveRules,
    match,
  });

  const baseResponse = buildBaseResponse(rawQuery, normalizedQuery, queryClassification);
  let response;
  const governanceScopeEnforcement = detectGovernanceScopeEnforcement({
    normalizedQuery,
    match,
    queryClassification,
    conceptIndex,
  });

  if (governanceScopeEnforcement) {
    response = {
      ...baseResponse,
      type: 'no_exact_match',
      interpretation: governanceScopeEnforcement.interpretation,
      resolution: {
        method: governanceScopeEnforcement.resolutionMethod,
      },
      message: NO_EXACT_MATCH_MESSAGE,
      suggestions: [],
    };

    return assertValidProductResponse(response);
  }

  if (queryClassification.queryType === 'comparison_query') {
    const comparison = resolveComparisonQuery(queryClassification.interpretation?.concepts ?? [], conceptIndex);

    if (comparison) {
      response = {
        ...baseResponse,
        type: 'comparison',
        mode: 'comparison',
        interpretation: null,
        comparison,
      };
    } else {
      if (packageContext !== null) {
        throw new Error('No canonical concept resolved in active package boundary.');
      }

      response = {
        ...baseResponse,
        type: 'no_exact_match',
        resolution: {
          method: 'no_exact_match',
        },
        message: NO_EXACT_MATCH_MESSAGE,
        suggestions: [],
      };
    }
  } else if (match.type === 'concept_match') {
    response = {
      ...baseResponse,
      type: 'concept_match',
      resolution: {
        method: match.method,
        conceptId: match.concept.conceptId,
        conceptVersion: match.concept.version ?? buildPackageConceptVersion(packageRecord?.manifest.version),
      },
      answer: buildAnswerPayload(match.concept, conceptIndex, packageRecord, coreConceptIndex),
    };
  } else if (match.type === 'ambiguous_match') {
    response = {
      ...baseResponse,
      type: 'ambiguous_match',
      resolution: {
        method: match.method,
      },
      message: AMBIGUOUS_MATCH_MESSAGE,
      candidates: match.candidates,
    };
  } else {
    if (packageContext !== null) {
      throw new Error('No canonical concept resolved in active package boundary.');
    }

    response = {
      ...baseResponse,
      type: 'no_exact_match',
      resolution: {
        method: 'no_exact_match',
      },
      message: NO_EXACT_MATCH_MESSAGE,
      suggestions: match.suggestions,
    };
  }

  return assertValidProductResponse(response);
}

function resolveConceptQuery(rawQuery, options = {}) {
  return resolveConcept({
    query: rawQuery,
    packageContext: typeof options === 'object' && options !== null
      ? options.packageContext ?? null
      : options ?? null,
  });
}

module.exports = {
  resolveConcept,
  resolveConceptQuery,
};

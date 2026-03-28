'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  GOVERNANCE_CORE_TRIAD,
  GOVERNANCE_SCOPE_MUST_PRESERVE_IN,
  NON_GOVERNANCE_HANDLING_REQUIRED,
  SEED_CONCEPT_IDS,
} = require('./constants');

const conceptsDirectory = path.resolve(__dirname, '../../../../data/concepts');
const sourceRegistry = require('./source-registry.json');

const RESERVED_AUTHORED_OVERLAY_FIELDS = Object.freeze([
  'derivedExplanationOverlays',
  'derivedExplanationOverlayContract',
]);
const DERIVED_OVERLAY_MODES = Object.freeze(['standard', 'simplified', 'formal']);
const DERIVED_OVERLAY_FIELDS = Object.freeze(['shortDefinition', 'coreMeaning', 'fullDefinition']);
const DERIVED_OVERLAY_STATUS_ABSENT = 'absent';

const PRIMARY_SOURCE_BY_CONCEPT = Object.freeze({
  authority: 'weber',
  power: 'lukes',
  legitimacy: 'beetham',
  responsibility: 'hart',
  duty: 'hohfeld',
});

function assertNonEmptyString(value, fieldName, conceptId) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Concept "${conceptId}" has invalid ${fieldName}.`);
  }
}

function assertArray(value, fieldName, conceptId) {
  if (!Array.isArray(value)) {
    throw new Error(`Concept "${conceptId}" has invalid ${fieldName}; expected an array.`);
  }
}

function assertArrayOfNonEmptyStrings(value, fieldName, conceptId, minimumLength = 0) {
  assertArray(value, fieldName, conceptId);

  if (value.length < minimumLength) {
    throw new Error(`Concept "${conceptId}" has invalid ${fieldName}; expected at least ${minimumLength} item(s).`);
  }

  value.forEach((entry, index) => {
    assertNonEmptyString(entry, `${fieldName}[${index}]`, conceptId);
  });
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

function computeCanonicalConceptHash(concept, algorithm = 'sha256') {
  return crypto
    .createHash(algorithm)
    .update(stableStringify(concept))
    .digest('hex');
}

function buildDerivedExplanationModeShell() {
  const fields = {};

  for (const fieldName of DERIVED_OVERLAY_FIELDS) {
    fields[fieldName] = null;
  }

  return {
    status: DERIVED_OVERLAY_STATUS_ABSENT,
    fields,
    equivalenceCertificate: null,
  };
}

function buildDerivedExplanationOverlayContract(concept) {
  const modes = {};

  for (const mode of DERIVED_OVERLAY_MODES) {
    modes[mode] = buildDerivedExplanationModeShell();
  }

  return {
    readOnly: true,
    status: DERIVED_OVERLAY_STATUS_ABSENT,
    canonicalBinding: {
      conceptId: concept.conceptId,
      conceptVersion: concept.version,
      canonicalHash: computeCanonicalConceptHash(concept),
    },
    modes,
  };
}

function validateComparisonAxis(axis, conceptId, relatedConceptId, axisIndex) {
  if (!axis || typeof axis !== 'object' || Array.isArray(axis)) {
    throw new Error(
      `Concept "${conceptId}" comparison "${relatedConceptId}" axis ${axisIndex} must be an object.`,
    );
  }

  assertNonEmptyString(axis.axis, `comparison.${relatedConceptId}.axes[${axisIndex}].axis`, conceptId);

  if (typeof axis.statement === 'string') {
    if (axis.statement.trim() === '') {
      throw new Error(
        `Concept "${conceptId}" comparison "${relatedConceptId}" axis ${axisIndex} has empty statement.`,
      );
    }

    if (Object.hasOwn(axis, 'A') || Object.hasOwn(axis, 'B')) {
      throw new Error(
        `Concept "${conceptId}" comparison "${relatedConceptId}" axis ${axisIndex} must not mix statement with A/B fields.`,
      );
    }

    return;
  }

  assertNonEmptyString(axis.A, `comparison.${relatedConceptId}.axes[${axisIndex}].A`, conceptId);
  assertNonEmptyString(axis.B, `comparison.${relatedConceptId}.axes[${axisIndex}].B`, conceptId);
}

function validateComparisonShape(comparison, conceptId) {
  if (comparison === undefined) {
    return;
  }

  if (!comparison || typeof comparison !== 'object' || Array.isArray(comparison)) {
    throw new Error(`Concept "${conceptId}" has invalid comparison data; expected an object.`);
  }

  for (const [relatedConceptId, comparisonEntry] of Object.entries(comparison)) {
    if (!comparisonEntry || typeof comparisonEntry !== 'object' || Array.isArray(comparisonEntry)) {
      throw new Error(`Concept "${conceptId}" comparison "${relatedConceptId}" must be an object.`);
    }

    assertArray(comparisonEntry.axes, `comparison.${relatedConceptId}.axes`, conceptId);

    if (comparisonEntry.axes.length === 0) {
      throw new Error(`Concept "${conceptId}" comparison "${relatedConceptId}" must include at least one axis.`);
    }

    comparisonEntry.axes.forEach((axis, index) => {
      validateComparisonAxis(axis, conceptId, relatedConceptId, index);
    });
  }
}

function validateScopeShape(scope, conceptId) {
  if (scope === undefined) {
    return;
  }

  if (!scope || typeof scope !== 'object' || Array.isArray(scope)) {
    throw new Error(`Concept "${conceptId}" has invalid scope; expected an object.`);
  }

  assertNonEmptyString(scope.domain, 'scope.domain', conceptId);

  if (typeof scope.isUniversal !== 'boolean') {
    throw new Error(`Concept "${conceptId}" has invalid scope.isUniversal; expected a boolean.`);
  }

  assertArrayOfNonEmptyStrings(scope.mustPreserveIn, 'scope.mustPreserveIn', conceptId, 1);
  assertArrayOfNonEmptyStrings(scope.nonGovernanceHandling, 'scope.nonGovernanceHandling', conceptId, 1);
}

function validateGovernanceScopePolicy(concept, conceptId) {
  if (!GOVERNANCE_CORE_TRIAD.includes(conceptId)) {
    return;
  }

  if (!concept.scope) {
    throw new Error(`Concept "${conceptId}" must include a governance scope policy block.`);
  }

  validateScopeShape(concept.scope, conceptId);

  if (concept.scope.domain !== 'governance') {
    throw new Error(`Concept "${conceptId}" scope.domain must equal "governance".`);
  }

  if (concept.scope.isUniversal !== false) {
    throw new Error(`Concept "${conceptId}" scope.isUniversal must equal false.`);
  }

  for (const field of GOVERNANCE_SCOPE_MUST_PRESERVE_IN) {
    if (!concept.scope.mustPreserveIn.includes(field)) {
      throw new Error(`Concept "${conceptId}" scope.mustPreserveIn must include "${field}".`);
    }
  }

  for (const handling of NON_GOVERNANCE_HANDLING_REQUIRED) {
    if (!concept.scope.nonGovernanceHandling.includes(handling)) {
      throw new Error(`Concept "${conceptId}" scope.nonGovernanceHandling must include "${handling}".`);
    }
  }
}

function assertSourcePriorityViolation(conceptId, rule, offendingValue) {
  throw new Error(`Concept "${conceptId}" invalid sourcePriority: ${rule}; offending value: ${JSON.stringify(offendingValue)}`);
}

function validateSourceEntry(entry, conceptId, index) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error(`Concept "${conceptId}" has invalid sources[${index}]; expected an object.`);
  }

  assertNonEmptyString(entry.id, `sources[${index}].id`, conceptId);
}

function validateSourceIntegrity(concept, conceptId) {
  assertArrayOfNonEmptyStrings(concept.sourcePriority, 'sourcePriority', conceptId, 2);

  const sourcePriorityDuplicates = new Set(concept.sourcePriority).size !== concept.sourcePriority.length;
  if (sourcePriorityDuplicates) {
    assertSourcePriorityViolation(conceptId, 'duplicate entries are not allowed', concept.sourcePriority);
  }

  if (!concept.sourcePriority.includes('oxford')) {
    assertSourcePriorityViolation(conceptId, 'oxford must be present', concept.sourcePriority);
  }

  if (concept.sourcePriority[1] !== 'oxford') {
    assertSourcePriorityViolation(conceptId, 'oxford must be the second priority entry', concept.sourcePriority);
  }

  const expectedPrimarySource = PRIMARY_SOURCE_BY_CONCEPT[conceptId];
  if (expectedPrimarySource && concept.sourcePriority[0] !== expectedPrimarySource) {
    assertSourcePriorityViolation(
      conceptId,
      `expected primary "${expectedPrimarySource}", received "${concept.sourcePriority[0]}"`,
      concept.sourcePriority[0],
    );
  }

  concept.sourcePriority.forEach((sourceId) => {
    const sourceRecord = sourceRegistry[sourceId];

    if (!sourceRecord) {
      assertSourcePriorityViolation(conceptId, `unknown source ID "${sourceId}"`, sourceId);
    }

    if (sourceRecord.tier !== 'core') {
      assertSourcePriorityViolation(
        conceptId,
        `only core-tier sources are allowed, received tier "${sourceRecord.tier}" for "${sourceId}"`,
        sourceId,
      );
    }
  });

  concept.sources.forEach((source, index) => {
    validateSourceEntry(source, conceptId, index);

    if (!sourceRegistry[source.id]) {
      throw new Error(`Concept "${conceptId}" has invalid sources[${index}].id; unknown source ID "${source.id}".`);
    }
  });

  const sourceIds = concept.sources.map((source) => source.id);
  const duplicateSourceIds = new Set(sourceIds).size !== sourceIds.length;
  if (duplicateSourceIds) {
    throw new Error(`Concept "${conceptId}" has duplicate source IDs in sources; offending value: ${JSON.stringify(sourceIds)}.`);
  }

  concept.sourcePriority.forEach((sourceId) => {
    if (!sourceIds.includes(sourceId)) {
      throw new Error(`Concept "${conceptId}" sources are missing sourcePriority entry "${sourceId}".`);
    }
  });
}

function assertNoReservedAuthoredOverlayFields(concept, conceptId) {
  for (const fieldName of RESERVED_AUTHORED_OVERLAY_FIELDS) {
    if (Object.hasOwn(concept, fieldName)) {
      throw new Error(
        `Concept "${conceptId}" must not declare "${fieldName}" in authored packets; derived explanation overlays are read-only contract data.`,
      );
    }
  }
}

function validateConceptShape(concept, expectedConceptId) {
  if (!concept || typeof concept !== 'object' || Array.isArray(concept)) {
    throw new Error(`Concept "${expectedConceptId}" must be a JSON object.`);
  }

  assertNonEmptyString(concept.conceptId, 'conceptId', expectedConceptId);
  if (concept.conceptId !== expectedConceptId) {
    throw new Error(`Concept file "${expectedConceptId}" does not match conceptId "${concept.conceptId}".`);
  }

  assertNonEmptyString(concept.title, 'title', expectedConceptId);
  assertNonEmptyString(concept.domain, 'domain', expectedConceptId);
  assertNonEmptyString(concept.shortDefinition, 'shortDefinition', expectedConceptId);
  assertNonEmptyString(concept.coreMeaning, 'coreMeaning', expectedConceptId);
  assertNonEmptyString(concept.fullDefinition, 'fullDefinition', expectedConceptId);
  assertNoReservedAuthoredOverlayFields(concept, expectedConceptId);

  if (!Number.isInteger(concept.version)) {
    throw new Error(`Concept "${expectedConceptId}" must include an integer version.`);
  }

  assertArray(concept.contexts, 'contexts', expectedConceptId);
  assertArray(concept.sources, 'sources', expectedConceptId);
  assertArray(concept.relatedConcepts, 'relatedConcepts', expectedConceptId);
  assertArray(concept.aliases, 'aliases', expectedConceptId);
  assertArray(concept.normalizedAliases, 'normalizedAliases', expectedConceptId);
  validateComparisonShape(concept.comparison, expectedConceptId);
  validateScopeShape(concept.scope, expectedConceptId);
  validateGovernanceScopePolicy(concept, expectedConceptId);
  validateSourceIntegrity(concept, expectedConceptId);
}

function loadConceptFile(conceptId) {
  const filePath = path.join(conceptsDirectory, `${conceptId}.json`);
  const rawFile = fs.readFileSync(filePath, 'utf8');
  const concept = JSON.parse(rawFile);

  validateConceptShape(concept, conceptId);

  return concept;
}

function loadConceptSet() {
  return SEED_CONCEPT_IDS.map(loadConceptFile);
}

module.exports = {
  buildDerivedExplanationOverlayContract,
  computeCanonicalConceptHash,
  loadConceptSet,
  validateConceptShape,
};

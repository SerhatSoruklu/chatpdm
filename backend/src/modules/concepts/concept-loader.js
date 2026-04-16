'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  GOVERNANCE_CORE_TRIAD,
  GOVERNANCE_SCOPE_MUST_PRESERVE_IN,
  LIVE_CONCEPT_IDS,
  NON_GOVERNANCE_HANDLING_REQUIRED,
} = require('./constants');
const { validateBoundaryProofCatalog } = require('./concept-boundary-proof');
const {
  assertLiveConceptConstraintContractIntegration: assertLiveConstraintContracts,
  validateConstraintContractShape,
} = require('./constraint-contract');
const { normalizeConceptToProfile } = require('./concept-structural-profile');
const { assertCanonicalStoreFreeOfAiMarkers } = require('../../lib/ai-governance-guard');

const conceptsDirectory = path.resolve(__dirname, '../../../../data/concepts');
const sourceRegistry = require('./source-registry.json');

const RESERVED_AUTHORED_OVERLAY_FIELDS = Object.freeze([
  'derivedExplanationOverlays',
  'derivedExplanationOverlayContract',
]);
const AUTHORED_REGISTER_MODES = Object.freeze(['standard', 'simplified', 'formal']);
const AUTHORED_REGISTER_FIELDS = Object.freeze(['shortDefinition', 'coreMeaning', 'fullDefinition']);
const RESOLUTION_STATUS_VALUES = Object.freeze([
  'RESOLVED',
  'PARTIALLY_RESOLVED',
  'UNRESOLVED',
  'UNFALSIFIABLE',
]);
const CANONICAL_LIFECYCLE_STATUSES = Object.freeze([
  'active',
  'deprecated',
  'disputed',
]);
const CANONICAL_LIFECYCLE_FIELDS = Object.freeze([
  'status',
  'version',
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const PRIMARY_SOURCE_BY_CONCEPT = Object.freeze({
  authority: 'weber',
  power: 'lukes',
  legitimacy: 'beetham',
  law: 'hart',
  responsibility: 'hart',
  duty: 'hohfeld',
  violation: 'hart',
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

function buildCanonicalConceptHashInput(concept) {
  const canonicalConcept = { ...concept };
  // Keep the runtime integrity anchor stable while the static semantic anchor
  // and lifecycle metadata are introduced as documentation and validation data.
  delete canonicalConcept.canonical;
  delete canonicalConcept.concept;
  delete canonicalConcept.state;
  delete canonicalConcept.previousVersion;
  delete canonicalConcept.createdAt;
  delete canonicalConcept.updatedAt;
  delete canonicalConcept.registers;
  delete canonicalConcept.boundaryProofs;
  delete canonicalConcept.constraintContract;
  delete canonicalConcept.structureV3;
  delete canonicalConcept.resolutionStatus;
  return canonicalConcept;
}

function computeCanonicalConceptHash(concept, algorithm = 'sha256') {
  return crypto
    .createHash(algorithm)
    .update(stableStringify(buildCanonicalConceptHashInput(concept)))
    .digest('hex');
}

function validateRegisterModeShape(modeRecord, modeName, conceptId) {
  if (!modeRecord || typeof modeRecord !== 'object' || Array.isArray(modeRecord)) {
    throw new Error(`Concept "${conceptId}" has invalid registers.${modeName}; expected an object.`);
  }

  const unexpectedFields = Object.keys(modeRecord).filter(
    (fieldName) => !AUTHORED_REGISTER_FIELDS.includes(fieldName),
  );

  if (unexpectedFields.length > 0) {
    throw new Error(
      `Concept "${conceptId}" has unsupported registers.${modeName} field(s): ${unexpectedFields.join(', ')}.`,
    );
  }

  AUTHORED_REGISTER_FIELDS.forEach((fieldName) => {
    assertNonEmptyString(modeRecord[fieldName], `registers.${modeName}.${fieldName}`, conceptId);
  });
}

function validateRegistersShape(concept, conceptId) {
  const registers = concept.registers;

  if (!registers || typeof registers !== 'object' || Array.isArray(registers)) {
    throw new Error(`Concept "${conceptId}" has invalid registers; expected an object.`);
  }

  const unexpectedModes = Object.keys(registers).filter(
    (modeName) => !AUTHORED_REGISTER_MODES.includes(modeName),
  );

  if (unexpectedModes.length > 0) {
    throw new Error(
      `Concept "${conceptId}" has unsupported register mode(s): ${unexpectedModes.join(', ')}.`,
    );
  }

  AUTHORED_REGISTER_MODES.forEach((modeName) => {
    validateRegisterModeShape(registers[modeName], modeName, conceptId);
  });

  AUTHORED_REGISTER_FIELDS.forEach((fieldName) => {
    if (registers.standard[fieldName] !== concept[fieldName]) {
      throw new Error(
        `Concept "${conceptId}" registers.standard.${fieldName} must exactly match the canonical ${fieldName}.`,
      );
    }
  });
}

function validateResolutionStatusShape(concept, conceptId) {
  if (!Object.hasOwn(concept, 'resolutionStatus')) {
    return;
  }

  if (typeof concept.resolutionStatus !== 'string' || !RESOLUTION_STATUS_VALUES.includes(concept.resolutionStatus)) {
    throw new Error(
      `Concept "${conceptId}" has unsupported resolutionStatus "${concept.resolutionStatus}".`,
    );
  }
}

function validateCanonicalLifecycleShape(concept, conceptId) {
  if (!isPlainObject(concept.canonical)) {
    throw new Error(`Concept "${conceptId}" must include a canonical anchor object.`);
  }

  if (!Object.hasOwn(concept.canonical, 'lifecycle')) {
    throw new Error(`Concept "${conceptId}" must include canonical.lifecycle.`);
  }

  if (!isPlainObject(concept.canonical.lifecycle)) {
    throw new Error(`Concept "${conceptId}" has invalid canonical.lifecycle; expected an object.`);
  }

  const unexpectedFields = Object.keys(concept.canonical.lifecycle).filter(
    (fieldName) => !CANONICAL_LIFECYCLE_FIELDS.includes(fieldName),
  );

  if (unexpectedFields.length > 0) {
    throw new Error(
      `Concept "${conceptId}" has unsupported canonical.lifecycle field(s): ${unexpectedFields.join(', ')}.`,
    );
  }

  assertNonEmptyString(concept.canonical.lifecycle.status, 'canonical.lifecycle.status', conceptId);

  if (!CANONICAL_LIFECYCLE_STATUSES.includes(concept.canonical.lifecycle.status)) {
    throw new Error(
      `Concept "${conceptId}" has unsupported canonical.lifecycle.status "${concept.canonical.lifecycle.status}".`,
    );
  }

  if (!Number.isInteger(concept.canonical.lifecycle.version) || concept.canonical.lifecycle.version < 1) {
    throw new Error(
      `Concept "${conceptId}" has invalid canonical.lifecycle.version; expected a positive integer.`,
    );
  }

  if (concept.canonical.lifecycle.version !== concept.version) {
    throw new Error(
      `Concept "${conceptId}" canonical.lifecycle.version must match version.`,
    );
  }
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
        `Concept "${conceptId}" must not declare "${fieldName}" in authored packets; legacy derived overlays are not allowed in the authored register model.`,
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
  validateRegistersShape(concept, expectedConceptId);
  assertNoReservedAuthoredOverlayFields(concept, expectedConceptId);

  if (!Number.isInteger(concept.version)) {
    throw new Error(`Concept "${expectedConceptId}" must include an integer version.`);
  }

  validateCanonicalLifecycleShape(concept, expectedConceptId);
  assertArray(concept.contexts, 'contexts', expectedConceptId);
  assertArray(concept.sources, 'sources', expectedConceptId);
  assertArray(concept.relatedConcepts, 'relatedConcepts', expectedConceptId);
  assertArray(concept.aliases, 'aliases', expectedConceptId);
  assertArray(concept.normalizedAliases, 'normalizedAliases', expectedConceptId);
  validateResolutionStatusShape(concept, expectedConceptId);
  validateComparisonShape(concept.comparison, expectedConceptId);
  validateBoundaryProofCatalog(concept.boundaryProofs, expectedConceptId);
  validateConstraintContractShape(concept.constraintContract, expectedConceptId);
  validateScopeShape(concept.scope, expectedConceptId);
  validateGovernanceScopePolicy(concept, expectedConceptId);
  validateSourceIntegrity(concept, expectedConceptId);
  normalizeConceptToProfile(concept);
}

function loadConceptFile(conceptId) {
  const filePath = path.join(conceptsDirectory, `${conceptId}.json`);
  const rawFile = fs.readFileSync(filePath, 'utf8');
  const concept = JSON.parse(rawFile);

  assertCanonicalStoreFreeOfAiMarkers(concept, `Concept "${conceptId}" authored packet`);
  validateConceptShape(concept, conceptId);

  return concept;
}

function loadConceptSet() {
  const liveConcepts = LIVE_CONCEPT_IDS.map(loadConceptFile);
  const { assertLiveConceptOverlapAdmissions } = require('./concept-overlap-admission-gate');
  const {
    assertStoredConceptRelationshipSnapshotAuthority,
  } = require('./concept-overlap-snapshot');

  assertLiveConstraintContracts(liveConcepts);
  assertLiveConceptOverlapAdmissions(liveConcepts);
  assertStoredConceptRelationshipSnapshotAuthority();

  return liveConcepts;
}

function getConceptById(conceptId) {
  if (typeof conceptId !== 'string' || conceptId.trim() === '') {
    return null;
  }

  const filePath = path.join(conceptsDirectory, `${conceptId}.json`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  return loadConceptFile(conceptId);
}

module.exports = {
  AUTHORED_REGISTER_FIELDS,
  AUTHORED_REGISTER_MODES,
  CANONICAL_LIFECYCLE_STATUSES,
  computeCanonicalConceptHash,
  getConceptById,
  loadConceptSet,
  RESOLUTION_STATUS_VALUES,
  validateConceptShape,
};

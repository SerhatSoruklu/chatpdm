'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  LIVE_CONCEPT_IDS,
} = require('./admission-state');

const fixturePath = path.resolve(
  __dirname,
  '../../../../tests/runtime/fixtures/phase-10-core-primitive-collapse-audit.json',
);
const conceptDirectoryPath = path.resolve(__dirname, '../../../../data/concepts');

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadLiveConceptPackets() {
  return LIVE_CONCEPT_IDS.map((conceptId) => loadJson(path.join(conceptDirectoryPath, `${conceptId}.json`)));
}

function loadPrimitiveCollapseAuditFixture() {
  return loadJson(fixturePath);
}

function getRoleMarker(concept) {
  return concept.constraintContract.expectedSourceKind
    ?? concept.constraintContract.expectedIdentityKind
    ?? null;
}

function readPath(object, pathSegments) {
  return pathSegments.reduce((current, segment) => (
    current && Object.prototype.hasOwnProperty.call(current, segment) ? current[segment] : undefined
  ), object);
}

function hasForbiddenEquivalentTo(concept, target) {
  return (concept.constraintContract.forbiddenRelations ?? []).some((relation) => (
    relation.relationType === 'equivalent_to'
    && relation.targetConceptId === target
  ));
}

function hasAllowedRelation(concept, relationType, target) {
  return (concept.constraintContract.allowedRelations ?? []).some((relation) => (
    relation.relationType === relationType
    && relation.targetConceptId === target
  ));
}

function hasInvariantId(concept, invariantId) {
  return (concept.constraintContract.invariants ?? []).some((invariant) => invariant.id === invariantId);
}

function evaluateCheck(check, concept, liveConcepts) {
  if (check.type === 'role_marker_unique') {
    const roleMarker = getRoleMarker(concept);
    const duplicates = liveConcepts.filter((candidate) => (
      candidate.conceptId !== concept.conceptId
      && getRoleMarker(candidate) === check.value
    ));

    return {
      passed: roleMarker === check.value && duplicates.length === 0,
      reason: `expected unique role marker ${check.value}`,
    };
  }

  if (check.type === 'forbidden_equivalent_to') {
    return {
      passed: hasForbiddenEquivalentTo(concept, check.target),
      reason: `expected forbidden equivalent_to target ${check.target}`,
    };
  }

  if (check.type === 'allowed_relation') {
    return {
      passed: hasAllowedRelation(concept, check.relationType, check.target),
      reason: `expected allowed relation ${check.relationType} -> ${check.target}`,
    };
  }

  if (check.type === 'invariant_id') {
    return {
      passed: hasInvariantId(concept, check.value),
      reason: `expected invariant ${check.value}`,
    };
  }

  if (check.type === 'structural_field_equals') {
    return {
      passed: readPath(concept, check.path) === check.value,
      reason: `expected ${check.path.join('.')} to equal "${check.value}"`,
    };
  }

  throw new Error(`Unsupported core primitive collapse check "${check.type}".`);
}

function evaluatePrimitive(entry, conceptMap, liveConcepts) {
  const concept = conceptMap.get(entry.primitive);
  if (!concept) {
    throw new Error(`Missing live concept packet for "${entry.primitive}".`);
  }

  const checkResults = entry.checks.map((check) => evaluateCheck(check, concept, liveConcepts));
  const failedChecks = checkResults.filter((check) => !check.passed);
  const reducible = failedChecks.length > 0;

  return {
    primitive: entry.primitive,
    reducible,
    reason: reducible
      ? `${entry.reasonStem} Missing proof: ${failedChecks.map((check) => check.reason).join('; ')}`
      : entry.reasonStem,
    metadata: {
      scenario: entry.scenario,
      collapseTargets: entry.collapseTargets,
      roleMarker: getRoleMarker(concept),
      checkResults,
    },
  };
}

function runCorePrimitiveCollapseAudit() {
  const liveConcepts = loadLiveConceptPackets();
  const conceptMap = new Map(liveConcepts.map((concept) => [concept.conceptId, concept]));
  const fixture = loadPrimitiveCollapseAuditFixture();

  return fixture.map((entry) => evaluatePrimitive(entry, conceptMap, liveConcepts));
}

module.exports = {
  fixturePath,
  loadPrimitiveCollapseAuditFixture,
  runCorePrimitiveCollapseAudit,
};

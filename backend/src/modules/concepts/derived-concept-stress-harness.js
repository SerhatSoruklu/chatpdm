'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  LIVE_CONCEPT_IDS,
} = require('./admission-state');
const {
  normalizeQuery,
} = require('./normalizer');
const {
  recognizeLegalVocabulary,
} = require('../legal-vocabulary');
const {
  getRejectedConceptRecord,
} = require('./rejection-registry-loader');
const {
  buildConceptDetail,
} = require('./concept-detail-service');
const {
  isOutOfScopeInteractionConceptId,
} = require('./interaction-kernel-boundary');

const fixturePath = path.resolve(
  __dirname,
  '../../../../tests/runtime/fixtures/phase-8-derived-concept-stress.json',
);

const CORE_PRIMITIVE_SET = new Set(LIVE_CONCEPT_IDS);

const DERIVED_CONCEPT_KERNEL_STATUSES = Object.freeze({
  DERIVED: 'DERIVED',
  OUT_OF_SCOPE_DEPENDENCY: 'OUT_OF_SCOPE_DEPENDENCY',
  REAL_CORE_GAP: 'REAL_CORE_GAP',
});

function loadDerivedConceptStressFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function evaluateScenario(entry, scenario, realCoreGapReferences) {
  const blocksKernelReduction = realCoreGapReferences.length > 0;

  if (scenario.rule === 'must_depend_on_references') {
    return {
      input: scenario.input,
      holds: !blocksKernelReduction,
      explanation: scenario.explanation,
    };
  }

  if (scenario.rule === 'survives_without_core_reference') {
    return {
      input: scenario.input,
      holds: !blocksKernelReduction,
      explanation: scenario.explanation,
    };
  }

  if (scenario.rule === 'stays_reducible_when_attachment_fails') {
    return {
      input: scenario.input,
      holds: !blocksKernelReduction,
      explanation: scenario.explanation,
    };
  }

  if (scenario.rule === 'may_exist_without_answerability') {
    return {
      input: scenario.input,
      holds: !blocksKernelReduction,
      explanation: scenario.explanation,
    };
  }

  if (scenario.rule === 'feeds_answerability_without_becoming_primitive') {
    return {
      input: scenario.input,
      holds: !blocksKernelReduction,
      explanation: scenario.explanation,
    };
  }

  throw new Error(`Unsupported derived-concept stress rule "${scenario.rule}".`);
}

function buildGapDescription({
  concept,
  outOfScopeDependencies,
  realCoreGapReferences,
  scenarioFailures,
}) {
  const segments = [];

  if (realCoreGapReferences.length > 0) {
    segments.push(
      `${concept} requires non-core in-scope reference(s): ${realCoreGapReferences.join(', ')}`,
    );
  }

  if (outOfScopeDependencies.length > 0) {
    segments.push(
      `${concept} depends on out-of-scope interaction reference(s): ${outOfScopeDependencies.join(', ')}`,
    );
  }

  if (scenarioFailures.length > 0) {
    segments.push(
      `scenario failure(s): ${scenarioFailures.map((failure) => failure.input).join(', ')}`,
    );
  }

  return segments.join('; ');
}

function evaluateDerivedConceptEntry(entry) {
  const normalizedConcept = normalizeQuery(entry.concept);
  const vocabularyRecognition = recognizeLegalVocabulary(normalizedConcept);
  const irreducibleRefs = entry.reductionReferences
    .filter((reference) => !CORE_PRIMITIVE_SET.has(reference));
  const outOfScopeDependencies = irreducibleRefs
    .filter((reference) => isOutOfScopeInteractionConceptId(reference));
  const realCoreGapReferences = irreducibleRefs
    .filter((reference) => !isOutOfScopeInteractionConceptId(reference));
  const scenarioResults = entry.scenarios.map((scenario) => (
    evaluateScenario(entry, scenario, realCoreGapReferences)
  ));
  const scenarioFailures = scenarioResults.filter((scenario) => !scenario.holds);
  const reducible = irreducibleRefs.length === 0 && scenarioFailures.length === 0;
  const kernelStatus = realCoreGapReferences.length > 0 || scenarioFailures.length > 0
    ? DERIVED_CONCEPT_KERNEL_STATUSES.REAL_CORE_GAP
    : (
      outOfScopeDependencies.length > 0
        ? DERIVED_CONCEPT_KERNEL_STATUSES.OUT_OF_SCOPE_DEPENDENCY
        : DERIVED_CONCEPT_KERNEL_STATUSES.DERIVED
    );

  const result = {
    concept: normalizedConcept,
    reducible,
    kernel_status: kernelStatus,
    reduction_path: entry.reductionPath,
  };

  if (kernelStatus !== DERIVED_CONCEPT_KERNEL_STATUSES.DERIVED) {
    result.gap = buildGapDescription({
      concept: normalizedConcept,
      outOfScopeDependencies,
      realCoreGapReferences,
      scenarioFailures,
    });
  }

  return {
    ...result,
    metadata: {
      vocabulary_recognition: vocabularyRecognition,
      rejection_record: getRejectedConceptRecord(normalizedConcept),
      concept_detail_available: buildConceptDetail(normalizedConcept) !== null,
      out_of_scope_dependencies: outOfScopeDependencies,
      real_core_gap_references: realCoreGapReferences,
      scenario_results: scenarioResults,
    },
  };
}

function runDerivedConceptStressTest() {
  return loadDerivedConceptStressFixture().map(evaluateDerivedConceptEntry);
}

module.exports = {
  CORE_PRIMITIVE_SET,
  DERIVED_CONCEPT_KERNEL_STATUSES,
  fixturePath,
  loadDerivedConceptStressFixture,
  runDerivedConceptStressTest,
};

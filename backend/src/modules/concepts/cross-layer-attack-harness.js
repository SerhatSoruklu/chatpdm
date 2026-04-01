'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  runFullPipeline,
} = require('./pipeline-runner');

const fixturePath = path.resolve(
  __dirname,
  '../../../../tests/runtime/fixtures/phase-9-cross-layer-attacks.json',
);

const LEAKING_RESOLUTION_TYPES = new Set([
  'LIVE_RESOLUTION',
  'VISIBLE_INSPECTION',
  'STRUCTURAL_REJECTION',
]);

function loadCrossLayerAttackFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function detectLeakage(result, expectedFinalState) {
  if (result.final_output.state !== expectedFinalState) {
    return true;
  }

  if (result.admission_state !== 'NOT_A_CONCEPT') {
    return true;
  }

  if (LEAKING_RESOLUTION_TYPES.has(result.resolution_output.type)) {
    return true;
  }

  if (result.final_output.state === 'valid') {
    return true;
  }

  if (
    result.final_output.state === 'classified'
    && result.vocabulary_recognition.recognized !== true
  ) {
    return true;
  }

  return false;
}

function evaluateCrossLayerAttack(entry) {
  const pipelineResult = runFullPipeline(entry.input);
  const leakageDetected = detectLeakage(pipelineResult, entry.expectedFinalState);

  return {
    name: entry.name,
    input: entry.input,
    final_state: pipelineResult.final_output.state,
    leakage_detected: leakageDetected,
    metadata: {
      normalized_query: pipelineResult.normalized_query,
      vocabulary_recognition: pipelineResult.vocabulary_recognition,
      admission_state: pipelineResult.admission_state,
      resolution_type: pipelineResult.resolution_output.type,
      final_type: pipelineResult.final_output.type,
    },
  };
}

function runCrossLayerAttackSimulation() {
  return loadCrossLayerAttackFixture().map(evaluateCrossLayerAttack);
}

module.exports = {
  fixturePath,
  loadCrossLayerAttackFixture,
  runCrossLayerAttackSimulation,
};

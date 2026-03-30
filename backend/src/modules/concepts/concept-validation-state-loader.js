'use strict';

const fs = require('node:fs');
const path = require('node:path');

const artifactPath = path.resolve(__dirname, '../../../../artifacts/register-validation-report.json');

let cachedSignature = null;
let cachedSnapshot = null;

function oneOf(value, allowedValues) {
  return allowedValues.includes(value) ? value : null;
}

function buildTrace(conceptId, conceptReport, source, unavailableReason = null) {
  return {
    conceptId,
    validatorSource: source,
    unavailableReason,
    relationSource: oneOf(
      conceptReport?.relations?.source ?? null,
      ['authored', 'fallback', 'none', null],
    ),
    lawSource: oneOf(
      conceptReport?.laws?.source ?? null,
      ['authored', 'fallback', 'none', null],
    ),
    relationDataPresent: Boolean(conceptReport?.relations?.relationDataPresent),
    dataSource: oneOf(
      conceptReport?.relations?.dataSource ?? conceptReport?.laws?.dataSource ?? null,
      ['authored_relation_packets', 'default_seed_relations', 'none', null],
    ),
  };
}

function buildUnavailableGovernanceState(conceptId, unavailableReason) {
  return {
    source: 'unavailable',
    available: false,
    validationState: null,
    v3Status: null,
    relationStatus: null,
    lawStatus: null,
    enforcementStatus: null,
    systemValidationState: null,
    isBlocked: false,
    isStructurallyIncomplete: false,
    isFullyValidated: false,
    isActionable: true,
    trace: buildTrace(conceptId, null, 'unavailable', unavailableReason),
  };
}

function deriveConceptRuntimeGovernanceState(conceptReport, conceptIdOverride = null) {
  const conceptId = conceptIdOverride ?? conceptReport?.conceptId ?? null;

  if (typeof conceptId !== 'string' || conceptId.trim() === '') {
    return buildUnavailableGovernanceState('unknown', 'concept_state_missing');
  }

  if (!conceptReport || typeof conceptReport !== 'object') {
    return buildUnavailableGovernanceState(conceptId, 'concept_state_missing');
  }

  const validationState = oneOf(
    conceptReport.validationState ?? null,
    ['language_invalid', 'language_valid', 'structurally_incomplete', 'fully_validated', null],
  );
  const v3Status = oneOf(
    conceptReport.v3Status ?? null,
    ['not_applicable', 'incomplete', 'passing', null],
  );
  const relationStatus = oneOf(
    conceptReport.relationStatus ?? null,
    ['not_applicable', 'incomplete', 'passing', null],
  );
  const lawStatus = oneOf(
    conceptReport.lawStatus ?? null,
    ['not_applicable', 'failing', 'warning_only', 'passing', null],
  );
  const enforcementStatus = oneOf(
    conceptReport.enforcementStatus ?? null,
    ['passing', 'warning_only', 'blocked', null],
  );
  const systemValidationState = oneOf(
    conceptReport.systemValidationState ?? null,
    ['language_invalid', 'structurally_incomplete', 'law_blocked', 'law_warning_only', 'law_validated', 'language_valid', null],
  );
  const isBlocked = enforcementStatus === 'blocked' || systemValidationState === 'law_blocked';
  const isStructurallyIncomplete = (
    v3Status === 'incomplete'
    || validationState === 'structurally_incomplete'
    || systemValidationState === 'structurally_incomplete'
  );
  const isFullyValidated = (
    validationState === 'fully_validated'
    && systemValidationState === 'law_validated'
    && enforcementStatus === 'passing'
  );

  return {
    source: 'validator_artifact',
    available: true,
    validationState,
    v3Status,
    relationStatus,
    lawStatus,
    enforcementStatus,
    systemValidationState,
    isBlocked,
    isStructurallyIncomplete,
    isFullyValidated,
    isActionable: !isBlocked,
    trace: buildTrace(conceptId, conceptReport, 'validator_artifact'),
  };
}

function loadConceptValidationSnapshot() {
  try {
    if (!fs.existsSync(artifactPath)) {
      return {
        available: false,
        source: 'unavailable',
        unavailableReason: 'artifact_missing',
        conceptsById: new Map(),
      };
    }

    const stat = fs.statSync(artifactPath);
    const signature = `${stat.size}:${stat.mtimeMs}`;

    if (cachedSnapshot && cachedSignature === signature) {
      return cachedSnapshot;
    }

    const artifactReport = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const concepts = Array.isArray(artifactReport?.concepts) ? artifactReport.concepts : [];
    const conceptsById = new Map();

    concepts.forEach((conceptReport) => {
      if (typeof conceptReport?.conceptId !== 'string' || conceptReport.conceptId.trim() === '') {
        return;
      }

      conceptsById.set(
        conceptReport.conceptId,
        deriveConceptRuntimeGovernanceState(conceptReport),
      );
    });

    cachedSignature = signature;
    cachedSnapshot = {
      available: true,
      source: 'validator_artifact',
      unavailableReason: null,
      conceptsById,
    };

    return cachedSnapshot;
  } catch (error) {
    process.stderr.write(
      `[chatpdm-runtime] validation artifact load failed: ${error.stack || error.message}\n`,
    );

    return {
      available: false,
      source: 'unavailable',
      unavailableReason: 'artifact_invalid',
      conceptsById: new Map(),
    };
  }
}

function getConceptRuntimeGovernanceState(conceptId) {
  const normalizedConceptId = typeof conceptId === 'string' && conceptId.trim() !== ''
    ? conceptId
    : 'unknown';
  const snapshot = loadConceptValidationSnapshot();

  if (!snapshot.available) {
    return buildUnavailableGovernanceState(normalizedConceptId, snapshot.unavailableReason);
  }

  return snapshot.conceptsById.get(normalizedConceptId)
    || buildUnavailableGovernanceState(normalizedConceptId, 'concept_state_missing');
}

module.exports = {
  artifactPath,
  deriveConceptRuntimeGovernanceState,
  getConceptRuntimeGovernanceState,
  loadConceptValidationSnapshot,
};

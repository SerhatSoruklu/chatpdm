'use strict';

const { validateDomainManifest } = require('../registries/validateDomainManifest');
const { validateNodeRegistry } = require('../registries/validateNodeRegistry');
const { validateThreatRegistry } = require('../registries/validateThreatRegistry');
const { validateCausalCompatibilityRegistry } = require('../registries/validateCausalCompatibilityRegistry');
const { validateFalsifierRegistry } = require('../registries/validateFalsifierRegistry');
const { validateEvidencePack } = require('../evidence/validateEvidencePack');
const { buildRegistryIndex } = require('../registries/buildRegistryIndex');
const { normalizeRiskMapQuery } = require('../normalizers/normalizeRiskMapQuery');
const { classifyRiskMapQueryShape } = require('../classification/classifyRiskMapQueryShape');
const { buildEvidenceCoverageReport } = require('../evidence/buildEvidenceCoverageReport');
const { assessRiskMapAdmissibility } = require('../admission/assessRiskMapAdmissibility');
const { buildSupportedRiskPaths } = require('../paths/buildSupportedRiskPaths');
const { buildUnsupportedBridgeLedger } = require('../ledgers/buildUnsupportedBridgeLedger');
const { buildAssumptionsLedger } = require('../ledgers/buildAssumptionsLedger');
const { buildUnknownsLedger } = require('../ledgers/buildUnknownsLedger');
const { buildFalsifierLedger } = require('../ledgers/buildFalsifierLedger');
const { classifyBoundedConfidence } = require('../confidence/classifyBoundedConfidence');
const { buildRiskMapResponse } = require('../resolve/buildRiskMapResponse');
const { validateRiskMapResponse } = require('../resolve/validateRiskMapResponse');
const { validateCompactOutputFormats } = require('../utils/validateCompactOutputFormats');
const { buildArtifactDiffReport } = require('./buildArtifactDiffReport');
const { loadGovernanceReleaseBundle } = require('./loadGovernanceReleaseBundle');
const { stableUniqueStrings } = require('../utils/stableUniqueStrings');

function validateArtifactErrorsForBundle(bundle, label) {
  const errors = [];

  if (bundle.domainManifest.domainId !== bundle.domainId) {
    errors.push(`${label}.domainManifest.domainId must match the release domainId.`);
  }

  if (bundle.domainManifest.version !== bundle.registryVersion) {
    errors.push(`${label}.domainManifest.version must match the release registryVersion.`);
  }

  if (bundle.nodeRegistry.domainId !== bundle.domainId || bundle.threatRegistry.domainId !== bundle.domainId) {
    errors.push(`${label}.registries.domainId must match the release domainId.`);
  }

  [
    ['domainManifest', validateDomainManifest(bundle.domainManifest)],
    ['nodeRegistry', validateNodeRegistry(bundle.nodeRegistry)],
    ['threatRegistry', validateThreatRegistry(bundle.threatRegistry)],
    ['causalCompatibilityRegistry', validateCausalCompatibilityRegistry(bundle.causalCompatibilityRegistry)],
    ['falsifierRegistry', validateFalsifierRegistry(bundle.falsifierRegistry)],
    ['evidencePack', validateEvidencePack(bundle.evidencePack)],
  ].forEach(([name, validation]) => {
    if (!validation.valid) {
      errors.push(`${label}.${name} invalid: ${validation.errors.join(' | ')}`);
    }
  });

  return errors;
}

function replayBundle(bundle, replayFixture) {
  const normalizedQuery = normalizeRiskMapQuery(replayFixture.input);
  const classification = classifyRiskMapQueryShape(normalizedQuery);
  const registryIndex = buildRegistryIndex({
    domainManifest: bundle.domainManifest,
    nodeRegistry: bundle.nodeRegistry,
    threatRegistry: bundle.threatRegistry,
    causalCompatibilityRegistry: bundle.causalCompatibilityRegistry,
    falsifierRegistry: bundle.falsifierRegistry,
  });
  const evidenceCoverageReport = buildEvidenceCoverageReport({
    normalizedQuery,
    registryIndex,
    evidencePack: bundle.evidencePack,
  });
  const admissibilityDecision = assessRiskMapAdmissibility({
    normalizedQuery,
    classification,
    domainManifest: bundle.domainManifest,
    registryIndex,
    evidenceCoverageReport,
  });
  const supportedPaths =
    admissibilityDecision.status === 'refused'
      ? Object.freeze([])
      : buildSupportedRiskPaths({
          normalizedQuery,
          admissibilityDecision,
          registryIndex,
          evidenceCoverageReport,
        });
  const unsupportedBridgeLedger =
    admissibilityDecision.status === 'refused'
      ? Object.freeze([])
      : buildUnsupportedBridgeLedger({
          normalizedQuery,
          classification,
          admissibilityDecision,
          registryIndex,
          evidenceCoverageReport,
        });
  const assumptionsLedger =
    admissibilityDecision.status === 'refused' ? Object.freeze([]) : buildAssumptionsLedger({ supportedPaths });
  const unknownsLedger = admissibilityDecision.status === 'refused' ? Object.freeze([]) : buildUnknownsLedger({ supportedPaths });
  const falsifierLedger =
    admissibilityDecision.status === 'refused' ? Object.freeze([]) : buildFalsifierLedger({ supportedPaths, registryIndex });
  const confidenceAssessment = classifyBoundedConfidence({
    admissibilityDecision,
    evidenceCoverageReport,
    supportedPaths,
    unsupportedBridgeLedger,
    assumptionsLedger,
    unknownsLedger,
    falsifierLedger,
  });
  const output = buildRiskMapResponse({
    normalizedQuery,
    admissibilityDecision,
    classification,
    evidenceCoverageReport,
    supportedPaths,
    unsupportedBridgeLedger,
    assumptionsLedger,
    unknownsLedger,
    falsifierLedger,
    confidenceAssessment,
  });
  const outputValidation = validateRiskMapResponse(output);
  const compactValidation = validateCompactOutputFormats(output);

  return {
    output,
    outputValidation,
    compactValidation,
  };
}

/**
 * @param {{
 *   baselineRelease: ReturnType<typeof loadGovernanceReleaseBundle>,
 *   candidateRelease: ReturnType<typeof loadGovernanceReleaseBundle>,
 *   replayFixture: { input: Record<string, unknown>, expectedOutput: Record<string, unknown> },
 * }} input
 * @returns {{ compatible: boolean, errors: readonly string[] }}
 */
function validateArtifactCompatibility(input) {
  const errors = [];

  errors.push(...validateArtifactErrorsForBundle(input.candidateRelease, 'candidateRelease'));

  const diffReport = buildArtifactDiffReport({
    releaseFrom: input.baselineRelease,
    releaseTo: input.candidateRelease,
  });

  const removedIds = [
    ...diffReport.changedIds.nodesRemoved,
    ...diffReport.changedIds.threatsRemoved,
    ...diffReport.changedIds.compatibilityRemoved,
    ...diffReport.changedIds.falsifiersRemoved,
    ...diffReport.changedIds.evidenceRecordsRemoved,
  ];

  if (removedIds.length > 0) {
    errors.push(`candidateRelease removed authored ids: ${stableUniqueStrings(removedIds).join(' | ')}`);
  }

  if (errors.length === 0) {
    const replay = replayBundle(input.candidateRelease, input.replayFixture);

    if (!replay.outputValidation.valid) {
      errors.push(`candidateRelease replay output invalid: ${replay.outputValidation.errors.join(' | ')}`);
    }

    if (!replay.compactValidation.valid) {
      errors.push(`candidateRelease replay compact output invalid: ${replay.compactValidation.errors.join(' | ')}`);
    }

    if (JSON.stringify(replay.output) !== JSON.stringify(input.replayFixture.expectedOutput)) {
      errors.push('candidateRelease replay output diverges from the seeded replay fixture.');
    }
  }

  return {
    compatible: errors.length === 0,
    errors: Object.freeze(stableUniqueStrings(errors)),
  };
}

module.exports = Object.freeze({
  validateArtifactCompatibility,
});

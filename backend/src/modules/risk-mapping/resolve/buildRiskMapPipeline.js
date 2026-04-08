'use strict';

const { validateRiskMapQueryContract } = require('../contracts/riskMapQueryContract');
const { normalizeRiskMapQuery } = require('../normalizers/normalizeRiskMapQuery');
const { classifyRiskMapQueryShape } = require('../classification/classifyRiskMapQueryShape');
const { loadDomainManifest } = require('../registries/loadDomainManifest');
const { loadNodeRegistry } = require('../registries/loadNodeRegistry');
const { loadThreatRegistry } = require('../registries/loadThreatRegistry');
const { loadCausalCompatibilityRegistry } = require('../registries/loadCausalCompatibilityRegistry');
const { loadFalsifierRegistry } = require('../registries/loadFalsifierRegistry');
const { buildRegistryIndex } = require('../registries/buildRegistryIndex');
const { loadEvidencePack } = require('../evidence/loadEvidencePack');
const { buildEvidenceCoverageReport } = require('../evidence/buildEvidenceCoverageReport');
const { assessRiskMapAdmissibility } = require('../admission/assessRiskMapAdmissibility');
const { buildSupportedRiskPaths } = require('../paths/buildSupportedRiskPaths');
const { buildUnsupportedBridgeLedger } = require('../ledgers/buildUnsupportedBridgeLedger');
const { buildAssumptionsLedger } = require('../ledgers/buildAssumptionsLedger');
const { buildUnknownsLedger } = require('../ledgers/buildUnknownsLedger');
const { buildFalsifierLedger } = require('../ledgers/buildFalsifierLedger');
const { classifyBoundedConfidence } = require('../confidence/classifyBoundedConfidence');
const { buildRiskMapResponse } = require('./buildRiskMapResponse');
const { validateRiskMapResponse } = require('./validateRiskMapResponse');
const { freezePlainObject } = require('../utils/freezePlainObject');

/**
 * @param {unknown} input
 * @returns {Readonly<{
 *   normalizedQuery: ReturnType<typeof normalizeRiskMapQuery>,
 *   classification: ReturnType<typeof classifyRiskMapQueryShape>,
 *   domainManifest: ReturnType<typeof loadDomainManifest>,
 *   registryIndex: ReturnType<typeof buildRegistryIndex>,
 *   evidencePack: ReturnType<typeof loadEvidencePack>,
 *   evidenceCoverageReport: ReturnType<typeof buildEvidenceCoverageReport>,
 *   admissibilityDecision: ReturnType<typeof assessRiskMapAdmissibility>,
 *   supportedPaths: ReturnType<typeof buildSupportedRiskPaths>,
 *   unsupportedBridgeLedger: ReturnType<typeof buildUnsupportedBridgeLedger>,
 *   assumptionsLedger: ReturnType<typeof buildAssumptionsLedger>,
 *   unknownsLedger: ReturnType<typeof buildUnknownsLedger>,
 *   falsifierLedger: ReturnType<typeof buildFalsifierLedger>,
 *   confidenceAssessment: ReturnType<typeof classifyBoundedConfidence>,
 *   output: ReturnType<typeof buildRiskMapResponse>,
 * }>}
 */
function buildRiskMapPipeline(input) {
  const inputValidation = validateRiskMapQueryContract(input);

  if (!inputValidation.valid) {
    throw new TypeError(`Invalid RiskMapQuery contract: ${inputValidation.errors.join(' | ')}`);
  }

  const normalizedQuery = normalizeRiskMapQuery(input);
  const classification = classifyRiskMapQueryShape(normalizedQuery);
  const domainManifest = loadDomainManifest(normalizedQuery.domain);
  const nodeRegistry = loadNodeRegistry(normalizedQuery.domain);
  const threatRegistry = loadThreatRegistry(normalizedQuery.domain);
  const causalCompatibilityRegistry = loadCausalCompatibilityRegistry(normalizedQuery.domain);
  const falsifierRegistry = loadFalsifierRegistry(normalizedQuery.domain);
  const registryIndex = buildRegistryIndex({
    domainManifest,
    nodeRegistry,
    threatRegistry,
    causalCompatibilityRegistry,
    falsifierRegistry,
  });
  const evidencePack = loadEvidencePack({
    domainId: normalizedQuery.domain,
    entity: normalizedQuery.entity,
    evidenceSetVersion: normalizedQuery.evidenceSetVersion,
  });
  const evidenceCoverageReport = buildEvidenceCoverageReport({
    normalizedQuery,
    registryIndex,
    evidencePack,
  });
  const admissibilityDecision = assessRiskMapAdmissibility({
    normalizedQuery,
    classification,
    domainManifest,
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
    admissibilityDecision.status === 'refused'
      ? Object.freeze([])
      : buildAssumptionsLedger({ supportedPaths });

  const unknownsLedger =
    admissibilityDecision.status === 'refused'
      ? Object.freeze([])
      : buildUnknownsLedger({ supportedPaths });

  const falsifierLedger =
    admissibilityDecision.status === 'refused'
      ? Object.freeze([])
      : buildFalsifierLedger({ supportedPaths, registryIndex });

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

  if (!outputValidation.valid) {
    throw new TypeError(`Invalid RiskMapOutput contract: ${outputValidation.errors.join(' | ')}`);
  }

  return freezePlainObject({
    normalizedQuery,
    classification,
    domainManifest,
    registryIndex,
    evidencePack,
    evidenceCoverageReport,
    admissibilityDecision,
    supportedPaths,
    unsupportedBridgeLedger,
    assumptionsLedger,
    unknownsLedger,
    falsifierLedger,
    confidenceAssessment,
    output,
  });
}

module.exports = Object.freeze({
  buildRiskMapPipeline,
});

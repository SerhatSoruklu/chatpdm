'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { safeJsonRead } = require('../../src/modules/risk-mapping/utils/safeJsonRead');
const { validateRiskMappingManifest } = require('../../src/modules/risk-mapping/registries/validateRiskMappingManifest');
const { loadDomainManifest } = require('../../src/modules/risk-mapping/registries/loadDomainManifest');
const { loadNodeRegistry } = require('../../src/modules/risk-mapping/registries/loadNodeRegistry');
const { loadThreatRegistry } = require('../../src/modules/risk-mapping/registries/loadThreatRegistry');
const { loadCausalCompatibilityRegistry } = require('../../src/modules/risk-mapping/registries/loadCausalCompatibilityRegistry');
const { loadFalsifierRegistry } = require('../../src/modules/risk-mapping/registries/loadFalsifierRegistry');
const { buildRegistryIndex } = require('../../src/modules/risk-mapping/registries/buildRegistryIndex');
const { loadEvidencePack } = require('../../src/modules/risk-mapping/evidence/loadEvidencePack');
const { validateEvidencePack } = require('../../src/modules/risk-mapping/evidence/validateEvidencePack');
const { buildEvidenceCoverageReport } = require('../../src/modules/risk-mapping/evidence/buildEvidenceCoverageReport');
const { normalizeRiskMapQuery } = require('../../src/modules/risk-mapping/normalizers/normalizeRiskMapQuery');

const BACKEND_ROOT = path.resolve(__dirname, '../..');
const MANIFEST_PATH = path.resolve(BACKEND_ROOT, 'data/risk-mapping/manifests/risk-mapping-manifest.json');
const REPORT_PATH = path.resolve(BACKEND_ROOT, 'artifacts/risk-mapping/evidence-validation-report.json');

function writeReport(report) {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

function main() {
  const startedAt = new Date().toISOString();

  try {
    const manifest = safeJsonRead(MANIFEST_PATH);
    const manifestValidation = validateRiskMappingManifest(manifest);

    if (!manifestValidation.valid) {
      throw new Error(`Invalid risk mapping manifest: ${manifestValidation.errors.join(' | ')}`);
    }

    const domainManifest = loadDomainManifest(manifest.availableDomains[0]);
    const nodeRegistry = loadNodeRegistry(domainManifest.domainId);
    const threatRegistry = loadThreatRegistry(domainManifest.domainId);
    const causalCompatibilityRegistry = loadCausalCompatibilityRegistry(domainManifest.domainId);
    const falsifierRegistry = loadFalsifierRegistry(domainManifest.domainId);
    const registryIndex = buildRegistryIndex({
      domainManifest,
      nodeRegistry,
      threatRegistry,
      causalCompatibilityRegistry,
      falsifierRegistry,
    });

    const evidencePack = loadEvidencePack({
      domainId: domainManifest.domainId,
      entity: 'apple',
      evidenceSetVersion: 'v1',
    });
    const validation = validateEvidencePack(evidencePack);

    if (!validation.valid) {
      throw new Error(`Invalid evidence pack: ${validation.errors.join(' | ')}`);
    }

    const coverageReport = buildEvidenceCoverageReport({
      normalizedQuery: normalizeRiskMapQuery({
        entity: evidencePack.entity,
        timeHorizon: '5 years',
        scenarioType: 'decline_risk',
        domain: evidencePack.domainId,
        scope: domainManifest.supportedScopes,
        evidenceSetVersion: evidencePack.evidenceSetVersion,
      }),
      registryIndex,
      evidencePack,
    });

    const report = {
      status: 'pass',
      startedAt,
      domainId: evidencePack.domainId,
      entity: evidencePack.entity,
      evidenceSetVersion: evidencePack.evidenceSetVersion,
      counts: {
        targetType: {
          node: evidencePack.records.filter((record) => record.targetType === 'node').length,
          threat: evidencePack.records.filter((record) => record.targetType === 'threat').length,
        },
        supportLevel: {
          direct: evidencePack.records.filter((record) => record.supportLevel === 'direct').length,
          contextual: evidencePack.records.filter((record) => record.supportLevel === 'contextual').length,
        },
      },
      coverage: {
        supportedNodeIds: coverageReport.supportedNodeIds,
        supportedThreatIds: coverageReport.supportedThreatIds,
      },
    };

    writeReport(report);
    console.log('RMG evidence validation passed.');
    console.log(`domainId=${report.domainId} entity=${report.entity} evidenceSetVersion=${report.evidenceSetVersion}`);
    console.log(
      `nodeRecords=${report.counts.targetType.node} threatRecords=${report.counts.targetType.threat} direct=${report.counts.supportLevel.direct} contextual=${report.counts.supportLevel.contextual}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const report = {
      status: 'fail',
      startedAt,
      error: message,
    };

    writeReport(report);
    console.error('RMG evidence validation failed.');
    console.error(message);
    process.exitCode = 1;
  }
}

main();

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

const BACKEND_ROOT = path.resolve(__dirname, '../..');
const MANIFEST_PATH = path.resolve(BACKEND_ROOT, 'data/risk-mapping/manifests/risk-mapping-manifest.json');
const REPORT_PATH = path.resolve(BACKEND_ROOT, 'artifacts/risk-mapping/registry-validation-report.json');

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

    const domains = manifest.availableDomains.map((domainId) => {
      const domainManifest = loadDomainManifest(domainId);
      const nodeRegistry = loadNodeRegistry(domainId);
      const threatRegistry = loadThreatRegistry(domainId);
      const causalCompatibilityRegistry = loadCausalCompatibilityRegistry(domainId);
      const falsifierRegistry = loadFalsifierRegistry(domainId);
      const registryIndex = buildRegistryIndex({
        domainManifest,
        nodeRegistry,
        threatRegistry,
        causalCompatibilityRegistry,
        falsifierRegistry,
      });

      return {
        domainId: registryIndex.domainId,
        version: registryIndex.version,
        counts: {
          nodes: registryIndex.nodeIds.length,
          threats: registryIndex.threatIds.length,
          causalCompatibilityRules: registryIndex.causalCompatibilityIds.length,
          falsifiers: registryIndex.falsifierIds.length,
        },
      };
    });

    const report = {
      status: 'pass',
      startedAt,
      domains,
    };

    writeReport(report);
    console.log('RMG domain and registry validation passed.');
    for (const domain of report.domains) {
      console.log(`domainId=${domain.domainId} version=${domain.version}`);
      console.log(
        `nodes=${domain.counts.nodes} threats=${domain.counts.threats} causalCompatibilityRules=${domain.counts.causalCompatibilityRules} falsifiers=${domain.counts.falsifiers}`,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const report = {
      status: 'fail',
      startedAt,
      error: message,
    };

    writeReport(report);
    console.error('RMG domain and registry validation failed.');
    console.error(message);
    process.exitCode = 1;
  }
}

main();

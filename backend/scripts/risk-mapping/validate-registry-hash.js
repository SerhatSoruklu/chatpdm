'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { buildRegistryHash } = require('../../src/modules/risk-mapping/utils/buildRegistryHash');

const BACKEND_ROOT = path.resolve(__dirname, '../..');
const REPORT_PATH = path.resolve(BACKEND_ROOT, 'artifacts/risk-mapping/registry-hash-report.json');
const EXPECTED_HASH = '8da4f82e502af54d8d9e398633a25820490e261e4a74e3ddfc538150194cf2e5';

function writeReport(report) {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

function main() {
  try {
    const hash = buildRegistryHash({
      domainId: 'organization_risk',
      entity: 'apple',
      evidenceSetVersion: 'v1',
    });
    if (hash.hash !== EXPECTED_HASH) {
      throw new Error(`Registry hash changed: expected ${EXPECTED_HASH}, received ${hash.hash}.`);
    }

    const report = {
      status: 'pass',
      domainId: hash.domainId,
      entity: hash.entity,
      evidenceSetVersion: hash.evidenceSetVersion,
      hash: hash.hash,
    };

    writeReport(report);
    console.log('RMG registry hash validation passed.');
    console.log(`domainId=${report.domainId} entity=${report.entity} evidenceSetVersion=${report.evidenceSetVersion}`);
    console.log(`hash=${report.hash}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const report = {
      status: 'fail',
      error: message,
    };

    writeReport(report);
    console.error('RMG registry hash validation failed.');
    console.error(message);
    process.exitCode = 1;
  }
}

main();

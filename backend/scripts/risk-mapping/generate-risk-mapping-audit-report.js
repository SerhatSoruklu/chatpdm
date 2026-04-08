'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { inspectRiskMapAuditReport } = require('../../src/modules/risk-mapping/inspect/inspectRiskMapAuditReport');

const BACKEND_ROOT = path.resolve(__dirname, '../..');
const REPORT_PATH = path.resolve(BACKEND_ROOT, 'artifacts/risk-mapping/audit-report.json');

function writeReport(report) {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

function main() {
  try {
    const report = inspectRiskMapAuditReport({
      entity: 'apple',
      timeHorizon: '5 years',
      scenarioType: 'decline_risk',
      domain: 'organization_risk',
      scope: ['regulatory', 'supply_chain'],
      evidenceSetVersion: 'v1',
    });

    writeReport(report);
    console.log('RMG audit report generation passed.');
    console.log(`domain=${report.provenance.domainId} entity=${report.provenance.entity} evidenceSetVersion=${report.provenance.evidenceSetVersion}`);
    console.log(`registryHash=${report.provenance.registryHash}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const report = {
      status: 'fail',
      error: message,
    };

    writeReport(report);
    console.error('RMG audit report generation failed.');
    console.error(message);
    process.exitCode = 1;
  }
}

main();

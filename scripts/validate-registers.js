'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { validateConcept } = require('./lib/register-validation/validate-concept');

const conceptsDirectory = path.resolve(__dirname, '../data/concepts');
const artifactDirectory = path.resolve(__dirname, '../artifacts');
const artifactPath = path.join(artifactDirectory, 'register-validation-report.json');
const NON_CONCEPT_PACKET_FILES = new Set(['resolve-rules.json']);

function loadConceptPackets() {
  return fs.readdirSync(conceptsDirectory)
    .filter((fileName) => fileName.endsWith('.json'))
    .filter((fileName) => !NON_CONCEPT_PACKET_FILES.has(fileName))
    .sort()
    .map((fileName) => JSON.parse(fs.readFileSync(path.join(conceptsDirectory, fileName), 'utf8')));
}

function collectFailureCategories(conceptReports) {
  const counts = new Map();

  conceptReports.forEach((conceptReport) => {
    Object.values(conceptReport.registers).forEach((registerReport) => {
      registerReport.errors.forEach((code) => {
        counts.set(code, (counts.get(code) || 0) + 1);
      });
    });
  });

  return Object.fromEntries([...counts.entries()].sort());
}

function collectWarningCategories(conceptReports) {
  const counts = new Map();

  conceptReports.forEach((conceptReport) => {
    Object.values(conceptReport.registers).forEach((registerReport) => {
      registerReport.warnings.forEach((code) => {
        counts.set(code, (counts.get(code) || 0) + 1);
      });
    });

    conceptReport.comparisons.forEach((comparisonReport) => {
      (comparisonReport.warnings || []).forEach((code) => {
        counts.set(code, (counts.get(code) || 0) + 1);
      });
    });
  });

  return Object.fromEntries([...counts.entries()].sort());
}

function collectExposedRegisterCounts(conceptReports) {
  const counts = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
  };

  conceptReports.forEach((conceptReport) => {
    counts[conceptReport.exposure.exposedRegisters.length] += 1;
  });

  return counts;
}

function writeArtifact(report) {
  fs.mkdirSync(artifactDirectory, { recursive: true });
  fs.writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

function formatZoneFailures(registerReport) {
  return Object.entries(registerReport.zones)
    .filter(([, zoneReport]) => zoneReport.errors.length > 0)
    .map(([zoneName, zoneReport]) => `    - ${zoneName}: ${zoneReport.errors.join(', ')}`);
}

function formatZoneWarnings(registerReport) {
  return Object.entries(registerReport.zones)
    .filter(([, zoneReport]) => (zoneReport.warnings || []).length > 0)
    .map(([zoneName, zoneReport]) => `    ~ ${zoneName}: ${zoneReport.warnings.join(', ')}`);
}

function printConceptSummary(conceptReport) {
  process.stdout.write(`[${conceptReport.conceptId}] ${conceptReport.passed ? 'PASS' : 'FAIL'}\n`);

  Object.entries(conceptReport.registers).forEach(([registerName, registerReport]) => {
    const status = registerReport.passed ? 'PASS' : 'FAIL';
    process.stdout.write(`  ${registerName}: ${status}\n`);

    formatZoneFailures(registerReport).forEach((line) => {
      process.stdout.write(`${line}\n`);
    });

    formatZoneWarnings(registerReport).forEach((line) => {
      process.stdout.write(`${line}\n`);
    });
  });

  process.stdout.write(`  exposed: ${conceptReport.exposure.exposedRegisters.join(', ') || 'none'}\n`);
}

function main() {
  const concepts = loadConceptPackets();
  const conceptReports = concepts.map(validateConcept);
  const summary = {
    totalConcepts: conceptReports.length,
    passingConcepts: conceptReports.filter((report) => report.passed).length,
    failingConcepts: conceptReports.filter((report) => !report.passed).length,
    exposedRegisterCounts: collectExposedRegisterCounts(conceptReports),
    failureCategories: collectFailureCategories(conceptReports),
    warningCategories: collectWarningCategories(conceptReports),
  };
  const artifactReport = {
    summary,
    concepts: conceptReports,
  };

  conceptReports.forEach(printConceptSummary);
  process.stdout.write(`SUMMARY ${JSON.stringify(summary)}\n`);

  writeArtifact(artifactReport);
  process.stdout.write(`Artifact written to ${path.relative(process.cwd(), artifactPath)}\n`);

  if (summary.failingConcepts > 0) {
    process.exitCode = 1;
  }
}

main();

'use strict';

const { validateAuthorityShape } = require('./validate-authority-shape');
const { validateAuthorityPowerBoundary } = require('./validate-authority-power-boundary');
const { validateDutyShape } = require('./validate-duty-shape');
const { validateDutyResponsibilityBoundary } = require('./validate-duty-responsibility-boundary');
const { validateLegitimacyBoundary } = require('./validate-legitimacy-boundary');
const { validateLegitimacyShape } = require('./validate-legitimacy-shape');
const { validatePowerShape } = require('./validate-power-shape');
const { validateResponsibilityShape } = require('./validate-responsibility-shape');

function validateConceptShape(concept) {
  let report = null;

  if (concept?.conceptId === 'authority') {
    report = validateAuthorityShape(concept);
  }

  if (concept?.conceptId === 'duty') {
    report = validateDutyShape(concept);
  }

  if (concept?.conceptId === 'legitimacy') {
    report = validateLegitimacyShape(concept);
  }

  if (concept?.conceptId === 'power') {
    report = validatePowerShape(concept);
  }

  if (concept?.conceptId === 'responsibility') {
    report = validateResponsibilityShape(concept);
  }

  if (!report) {
    report = {
      applicable: false,
      skipped: true,
      passed: true,
      v3Status: 'not_applicable',
      failures: [],
      warnings: [],
      requiredSlots: {},
      recommendedSlots: {},
      boundaryChecks: [],
      schemaVersion: null,
      conceptFamily: null,
    };
  }

  const boundaryChecks = [
    ...validateDutyResponsibilityBoundary(concept),
    ...validateAuthorityPowerBoundary(concept),
    ...validateLegitimacyBoundary(concept),
  ];
  report.boundaryChecks = boundaryChecks;
  report.warnings = [...report.warnings, ...boundaryChecks];

  return report;
}

module.exports = {
  validateConceptShape,
};

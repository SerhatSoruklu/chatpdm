'use strict';

const { REASON_CODES } = require('./reason-codes');

const REGISTER_NAMES = Object.freeze(['standard', 'simplified', 'formal']);
const REQUIRED_REGISTERS = new Set(['standard']);
const ZONE_NAMES = Object.freeze(['shortDefinition', 'coreMeaning', 'fullDefinition']);
const CANONICAL_FIELD_NAMES = Object.freeze(['invariant', 'excludes', 'adjacent']);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function pushUniqueCode(target, code) {
  if (!target.errors.includes(code)) {
    target.errors.push(code);
  }
}

function createZoneReport() {
  return {
    present: false,
    passed: true,
    errors: [],
  };
}

function createCanonicalFieldReport() {
  return {
    present: false,
    passed: true,
    warnings: [],
  };
}

function createRegisterReport(registerName) {
  return {
    name: registerName,
    required: REQUIRED_REGISTERS.has(registerName),
    present: false,
    passed: true,
    errors: [],
    zones: Object.fromEntries(ZONE_NAMES.map((zoneName) => [zoneName, createZoneReport()])),
  };
}

function createCanonicalReport() {
  return {
    present: false,
    passed: true,
    warnings: [],
    fields: Object.fromEntries(
      CANONICAL_FIELD_NAMES.map((fieldName) => [fieldName, createCanonicalFieldReport()]),
    ),
  };
}

function markFailed(reportNode, code) {
  reportNode.passed = false;
  pushUniqueCode(reportNode, code);
}

function pushUniqueWarning(target, code) {
  if (!target.warnings.includes(code)) {
    target.warnings.push(code);
  }
}

function markWarning(reportNode, code) {
  reportNode.passed = false;
  pushUniqueWarning(reportNode, code);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function validateCanonicalStructure(concept) {
  const report = createCanonicalReport();
  const canonical = concept?.canonical;

  if (!isPlainObject(canonical)) {
    markWarning(report, REASON_CODES.MISSING_CANONICAL_ANCHOR);
    return report;
  }

  report.present = true;

  const invariantReport = report.fields.invariant;
  if (Object.hasOwn(canonical, 'invariant')) {
    invariantReport.present = true;
  }
  if (!isNonEmptyString(canonical.invariant)) {
    markWarning(invariantReport, REASON_CODES.EMPTY_CANONICAL_INVARIANT);
  }

  const excludesReport = report.fields.excludes;
  if (Object.hasOwn(canonical, 'excludes')) {
    excludesReport.present = true;
  }
  if (
    !Array.isArray(canonical.excludes)
    || canonical.excludes.some((entry) => !isNonEmptyString(entry))
  ) {
    markWarning(excludesReport, REASON_CODES.INVALID_CANONICAL_EXCLUDES);
  }

  const adjacentReport = report.fields.adjacent;
  if (Object.hasOwn(canonical, 'adjacent')) {
    adjacentReport.present = true;
  }
  if (
    !isPlainObject(canonical.adjacent)
    || Object.entries(canonical.adjacent).some(
      ([key, value]) => !isNonEmptyString(key) || !isNonEmptyString(value),
    )
  ) {
    markWarning(adjacentReport, REASON_CODES.INVALID_CANONICAL_ADJACENT);
  }

  Object.values(report.fields).forEach((fieldReport) => {
    fieldReport.warnings.forEach((code) => pushUniqueWarning(report, code));
    if (!fieldReport.passed) {
      report.passed = false;
    }
  });

  return report;
}

function validateStructure(concept) {
  const report = {
    conceptId: typeof concept?.conceptId === 'string' ? concept.conceptId : null,
    passed: true,
    warnings: [],
    canonical: validateCanonicalStructure(concept),
    registers: {},
  };

  report.warnings = [...report.canonical.warnings];

  const authoredRegisters = isPlainObject(concept?.registers) ? concept.registers : null;

  REGISTER_NAMES.forEach((registerName) => {
    const registerReport = createRegisterReport(registerName);
    report.registers[registerName] = registerReport;

    if (!authoredRegisters || !Object.hasOwn(authoredRegisters, registerName)) {
      if (registerReport.required) {
        markFailed(registerReport, REASON_CODES.MISSING_REGISTER);
        report.passed = false;
      }

      return;
    }

    registerReport.present = true;

    const registerRecord = authoredRegisters[registerName];

    if (!isPlainObject(registerRecord)) {
      ZONE_NAMES.forEach((zoneName) => {
        markFailed(registerReport.zones[zoneName], REASON_CODES.MISSING_ZONE);
      });
      registerReport.passed = false;
      report.passed = false;
      return;
    }

    ZONE_NAMES.forEach((zoneName) => {
      const zoneReport = registerReport.zones[zoneName];

      if (!Object.hasOwn(registerRecord, zoneName)) {
        markFailed(zoneReport, REASON_CODES.MISSING_ZONE);
        registerReport.passed = false;
        report.passed = false;
        return;
      }

      zoneReport.present = true;

      if (typeof registerRecord[zoneName] !== 'string' || registerRecord[zoneName].trim() === '') {
        markFailed(zoneReport, REASON_CODES.EMPTY_TEXT);
        registerReport.passed = false;
        report.passed = false;
      }
    });
  });

  return report;
}

module.exports = {
  CANONICAL_FIELD_NAMES,
  REGISTER_NAMES,
  ZONE_NAMES,
  validateStructure,
};

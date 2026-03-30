'use strict';

const { REASON_CODES } = require('./reason-codes');

const REGISTER_NAMES = Object.freeze(['standard', 'simplified', 'formal']);
const REQUIRED_REGISTERS = new Set(['standard']);
const ZONE_NAMES = Object.freeze(['shortDefinition', 'coreMeaning', 'fullDefinition']);

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

function markFailed(reportNode, code) {
  reportNode.passed = false;
  pushUniqueCode(reportNode, code);
}

function validateStructure(concept) {
  const report = {
    conceptId: typeof concept?.conceptId === 'string' ? concept.conceptId : null,
    passed: true,
    registers: {},
  };

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
  REGISTER_NAMES,
  ZONE_NAMES,
  validateStructure,
};

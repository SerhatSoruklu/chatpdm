'use strict';

const { compareConceptRegisters } = require('./compare-registers');
const { REASON_CODES } = require('./reason-codes');
const { collectTextStats } = require('./text-stats');
const { validateConceptShape } = require('./validate-concept-shape');
const { validateSemanticInvariance } = require('./validate-semantic-invariance');
const { REGISTER_NAMES, ZONE_NAMES } = require('./validate-structure');
const { validateZoneContract } = require('./validate-zone');

function uniqueCodes(values) {
  return [...new Set(values)];
}

function pushUniqueCode(target, code) {
  if (!target.includes(code)) {
    target.push(code);
  }
}

function collectRegisterProfile(registerRecord) {
  if (!registerRecord) {
    return null;
  }

  const joinedText = ZONE_NAMES
    .map((zoneName) => (typeof registerRecord[zoneName] === 'string' ? registerRecord[zoneName] : ''))
    .filter(Boolean)
    .join('\n\n');

  if (!joinedText) {
    return null;
  }

  return collectTextStats(joinedText);
}

function buildProfileDeltas(leftProfile, rightProfile) {
  return {
    averageSentenceLengthDelta: Math.abs(
      leftProfile.averageSentenceLength - rightProfile.averageSentenceLength,
    ),
    longWordRatioDelta: Math.abs(leftProfile.longWordRatio - rightProfile.longWordRatio),
    abstractNounDensityDelta: Math.abs(
      leftProfile.abstractNounDensity - rightProfile.abstractNounDensity,
    ),
  };
}

function attachSemanticResults(report, semanticReport) {
  REGISTER_NAMES.forEach((registerName) => {
    const registerReport = report.registers[registerName];
    const semanticRegisterReport = semanticReport.registerResults[registerName];

    Object.keys(registerReport.zones).forEach((zoneName) => {
      const zoneReport = registerReport.zones[zoneName];
      const semanticZoneReport = semanticReport.zoneResults[registerName][zoneName];

      zoneReport.passed = zoneReport.passed && semanticZoneReport.passed;
      zoneReport.errors = uniqueCodes([...zoneReport.errors, ...semanticZoneReport.errors]);
      zoneReport.warnings = uniqueCodes([...zoneReport.warnings, ...semanticZoneReport.warnings]);
      zoneReport.semantic = {
        passed: semanticZoneReport.passed,
        errors: [...semanticZoneReport.errors],
        warnings: [...semanticZoneReport.warnings],
        matchedAnchors: semanticZoneReport.matchedAnchors,
        missingAnchors: semanticZoneReport.missingAnchors,
        forbiddenMatches: semanticZoneReport.forbiddenMatches,
      };

      if (registerReport.present && !zoneReport.passed) {
        registerReport.passed = false;
      }
    });

    registerReport.errors = uniqueCodes([
      ...registerReport.errors,
      ...semanticRegisterReport.errors,
      ...Object.values(registerReport.zones).flatMap((zoneReport) => zoneReport.errors),
    ]);
    registerReport.warnings = uniqueCodes([
      ...registerReport.warnings,
      ...semanticRegisterReport.warnings,
      ...Object.values(registerReport.zones).flatMap((zoneReport) => zoneReport.warnings),
    ]);
    registerReport.semantic = {
      profileFound: semanticReport.profileFound,
      skipped: semanticReport.skipped,
      present: semanticRegisterReport.present,
      passed: semanticRegisterReport.passed,
      errors: [...semanticRegisterReport.errors],
      warnings: [...semanticRegisterReport.warnings],
    };
    registerReport.passed = registerReport.passed && semanticRegisterReport.passed;
  });

  report.semantic = semanticReport;
  report.passed = Object.values(report.registers).every(
    (registerReport) => (registerReport.required || registerReport.present ? registerReport.passed : true),
  );
}

function applyProfileRules(report) {
  const standardRegister = report.registers.standard;
  const simplifiedRegister = report.registers.simplified;
  const formalRegister = report.registers.formal;

  const standardProfile = standardRegister.profile;
  const simplifiedProfile = simplifiedRegister.profile;
  const formalProfile = formalRegister.profile;

  if (standardProfile && simplifiedProfile) {
    if (
      simplifiedProfile.averageSentenceLength >= standardProfile.averageSentenceLength
      || simplifiedProfile.longWordRatio >= standardProfile.longWordRatio
      || simplifiedProfile.abstractNounDensity >= standardProfile.abstractNounDensity
    ) {
      pushUniqueCode(simplifiedRegister.errors, REASON_CODES.SIMPLIFIED_PROFILE_NOT_SIMPLER);
      simplifiedRegister.passed = false;
      report.passed = false;
    }

    if (
      standardProfile.averageSentenceLength - simplifiedProfile.averageSentenceLength < 2
      || standardProfile.longWordRatio - simplifiedProfile.longWordRatio < 0.03
      || standardProfile.abstractNounDensity - simplifiedProfile.abstractNounDensity < 0.01
    ) {
      pushUniqueCode(simplifiedRegister.warnings, REASON_CODES.SIMPLIFIED_PROFILE_DRIFT);
    }
  }

  if (standardProfile && formalProfile) {
    if (formalProfile.averageSentenceLength <= standardProfile.averageSentenceLength) {
      pushUniqueCode(formalRegister.errors, REASON_CODES.FORMAL_PROFILE_NOT_MORE_FORMAL);
      formalRegister.passed = false;
      report.passed = false;
    }

    if (formalProfile.averageSentenceLength - standardProfile.averageSentenceLength < 2) {
      pushUniqueCode(formalRegister.warnings, REASON_CODES.FORMAL_PROFILE_DRIFT);
    }
  }

  if (standardProfile && simplifiedProfile && formalProfile) {
    if (
      !(
        simplifiedProfile.averageSentenceLength < standardProfile.averageSentenceLength
        && standardProfile.averageSentenceLength < formalProfile.averageSentenceLength
      )
    ) {
      pushUniqueCode(standardRegister.errors, REASON_CODES.STANDARD_PROFILE_NOT_INTERMEDIATE);
      standardRegister.passed = false;
      report.passed = false;
    }

    if (
      !(
        simplifiedProfile.longWordRatio < standardProfile.longWordRatio
        && standardProfile.longWordRatio < formalProfile.longWordRatio
      )
      || !(
        simplifiedProfile.abstractNounDensity < standardProfile.abstractNounDensity
        && standardProfile.abstractNounDensity < formalProfile.abstractNounDensity
      )
    ) {
      pushUniqueCode(standardRegister.warnings, REASON_CODES.STANDARD_PROFILE_DRIFT);
    }
  }

  report.profileComparisons = {};

  if (standardProfile && simplifiedProfile) {
    report.profileComparisons.standard__simplified = buildProfileDeltas(
      standardProfile,
      simplifiedProfile,
    );
  }

  if (standardProfile && formalProfile) {
    report.profileComparisons.standard__formal = buildProfileDeltas(
      standardProfile,
      formalProfile,
    );
  }

  if (simplifiedProfile && formalProfile) {
    report.profileComparisons.simplified__formal = buildProfileDeltas(
      simplifiedProfile,
      formalProfile,
    );
  }
}

function deriveExposure(report) {
  const exposedRegisters = [];
  const hiddenRegisters = {};
  const standardReport = report.registers.standard;
  const standardSemanticPassed = report.semantic?.profileFound
    ? Boolean(standardReport?.semantic?.passed)
    : true;
  const standardPassed = Boolean(
    standardReport?.present
    && standardReport?.passed
    && standardSemanticPassed,
  );

  if (standardPassed) {
    exposedRegisters.push('standard');
  } else {
    hiddenRegisters.standard = uniqueCodes([
      ...(standardReport?.errors ?? [REASON_CODES.MISSING_REGISTER]),
      ...(standardReport?.semantic?.errors ?? []),
    ]);
  }

  ['simplified', 'formal'].forEach((registerName) => {
    const registerReport = report.registers[registerName];
    const semanticPassed = report.semantic?.profileFound
      ? Boolean(registerReport?.semantic?.passed)
      : true;

    if (standardPassed && registerReport?.present && registerReport.passed && semanticPassed) {
      exposedRegisters.push(registerName);
      return;
    }

    const reasons = [];

    if (!registerReport?.present) {
      reasons.push(REASON_CODES.MISSING_REGISTER);
    } else {
      reasons.push(...registerReport.errors);
      reasons.push(...(registerReport.semantic?.errors ?? []));
    }

    if (!standardPassed) {
      reasons.push(REASON_CODES.STANDARD_REQUIRED_FOR_EXPOSURE);
    }

    hiddenRegisters[registerName] = uniqueCodes(reasons);
  });

  return {
    exposedRegisters,
    hiddenRegisters,
  };
}

function deriveValidationState(languagePassed, v3Status) {
  if (!languagePassed) {
    return 'language_invalid';
  }

  if (v3Status === 'incomplete') {
    return 'structurally_incomplete';
  }

  if (v3Status === 'passing') {
    return 'fully_validated';
  }

  return 'language_valid';
}

function validateConcept(concept) {
  const comparisonReport = compareConceptRegisters(concept);
  const structureReport = comparisonReport.structure;
  const semanticReport = validateSemanticInvariance(concept?.conceptId, concept);
  const registers = {};

  REGISTER_NAMES.forEach((registerName) => {
    const structureRegisterReport = structureReport.registers[registerName];
    const registerReport = {
      name: registerName,
      required: structureRegisterReport.required,
      present: structureRegisterReport.present,
      passed: structureRegisterReport.required ? structureRegisterReport.passed : true,
      errors: [...structureRegisterReport.errors],
      warnings: [],
      zones: {},
    };

    ZONE_NAMES.forEach((zoneName) => {
      const structureZoneReport = structureRegisterReport.zones[zoneName];
      const zoneReport = {
        present: structureZoneReport.present,
        passed: structureZoneReport.passed,
        errors: [...structureZoneReport.errors],
        warnings: [],
      };

      if (structureRegisterReport.present && structureZoneReport.present && structureZoneReport.passed) {
        const contractReport = validateZoneContract({
          registerName,
          zoneName,
          text: concept.registers[registerName][zoneName],
          comparisonReport,
        });

        zoneReport.passed = contractReport.passed;
        zoneReport.errors = uniqueCodes([...zoneReport.errors, ...contractReport.errors]);
        zoneReport.warnings = uniqueCodes([...zoneReport.warnings, ...contractReport.warnings]);
        zoneReport.metrics = contractReport.metrics;
        zoneReport.matchedTerms = contractReport.matchedTerms;
      }

      if (structureRegisterReport.present && !zoneReport.passed) {
        registerReport.passed = false;
      }

      registerReport.zones[zoneName] = zoneReport;
    });

    registerReport.errors = uniqueCodes([
      ...registerReport.errors,
      ...Object.values(registerReport.zones).flatMap((zoneReport) => zoneReport.errors),
    ]);
    registerReport.warnings = uniqueCodes(
      Object.values(registerReport.zones).flatMap((zoneReport) => zoneReport.warnings),
    );

    if (!structureRegisterReport.present && !structureRegisterReport.required) {
      registerReport.passed = true;
    }

    if (structureRegisterReport.present) {
      registerReport.profile = collectRegisterProfile(concept.registers[registerName]);
    } else {
      registerReport.profile = null;
    }

    registers[registerName] = registerReport;
  });

  const report = {
    conceptId: typeof concept?.conceptId === 'string' ? concept.conceptId : null,
    passed: Object.values(registers).every(
      (registerReport) => (registerReport.required || registerReport.present ? registerReport.passed : true),
    ),
    warnings: [...(structureReport.warnings || [])],
    structure: structureReport,
    canonical: structureReport.canonical,
    comparisons: comparisonReport.comparisons,
    pairs: comparisonReport.pairs,
    semantic: null,
    registers,
  };

  applyProfileRules(report);
  attachSemanticResults(report, semanticReport);
  report.languagePassed = report.passed;
  report.v3 = validateConceptShape(concept);
  report.v3Status = report.v3.v3Status;
  report.relationStatus = 'not_applicable';
  report.lawStatus = 'not_applicable';
  report.relations = {
    applicable: false,
    passed: true,
    source: 'none',
    relationDataPresent: false,
    dataSource: 'none',
    counts: {
      total: 0,
      failures: 0,
      warnings: 0,
    },
    failures: [],
    warnings: [],
    packetValidation: null,
    results: [],
  };
  report.laws = {
    applicable: false,
    passed: true,
    source: 'none',
    relationDataPresent: false,
    dataSource: 'none',
    counts: {
      total: 0,
      failures: 0,
      warnings: 0,
    },
    failures: [],
    warnings: [],
    results: [],
  };
  report.enforcementStatus = 'passing';
  report.enforcement = {
    applicable: false,
    enforcementStatus: 'passing',
    blockingFailures: [],
    nonBlockingWarnings: [],
    activations: [],
    blockingFailureCategories: {},
    nonBlockingWarningCategories: {},
  };
  report.systemValidationState = report.validationState;

  if (report.v3.applicable && !report.v3.passed) {
    report.passed = false;
  }

  report.validationState = deriveValidationState(report.languagePassed, report.v3Status);
  report.systemValidationState = report.validationState;
  report.exposure = deriveExposure(report);
  return report;
}

module.exports = {
  deriveExposure,
  validateConcept,
};

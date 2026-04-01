'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  getAuditTrail,
  getLatestPublished,
} = require('./lib/governance/audit-trail');
const { REASON_CODES } = require('./lib/register-validation/reason-codes');
const {
  deriveGovernanceEnforcement,
  deriveSystemValidationState,
} = require('./lib/register-validation/derive-governance-enforcement');
const { evaluateEditDiscipline } = require('./lib/register-validation/edit-discipline');
const { attachOverlapValidationResults } = require('./lib/register-validation/validate-overlap-enforcement');
const { validateGovernanceLaws } = require('./lib/register-validation/validate-governance-laws');
const { REGISTER_NAMES, ZONE_NAMES } = require('./lib/register-validation/validate-structure');
const { validateConcept } = require('./lib/register-validation/validate-concept');

const conceptsDirectory = path.resolve(__dirname, '../data/concepts');
const goldenConceptsDirectory = path.resolve(__dirname, '../standards/golden-concepts');
const artifactDirectory = path.resolve(__dirname, '../artifacts');
const artifactPath = path.join(artifactDirectory, 'register-validation-report.json');
const artifactHistoryPath = path.join(artifactDirectory, 'register-validation-history.jsonl');
const NON_CONCEPT_PACKET_FILES = new Set([
  'concept-admission-state.json',
  'overlap-boundary-change-approvals.json',
  'overlap-classification-snapshot.json',
  'resolve-rules.json',
]);
const GOLDEN_CONCEPT_IDS = Object.freeze([
  'authority',
  'power',
  'legitimacy',
  'duty',
  'responsibility',
]);
const GOLDEN_PROFILE_TOLERANCES = Object.freeze({
  averageSentenceLength: 3,
  longWordRatio: 0.08,
  abstractNounDensity: 0.06,
});
const TOP_REASON_LIMIT = 5;
const OVERLAP_ALERT_DELTA = 0.02;
const PROFILE_DRIFT_CODES = new Set([
  REASON_CODES.STANDARD_PROFILE_DRIFT,
  REASON_CODES.SIMPLIFIED_PROFILE_DRIFT,
  REASON_CODES.FORMAL_PROFILE_DRIFT,
]);

function loadConceptPackets() {
  return fs.readdirSync(conceptsDirectory)
    .filter((fileName) => fileName.endsWith('.json'))
    .filter((fileName) => !NON_CONCEPT_PACKET_FILES.has(fileName))
    .sort()
    .map((fileName) => JSON.parse(fs.readFileSync(path.join(conceptsDirectory, fileName), 'utf8')));
}

function loadGoldenConceptPackets() {
  if (!fs.existsSync(goldenConceptsDirectory)) {
    return new Map();
  }

  return new Map(
    fs.readdirSync(goldenConceptsDirectory)
      .filter((fileName) => fileName.endsWith('.json'))
      .sort()
      .map((fileName) => {
        const concept = JSON.parse(fs.readFileSync(path.join(goldenConceptsDirectory, fileName), 'utf8'));
        return [concept.conceptId, concept];
      }),
  );
}

function loadPreviousArtifact() {
  if (!fs.existsSync(artifactPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  } catch {
    return null;
  }
}

function runGit(args) {
  try {
    return execFileSync('git', args, {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function resolveGitRevision() {
  return runGit(['rev-parse', 'HEAD']);
}

function average(values) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

function buildRange(values) {
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function buildGoldenBaselines(goldenConceptReports) {
  const baselines = {};

  REGISTER_NAMES.forEach((registerName) => {
    const profiles = goldenConceptReports
      .map((report) => report.registers[registerName]?.profile)
      .filter(Boolean);

    if (profiles.length === 0) {
      return;
    }

    baselines[registerName] = {
      averageSentenceLength: buildRange(profiles.map((profile) => profile.averageSentenceLength)),
      longWordRatio: buildRange(profiles.map((profile) => profile.longWordRatio)),
      abstractNounDensity: buildRange(profiles.map((profile) => profile.abstractNounDensity)),
    };
  });

  return baselines;
}

function pushUniqueWarning(target, code) {
  if (!target.includes(code)) {
    target.push(code);
  }
}

function isOutsideRange(value, range, tolerance) {
  return value < range.min - tolerance || value > range.max + tolerance;
}

function attachGoldenAlignment(report, concept, goldenConceptPackets, goldenBaselines) {
  const isGolden = GOLDEN_CONCEPT_IDS.includes(concept.conceptId);
  const golden = {
    isGolden,
    warnings: [],
    profileOutliers: {},
  };

  if (isGolden) {
    const goldenSnapshot = goldenConceptPackets.get(concept.conceptId);

    if (!goldenSnapshot) {
      pushUniqueWarning(golden.warnings, REASON_CODES.MISSING_GOLDEN_SNAPSHOT);
      report.golden = golden;
      return;
    }

    if (stableStringify(goldenSnapshot) !== stableStringify(concept)) {
      pushUniqueWarning(golden.warnings, REASON_CODES.GOLDEN_SNAPSHOT_OUT_OF_SYNC);
    }

    report.golden = golden;
    return;
  }

  REGISTER_NAMES.forEach((registerName) => {
    const registerProfile = report.registers[registerName]?.profile;
    const baseline = goldenBaselines[registerName];

    if (!registerProfile || !baseline) {
      return;
    }

    const outliers = [];

    if (
      isOutsideRange(
        registerProfile.averageSentenceLength,
        baseline.averageSentenceLength,
        GOLDEN_PROFILE_TOLERANCES.averageSentenceLength,
      )
    ) {
      outliers.push('averageSentenceLength');
    }

    if (
      isOutsideRange(
        registerProfile.longWordRatio,
        baseline.longWordRatio,
        GOLDEN_PROFILE_TOLERANCES.longWordRatio,
      )
    ) {
      outliers.push('longWordRatio');
    }

    if (
      isOutsideRange(
        registerProfile.abstractNounDensity,
        baseline.abstractNounDensity,
        GOLDEN_PROFILE_TOLERANCES.abstractNounDensity,
      )
    ) {
      outliers.push('abstractNounDensity');
    }

    if (outliers.length > 0) {
      golden.profileOutliers[registerName] = outliers;
      pushUniqueWarning(golden.warnings, REASON_CODES.GOLDEN_PROFILE_OUTLIER);
    }
  });

  report.golden = golden;
}

function collectFailureCategories(conceptReports, governanceLawReport = null) {
  const counts = new Map();

  conceptReports.forEach((conceptReport) => {
    (conceptReport.v3?.failures || []).forEach((entry) => {
      counts.set(entry.code, (counts.get(entry.code) || 0) + 1);
    });

    (conceptReport.overlap?.failures || []).forEach((entry) => {
      counts.set(entry.code, (counts.get(entry.code) || 0) + 1);
    });

    Object.values(conceptReport.registers).forEach((registerReport) => {
      registerReport.errors.forEach((code) => {
        counts.set(code, (counts.get(code) || 0) + 1);
      });
    });
  });

  (governanceLawReport?.failures || []).forEach((entry) => {
    counts.set(entry.code, (counts.get(entry.code) || 0) + 1);
  });

  return Object.fromEntries([...counts.entries()].sort());
}

function collectWarningCategories(conceptReports, governanceLawReport = null) {
  const counts = new Map();

  conceptReports.forEach((conceptReport) => {
    (conceptReport.v3?.warnings || []).forEach((entry) => {
      counts.set(entry.code, (counts.get(entry.code) || 0) + 1);
    });

    (conceptReport.warnings || []).forEach((code) => {
      counts.set(code, (counts.get(code) || 0) + 1);
    });

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

    (conceptReport.golden?.warnings || []).forEach((code) => {
      counts.set(code, (counts.get(code) || 0) + 1);
    });
  });

  (governanceLawReport?.warnings || []).forEach((entry) => {
    counts.set(entry.code, (counts.get(entry.code) || 0) + 1);
  });

  return Object.fromEntries([...counts.entries()].sort());
}

function collectSemanticCategories(conceptReports, propertyName) {
  const counts = new Map();

  conceptReports.forEach((conceptReport) => {
    if (!conceptReport.semantic?.profileFound) {
      return;
    }

    (conceptReport.semantic[propertyName] || []).forEach((entry) => {
      counts.set(entry.code, (counts.get(entry.code) || 0) + 1);
    });
  });

  return Object.fromEntries([...counts.entries()].sort());
}

function countSemanticEntries(conceptReports, selector) {
  const counts = new Map();

  conceptReports.forEach((conceptReport) => {
    if (!conceptReport.semantic?.profileFound) {
      return;
    }

    REGISTER_NAMES.forEach((registerName) => {
      ZONE_NAMES.forEach((zoneName) => {
        const entries = selector(conceptReport.semantic, registerName, zoneName) || [];

        entries.forEach((entry) => {
          const key = typeof entry === 'string'
            ? entry
            : `${entry.category ?? 'uncategorized'}:${entry.id}`;
          counts.set(key, (counts.get(key) || 0) + 1);
        });
      });
    });
  });

  return Object.fromEntries([...counts.entries()].sort());
}

function buildSemanticSummary(conceptReports) {
  return {
    profiledConcepts: conceptReports.filter((report) => report.semantic?.profileFound).length,
    failingConcepts: conceptReports.filter((report) => report.semantic?.profileFound && !report.semantic.passed).length,
    failureCategories: collectSemanticCategories(conceptReports, 'failures'),
    warningCategories: collectSemanticCategories(conceptReports, 'warnings'),
    anchorBreakdown: {
      matched: countSemanticEntries(
        conceptReports,
        (semanticReport, registerName, zoneName) => [
          ...(semanticReport.matchedAnchors?.[registerName]?.[zoneName]?.requiredAnchors || []),
          ...(semanticReport.matchedAnchors?.[registerName]?.[zoneName]?.requiredBoundaries || []),
        ],
      ),
      missing: countSemanticEntries(
        conceptReports,
        (semanticReport, registerName, zoneName) => [
          ...(semanticReport.missingAnchors?.[registerName]?.[zoneName]?.requiredAnchors || []),
          ...(semanticReport.missingAnchors?.[registerName]?.[zoneName]?.requiredBoundaries || []),
        ],
      ),
      forbidden: countSemanticEntries(
        conceptReports,
        (semanticReport, registerName, zoneName) => (
          semanticReport.forbiddenMatches?.[registerName]?.[zoneName] || []
        ),
      ),
    },
  };
}

function buildV3Summary(conceptReports) {
  const failureCounts = new Map();
  const warningCounts = new Map();
  const statusCounts = {
    not_applicable: 0,
    incomplete: 0,
    passing: 0,
  };

  conceptReports.forEach((conceptReport) => {
    const status = conceptReport.v3Status || conceptReport.v3?.v3Status || 'not_applicable';
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    (conceptReport.v3?.failures || []).forEach((entry) => {
      failureCounts.set(entry.code, (failureCounts.get(entry.code) || 0) + 1);
    });

    (conceptReport.v3?.warnings || []).forEach((entry) => {
      warningCounts.set(entry.code, (warningCounts.get(entry.code) || 0) + 1);
    });
  });

  return {
    applicableConcepts: conceptReports.filter((report) => report.v3?.applicable).length,
    failingConcepts: conceptReports.filter((report) => report.v3?.applicable && !report.v3.passed).length,
    statusCounts,
    structuralCompleteness: { ...statusCounts },
    failureCount: [...failureCounts.values()].reduce((sum, count) => sum + count, 0),
    warningCount: [...warningCounts.values()].reduce((sum, count) => sum + count, 0),
    failureCategories: Object.fromEntries([...failureCounts.entries()].sort()),
    warningCategories: Object.fromEntries([...warningCounts.entries()].sort()),
  };
}

function buildValidationStateSummary(conceptReports) {
  const counts = {
    language_invalid: 0,
    language_valid: 0,
    structurally_incomplete: 0,
    fully_validated: 0,
  };

  conceptReports.forEach((conceptReport) => {
    const state = conceptReport.validationState || 'language_valid';
    counts[state] = (counts[state] || 0) + 1;
  });

  return counts;
}

function deriveRelationStatus(relationSlice) {
  if (!relationSlice.applicable) {
    return 'not_applicable';
  }

  if (relationSlice.failures.length > 0) {
    return 'incomplete';
  }

  return 'passing';
}

function deriveLawStatus(lawSlice) {
  if (!lawSlice.applicable) {
    return 'not_applicable';
  }

  if (lawSlice.failures.length > 0) {
    return 'failing';
  }

  if (lawSlice.warnings.length > 0) {
    return 'warning_only';
  }

  return 'passing';
}

function touchesConcept(entry, conceptId) {
  return (
    entry?.conceptId === conceptId
    || entry?.subjectConceptId === conceptId
    || entry?.targetConceptId === conceptId
  );
}

function relationTouchesConcept(relationResult, conceptId) {
  return (
    relationResult?.relation?.subject?.conceptId === conceptId
    || relationResult?.relation?.target?.conceptId === conceptId
  );
}

function attachGovernanceLawResults(conceptReports, governanceLawReport) {
  const source = governanceLawReport?.source || 'none';
  const relationDataPresent = Boolean(governanceLawReport?.relationDataPresent);
  const dataSource = governanceLawReport?.dataSource || 'none';
  const strictMode = Boolean(governanceLawReport?.strictMode);
  const fallbackUsed = Boolean(governanceLawReport?.fallbackUsed);
  const packetResults = governanceLawReport?.relationReport?.packetResults || [];
  const relationResults = governanceLawReport?.relationReport?.relations || [];
  const relationFailures = governanceLawReport?.relationReport?.failures || [];
  const relationWarnings = governanceLawReport?.relationReport?.warnings || [];
  const lawChecks = governanceLawReport?.lawChecks || [];
  const lawFailures = governanceLawReport?.lawFailures || [];
  const lawWarnings = governanceLawReport?.lawWarnings || [];

  conceptReports.forEach((conceptReport) => {
    const conceptPacketValidation = packetResults.find((entry) => entry.conceptId === conceptReport.conceptId) || null;
    const conceptRelationResults = relationResults.filter((entry) => relationTouchesConcept(entry, conceptReport.conceptId));
    const conceptRelationFailures = relationFailures.filter((entry) => touchesConcept(entry, conceptReport.conceptId));
    const conceptRelationWarnings = relationWarnings.filter((entry) => touchesConcept(entry, conceptReport.conceptId));
    const conceptLawResults = lawChecks.filter((entry) => touchesConcept(entry, conceptReport.conceptId));
    const conceptLawFailures = lawFailures.filter((entry) => touchesConcept(entry, conceptReport.conceptId));
    const conceptLawWarnings = lawWarnings.filter((entry) => touchesConcept(entry, conceptReport.conceptId));

    conceptReport.relations = {
      applicable: conceptRelationResults.length > 0 || Boolean(conceptPacketValidation),
      passed: conceptRelationFailures.length === 0,
      source,
      relationDataPresent,
      dataSource,
      strictMode,
      fallbackUsed,
      counts: {
        total: conceptRelationResults.length,
        failures: conceptRelationFailures.length,
        warnings: conceptRelationWarnings.length,
      },
      failures: conceptRelationFailures,
      warnings: conceptRelationWarnings,
      packetValidation: conceptPacketValidation,
      results: conceptRelationResults,
    };
    conceptReport.laws = {
      applicable: conceptLawResults.length > 0,
      passed: conceptLawFailures.length === 0,
      source,
      relationDataPresent,
      dataSource,
      strictMode,
      fallbackUsed,
      counts: {
        total: conceptLawResults.length,
        failures: conceptLawFailures.length,
        warnings: conceptLawWarnings.length,
      },
      failures: conceptLawFailures,
      warnings: conceptLawWarnings,
      results: conceptLawResults,
    };
    conceptReport.relationStatus = deriveRelationStatus(conceptReport.relations);
    conceptReport.lawStatus = deriveLawStatus(conceptReport.laws);
    conceptReport.enforcement = deriveGovernanceEnforcement({
      relationFailures: conceptReport.relations.failures,
      relationWarnings: conceptReport.relations.warnings,
      lawFailures: conceptReport.laws.failures,
      lawWarnings: conceptReport.laws.warnings,
    });
    conceptReport.enforcement.applicable = conceptReport.relations.applicable || conceptReport.laws.applicable;
    conceptReport.enforcementStatus = conceptReport.enforcement.enforcementStatus;
    conceptReport.systemValidationState = deriveSystemValidationState({
      languagePassed: conceptReport.languagePassed,
      v3Status: conceptReport.v3Status,
      enforcementStatus: conceptReport.enforcementStatus,
    });

    if (conceptReport.enforcementStatus === 'blocked') {
      conceptReport.passed = false;
    }
  });
}

function buildRelationSummary(governanceLawReport) {
  const relationReport = governanceLawReport?.relationReport;

  if (!relationReport) {
    return {
      applicable: false,
      source: 'none',
      relationDataPresent: false,
      dataSource: 'none',
      relationStatus: 'not_applicable',
      counts: {
        total: 0,
        failures: 0,
        warnings: 0,
      },
      failureCategories: {},
      warningCategories: {},
      packetResults: [],
    };
  }

  const failureCounts = new Map();
  const warningCounts = new Map();

  (relationReport.failures || []).forEach((entry) => {
    failureCounts.set(entry.code, (failureCounts.get(entry.code) || 0) + 1);
  });

  (relationReport.warnings || []).forEach((entry) => {
    warningCounts.set(entry.code, (warningCounts.get(entry.code) || 0) + 1);
  });

  return {
    applicable: relationReport.applicable,
    source: relationReport.source,
    relationDataPresent: relationReport.relationDataPresent,
    dataSource: relationReport.dataSource,
    strictMode: Boolean(relationReport.strictMode),
    fallbackUsed: Boolean(relationReport.fallbackUsed),
    relationStatus: relationReport.failures.length > 0
      ? 'incomplete'
      : relationReport.applicable ? 'passing' : 'not_applicable',
    counts: {
      total: relationReport.relationCount,
      failures: relationReport.failureCount,
      warnings: relationReport.warningCount,
    },
    failureCategories: Object.fromEntries([...failureCounts.entries()].sort()),
    warningCategories: Object.fromEntries([...warningCounts.entries()].sort()),
    packetResults: relationReport.packetResults || [],
  };
}

function buildLawSummary(governanceLawReport) {
  if (!governanceLawReport) {
    return {
      applicable: false,
      source: 'none',
      relationDataPresent: false,
      dataSource: 'none',
      lawStatus: 'not_applicable',
      counts: {
        total: 0,
        failures: 0,
        warnings: 0,
      },
      failureCategories: {},
      warningCategories: {},
    };
  }

  const failureCounts = new Map();
  const warningCounts = new Map();

  (governanceLawReport.lawFailures || []).forEach((entry) => {
    failureCounts.set(entry.code, (failureCounts.get(entry.code) || 0) + 1);
  });

  (governanceLawReport.lawWarnings || []).forEach((entry) => {
    warningCounts.set(entry.code, (warningCounts.get(entry.code) || 0) + 1);
  });

  return {
    applicable: governanceLawReport.applicable,
    source: governanceLawReport.source,
    relationDataPresent: governanceLawReport.relationDataPresent,
    dataSource: governanceLawReport.dataSource,
    strictMode: Boolean(governanceLawReport.strictMode),
    fallbackUsed: Boolean(governanceLawReport.fallbackUsed),
    lawStatus: governanceLawReport.lawFailures.length > 0
      ? 'failing'
      : governanceLawReport.lawWarnings.length > 0
        ? 'warning_only'
        : governanceLawReport.applicable ? 'passing' : 'not_applicable',
    counts: {
      total: governanceLawReport.lawChecks.length,
      failures: governanceLawReport.lawFailures.length,
      warnings: governanceLawReport.lawWarnings.length,
    },
    failureCategories: Object.fromEntries([...failureCounts.entries()].sort()),
    warningCategories: Object.fromEntries([...warningCounts.entries()].sort()),
  };
}

function buildEnforcementSummary(conceptReports, governanceLawReport) {
  const statusCounts = {
    passing: 0,
    warning_only: 0,
    blocked: 0,
  };

  conceptReports.forEach((conceptReport) => {
    const status = conceptReport.enforcementStatus || 'passing';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  const systemEnforcement = deriveGovernanceEnforcement({
    relationFailures: governanceLawReport?.relationReport?.failures || [],
    relationWarnings: governanceLawReport?.relationReport?.warnings || [],
    lawFailures: governanceLawReport?.lawFailures || [],
    lawWarnings: governanceLawReport?.lawWarnings || [],
  });

  return {
    applicable: Boolean(governanceLawReport?.applicable),
    enforcementStatus: systemEnforcement.enforcementStatus,
    statusCounts,
    blockingFailures: systemEnforcement.blockingFailures,
    nonBlockingWarnings: systemEnforcement.nonBlockingWarnings,
    activations: systemEnforcement.activations,
    blockingFailureCategories: systemEnforcement.blockingFailureCategories,
    nonBlockingWarningCategories: systemEnforcement.nonBlockingWarningCategories,
  };
}

function buildSystemValidationStateSummary(conceptReports) {
  const counts = {
    language_invalid: 0,
    structurally_incomplete: 0,
    law_blocked: 0,
    law_warning_only: 0,
    law_validated: 0,
    language_valid: 0,
  };

  conceptReports.forEach((conceptReport) => {
    const state = conceptReport.systemValidationState || 'language_valid';
    counts[state] = (counts[state] || 0) + 1;
  });

  return counts;
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

function averageTokenOverlap(conceptReports) {
  const allComparisons = conceptReports.flatMap((conceptReport) => conceptReport.comparisons);
  const overall = average(allComparisons.map((comparison) => comparison.similarityScore));
  const byPair = {};
  const byZone = {};

  allComparisons.forEach((comparison) => {
    const pairKey = `${comparison.left}__${comparison.right}`;

    byPair[pairKey] ??= [];
    byPair[pairKey].push(comparison.similarityScore);

    byZone[comparison.zone] ??= [];
    byZone[comparison.zone].push(comparison.similarityScore);
  });

  return {
    overall,
    byPair: Object.fromEntries(
      Object.entries(byPair)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([pairKey, values]) => [pairKey, average(values)]),
    ),
    byZone: Object.fromEntries(
      Object.entries(byZone)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([zoneName, values]) => [zoneName, average(values)]),
    ),
  };
}

function topReasonCodes(categoryCounts, limit = TOP_REASON_LIMIT) {
  return Object.entries(categoryCounts)
    .sort((leftEntry, rightEntry) => {
      if (rightEntry[1] !== leftEntry[1]) {
        return rightEntry[1] - leftEntry[1];
      }

      return leftEntry[0].localeCompare(rightEntry[0]);
    })
    .slice(0, limit)
    .map(([code, count]) => ({ code, count }));
}

function collectProfileDriftCounts(summary) {
  const warningCount = [...PROFILE_DRIFT_CODES].reduce(
    (count, code) => count + (summary.warningCategories[code] || 0),
    0,
  );

  return {
    warnings: warningCount,
  };
}

function buildTelemetry(summary, conceptReports) {
  const threeRegisterExposureRate = summary.totalConcepts > 0
    ? summary.exposedRegisterCounts[3] / summary.totalConcepts
    : 0;
  const tokenOverlap = averageTokenOverlap(conceptReports);

  return {
    threeRegisterExposureRate,
    tokenOverlap,
    mostCommonFailureReasonCodes: topReasonCodes(summary.failureCategories),
    mostCommonWarningReasonCodes: topReasonCodes(summary.warningCategories),
    profileDrift: collectProfileDriftCounts(summary),
  };
}

function buildAuditSummary(concepts) {
  const auditRecords = getAuditTrail();
  const conceptIds = concepts.map((concept) => concept.conceptId).sort();
  const latestPublishedByConcept = Object.fromEntries(
    conceptIds.map((conceptId) => [conceptId, getLatestPublished(conceptId)]),
  );
  const approvalHistory = auditRecords.reduce((counts, record) => {
    counts[record.approvedBy] = (counts[record.approvedBy] || 0) + 1;
    return counts;
  }, {});
  const validatorFailureTrends = auditRecords.reduce((counts, record) => {
    ['v1', 'v2', 'v3'].forEach((stageName) => {
      const status = record.validatorSnapshot?.[stageName] || 'not-run';
      const key = `${stageName}.${status}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, {});
  const recentChanges = [...auditRecords]
    .sort((left, right) => Date.parse(right.approvedAt) - Date.parse(left.approvedAt))
    .slice(0, 5)
    .map((record) => ({
      concept: record.concept,
      version: record.version,
      changeType: record.changeType,
      approvedBy: record.approvedBy,
      approvedAt: record.approvedAt,
      stateTransitions: record.stateTransitions,
    }));

  return {
    totalRecords: auditRecords.length,
    conceptsWithAudit: [...new Set(auditRecords.map((record) => record.concept))].length,
    recentChanges,
    validatorFailureTrends,
    approvalHistory,
    latestPublished: Object.fromEntries(
      Object.entries(latestPublishedByConcept)
        .filter(([, record]) => Boolean(record))
        .map(([conceptId, record]) => [conceptId, {
          version: record.version,
          approvedAt: record.approvedAt,
          approvedBy: record.approvedBy,
        }]),
    ),
  };
}

function deltaDirection(delta) {
  if (delta > 0) {
    return 'up';
  }

  if (delta < 0) {
    return 'down';
  }

  return 'flat';
}

function buildTrendIndicators(summary, previousArtifact) {
  const previousSummary = previousArtifact?.summary;
  const previousTelemetry = previousSummary?.telemetry;
  const alerts = [];

  if (!previousSummary || !previousTelemetry) {
    return {
      previousRunFound: false,
      exposureRateDelta: 0,
      exposureRateDirection: 'flat',
      tokenOverlapDelta: {
        overall: 0,
        byPair: {},
      },
      risingFailureCategories: [],
      profileDriftDelta: 0,
      alerts,
    };
  }

  const exposureRateDelta = summary.telemetry.threeRegisterExposureRate - previousTelemetry.threeRegisterExposureRate;
  const currentOverlap = summary.telemetry.tokenOverlap;
  const previousOverlap = previousTelemetry.tokenOverlap || { overall: 0, byPair: {} };
  const pairKeys = [...new Set([
    ...Object.keys(currentOverlap.byPair),
    ...Object.keys(previousOverlap.byPair || {}),
  ])].sort();
  const overlapDeltaByPair = Object.fromEntries(
    pairKeys.map((pairKey) => {
      const delta = (currentOverlap.byPair[pairKey] || 0) - (previousOverlap.byPair?.[pairKey] || 0);

      if (delta >= OVERLAP_ALERT_DELTA) {
        alerts.push({
          code: REASON_CODES.INCREASING_OVERLAP_TREND,
          detail: `${pairKey} +${delta.toFixed(3)}`,
        });
      }

      return [pairKey, delta];
    }),
  );

  const overallOverlapDelta = currentOverlap.overall - (previousOverlap.overall || 0);

  if (overallOverlapDelta >= OVERLAP_ALERT_DELTA) {
    alerts.push({
      code: REASON_CODES.INCREASING_OVERLAP_TREND,
      detail: `overall +${overallOverlapDelta.toFixed(3)}`,
    });
  }

  const failureKeys = [...new Set([
    ...Object.keys(summary.failureCategories),
    ...Object.keys(previousSummary.failureCategories || {}),
  ])].sort();
  const risingFailureCategories = failureKeys
    .map((code) => {
      const previousCount = previousSummary.failureCategories?.[code] || 0;
      const currentCount = summary.failureCategories[code] || 0;
      return {
        code,
        previousCount,
        currentCount,
        delta: currentCount - previousCount,
      };
    })
    .filter((entry) => entry.delta > 0);

  risingFailureCategories.forEach((entry) => {
    alerts.push({
      code: REASON_CODES.RISING_FAILURE_CATEGORY,
      detail: `${entry.code} +${entry.delta}`,
    });
  });

  const currentProfileDrift = summary.telemetry.profileDrift.warnings;
  const previousProfileDrift = previousTelemetry.profileDrift?.warnings || 0;
  const profileDriftDelta = currentProfileDrift - previousProfileDrift;

  if (profileDriftDelta > 0) {
    alerts.push({
      code: REASON_CODES.PROFILE_DRIFT_ALERT,
      detail: `warnings +${profileDriftDelta}`,
    });
  }

  return {
    previousRunFound: true,
    exposureRateDelta,
    exposureRateDirection: deltaDirection(exposureRateDelta),
    tokenOverlapDelta: {
      overall: overallOverlapDelta,
      byPair: overlapDeltaByPair,
    },
    risingFailureCategories,
    profileDriftDelta,
    alerts,
  };
}

function writeArtifact(report) {
  fs.mkdirSync(artifactDirectory, { recursive: true });
  fs.writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

function appendHistoryEntry(summary) {
  const historyEntry = {
    generatedAt: new Date().toISOString(),
    gitRevision: resolveGitRevision(),
    overlap: summary.overlap,
    semantic: summary.semantic,
    v3: summary.v3,
    relations: summary.relations,
    laws: summary.laws,
    enforcement: summary.enforcement,
    validationStates: summary.validationStates,
    systemValidationStates: summary.systemValidationStates,
    telemetry: summary.telemetry,
    trendIndicators: summary.trendIndicators,
    exposedRegisterCounts: summary.exposedRegisterCounts,
    failureCategories: summary.failureCategories,
    warningCategories: summary.warningCategories,
  };

  fs.mkdirSync(artifactDirectory, { recursive: true });
  fs.appendFileSync(artifactHistoryPath, `${JSON.stringify(historyEntry)}\n`, 'utf8');
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
  process.stdout.write(
    `  classification: language=${conceptReport.languagePassed ? 'PASS' : 'FAIL'} v3=${conceptReport.v3Status} relation=${conceptReport.relationStatus} law=${conceptReport.lawStatus} enforcement=${conceptReport.enforcementStatus} state=${conceptReport.validationState} system=${conceptReport.systemValidationState}\n`,
  );

  if ((conceptReport.warnings || []).length > 0) {
    process.stdout.write(`  ~ canonical: ${conceptReport.warnings.join(', ')}\n`);
  }

  if ((conceptReport.golden?.warnings || []).length > 0) {
    process.stdout.write(`  ~ golden: ${conceptReport.golden.warnings.join(', ')}\n`);
  }

  Object.entries(conceptReport.registers).forEach(([registerName, registerReport]) => {
    const status = registerReport.passed ? 'PASS' : 'FAIL';
    const semanticStatus = registerReport.semantic?.profileFound
      ? (registerReport.semantic.passed ? 'PASS' : 'FAIL')
      : 'SKIP';
    process.stdout.write(`  ${registerName}: ${status} semantic=${semanticStatus}\n`);

    formatZoneFailures(registerReport).forEach((line) => {
      process.stdout.write(`${line}\n`);
    });

    formatZoneWarnings(registerReport).forEach((line) => {
      process.stdout.write(`${line}\n`);
    });
  });

  if (
    conceptReport.v3?.applicable
    || (conceptReport.v3?.failures?.length || 0) > 0
    || (conceptReport.v3?.warnings?.length || 0) > 0
  ) {
    const v3Status = conceptReport.v3.passed ? 'PASS' : 'FAIL';
    process.stdout.write(`  v3: ${v3Status}\n`);
    process.stdout.write(
      `    requiredSlots=${Object.entries(conceptReport.v3.requiredSlots).map(([slotName, present]) => `${slotName}:${present ? 'yes' : 'no'}`).join(', ')}\n`,
    );
    process.stdout.write(
      `    recommendedSlots=${Object.entries(conceptReport.v3.recommendedSlots).map(([slotName, present]) => `${slotName}:${present ? 'yes' : 'no'}`).join(', ')}\n`,
    );

    if (conceptReport.v3.failures.length > 0) {
      process.stdout.write(
        `    - failures: ${conceptReport.v3.failures.map((entry) => `${entry.code}${entry.slot ? `(${entry.slot})` : entry.zone ? `(${entry.zone})` : ''}`).join(', ')}\n`,
      );
    }

    if (conceptReport.v3.warnings.length > 0) {
      process.stdout.write(
        `    ~ warnings: ${conceptReport.v3.warnings.map((entry) => `${entry.code}${entry.slot ? `(${entry.slot})` : entry.zone ? `(${entry.zone})` : ''}`).join(', ')}\n`,
      );
    }
  }

  if (conceptReport.relations?.applicable || conceptReport.laws?.applicable) {
    process.stdout.write(
      `  connected: relation=${conceptReport.relationStatus} law=${conceptReport.lawStatus}\n`,
    );

    if (conceptReport.relations?.applicable) {
      process.stdout.write(
        `    relations total=${conceptReport.relations.counts.total} failures=${conceptReport.relations.counts.failures} warnings=${conceptReport.relations.counts.warnings} source=${conceptReport.relations.source} strict=${conceptReport.relations.strictMode ? 'yes' : 'no'} fallback=${conceptReport.relations.fallbackUsed ? 'yes' : 'no'}\n`,
      );
      if (conceptReport.relations.packetValidation) {
        process.stdout.write(
          `    packet: present=${conceptReport.relations.packetValidation.present ? 'yes' : 'no'} passed=${conceptReport.relations.packetValidation.passed ? 'yes' : 'no'} source=${conceptReport.relations.packetValidation.source}\n`,
        );
      }

      if (conceptReport.relations.failures.length > 0) {
        process.stdout.write(
          `    - relationFailures: ${conceptReport.relations.failures.map((entry) => entry.code).join(', ')}\n`,
        );
      }
    }

    if (conceptReport.laws?.applicable) {
      process.stdout.write(
        `    laws total=${conceptReport.laws.counts.total} failures=${conceptReport.laws.counts.failures} warnings=${conceptReport.laws.counts.warnings} source=${conceptReport.laws.source} strict=${conceptReport.laws.strictMode ? 'yes' : 'no'} fallback=${conceptReport.laws.fallbackUsed ? 'yes' : 'no'}\n`,
      );

      if (conceptReport.laws.failures.length > 0) {
        process.stdout.write(
          `    - lawFailures: ${conceptReport.laws.failures.map((entry) => entry.code).join(', ')}\n`,
        );
      }

      if (conceptReport.laws.warnings.length > 0) {
        process.stdout.write(
          `    ~ lawWarnings: ${conceptReport.laws.warnings.map((entry) => entry.code).join(', ')}\n`,
        );
      }
    }
  }

  if (conceptReport.enforcement?.applicable) {
    process.stdout.write(
      `  enforcement: status=${conceptReport.enforcementStatus} blocking=${conceptReport.enforcement.blockingFailures.length} warnings=${conceptReport.enforcement.nonBlockingWarnings.length}\n`,
    );

    if (conceptReport.enforcement.activations.length > 0) {
      process.stdout.write(
        `    ~ activations: ${conceptReport.enforcement.activations.map((entry) => `${entry.code}(${entry.status})`).join(', ')}\n`,
      );
    }

    if (conceptReport.enforcement.blockingFailures.length > 0) {
      process.stdout.write(
        `    - blockingFailures: ${conceptReport.enforcement.blockingFailures.map((entry) => entry.code).join(', ')}\n`,
      );
    }

    if (conceptReport.enforcement.nonBlockingWarnings.length > 0) {
      process.stdout.write(
        `    ~ nonBlockingWarnings: ${conceptReport.enforcement.nonBlockingWarnings.map((entry) => entry.code).join(', ')}\n`,
      );
    }
  }

  if (conceptReport.overlap?.applicable) {
    process.stdout.write(
      `  overlap: ${conceptReport.overlap.passed ? 'PASS' : 'FAIL'} admission=${conceptReport.overlap.admission} comparisons=${conceptReport.overlap.comparedConceptIds.length}/${conceptReport.overlap.expectedComparisonTargetIds.length} targetSet=${conceptReport.overlap.targetSet}\n`,
    );

    if (conceptReport.overlap.failures.length > 0) {
      conceptReport.overlap.failures.forEach((entry) => {
        const target = entry.otherConceptId ? ` ${entry.otherConceptId}` : '';
        const classification = entry.classification ? ` classification=${entry.classification}` : '';
        process.stdout.write(`    - overlap ${entry.code}${target}${classification}: ${entry.detail}\n`);
      });
    }
  }

  process.stdout.write(`  exposed: ${conceptReport.exposure.exposedRegisters.join(', ') || 'none'}\n`);

  Object.entries(conceptReport.exposure.hiddenRegisters || {}).forEach(([registerName, reasons]) => {
    process.stdout.write(`  hidden ${registerName}: ${reasons.join(', ')}\n`);
  });
}

function printTelemetrySummary(summary) {
  process.stdout.write(
    `TELEMETRY threeRegisterExposureRate=${(summary.telemetry.threeRegisterExposureRate * 100).toFixed(1)}%\n`,
  );
  process.stdout.write(
    `TELEMETRY averageTokenOverlap.overall=${summary.telemetry.tokenOverlap.overall.toFixed(3)}\n`,
  );

  Object.entries(summary.telemetry.tokenOverlap.byPair).forEach(([pairKey, value]) => {
    process.stdout.write(`TELEMETRY averageTokenOverlap.${pairKey}=${value.toFixed(3)}\n`);
  });

  if (summary.telemetry.mostCommonFailureReasonCodes.length > 0) {
    process.stdout.write(
      `TELEMETRY topFailureReasons=${summary.telemetry.mostCommonFailureReasonCodes.map((entry) => `${entry.code}:${entry.count}`).join(', ')}\n`,
    );
  }

  if (summary.trendIndicators.previousRunFound) {
    process.stdout.write(
      `TREND threeRegisterExposureRate ${summary.trendIndicators.exposureRateDirection} ${summary.trendIndicators.exposureRateDelta.toFixed(3)}\n`,
    );
    process.stdout.write(
      `TREND averageTokenOverlap.overall ${deltaDirection(summary.trendIndicators.tokenOverlapDelta.overall)} ${summary.trendIndicators.tokenOverlapDelta.overall.toFixed(3)}\n`,
    );
  }

  summary.trendIndicators.alerts.forEach((alert) => {
    process.stdout.write(`ALERT ${alert.code}${alert.detail ? ` ${alert.detail}` : ''}\n`);
  });
}

function printSemanticSummary(summary) {
  process.stdout.write(`SEMANTIC profiledConcepts=${summary.semantic.profiledConcepts} failingConcepts=${summary.semantic.failingConcepts}\n`);

  if (summary.semantic.failureCategories && Object.keys(summary.semantic.failureCategories).length > 0) {
    process.stdout.write(
      `SEMANTIC failureCategories=${Object.entries(summary.semantic.failureCategories).map(([code, count]) => `${code}:${count}`).join(', ')}\n`,
    );
  }

  if (summary.semantic.warningCategories && Object.keys(summary.semantic.warningCategories).length > 0) {
    process.stdout.write(
      `SEMANTIC warningCategories=${Object.entries(summary.semantic.warningCategories).map(([code, count]) => `${code}:${count}`).join(', ')}\n`,
    );
  }

  if (Object.keys(summary.semantic.anchorBreakdown.matched).length > 0) {
    process.stdout.write(
      `SEMANTIC matchedAnchors=${Object.entries(summary.semantic.anchorBreakdown.matched).map(([key, count]) => `${key}:${count}`).join(', ')}\n`,
    );
  }

  if (Object.keys(summary.semantic.anchorBreakdown.missing).length > 0) {
    process.stdout.write(
      `SEMANTIC missingAnchors=${Object.entries(summary.semantic.anchorBreakdown.missing).map(([key, count]) => `${key}:${count}`).join(', ')}\n`,
    );
  }

  if (Object.keys(summary.semantic.anchorBreakdown.forbidden).length > 0) {
    process.stdout.write(
      `SEMANTIC forbiddenMatches=${Object.entries(summary.semantic.anchorBreakdown.forbidden).map(([key, count]) => `${key}:${count}`).join(', ')}\n`,
    );
  }
}

function printV3Summary(summary) {
  process.stdout.write(
    `V3 applicableConcepts=${summary.v3.applicableConcepts} failingConcepts=${summary.v3.failingConcepts}\n`,
  );
  process.stdout.write(
    `V3 statusCounts=${Object.entries(summary.v3.statusCounts).map(([status, count]) => `${status}:${count}`).join(', ')}\n`,
  );
  process.stdout.write(
    `V3 totals failures=${summary.v3.failureCount} warnings=${summary.v3.warningCount}\n`,
  );

  if (Object.keys(summary.v3.failureCategories).length > 0) {
    process.stdout.write(
      `V3 failureCategories=${Object.entries(summary.v3.failureCategories).map(([code, count]) => `${code}:${count}`).join(', ')}\n`,
    );
  }

  if (Object.keys(summary.v3.warningCategories).length > 0) {
    process.stdout.write(
      `V3 warningCategories=${Object.entries(summary.v3.warningCategories).map(([code, count]) => `${code}:${count}`).join(', ')}\n`,
    );
  }

  process.stdout.write(
    `V3 validationStates=${Object.entries(summary.validationStates).map(([state, count]) => `${state}:${count}`).join(', ')}\n`,
  );
}

function printRelationSummary(summary) {
  process.stdout.write(
    `RELATIONS status=${summary.relationStatus} total=${summary.relations.counts.total} failures=${summary.relations.counts.failures} warnings=${summary.relations.counts.warnings} source=${summary.relations.source} strict=${summary.relations.strictMode ? 'yes' : 'no'} fallback=${summary.relations.fallbackUsed ? 'yes' : 'no'}\n`,
  );

  if (Object.keys(summary.relations.failureCategories).length > 0) {
    process.stdout.write(
      `RELATIONS failureCategories=${Object.entries(summary.relations.failureCategories).map(([code, count]) => `${code}:${count}`).join(', ')}\n`,
    );
  }

  if (Object.keys(summary.relations.warningCategories).length > 0) {
    process.stdout.write(
      `RELATIONS warningCategories=${Object.entries(summary.relations.warningCategories).map(([code, count]) => `${code}:${count}`).join(', ')}\n`,
    );
  }
}

function printLawSummary(summary) {
  process.stdout.write(
    `LAWS status=${summary.lawStatus} total=${summary.laws.counts.total} failures=${summary.laws.counts.failures} warnings=${summary.laws.counts.warnings} source=${summary.laws.source} strict=${summary.laws.strictMode ? 'yes' : 'no'} fallback=${summary.laws.fallbackUsed ? 'yes' : 'no'}\n`,
  );

  if (Object.keys(summary.laws.failureCategories).length > 0) {
    process.stdout.write(
      `LAWS failureCategories=${Object.entries(summary.laws.failureCategories).map(([code, count]) => `${code}:${count}`).join(', ')}\n`,
    );
  }

  if (Object.keys(summary.laws.warningCategories).length > 0) {
    process.stdout.write(
      `LAWS warningCategories=${Object.entries(summary.laws.warningCategories).map(([code, count]) => `${code}:${count}`).join(', ')}\n`,
    );
  }
}

function printEnforcementSummary(summary) {
  process.stdout.write(
    `ENFORCEMENT status=${summary.enforcement.enforcementStatus} blocking=${summary.enforcement.blockingFailures.length} warnings=${summary.enforcement.nonBlockingWarnings.length}\n`,
  );
  process.stdout.write(
    `ENFORCEMENT statusCounts=${Object.entries(summary.enforcement.statusCounts).map(([status, count]) => `${status}:${count}`).join(', ')}\n`,
  );
  process.stdout.write(
    `ENFORCEMENT systemValidationStates=${Object.entries(summary.systemValidationStates).map(([state, count]) => `${state}:${count}`).join(', ')}\n`,
  );

  if (Object.keys(summary.enforcement.blockingFailureCategories).length > 0) {
    process.stdout.write(
      `ENFORCEMENT blockingCategories=${Object.entries(summary.enforcement.blockingFailureCategories).map(([code, count]) => `${code}:${count}`).join(', ')}\n`,
    );
  }

  if (Object.keys(summary.enforcement.nonBlockingWarningCategories).length > 0) {
    process.stdout.write(
      `ENFORCEMENT warningCategories=${Object.entries(summary.enforcement.nonBlockingWarningCategories).map(([code, count]) => `${code}:${count}`).join(', ')}\n`,
    );
  }

  if (summary.enforcement.activations.length > 0) {
    process.stdout.write(
      `ENFORCEMENT activations=${summary.enforcement.activations.map((entry) => `${entry.code}:${entry.status}`).join(', ')}\n`,
    );
  }
}

function printOverlapSummary(summary) {
  if (!summary.overlap?.applicable) {
    return;
  }

  process.stdout.write(
    `OVERLAP targetSet=${summary.overlap.targetSet} liveConcepts=${summary.overlap.liveConceptIds.join(', ')} passing=${summary.overlap.passingConcepts} failing=${summary.overlap.failingConcepts}\n`,
  );
  process.stdout.write(
    `OVERLAP statusCounts=${Object.entries(summary.overlap.statusCounts).map(([status, count]) => `${status}:${count}`).join(', ')}\n`,
  );

  if (Object.keys(summary.overlap.failureCategories).length > 0) {
    process.stdout.write(
      `OVERLAP failureCategories=${Object.entries(summary.overlap.failureCategories).map(([code, count]) => `${code}:${count}`).join(', ')}\n`,
    );
  }
}

function printEditDisciplineSummary(editDisciplineReport) {
  process.stdout.write(
    `EDIT_DISCIPLINE mode=${editDisciplineReport.mode} baseRef=${editDisciplineReport.baseRef} warnings=${editDisciplineReport.warningCount}\n`,
  );

  editDisciplineReport.warnings.forEach((warning) => {
    process.stdout.write(
      `  ~ ${warning.conceptId}: ${warning.code}${warning.detail ? ` (${warning.detail})` : ''}\n`,
    );
  });
}

function printAuditSummary(summary) {
  process.stdout.write(
    `AUDIT totalRecords=${summary.audit.totalRecords} conceptsWithAudit=${summary.audit.conceptsWithAudit}\n`,
  );

  if (summary.audit.recentChanges.length > 0) {
    process.stdout.write(
      `AUDIT recentChanges=${summary.audit.recentChanges.map((entry) => `${entry.concept}@v${entry.version}:${entry.changeType}:${entry.approvedBy}:${entry.approvedAt}`).join(', ')}\n`,
    );
  }

  if (Object.keys(summary.audit.validatorFailureTrends).length > 0) {
    process.stdout.write(
      `AUDIT failureTrends=${Object.entries(summary.audit.validatorFailureTrends).map(([key, count]) => `${key}:${count}`).join(', ')}\n`,
    );
  }

  if (Object.keys(summary.audit.approvalHistory).length > 0) {
    process.stdout.write(
      `AUDIT approvalHistory=${Object.entries(summary.audit.approvalHistory).map(([actor, count]) => `${actor}:${count}`).join(', ')}\n`,
    );
  }
}

function main() {
  const previousArtifact = loadPreviousArtifact();
  const concepts = loadConceptPackets();
  const goldenConceptPackets = loadGoldenConceptPackets();
  const goldenConceptReports = [...goldenConceptPackets.values()].map(validateConcept);
  const goldenBaselines = buildGoldenBaselines(goldenConceptReports);
  const conceptReports = concepts.map((concept) => {
    const report = validateConcept(concept);
    attachGoldenAlignment(report, concept, goldenConceptPackets, goldenBaselines);
    return report;
  });
  const governanceLawReport = validateGovernanceLaws({ concepts });
  attachGovernanceLawResults(conceptReports, governanceLawReport);
  const overlapSummary = attachOverlapValidationResults(conceptReports, concepts);
  const summary = {
    totalConcepts: conceptReports.length,
    goldenConceptCount: GOLDEN_CONCEPT_IDS.length,
    nonGoldenConceptCount: Math.max(conceptReports.length - GOLDEN_CONCEPT_IDS.length, 0),
    passingConcepts: conceptReports.filter((report) => report.passed).length,
    failingConcepts: conceptReports.filter((report) => !report.passed).length,
    exposedRegisterCounts: collectExposedRegisterCounts(conceptReports),
    failureCategories: collectFailureCategories(conceptReports, governanceLawReport),
    warningCategories: collectWarningCategories(conceptReports, governanceLawReport),
  };
  summary.overlap = overlapSummary;
  summary.semantic = buildSemanticSummary(conceptReports);
  summary.v3 = buildV3Summary(conceptReports);
  summary.relations = buildRelationSummary(governanceLawReport);
  summary.laws = buildLawSummary(governanceLawReport);
  summary.enforcement = buildEnforcementSummary(conceptReports, governanceLawReport);
  summary.relationStatus = summary.relations.relationStatus;
  summary.lawStatus = summary.laws.lawStatus;
  summary.validationStates = buildValidationStateSummary(conceptReports);
  summary.systemValidationStates = buildSystemValidationStateSummary(conceptReports);
  summary.telemetry = buildTelemetry(summary, conceptReports);
  summary.trendIndicators = buildTrendIndicators(summary, previousArtifact);
  summary.audit = buildAuditSummary(concepts);
  const editDiscipline = evaluateEditDiscipline();
  const artifactReport = {
    summary,
    editDiscipline,
    relations: {
      passed: governanceLawReport.relationReport.passed,
      applicable: governanceLawReport.relationReport.applicable,
      relationStatus: summary.relationStatus,
      source: governanceLawReport.relationReport.source,
      relationDataPresent: governanceLawReport.relationReport.relationDataPresent,
      dataSource: governanceLawReport.relationReport.dataSource,
      strictMode: Boolean(governanceLawReport.relationReport.strictMode),
      fallbackUsed: Boolean(governanceLawReport.relationReport.fallbackUsed),
      counts: {
        total: governanceLawReport.relationReport.relationCount,
        failures: governanceLawReport.relationReport.failureCount,
        warnings: governanceLawReport.relationReport.warningCount,
      },
      failures: governanceLawReport.relationReport.failures,
      warnings: governanceLawReport.relationReport.warnings,
      packetResults: governanceLawReport.relationReport.packetResults,
      results: governanceLawReport.relationReport.relations,
    },
    laws: {
      passed: governanceLawReport.passed,
      applicable: governanceLawReport.applicable,
      lawStatus: summary.lawStatus,
      source: governanceLawReport.source,
      relationDataPresent: governanceLawReport.relationDataPresent,
      dataSource: governanceLawReport.dataSource,
      strictMode: Boolean(governanceLawReport.strictMode),
      fallbackUsed: Boolean(governanceLawReport.fallbackUsed),
      counts: {
        total: governanceLawReport.lawChecks.length,
        failures: governanceLawReport.lawFailures.length,
        warnings: governanceLawReport.lawWarnings.length,
      },
      failures: governanceLawReport.lawFailures,
      warnings: governanceLawReport.lawWarnings,
      results: governanceLawReport.lawChecks,
    },
    enforcement: summary.enforcement,
    overlap: overlapSummary,
    concepts: conceptReports,
  };

  conceptReports.forEach(printConceptSummary);
  printV3Summary(summary);
  printRelationSummary(summary);
  printLawSummary(summary);
  printEnforcementSummary(summary);
  printOverlapSummary(summary);
  printSemanticSummary(summary);
  printTelemetrySummary(summary);
  printAuditSummary(summary);
  printEditDisciplineSummary(editDiscipline);
  process.stdout.write(`SUMMARY ${JSON.stringify(summary)}\n`);

  writeArtifact(artifactReport);
  appendHistoryEntry(summary);
  process.stdout.write(`Artifact written to ${path.relative(process.cwd(), artifactPath)}\n`);
  process.stdout.write(`History appended to ${path.relative(process.cwd(), artifactHistoryPath)}\n`);

  if (summary.failingConcepts > 0) {
    process.exitCode = 1;
  }

  if (!editDiscipline.passed) {
    process.exitCode = 1;
  }
}

main();

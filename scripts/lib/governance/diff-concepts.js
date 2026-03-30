'use strict';

const { normalizeText } = require('../register-validation/normalize');
const { REGISTER_NAMES, ZONE_NAMES } = require('../register-validation/validate-structure');

const CHANGE_TYPES = Object.freeze({
  REGISTER: 'register-change',
  SEMANTIC_PROFILE: 'semantic-profile-change',
  CANONICAL: 'canonical-change',
  STRUCTURAL: 'structural-change',
});

const RISK_LEVELS = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
});

const CHANGE_TYPE_PRIORITY = Object.freeze([
  CHANGE_TYPES.CANONICAL,
  CHANGE_TYPES.SEMANTIC_PROFILE,
  CHANGE_TYPES.STRUCTURAL,
  CHANGE_TYPES.REGISTER,
]);

const CHANGE_TYPE_RISK = Object.freeze({
  [CHANGE_TYPES.REGISTER]: RISK_LEVELS.LOW,
  [CHANGE_TYPES.SEMANTIC_PROFILE]: RISK_LEVELS.MEDIUM,
  [CHANGE_TYPES.CANONICAL]: RISK_LEVELS.HIGH,
  [CHANGE_TYPES.STRUCTURAL]: RISK_LEVELS.MEDIUM,
});

const CONCEPT_TEXT_FIELDS = new Set(ZONE_NAMES);
const EXCLUDED_STRUCTURAL_FIELDS = new Set(['registers', 'canonical', ...ZONE_NAMES]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeComparableValue(value) {
  if (typeof value === 'string') {
    return normalizeText(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeComparableValue(entry));
  }

  if (isPlainObject(value)) {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = normalizeComparableValue(value[key]);
        return result;
      }, {});
  }

  return value;
}

function valuesEquivalent(leftValue, rightValue) {
  return JSON.stringify(normalizeComparableValue(leftValue))
    === JSON.stringify(normalizeComparableValue(rightValue));
}

function collectChangedPaths(previousValue, nextValue, basePath) {
  if (valuesEquivalent(previousValue, nextValue)) {
    return [];
  }

  if (Array.isArray(previousValue) || Array.isArray(nextValue)) {
    return [basePath];
  }

  if (isPlainObject(previousValue) && isPlainObject(nextValue)) {
    const keys = new Set([
      ...Object.keys(previousValue),
      ...Object.keys(nextValue),
    ]);

    const childPaths = [...keys]
      .sort()
      .flatMap((key) => collectChangedPaths(
        previousValue[key],
        nextValue[key],
        `${basePath}.${key}`,
      ));

    return childPaths.length > 0 ? childPaths : [basePath];
  }

  return [basePath];
}

function diffRegisterAreas(previousConcept, nextConcept) {
  const changedAreas = [];

  REGISTER_NAMES.forEach((registerName) => {
    ZONE_NAMES.forEach((zoneName) => {
      const previousText = previousConcept?.registers?.[registerName]?.[zoneName] ?? '';
      const nextText = nextConcept?.registers?.[registerName]?.[zoneName] ?? '';

      if (!valuesEquivalent(previousText, nextText)) {
        changedAreas.push(`registers.${registerName}.${zoneName}`);
      }
    });
  });

  return changedAreas;
}

function diffCanonicalAreas(previousConcept, nextConcept) {
  return collectChangedPaths(previousConcept?.canonical ?? null, nextConcept?.canonical ?? null, 'canonical');
}

function extractStructuralFields(concept) {
  if (!isPlainObject(concept)) {
    return {};
  }

  return Object.keys(concept)
    .sort()
    .reduce((result, key) => {
      if (EXCLUDED_STRUCTURAL_FIELDS.has(key) || CONCEPT_TEXT_FIELDS.has(key)) {
        return result;
      }

      result[key] = concept[key];
      return result;
    }, {});
}

function diffStructuralAreas(previousConcept, nextConcept) {
  return collectChangedPaths(
    extractStructuralFields(previousConcept),
    extractStructuralFields(nextConcept),
    'structural',
  );
}

function diffSemanticProfileAreas(previousProfile, nextProfile) {
  return collectChangedPaths(previousProfile ?? null, nextProfile ?? null, 'semanticProfile');
}

function unique(values) {
  return [...new Set(values)];
}

function deriveChangeTypes(changedAreasByType) {
  return CHANGE_TYPE_PRIORITY.filter((changeType) => changedAreasByType[changeType].length > 0);
}

function derivePrimaryChangeType(changeTypes) {
  return changeTypes[0] ?? null;
}

function deriveRiskLevel(changeType) {
  if (!changeType) {
    return RISK_LEVELS.LOW;
  }

  return CHANGE_TYPE_RISK[changeType] ?? RISK_LEVELS.MEDIUM;
}

function resolveConceptName(previousConcept, nextConcept, previousProfile, nextProfile) {
  return nextConcept?.conceptId
    ?? nextConcept?.concept
    ?? previousConcept?.conceptId
    ?? previousConcept?.concept
    ?? nextProfile?.concept
    ?? previousProfile?.concept
    ?? null;
}

function diffConcepts(previousConcept, nextConcept, options = {}) {
  const previousSemanticProfile = options.previousSemanticProfile ?? null;
  const nextSemanticProfile = options.nextSemanticProfile ?? null;
  const conceptName = resolveConceptName(
    previousConcept,
    nextConcept,
    previousSemanticProfile,
    nextSemanticProfile,
  );

  const changedAreasByType = {
    [CHANGE_TYPES.REGISTER]: diffRegisterAreas(previousConcept, nextConcept),
    [CHANGE_TYPES.SEMANTIC_PROFILE]: diffSemanticProfileAreas(
      previousSemanticProfile,
      nextSemanticProfile,
    ),
    [CHANGE_TYPES.CANONICAL]: diffCanonicalAreas(previousConcept, nextConcept),
    [CHANGE_TYPES.STRUCTURAL]: diffStructuralAreas(previousConcept, nextConcept),
  };

  const changeTypes = deriveChangeTypes(changedAreasByType);
  const changeType = derivePrimaryChangeType(changeTypes);

  return {
    concept: conceptName,
    fromVersion: previousConcept?.version ?? null,
    toVersion: nextConcept?.version ?? null,
    hasChanges: changeTypes.length > 0,
    changeType,
    changeTypes,
    changedAreas: unique(
      CHANGE_TYPE_PRIORITY.flatMap((type) => changedAreasByType[type]),
    ),
    changedAreasByType,
    riskLevel: deriveRiskLevel(changeType),
  };
}

function formatDiffReport(report) {
  const lines = [];
  const conceptLabel = report.concept ?? 'unknown-concept';
  const versionLabel = `${report.fromVersion ?? 'unknown'} -> ${report.toVersion ?? 'unknown'}`;

  lines.push(`[${conceptLabel}] ${versionLabel}`);
  lines.push(`  risk: ${report.riskLevel}`);
  lines.push(`  primary change: ${report.changeType ?? 'none'}`);

  if (!report.hasChanges) {
    lines.push('  changed areas: none');
    return lines.join('\n');
  }

  CHANGE_TYPE_PRIORITY.forEach((changeType) => {
    const areas = report.changedAreasByType[changeType];

    if (!areas || areas.length === 0) {
      return;
    }

    lines.push(`  ${changeType}`);
    areas.forEach((area) => {
      lines.push(`    - ${area}`);
    });
  });

  return lines.join('\n');
}

module.exports = {
  CHANGE_TYPES,
  RISK_LEVELS,
  diffConcepts,
  formatDiffReport,
};

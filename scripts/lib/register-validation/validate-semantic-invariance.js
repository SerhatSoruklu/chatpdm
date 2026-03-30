'use strict';

const { loadSemanticProfile, semanticProfileExists } = require('./load-semantic-profile');
const { normalizeText } = require('./normalize');
const { REASON_CODES } = require('./reason-codes');
const { REGISTER_NAMES, ZONE_NAMES } = require('./validate-structure');

const NEGATION_MARKERS = Object.freeze([
  'not',
  'rather',
  'without',
  'distinct',
  'except',
]);
const NEGATION_PHRASES = Object.freeze([
  'rather than',
  'distinct from',
  'not reducible to',
  'not about',
  'not any',
  'not mere',
]);
const BORDERLINE_MATCH_TOKEN_COUNT = 2;

function uniqueStrings(values) {
  return [...new Set(values)];
}

function createZoneSemanticResult() {
  return {
    passed: true,
    errors: [],
    warnings: [],
    matchedAnchors: {
      requiredAnchors: [],
      requiredBoundaries: [],
      optionalWarnings: [],
    },
    missingAnchors: {
      requiredAnchors: [],
      requiredBoundaries: [],
    },
    forbiddenMatches: [],
  };
}

function createRegisterSemanticResult() {
  return {
    present: true,
    passed: true,
    errors: [],
    warnings: [],
  };
}

function pushUniqueCode(target, code) {
  if (!target.includes(code)) {
    target.push(code);
  }
}

function normalizeWords(text) {
  const normalized = normalizeText(text);
  return normalized ? normalized.split(' ') : [];
}

function groupEntries(profile, sectionName, zoneName) {
  const section = profile?.[sectionName] || {};

  return [
    ...(Array.isArray(section.allZones) ? section.allZones : []),
    ...(Array.isArray(section[zoneName]) ? section[zoneName] : []),
  ];
}

function findMatchingPhrases(text, matchAny) {
  const normalizedText = normalizeText(text);

  return uniqueStrings(
    matchAny.filter((phrase) => normalizedText.includes(normalizeText(phrase))),
  );
}

function countPhraseTokens(phrase) {
  return normalizeWords(phrase).length;
}

function groupMatchRecord(group, matchedPhrases, category) {
  return {
    id: group.id,
    category,
    matchedPhrases,
  };
}

function groupMissingRecord(group, category) {
  return {
    id: group.id,
    category,
  };
}

function findForbiddenOccurrences(text, group) {
  const words = normalizeWords(text);
  const matches = [];

  group.matchAny.forEach((phrase) => {
    const phraseWords = normalizeWords(phrase);

    if (phraseWords.length === 0 || phraseWords.length > words.length) {
      return;
    }

    for (let index = 0; index <= words.length - phraseWords.length; index += 1) {
      const candidate = words.slice(index, index + phraseWords.length);

      if (candidate.join(' ') !== phraseWords.join(' ')) {
        continue;
      }

      const windowStart = Math.max(0, index - 4);
      const precedingWords = words.slice(windowStart, index);
      const precedingPhrase = precedingWords.join(' ');
      const negated = precedingWords.some((word) => NEGATION_MARKERS.includes(word))
        || NEGATION_PHRASES.some((entry) => precedingPhrase.includes(entry));

      matches.push({
        id: group.id,
        phrase,
        negated,
      });
    }
  });

  return matches;
}

function applyRequiredGroups(zoneResult, text, groups, category, failureCode) {
  groups.forEach((group) => {
    const matchedPhrases = findMatchingPhrases(text, group.matchAny);

    if (matchedPhrases.length === 0) {
      pushUniqueCode(zoneResult.errors, failureCode);
      zoneResult.missingAnchors[category].push(groupMissingRecord(group, category));
      zoneResult.passed = false;
      return;
    }

    zoneResult.matchedAnchors[category].push(groupMatchRecord(group, matchedPhrases, category));

    if (matchedPhrases.some((phrase) => countPhraseTokens(phrase) <= BORDERLINE_MATCH_TOKEN_COUNT)) {
      pushUniqueCode(zoneResult.warnings, REASON_CODES.BORDERLINE_ANCHOR_COVERAGE);
    }
  });
}

function applyForbiddenDrift(zoneResult, text, groups) {
  groups.forEach((group) => {
    const occurrences = findForbiddenOccurrences(text, group);
    const positiveMatches = occurrences.filter((match) => !match.negated);

    if (positiveMatches.length === 0) {
      return;
    }

    pushUniqueCode(zoneResult.errors, REASON_CODES.FORBIDDEN_SEMANTIC_DRIFT);
    zoneResult.forbiddenMatches.push(
      ...positiveMatches.map((match) => ({
        id: match.id,
        phrase: match.phrase,
      })),
    );
    zoneResult.passed = false;
  });
}

function applyOptionalWarnings(zoneResult, text, groups) {
  if (groups.length === 0) {
    return;
  }

  let matchedGroupCount = 0;

  groups.forEach((group) => {
    const matchedPhrases = findMatchingPhrases(text, group.matchAny);

    if (matchedPhrases.length === 0) {
      return;
    }

    matchedGroupCount += 1;
    zoneResult.matchedAnchors.optionalWarnings.push(
      groupMatchRecord(group, matchedPhrases, 'optionalWarnings'),
    );
  });

  if (matchedGroupCount === 0) {
    pushUniqueCode(zoneResult.warnings, REASON_CODES.WEAK_ANCHOR_COVERAGE);
  }
}

function applyAnchorParity(registerName, zoneName, semanticReport) {
  if (registerName === 'standard') {
    return;
  }

  if (!semanticReport.registerResults.standard.present || !semanticReport.registerResults[registerName].present) {
    return;
  }

  const standardZone = semanticReport.zoneResults.standard[zoneName];
  const registerZone = semanticReport.zoneResults[registerName][zoneName];

  if (!standardZone || !registerZone) {
    return;
  }

  standardZone.matchedAnchors.requiredAnchors.forEach((standardMatch) => {
    const parityMatch = registerZone.matchedAnchors.requiredAnchors.some(
      (candidateMatch) => candidateMatch.id === standardMatch.id,
    );

    if (parityMatch) {
      return;
    }

    pushUniqueCode(registerZone.errors, REASON_CODES.ANCHOR_PARITY_FAILURE);
    registerZone.passed = false;
  });
}

function aggregateRegisterResult(registerName, semanticReport) {
  const registerResult = semanticReport.registerResults[registerName];

  if (!registerResult.present) {
    return;
  }

  ZONE_NAMES.forEach((zoneName) => {
    const zoneResult = semanticReport.zoneResults[registerName][zoneName];
    registerResult.errors.push(...zoneResult.errors);
    registerResult.warnings.push(...zoneResult.warnings);

    if (!zoneResult.passed) {
      registerResult.passed = false;
      semanticReport.passed = false;
    }
  });

  registerResult.errors = uniqueStrings(registerResult.errors);
  registerResult.warnings = uniqueStrings(registerResult.warnings);
}

function flattenZoneRecords(semanticReport, propertyName) {
  const flattened = {};

  REGISTER_NAMES.forEach((registerName) => {
    flattened[registerName] = {};

    ZONE_NAMES.forEach((zoneName) => {
      flattened[registerName][zoneName] = semanticReport.zoneResults[registerName][zoneName][propertyName];
    });
  });

  return flattened;
}

function flattenCodes(semanticReport, propertyName) {
  const records = [];

  REGISTER_NAMES.forEach((registerName) => {
    ZONE_NAMES.forEach((zoneName) => {
      semanticReport.zoneResults[registerName][zoneName][propertyName].forEach((code) => {
        records.push({
          register: registerName,
          zone: zoneName,
          code,
        });
      });
    });
  });

  return records;
}

function validateSemanticInvariance(conceptName, concept) {
  if (!semanticProfileExists(conceptName)) {
    return {
      conceptId: conceptName,
      profileFound: false,
      skipped: true,
      passed: true,
      registerResults: Object.fromEntries(
        REGISTER_NAMES.map((registerName) => [registerName, createRegisterSemanticResult()]),
      ),
      zoneResults: Object.fromEntries(
        REGISTER_NAMES.map((registerName) => [
          registerName,
          Object.fromEntries(ZONE_NAMES.map((zoneName) => [zoneName, createZoneSemanticResult()])),
        ]),
      ),
      failures: [],
      warnings: [],
      matchedAnchors: {},
      missingAnchors: {},
      forbiddenMatches: {},
    };
  }

  const profile = loadSemanticProfile(conceptName);
  const semanticReport = {
    conceptId: conceptName,
    profileFound: true,
    skipped: false,
    passed: true,
    profile,
    registerResults: Object.fromEntries(
      REGISTER_NAMES.map((registerName) => [registerName, createRegisterSemanticResult()]),
    ),
    zoneResults: Object.fromEntries(
      REGISTER_NAMES.map((registerName) => [
        registerName,
        Object.fromEntries(ZONE_NAMES.map((zoneName) => [zoneName, createZoneSemanticResult()])),
      ]),
    ),
    failures: [],
    warnings: [],
    matchedAnchors: {},
    missingAnchors: {},
    forbiddenMatches: {},
  };

  REGISTER_NAMES.forEach((registerName) => {
    const registerRecord = concept?.registers?.[registerName];

    if (!registerRecord || typeof registerRecord !== 'object' || Array.isArray(registerRecord)) {
      semanticReport.registerResults[registerName].present = false;
      return;
    }

    ZONE_NAMES.forEach((zoneName) => {
      const zoneText = registerRecord[zoneName] ?? '';
      const zoneResult = semanticReport.zoneResults[registerName][zoneName];

      applyRequiredGroups(
        zoneResult,
        zoneText,
        groupEntries(profile, 'requiredAnchors', zoneName),
        'requiredAnchors',
        REASON_CODES.MISSING_REQUIRED_ANCHOR,
      );
      applyRequiredGroups(
        zoneResult,
        zoneText,
        groupEntries(profile, 'requiredBoundaries', zoneName),
        'requiredBoundaries',
        REASON_CODES.MISSING_REQUIRED_BOUNDARY,
      );
      applyForbiddenDrift(zoneResult, zoneText, groupEntries(profile, 'forbiddenDrift', zoneName));
      applyOptionalWarnings(zoneResult, zoneText, groupEntries(profile, 'optionalWarnings', zoneName));
    });
  });

  ['simplified', 'formal'].forEach((registerName) => {
    ZONE_NAMES.forEach((zoneName) => {
      applyAnchorParity(registerName, zoneName, semanticReport);
    });
  });

  REGISTER_NAMES.forEach((registerName) => {
    aggregateRegisterResult(registerName, semanticReport);
  });

  semanticReport.failures = flattenCodes(semanticReport, 'errors');
  semanticReport.warnings = flattenCodes(semanticReport, 'warnings');
  semanticReport.matchedAnchors = flattenZoneRecords(semanticReport, 'matchedAnchors');
  semanticReport.missingAnchors = flattenZoneRecords(semanticReport, 'missingAnchors');
  semanticReport.forbiddenMatches = flattenZoneRecords(semanticReport, 'forbiddenMatches');

  return semanticReport;
}

module.exports = {
  validateSemanticInvariance,
};

'use strict';

const { normalizeText } = require('./normalize');
const { REASON_CODES } = require('./reason-codes');
const { collectTextStats } = require('./text-stats');

const SIMPLIFIED_MAX_SENTENCE_LENGTH = 24;
const SIMPLIFIED_MAX_AVERAGE_SENTENCE_LENGTH = 16;
const FORMAL_MIN_AVERAGE_SENTENCE_LENGTH = 15;

const STANDARD_SHORT_DEFINITION_BAND = Object.freeze({
  minWords: 8,
  maxWords: 28,
});

const STANDARD_AVERAGE_SENTENCE_BANDS = Object.freeze({
  coreMeaning: {
    min: 12,
    max: 22,
  },
  fullDefinition: {
    min: 12,
    max: 24,
  },
});

const SIMPLIFIED_BANNED_TERMS = Object.freeze([
  'internal composition',
  'structured right',
  'directive claim',
  'mere capacity',
  'directive obligation',
  'operative capacity',
  'institutionally operative',
]);

const FORMAL_SCOPE_TERMS = Object.freeze([
  'within the governance domain',
  'within this domain',
  'within the relevant system',
  'within a system',
  'is defined as',
  'is defined',
  'for the purposes of this concept',
  'within a governance order',
]);

const FORMAL_BOUNDARY_TERMS = Object.freeze([
  'rather than',
  'does not',
  'does not by itself',
  'is distinct from',
  'not identical to',
  'not reducible to',
  'whereas',
  'without thereby',
]);

const FORMAL_CASUAL_SCAFFOLDING_PHRASES = Object.freeze([
  'in simple terms',
  'this means',
  'basically',
  'you can think of',
  'put simply',
]);

function pushUnique(target, code) {
  if (!target.includes(code)) {
    target.push(code);
  }
}

function uniqueStrings(values) {
  return [...new Set(values)];
}

function normalizedMatches(text, terms) {
  const normalizedText = normalizeText(text);

  return uniqueStrings(terms.filter((term) => normalizedText.includes(normalizeText(term))));
}

function getPairZoneErrors(comparisonReport, leftRegister, rightRegister, zoneName) {
  const pairKey = `${leftRegister}__${rightRegister}`;
  return comparisonReport?.pairs?.[pairKey]?.zones?.[zoneName]?.errors ?? [];
}

function collectMetrics(text) {
  return collectTextStats(text);
}

function maybeWarnOnSentenceBoundary(zoneName, registerName, metrics, warnings) {
  if (registerName === 'simplified') {
    if (
      metrics.averageSentenceLength >= SIMPLIFIED_MAX_AVERAGE_SENTENCE_LENGTH - 1
      || metrics.maxSentenceLength >= SIMPLIFIED_MAX_SENTENCE_LENGTH - 2
    ) {
      pushUnique(warnings, REASON_CODES.BORDERLINE_SENTENCE_LENGTH);
    }

    return;
  }

  if (registerName === 'formal' && (zoneName === 'coreMeaning' || zoneName === 'fullDefinition')) {
    if (metrics.averageSentenceLength <= FORMAL_MIN_AVERAGE_SENTENCE_LENGTH + 1) {
      pushUnique(warnings, REASON_CODES.BORDERLINE_SENTENCE_LENGTH);
    }

    return;
  }

  if (registerName === 'standard') {
    if (zoneName === 'shortDefinition') {
      if (
        metrics.wordCount <= STANDARD_SHORT_DEFINITION_BAND.minWords + 2
        || metrics.wordCount >= STANDARD_SHORT_DEFINITION_BAND.maxWords - 2
      ) {
        pushUnique(warnings, REASON_CODES.BORDERLINE_SENTENCE_LENGTH);
      }

      return;
    }

    const band = STANDARD_AVERAGE_SENTENCE_BANDS[zoneName];

    if (
      metrics.averageSentenceLength <= band.min + 1
      || metrics.averageSentenceLength >= band.max - 1
    ) {
      pushUnique(warnings, REASON_CODES.BORDERLINE_SENTENCE_LENGTH);
    }
  }
}

function validateStandardZone(zoneName, metrics, comparisonReport, errors) {
  if (zoneName === 'shortDefinition') {
    if (metrics.wordCount < STANDARD_SHORT_DEFINITION_BAND.minWords) {
      pushUnique(errors, REASON_CODES.STANDARD_TOO_SIMPLE);
    }

    if (metrics.wordCount > STANDARD_SHORT_DEFINITION_BAND.maxWords) {
      pushUnique(errors, REASON_CODES.STANDARD_TOO_FORMAL);
    }
  } else {
    const band = STANDARD_AVERAGE_SENTENCE_BANDS[zoneName];

    if (metrics.averageSentenceLength < band.min) {
      pushUnique(errors, REASON_CODES.STANDARD_TOO_SIMPLE);
    }

    if (metrics.averageSentenceLength > band.max) {
      pushUnique(errors, REASON_CODES.STANDARD_TOO_FORMAL);
    }
  }

  const tooCloseToSimplified = getPairZoneErrors(
    comparisonReport,
    'standard',
    'simplified',
    zoneName,
  ).length > 0;
  const tooCloseToFormal = getPairZoneErrors(
    comparisonReport,
    'standard',
    'formal',
    zoneName,
  ).length > 0;

  if (tooCloseToSimplified && tooCloseToFormal) {
    pushUnique(errors, REASON_CODES.STANDARD_COLLAPSES_WITH_OTHER_REGISTERS);
  }
}

function validateSimplifiedZone(zoneName, text, metrics, comparisonReport, errors, matchedTerms) {
  if (
    metrics.averageSentenceLength > SIMPLIFIED_MAX_AVERAGE_SENTENCE_LENGTH
    || metrics.maxSentenceLength > SIMPLIFIED_MAX_SENTENCE_LENGTH
  ) {
    pushUnique(errors, REASON_CODES.SIMPLIFIED_TOO_LONG);
  }

  matchedTerms.banned = normalizedMatches(text, SIMPLIFIED_BANNED_TERMS);

  if (matchedTerms.banned.length > 0) {
    pushUnique(errors, REASON_CODES.SIMPLIFIED_BANNED_TERM);
  }

  if (getPairZoneErrors(comparisonReport, 'standard', 'simplified', zoneName).length > 0) {
    pushUnique(errors, REASON_CODES.SIMPLIFIED_TOO_CLOSE_TO_STANDARD);
  }
}

function validateFormalZone(zoneName, text, metrics, comparisonReport, errors, matchedTerms) {
  matchedTerms.casual = normalizedMatches(text, FORMAL_CASUAL_SCAFFOLDING_PHRASES);

  if (matchedTerms.casual.length > 0) {
    pushUnique(errors, REASON_CODES.FORMAL_TOO_CASUAL);
  }

  if (zoneName === 'coreMeaning' || zoneName === 'fullDefinition') {
    if (metrics.averageSentenceLength < FORMAL_MIN_AVERAGE_SENTENCE_LENGTH) {
      pushUnique(errors, REASON_CODES.FORMAL_TOO_SHORT);
    }

    matchedTerms.scope = normalizedMatches(text, FORMAL_SCOPE_TERMS);

    if (matchedTerms.scope.length === 0) {
      pushUnique(errors, REASON_CODES.FORMAL_MISSING_SCOPE_LANGUAGE);
    }
  }

  if (zoneName === 'fullDefinition') {
    matchedTerms.boundary = normalizedMatches(text, FORMAL_BOUNDARY_TERMS);

    if (matchedTerms.boundary.length === 0) {
      pushUnique(errors, REASON_CODES.FORMAL_MISSING_BOUNDARY_LANGUAGE);
    }
  }

  if (getPairZoneErrors(comparisonReport, 'standard', 'formal', zoneName).length > 0) {
    pushUnique(errors, REASON_CODES.FORMAL_TOO_CLOSE_TO_STANDARD);
  }
}

function validateZoneContract({ registerName, zoneName, text, comparisonReport }) {
  const errors = [];
  const warnings = [];
  const metrics = collectMetrics(text);
  const matchedTerms = {
    banned: [],
    scope: [],
    boundary: [],
    casual: [],
  };

  if (registerName === 'standard') {
    validateStandardZone(zoneName, metrics, comparisonReport, errors);
  }

  if (registerName === 'simplified') {
    validateSimplifiedZone(zoneName, text, metrics, comparisonReport, errors, matchedTerms);
  }

  if (registerName === 'formal') {
    validateFormalZone(zoneName, text, metrics, comparisonReport, errors, matchedTerms);
  }

  maybeWarnOnSentenceBoundary(zoneName, registerName, metrics, warnings);

  return {
    register: registerName,
    zone: zoneName,
    passed: errors.length === 0,
    errors,
    warnings,
    metrics,
    matchedTerms,
  };
}

module.exports = {
  FORMAL_BOUNDARY_TERMS,
  FORMAL_SCOPE_TERMS,
  SIMPLIFIED_BANNED_TERMS,
  validateZoneContract,
};

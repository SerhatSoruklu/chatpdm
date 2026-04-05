'use strict';

const gate = require('./derived-explanation-reading-lens-gate.json');
const { AUTHORED_REGISTER_FIELDS, AUTHORED_REGISTER_MODES } = require('./concept-loader');

const WORD_PATTERN = /[a-z0-9]+(?:'[a-z0-9]+)?/gi;

function pushReason(reasons, nextReason) {
  const alreadyPresent = reasons.some(
    (reason) => reason.code === nextReason.code && reason.field === nextReason.field && reason.detail === nextReason.detail,
  );

  if (!alreadyPresent) {
    reasons.push(nextReason);
  }
}

function normalizeForComparison(text) {
  let normalized = String(text ?? '');
  const comparisonRules = gate.divergenceValidation.normalizedComparison;

  if (comparisonRules.stripCase) {
    normalized = normalized.toLowerCase();
  }

  if (comparisonRules.stripPunctuation) {
    normalized = normalized.replace(/[^a-z0-9\s]/gi, '');
  }

  if (comparisonRules.stripWhitespace) {
    normalized = normalized.replace(/\s+/g, '');
  }

  return normalized.trim();
}

function stripKnownPrefixes(text) {
  let normalizedText = String(text ?? '').trim();
  let changed = false;
  let keepStripping = true;

  while (keepStripping) {
    keepStripping = false;

    gate.divergenceValidation.prefixOnlyPrefixes.forEach((prefix) => {
      if (normalizedText.toLowerCase().startsWith(prefix.toLowerCase())) {
        normalizedText = normalizedText.slice(prefix.length).trimStart();
        changed = true;
        keepStripping = true;
      }
    });
  }

  return {
    changed,
    text: normalizedText,
  };
}

function tokenize(text) {
  return (String(text ?? '').match(WORD_PATTERN) || []).map((token) => token.toLowerCase());
}

function splitSentences(text) {
  return String(text ?? '')
    .split(/\n+/)
    .flatMap((chunk) => chunk.split(/[.!?]+/))
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function averageSentenceLength(modeRecord) {
  const sentences = AUTHORED_REGISTER_FIELDS.flatMap((fieldName) => splitSentences(modeRecord[fieldName]));

  if (sentences.length === 0) {
    return 0;
  }

  const totalWords = sentences.reduce(
    (count, sentence) => count + tokenize(sentence).length,
    0,
  );

  return totalWords / sentences.length;
}

function validateRequiredFields(modeRecord, modeName, reasons) {
  AUTHORED_REGISTER_FIELDS.forEach((fieldName) => {
    if (typeof modeRecord?.[fieldName] !== 'string' || modeRecord[fieldName].trim() === '') {
      pushReason(reasons, {
        code: 'MISSING_REQUIRED_FIELD',
        field: fieldName,
        detail: `${modeName}.${fieldName}`,
      });
    }
  });
}

function validateSentenceBand(modeRecord, modeName, reasons) {
  const sentenceBand = gate.divergenceValidation.modeRules[modeName].sentenceLengthBand;
  const averageWords = averageSentenceLength(modeRecord);

  if (averageWords < sentenceBand.min || averageWords > sentenceBand.max) {
    pushReason(reasons, {
      code: 'SENTENCE_LENGTH_BAND_VIOLATION',
      detail: `${modeName} average=${averageWords.toFixed(1)} expected=${sentenceBand.min}-${sentenceBand.max}`,
    });
  }
}

function validateBannedPhrases(modeRecord, modeName, reasons) {
  const bannedPhrases = gate.divergenceValidation.modeRules[modeName].bannedPhrases || [];

  AUTHORED_REGISTER_FIELDS.forEach((fieldName) => {
    const loweredField = String(modeRecord[fieldName] ?? '').toLowerCase();

    bannedPhrases.forEach((phrase) => {
      if (loweredField.includes(phrase.toLowerCase())) {
        pushReason(reasons, {
          code: 'BANNED_PHRASING',
          field: fieldName,
          detail: phrase,
        });
      }
    });
  });
}

function validateAgainstStandard(modeRecord, standardModeRecord, modeName, reasons) {
  AUTHORED_REGISTER_FIELDS.forEach((fieldName) => {
    const candidateField = modeRecord[fieldName];
    const standardField = standardModeRecord[fieldName];

    if (candidateField === standardField) {
      pushReason(reasons, {
        code: 'EXACT_EQUALITY',
        field: fieldName,
      });
    }

    if (normalizeForComparison(candidateField) === normalizeForComparison(standardField)) {
      pushReason(reasons, {
        code: 'NORMALIZED_EQUALITY',
        field: fieldName,
      });
    }

    const strippedCandidate = stripKnownPrefixes(candidateField);
    const strippedStandard = stripKnownPrefixes(standardField);

    if (
      strippedCandidate.changed
      && normalizeForComparison(strippedCandidate.text) === normalizeForComparison(strippedStandard.text)
    ) {
      pushReason(reasons, {
        code: 'PREFIX_ONLY_MUTATION',
        field: fieldName,
      });
    }
  });
}

function validateMode(modeRecord, standardModeRecord, modeName) {
  const reasons = [];

  validateRequiredFields(modeRecord, modeName, reasons);

  if (reasons.length === 0) {
    validateSentenceBand(modeRecord, modeName, reasons);
    validateBannedPhrases(modeRecord, modeName, reasons);

    if (modeName !== 'standard') {
      validateAgainstStandard(modeRecord, standardModeRecord, modeName, reasons);
    }
  }

  return {
    status: reasons.length === 0 ? 'available' : 'rejected',
    reasons,
  };
}

function validateRegisterDivergenceForConcept(concept) {
  const standardModeRecord = concept.registers.standard;
  const modes = {};

  AUTHORED_REGISTER_MODES.forEach((modeName) => {
    modes[modeName] = validateMode(concept.registers[modeName], standardModeRecord, modeName);
  });

  const availableModes = AUTHORED_REGISTER_MODES.filter(
    (modeName) => modes[modeName].status === 'available',
  );

  return {
    availableModes,
    modes,
  };
}

module.exports = {
  validateRegisterDivergenceForConcept,
};

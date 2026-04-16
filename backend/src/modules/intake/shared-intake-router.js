'use strict';

const { resolveConceptQuery } = require('../concepts');
const { resolveRiskMapQuery } = require('../risk-mapping/resolve/resolveRiskMapQuery');
const { validateRiskMapQueryContract } = require('../risk-mapping/contracts/riskMapQueryContract');

const STRUCTURED_RMG_FIELD_NAMES = Object.freeze({
  entity: 'entity',
  timehorizon: 'timeHorizon',
  scenariotype: 'scenarioType',
  domain: 'domain',
  scope: 'scope',
  evidencesetversion: 'evidenceSetVersion',
  querytext: 'queryText',
});

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function buildInvalidInputError(message) {
  return new TypeError(message);
}

function normalizeStructuredFieldName(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

function findStructuredFieldSeparatorIndex(token) {
  const colonIndex = token.indexOf(':');
  const equalsIndex = token.indexOf('=');

  if (colonIndex === -1) {
    return equalsIndex;
  }

  if (equalsIndex === -1) {
    return colonIndex;
  }

  return Math.min(colonIndex, equalsIndex);
}

function splitStructuredTokens(text) {
  return text
    .split(/[;\n]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function parseStructuredRiskMapText(rawText) {
  const trimmedText = rawText.trim();

  if (trimmedText === '') {
    return {
      kind: 'not_applicable',
    };
  }

  const tokens = splitStructuredTokens(trimmedText);

  if (tokens.length === 0) {
    return {
      kind: 'not_applicable',
    };
  }

  const parsedTokens = tokens.map((token) => {
    const separatorIndex = findStructuredFieldSeparatorIndex(token);

    if (separatorIndex === -1) {
      return {
        hasAssignment: false,
        fieldName: null,
        rawFieldName: null,
        rawFieldValue: null,
      };
    }

    const rawFieldName = token.slice(0, separatorIndex).trim();
    const rawFieldValue = token.slice(separatorIndex + 1).trim();
    const normalizedFieldName = normalizeStructuredFieldName(rawFieldName);
    const fieldName = STRUCTURED_RMG_FIELD_NAMES[normalizedFieldName] ?? null;

    return {
      hasAssignment: true,
      fieldName,
      rawFieldName,
      rawFieldValue,
    };
  });

  const hasRecognizedStructuredField = parsedTokens.some((token) => token.fieldName !== null);

  if (!hasRecognizedStructuredField) {
    return {
      kind: 'not_applicable',
    };
  }

  const parsedFields = {};

  for (const parsedToken of parsedTokens) {
    if (!parsedToken.hasAssignment) {
      return {
        kind: 'unsupported',
        message: 'Structured RiskMapQuery text must use only explicit key/value field assignments.',
      };
    }

    if (!parsedToken.fieldName) {
      return {
        kind: 'unsupported',
        message: `Structured RiskMapQuery text contains unsupported field "${parsedToken.rawFieldName}".`,
      };
    }

    if (Object.prototype.hasOwnProperty.call(parsedFields, parsedToken.fieldName)) {
      return {
        kind: 'unsupported',
        message: `Structured RiskMapQuery text repeats field "${parsedToken.rawFieldName}".`,
      };
    }

    parsedFields[parsedToken.fieldName] = parsedToken.rawFieldValue;
  }

  const candidateQuery = {
    entity: parsedFields.entity,
    timeHorizon: parsedFields.timeHorizon,
    scenarioType: parsedFields.scenarioType,
    domain: parsedFields.domain,
    evidenceSetVersion: parsedFields.evidenceSetVersion,
    scope: typeof parsedFields.scope === 'string'
      ? parsedFields.scope
          .split(',')
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0)
      : parsedFields.scope,
  };

  if (typeof parsedFields.queryText === 'string' && parsedFields.queryText.length > 0) {
    candidateQuery.queryText = parsedFields.queryText;
  }

  const validation = validateRiskMapQueryContract(candidateQuery);

  if (!validation.valid) {
    return {
      kind: 'unsupported',
      message: `Structured RiskMapQuery text is incomplete or invalid: ${validation.errors.join(' | ')}`,
    };
  }

  return {
    kind: 'parsed',
    query: candidateQuery,
  };
}

function classifySharedIntakeInput(input) {
  if (typeof input === 'string') {
    if (input.length === 0) {
      throw buildInvalidInputError(
        'Shared intake input must be a non-empty string or a structured RiskMapQuery object.',
      );
    }

    const structuredRiskMapText = parseStructuredRiskMapText(input);

    if (structuredRiskMapText.kind === 'parsed') {
      return Object.freeze({
        selectedSurface: 'risk-mapping',
        inputType: 'structured_text',
        structuredQuery: structuredRiskMapText.query,
      });
    }

    if (structuredRiskMapText.kind === 'unsupported') {
      throw buildInvalidInputError(structuredRiskMapText.message);
    }

    return Object.freeze({
      selectedSurface: 'concepts',
      inputType: 'raw_text',
    });
  }

  if (!isPlainObject(input)) {
    throw buildInvalidInputError(
      'Shared intake input must be a non-empty string or a structured RiskMapQuery object.',
    );
  }

  const validation = validateRiskMapQueryContract(input);

  if (!validation.valid) {
    throw buildInvalidInputError(
      `Shared intake structured input must satisfy the RiskMapQuery contract: ${validation.errors.join(' | ')}`,
    );
  }

  return Object.freeze({
    selectedSurface: 'risk-mapping',
    inputType: 'structured_query',
  });
}

function resolveSharedIntakeQuery(input) {
  const classification = classifySharedIntakeInput(input);
  const output = classification.selectedSurface === 'concepts'
    ? resolveConceptQuery(input)
    : resolveRiskMapQuery(classification.structuredQuery ?? input);

  return Object.freeze({
    ...classification,
    output,
  });
}

module.exports = Object.freeze({
  classifySharedIntakeInput,
  resolveSharedIntakeQuery,
});

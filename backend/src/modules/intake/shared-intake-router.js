'use strict';

const { resolveConceptQuery } = require('../concepts');
const { resolveRiskMapQuery } = require('../risk-mapping/resolve/resolveRiskMapQuery');
const { validateRiskMapQueryContract } = require('../risk-mapping/contracts/riskMapQueryContract');

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function buildInvalidInputError(message) {
  return new TypeError(message);
}

function classifySharedIntakeInput(input) {
  if (typeof input === 'string') {
    if (input.length === 0) {
      throw buildInvalidInputError(
        'Shared intake input must be a non-empty string or a structured RiskMapQuery object.',
      );
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
    : resolveRiskMapQuery(input);

  return Object.freeze({
    ...classification,
    output,
  });
}

module.exports = Object.freeze({
  classifySharedIntakeInput,
  resolveSharedIntakeQuery,
});

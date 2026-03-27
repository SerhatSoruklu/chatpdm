'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { EMPTY_NORMALIZED_QUERY } = require('./constants');
const { normalizeQuery } = require('./normalizer');

const resolveRulesPath = path.resolve(__dirname, '../../../../data/concepts/resolve-rules.json');

function assertNonEmptyString(value, fieldName, ruleName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${ruleName} has invalid ${fieldName}.`);
  }
}

function assertArray(value, fieldName, ruleName) {
  if (!Array.isArray(value)) {
    throw new Error(`${ruleName} has invalid ${fieldName}; expected an array.`);
  }
}

function assertNormalizedKey(normalizedQuery, ruleName) {
  assertNonEmptyString(normalizedQuery, 'normalizedQuery', ruleName);

  if (normalizedQuery === EMPTY_NORMALIZED_QUERY) {
    throw new Error(`${ruleName} cannot target ${EMPTY_NORMALIZED_QUERY}.`);
  }

  if (normalizeQuery(normalizedQuery) !== normalizedQuery) {
    throw new Error(`${ruleName} normalizedQuery must already be stored in normalized form.`);
  }
}

function validateDisambiguationRule(rule, index) {
  const ruleName = `authorDefinedDisambiguations[${index}]`;

  if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
    throw new Error(`${ruleName} must be an object.`);
  }

  assertNormalizedKey(rule.normalizedQuery, ruleName);
  assertArray(rule.candidateConceptIds, 'candidateConceptIds', ruleName);

  if (rule.candidateConceptIds.length < 2) {
    throw new Error(`${ruleName} must declare at least two candidate concept ids.`);
  }

  for (const conceptId of rule.candidateConceptIds) {
    assertNonEmptyString(conceptId, 'candidateConceptIds[]', ruleName);
  }
}

function validateSuggestionRule(rule, index) {
  const ruleName = `authorDefinedSuggestions[${index}]`;

  if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
    throw new Error(`${ruleName} must be an object.`);
  }

  assertNormalizedKey(rule.normalizedQuery, ruleName);
  assertArray(rule.suggestions, 'suggestions', ruleName);

  for (const suggestion of rule.suggestions) {
    if (!suggestion || typeof suggestion !== 'object' || Array.isArray(suggestion)) {
      throw new Error(`${ruleName}.suggestions[] must be an object.`);
    }

    assertNonEmptyString(suggestion.conceptId, 'suggestions[].conceptId', ruleName);
    assertNonEmptyString(suggestion.reason, 'suggestions[].reason', ruleName);
  }
}

function loadResolveRules() {
  const rawFile = fs.readFileSync(resolveRulesPath, 'utf8');
  const parsed = JSON.parse(rawFile);

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('resolve-rules.json must be a JSON object.');
  }

  const authorDefinedDisambiguations = parsed.authorDefinedDisambiguations || [];
  const authorDefinedSuggestions = parsed.authorDefinedSuggestions || [];

  assertArray(authorDefinedDisambiguations, 'authorDefinedDisambiguations', 'resolve-rules.json');
  assertArray(authorDefinedSuggestions, 'authorDefinedSuggestions', 'resolve-rules.json');

  authorDefinedDisambiguations.forEach(validateDisambiguationRule);
  authorDefinedSuggestions.forEach(validateSuggestionRule);

  return {
    authorDefinedDisambiguations,
    authorDefinedSuggestions,
  };
}

module.exports = {
  loadResolveRules,
};

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { SEED_CONCEPT_IDS } = require('./constants');

const conceptsDirectory = path.resolve(__dirname, '../../../../data/concepts');

function assertNonEmptyString(value, fieldName, conceptId) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Concept "${conceptId}" has invalid ${fieldName}.`);
  }
}

function assertArray(value, fieldName, conceptId) {
  if (!Array.isArray(value)) {
    throw new Error(`Concept "${conceptId}" has invalid ${fieldName}; expected an array.`);
  }
}

function validateConceptShape(concept, expectedConceptId) {
  if (!concept || typeof concept !== 'object' || Array.isArray(concept)) {
    throw new Error(`Concept "${expectedConceptId}" must be a JSON object.`);
  }

  assertNonEmptyString(concept.conceptId, 'conceptId', expectedConceptId);
  if (concept.conceptId !== expectedConceptId) {
    throw new Error(`Concept file "${expectedConceptId}" does not match conceptId "${concept.conceptId}".`);
  }

  assertNonEmptyString(concept.title, 'title', expectedConceptId);
  assertNonEmptyString(concept.domain, 'domain', expectedConceptId);
  assertNonEmptyString(concept.shortDefinition, 'shortDefinition', expectedConceptId);
  assertNonEmptyString(concept.coreMeaning, 'coreMeaning', expectedConceptId);
  assertNonEmptyString(concept.fullDefinition, 'fullDefinition', expectedConceptId);

  if (!Number.isInteger(concept.version)) {
    throw new Error(`Concept "${expectedConceptId}" must include an integer version.`);
  }

  assertArray(concept.contexts, 'contexts', expectedConceptId);
  assertArray(concept.sources, 'sources', expectedConceptId);
  assertArray(concept.relatedConcepts, 'relatedConcepts', expectedConceptId);
  assertArray(concept.aliases, 'aliases', expectedConceptId);
  assertArray(concept.normalizedAliases, 'normalizedAliases', expectedConceptId);
}

function loadConceptFile(conceptId) {
  const filePath = path.join(conceptsDirectory, `${conceptId}.json`);
  const rawFile = fs.readFileSync(filePath, 'utf8');
  const concept = JSON.parse(rawFile);

  validateConceptShape(concept, conceptId);

  return concept;
}

function loadConceptSet() {
  return SEED_CONCEPT_IDS.map(loadConceptFile);
}

module.exports = {
  loadConceptSet,
};

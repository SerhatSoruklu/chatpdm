'use strict';

const fs = require('node:fs');
const path = require('node:path');

const definitionsPath = path.resolve(
  __dirname,
  '../../../../data/legal-vocabulary/term-definitions.json',
);

let cachedSignature = null;
let cachedDefinitions = null;

function buildDefinitionsSignature() {
  if (!fs.existsSync(definitionsPath)) {
    return null;
  }

  const stat = fs.statSync(definitionsPath);
  return `${stat.size}:${stat.mtimeMs}`;
}

function normalizeDefinitionPart(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function normalizeTermDefinition(record, term) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error(`Term definition for "${term}" must be a plain object.`);
  }

  const short = normalizeDefinitionPart(record.short);
  const core = normalizeDefinitionPart(record.core);
  const full = normalizeDefinitionPart(record.full);

  if (!short && !core && !full) {
    throw new Error(`Term definition for "${term}" must contain at least one non-empty definition field.`);
  }

  const definition = {};

  if (short) {
    definition.short = short;
  }

  if (core) {
    definition.core = core;
  }

  if (full) {
    definition.full = full;
  }

  return Object.freeze(definition);
}

function buildTermDefinitions() {
  if (!fs.existsSync(definitionsPath)) {
    return {
      available: false,
      definitionsByTerm: new Map(),
    };
  }

  const rawDefinitions = JSON.parse(fs.readFileSync(definitionsPath, 'utf8'));
  if (!rawDefinitions || typeof rawDefinitions !== 'object' || Array.isArray(rawDefinitions)) {
    throw new Error('Legal vocabulary term definitions must be a plain object keyed by term.');
  }

  const definitionsByTerm = new Map();

  for (const [term, definition] of Object.entries(rawDefinitions)) {
    if (typeof term !== 'string' || term.trim() === '') {
      continue;
    }

    definitionsByTerm.set(term, normalizeTermDefinition(definition, term));
  }

  return {
    available: true,
    definitionsByTerm,
  };
}

function loadTermDefinitions() {
  const signature = buildDefinitionsSignature();
  if (cachedDefinitions && cachedSignature === signature) {
    return cachedDefinitions;
  }

  cachedDefinitions = buildTermDefinitions();
  cachedSignature = signature;
  return cachedDefinitions;
}

module.exports = {
  definitionsPath,
  loadTermDefinitions,
};

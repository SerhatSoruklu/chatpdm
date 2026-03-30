'use strict';

const fs = require('node:fs');
const path = require('node:path');

const semanticProfilesDirectory = path.resolve(__dirname, '../../../data/concept-semantic-profiles');
const SEMANTIC_PROFILE_SECTION_NAMES = Object.freeze([
  'requiredAnchors',
  'requiredBoundaries',
  'forbiddenDrift',
  'optionalWarnings',
]);
const SEMANTIC_PROFILE_ZONE_NAMES = Object.freeze([
  'allZones',
  'shortDefinition',
  'coreMeaning',
  'fullDefinition',
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertNonEmptyString(value, context) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${context} must be a non-empty string.`);
  }
}

function assertStringArray(values, context) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(`${context} must be a non-empty string array.`);
  }

  values.forEach((value, index) => {
    assertNonEmptyString(value, `${context}[${index}]`);
  });
}

function assertAnchorGroup(value, context) {
  if (!isPlainObject(value)) {
    throw new Error(`${context} must be an object.`);
  }

  const keys = Object.keys(value).sort();
  const expectedKeys = ['id', 'matchAny'];

  if (keys.length !== expectedKeys.length || expectedKeys.some((key, index) => keys[index] !== key)) {
    throw new Error(`${context} must contain only "id" and "matchAny".`);
  }

  assertNonEmptyString(value.id, `${context}.id`);
  assertStringArray(value.matchAny, `${context}.matchAny`);
}

function assertAnchorGroupArray(value, context) {
  if (!Array.isArray(value)) {
    throw new Error(`${context} must be an array.`);
  }

  value.forEach((entry, index) => {
    assertAnchorGroup(entry, `${context}[${index}]`);
  });
}

function assertSection(sectionValue, sectionName) {
  if (!isPlainObject(sectionValue)) {
    throw new Error(`semantic profile "${sectionName}" must be an object.`);
  }

  Object.keys(sectionValue).forEach((zoneName) => {
    if (!SEMANTIC_PROFILE_ZONE_NAMES.includes(zoneName)) {
      throw new Error(`semantic profile "${sectionName}" contains unsupported zone "${zoneName}".`);
    }

    assertAnchorGroupArray(sectionValue[zoneName], `${sectionName}.${zoneName}`);
  });
}

function validateSemanticProfile(profile, conceptName) {
  if (!isPlainObject(profile)) {
    throw new Error(`semantic profile "${conceptName}" must be an object.`);
  }

  const allowedKeys = ['concept', ...SEMANTIC_PROFILE_SECTION_NAMES];
  const unknownKeys = Object.keys(profile).filter((key) => !allowedKeys.includes(key));

  if (unknownKeys.length > 0) {
    throw new Error(`semantic profile "${conceptName}" contains unsupported keys: ${unknownKeys.join(', ')}.`);
  }

  assertNonEmptyString(profile.concept, 'semantic profile concept');

  if (profile.concept !== conceptName) {
    throw new Error(`semantic profile "${conceptName}" must declare concept "${conceptName}".`);
  }

  SEMANTIC_PROFILE_SECTION_NAMES.forEach((sectionName) => {
    if (!Object.hasOwn(profile, sectionName)) {
      return;
    }

    assertSection(profile[sectionName], sectionName);
  });

  return profile;
}

function loadSemanticProfile(conceptName) {
  assertNonEmptyString(conceptName, 'conceptName');

  const profilePath = path.join(semanticProfilesDirectory, `${conceptName}.json`);

  if (!fs.existsSync(profilePath)) {
    throw new Error(`Semantic profile missing for concept "${conceptName}" at ${profilePath}.`);
  }

  const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
  return validateSemanticProfile(profile, conceptName);
}

module.exports = {
  SEMANTIC_PROFILE_SECTION_NAMES,
  SEMANTIC_PROFILE_ZONE_NAMES,
  semanticProfilesDirectory,
  semanticProfilePath: (conceptName) => path.join(semanticProfilesDirectory, `${conceptName}.json`),
  semanticProfileExists: (conceptName) => fs.existsSync(path.join(semanticProfilesDirectory, `${conceptName}.json`)),
  loadSemanticProfile,
  validateSemanticProfile,
};

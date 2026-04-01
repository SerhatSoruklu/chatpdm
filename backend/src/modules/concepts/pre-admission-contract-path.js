'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  LIVE_CONCEPT_IDS,
  REJECTED_CONCEPT_IDS,
  VISIBLE_ONLY_PUBLIC_CONCEPT_IDS,
} = require('./admission-state');
const { getRejectedConceptRecord } = require('./rejection-registry-loader');

const preAdmissionContractPathRegistryPath = path.resolve(
  __dirname,
  '../../../../data/constraint-contracts/pre-admission-contract-paths.json',
);

const PRE_ADMISSION_CONTRACT_PATH_FIELDS = Object.freeze([
  'conceptId',
  'runtimeStatus',
  'runtimeExposure',
  'comparisonTargets',
  'requiredArtifacts',
  'authoringRequirements',
  'testRequirements',
  'promotionRequirements',
]);

function assertNonEmptyString(value, fieldName, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} has invalid ${fieldName}.`);
  }
}

function assertStringArray(value, fieldName, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} has invalid ${fieldName}; expected a non-empty array.`);
  }

  value.forEach((entry, index) => {
    assertNonEmptyString(entry, `${fieldName}[${index}]`, label);
  });

  if (new Set(value).size !== value.length) {
    throw new Error(`${label} has duplicate values in ${fieldName}.`);
  }
}

function validateConceptPathEntry(entry, runtimeExposurePolicy) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error('Pre-admission contract path entry must be an object.');
  }

  const unexpectedFields = Object.keys(entry)
    .filter((fieldName) => !PRE_ADMISSION_CONTRACT_PATH_FIELDS.includes(fieldName));

  if (unexpectedFields.length > 0) {
    throw new Error(
      `Pre-admission contract path entry has unsupported field(s): ${unexpectedFields.join(', ')}.`,
    );
  }

  assertNonEmptyString(entry.conceptId, 'conceptId', 'Pre-admission contract path entry');
  assertNonEmptyString(entry.runtimeStatus, 'runtimeStatus', `Pre-admission path "${entry.conceptId}"`);
  assertNonEmptyString(entry.runtimeExposure, 'runtimeExposure', `Pre-admission path "${entry.conceptId}"`);
  assertStringArray(entry.comparisonTargets, 'comparisonTargets', `Pre-admission path "${entry.conceptId}"`);
  assertStringArray(entry.requiredArtifacts, 'requiredArtifacts', `Pre-admission path "${entry.conceptId}"`);
  assertStringArray(entry.authoringRequirements, 'authoringRequirements', `Pre-admission path "${entry.conceptId}"`);
  assertStringArray(entry.testRequirements, 'testRequirements', `Pre-admission path "${entry.conceptId}"`);
  assertStringArray(entry.promotionRequirements, 'promotionRequirements', `Pre-admission path "${entry.conceptId}"`);

  if (!REJECTED_CONCEPT_IDS.includes(entry.conceptId)) {
    throw new Error(`Pre-admission path "${entry.conceptId}" must target a rejected concept ID.`);
  }

  if (LIVE_CONCEPT_IDS.includes(entry.conceptId) || VISIBLE_ONLY_PUBLIC_CONCEPT_IDS.includes(entry.conceptId)) {
    throw new Error(`Pre-admission path "${entry.conceptId}" must remain non-live and non-visible-only.`);
  }

  if (entry.runtimeStatus !== 'rejected_non_live') {
    throw new Error(`Pre-admission path "${entry.conceptId}" runtimeStatus must equal "rejected_non_live".`);
  }

  if (entry.runtimeExposure !== runtimeExposurePolicy) {
    throw new Error(
      `Pre-admission path "${entry.conceptId}" runtimeExposure must equal "${runtimeExposurePolicy}".`,
    );
  }

  const rejectionRecord = getRejectedConceptRecord(entry.conceptId);
  if (!rejectionRecord) {
    throw new Error(`Pre-admission path "${entry.conceptId}" requires a rejection-registry record.`);
  }

  if (rejectionRecord.status !== 'REJECTED' || rejectionRecord.finality !== true) {
    throw new Error(`Pre-admission path "${entry.conceptId}" requires a final rejected registry record.`);
  }

  rejectionRecord.collapseTargets.forEach((targetConceptId) => {
    if (!entry.comparisonTargets.includes(targetConceptId)) {
      throw new Error(
        `Pre-admission path "${entry.conceptId}" must include rejection collapse target "${targetConceptId}" in comparisonTargets.`,
      );
    }
  });

  const runtimeConceptPath = path.resolve(
    __dirname,
    `../../../../data/concepts/${entry.conceptId}.json`,
  );

  if (fs.existsSync(runtimeConceptPath)) {
    throw new Error(
      `Pre-admission path "${entry.conceptId}" must remain outside data/concepts until live promotion review is complete.`,
    );
  }

  return Object.freeze({
    conceptId: entry.conceptId.trim(),
    runtimeStatus: entry.runtimeStatus.trim(),
    runtimeExposure: entry.runtimeExposure.trim(),
    comparisonTargets: [...entry.comparisonTargets],
    requiredArtifacts: [...entry.requiredArtifacts],
    authoringRequirements: [...entry.authoringRequirements],
    testRequirements: [...entry.testRequirements],
    promotionRequirements: [...entry.promotionRequirements],
  });
}

function loadPreAdmissionContractPathRegistry() {
  if (!fs.existsSync(preAdmissionContractPathRegistryPath)) {
    throw new Error(
      `Pre-admission contract path registry is missing at ${preAdmissionContractPathRegistryPath}.`,
    );
  }

  const registry = JSON.parse(fs.readFileSync(preAdmissionContractPathRegistryPath, 'utf8'));

  if (!registry || typeof registry !== 'object' || Array.isArray(registry)) {
    throw new Error('Pre-admission contract path registry must be an object.');
  }

  if (registry.version !== 1) {
    throw new Error('Pre-admission contract path registry must declare version 1.');
  }

  assertNonEmptyString(registry.policyId, 'policyId', 'Pre-admission contract path registry');
  assertNonEmptyString(
    registry.runtimeExposurePolicy,
    'runtimeExposurePolicy',
    'Pre-admission contract path registry',
  );

  if (!Array.isArray(registry.conceptPaths) || registry.conceptPaths.length === 0) {
    throw new Error('Pre-admission contract path registry must expose a non-empty conceptPaths array.');
  }

  const conceptPaths = registry.conceptPaths.map((entry) => (
    validateConceptPathEntry(entry, registry.runtimeExposurePolicy)
  ));
  const conceptIds = conceptPaths.map((entry) => entry.conceptId);

  if (new Set(conceptIds).size !== conceptIds.length) {
    throw new Error('Pre-admission contract path registry conceptIds must be unique.');
  }

  if (JSON.stringify(conceptIds.sort()) !== JSON.stringify([...REJECTED_CONCEPT_IDS].sort())) {
    throw new Error('Pre-admission contract path registry must cover every rejected concept exactly once.');
  }

  return Object.freeze({
    version: 1,
    policyId: registry.policyId.trim(),
    runtimeExposurePolicy: registry.runtimeExposurePolicy.trim(),
    conceptPaths,
  });
}

function getPreAdmissionContractPath(conceptId) {
  const registry = loadPreAdmissionContractPathRegistry();
  const normalizedConceptId = typeof conceptId === 'string' ? conceptId.trim() : '';

  if (normalizedConceptId === '') {
    throw new Error('Pre-admission contract path lookup requires a conceptId.');
  }

  const entry = registry.conceptPaths.find((pathEntry) => pathEntry.conceptId === normalizedConceptId);

  if (!entry) {
    throw new Error(`No pre-admission contract path found for "${normalizedConceptId}".`);
  }

  return entry;
}

module.exports = {
  getPreAdmissionContractPath,
  loadPreAdmissionContractPathRegistry,
  preAdmissionContractPathRegistryPath,
};

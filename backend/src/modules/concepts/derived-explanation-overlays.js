'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  buildDerivedExplanationOverlayContract,
  computeCanonicalConceptHash,
  loadConceptSet,
  validateConceptShape,
} = require('./concept-loader');
const manifest = require('./derived-explanation-overlay-manifest.json');

const GENERATED_OVERLAY_FIELDS = Object.freeze(['shortDefinition', 'coreMeaning', 'fullDefinition']);
const GENERATED_OVERLAY_MODES = Object.freeze(['standard', 'simplified', 'formal']);
const GENERATED_OVERLAY_STATUS_GENERATED = 'generated';
const GENERATED_OVERLAY_STATUS_PENDING = 'pending_generation';
const GENERATED_OVERLAY_STATUS_INVALID = 'invalid';
const GENERATED_OVERLAY_STORE_VERSION = manifest.storeVersion;
const GENERATED_OVERLAY_TEMPLATE_VERSION = manifest.templateVersion;
const GENERATED_OVERLAY_CERTIFICATE_VERSION = manifest.certificateVersion;
const GENERATED_OVERLAY_HASH_ALGORITHM = manifest.hashAlgorithm;
const generatedOverlayStorePath = path.resolve(
  __dirname,
  '../../../../data/generated/derived-explanation-overlays.json',
);

const GENERATED_OVERLAY_TEMPLATE_STRATEGY_BY_ID = Object.freeze({
  'identity-copy.v1': 'identity',
  'simplified-prefixed-copy.v1': 'prefixed_copy',
  'formal-prefixed-copy.v1': 'prefixed_copy',
});

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function getModeManifest(modeName) {
  const modeManifest = manifest.modes[modeName];

  if (!modeManifest) {
    throw new Error(`Derived explanation overlay manifest is missing mode "${modeName}".`);
  }

  return modeManifest;
}

function getModePrefix(modeName, fieldName) {
  const prefix = getModeManifest(modeName).fieldPrefixes[fieldName];

  if (typeof prefix !== 'string') {
    throw new Error(`Derived explanation overlay manifest is missing ${modeName}.${fieldName} prefix.`);
  }

  return prefix;
}

function getModeTemplateStrategy(modeName) {
  const templateId = getModeManifest(modeName).templateId;
  const strategy = GENERATED_OVERLAY_TEMPLATE_STRATEGY_BY_ID[templateId];

  if (!strategy) {
    throw new Error(`Derived explanation overlay manifest uses unsupported templateId "${templateId}" for mode "${modeName}".`);
  }

  return strategy;
}

function buildStatusOnlyOverlayContract(concept, status) {
  const contract = buildDerivedExplanationOverlayContract(concept, GENERATED_OVERLAY_HASH_ALGORITHM);
  contract.status = status;

  for (const modeName of GENERATED_OVERLAY_MODES) {
    contract.modes[modeName].status = status;
  }

  return contract;
}

function buildGeneratedOverlayFieldValue(modeName, fieldName, canonicalValue) {
  const prefix = getModePrefix(modeName, fieldName);
  return `${prefix}${canonicalValue}`;
}

function buildFieldChecks(modeName) {
  const fieldChecks = {};

  for (const fieldName of GENERATED_OVERLAY_FIELDS) {
    const prefix = getModePrefix(modeName, fieldName);
    fieldChecks[fieldName] = {
      strategy: getModeTemplateStrategy(modeName),
      prefix,
      canonicalSuffixMatch: true,
    };
  }

  return fieldChecks;
}

function buildEquivalenceCertificate(modeName, canonicalHash) {
  return {
    status: 'certified',
    certificateVersion: GENERATED_OVERLAY_CERTIFICATE_VERSION,
    templateVersion: GENERATED_OVERLAY_TEMPLATE_VERSION,
    canonicalHash,
    mode: modeName,
    fieldChecks: buildFieldChecks(modeName),
  };
}

function certifyGeneratedMode(concept, canonicalHash, modeName, modeRecord) {
  if (!modeRecord || typeof modeRecord !== 'object' || Array.isArray(modeRecord)) {
    throw new Error(`Generated overlay mode "${modeName}" must be an object.`);
  }

  if (modeRecord.status !== GENERATED_OVERLAY_STATUS_GENERATED) {
    throw new Error(`Generated overlay mode "${modeName}" must have status "${GENERATED_OVERLAY_STATUS_GENERATED}".`);
  }

  if (!modeRecord.fields || typeof modeRecord.fields !== 'object' || Array.isArray(modeRecord.fields)) {
    throw new Error(`Generated overlay mode "${modeName}" must include field output.`);
  }

  for (const fieldName of GENERATED_OVERLAY_FIELDS) {
    const expectedValue = buildGeneratedOverlayFieldValue(modeName, fieldName, concept[fieldName]);
    if (modeRecord.fields[fieldName] !== expectedValue) {
      throw new Error(
        `Generated overlay mode "${modeName}" field "${fieldName}" failed deterministic certification.`,
      );
    }
  }

  const certificate = modeRecord.equivalenceCertificate;

  if (!certificate || typeof certificate !== 'object' || Array.isArray(certificate)) {
    throw new Error(`Generated overlay mode "${modeName}" must include an equivalence certificate.`);
  }

  if (certificate.status !== 'certified') {
    throw new Error(`Generated overlay mode "${modeName}" certificate must be certified.`);
  }

  if (certificate.canonicalHash !== canonicalHash) {
    throw new Error(`Generated overlay mode "${modeName}" certificate canonical hash mismatch.`);
  }

  if (certificate.mode !== modeName) {
    throw new Error(`Generated overlay mode "${modeName}" certificate mode mismatch.`);
  }
}

function buildGeneratedOverlayMode(concept, canonicalHash, modeName) {
  const fields = {};

  for (const fieldName of GENERATED_OVERLAY_FIELDS) {
    fields[fieldName] = buildGeneratedOverlayFieldValue(modeName, fieldName, concept[fieldName]);
  }

  const modeRecord = {
    status: GENERATED_OVERLAY_STATUS_GENERATED,
    fields,
    equivalenceCertificate: buildEquivalenceCertificate(modeName, canonicalHash),
  };

  certifyGeneratedMode(concept, canonicalHash, modeName, modeRecord);

  return modeRecord;
}

function buildGeneratedOverlayContract(concept) {
  validateConceptShape(concept, concept.conceptId);

  const contract = buildDerivedExplanationOverlayContract(concept, GENERATED_OVERLAY_HASH_ALGORITHM);
  const canonicalHash = computeCanonicalConceptHash(concept, GENERATED_OVERLAY_HASH_ALGORITHM);

  if (contract.canonicalBinding.canonicalHash !== canonicalHash) {
    throw new Error(`Derived explanation overlay contract binding mismatch for concept "${concept.conceptId}".`);
  }

  contract.status = GENERATED_OVERLAY_STATUS_GENERATED;

  for (const modeName of GENERATED_OVERLAY_MODES) {
    contract.modes[modeName] = buildGeneratedOverlayMode(concept, canonicalHash, modeName);
  }

  return contract;
}

function buildStoreSnapshot(concepts) {
  const conceptsById = {};

  for (const concept of concepts) {
    conceptsById[concept.conceptId] = buildGeneratedOverlayContract(concept);
  }

  return {
    publishedAtMs: Date.now(),
    storeVersion: GENERATED_OVERLAY_STORE_VERSION,
    concepts: conceptsById,
  };
}

function assertConceptBindingsCurrent(snapshot, concepts) {
  for (const concept of concepts) {
    const publishedContract = snapshot.concepts[concept.conceptId];

    if (!publishedContract) {
      throw new Error(`Derived explanation overlay snapshot missing concept "${concept.conceptId}".`);
    }

    const currentHash = computeCanonicalConceptHash(concept, GENERATED_OVERLAY_HASH_ALGORITHM);

    if (publishedContract.canonicalBinding.canonicalHash !== currentHash) {
      throw new Error(`Stale regeneration input detected for concept "${concept.conceptId}".`);
    }
  }
}

function writeStoreAtomically(snapshot, outputPath = generatedOverlayStorePath) {
  const directory = path.dirname(outputPath);
  fs.mkdirSync(directory, { recursive: true });

  const tempPath = `${outputPath}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, outputPath);
}

function regenerateDerivedExplanationOverlayStore(options = {}) {
  const outputPath = options.outputPath || generatedOverlayStorePath;
  const concepts = options.concepts ? options.concepts.map((concept) => cloneJson(concept)) : loadConceptSet();
  const snapshot = buildStoreSnapshot(concepts);

  if (Number.isFinite(options.nowMs)) {
    snapshot.publishedAtMs = options.nowMs;
  }

  const currentConcepts = options.currentConcepts
    ? options.currentConcepts.map((concept) => cloneJson(concept))
    : loadConceptSet();

  assertConceptBindingsCurrent(snapshot, currentConcepts);
  writeStoreAtomically(snapshot, outputPath);

  return snapshot;
}

function loadPublishedDerivedExplanationOverlayStore(options = {}) {
  const storePath = options.storePath || generatedOverlayStorePath;

  if (!fs.existsSync(storePath)) {
    return {
      publishedAtMs: null,
      storeVersion: GENERATED_OVERLAY_STORE_VERSION,
      concepts: {},
    };
  }

  return JSON.parse(fs.readFileSync(storePath, 'utf8'));
}

function hasValidPublishedAtMs(store) {
  return Number.isInteger(store.publishedAtMs) && store.publishedAtMs > 0;
}

function isStoreWithinSemanticLagWindow(store, nowMs = Date.now()) {
  if (!hasValidPublishedAtMs(store)) {
    return false;
  }

  return nowMs - store.publishedAtMs <= manifest.maxSemanticLagMs;
}

function assertPublishedOverlayContract(concept, contract) {
  const expectedHash = computeCanonicalConceptHash(concept, GENERATED_OVERLAY_HASH_ALGORITHM);

  if (contract.readOnly !== true) {
    throw new Error(`Published overlay contract for "${concept.conceptId}" must remain read-only.`);
  }

  if (contract.status !== GENERATED_OVERLAY_STATUS_GENERATED) {
    throw new Error(`Published overlay contract for "${concept.conceptId}" must be generated.`);
  }

  if (contract.canonicalBinding.conceptId !== concept.conceptId) {
    throw new Error(`Published overlay contract conceptId mismatch for "${concept.conceptId}".`);
  }

  if (contract.canonicalBinding.conceptVersion !== concept.version) {
    throw new Error(`Published overlay contract conceptVersion mismatch for "${concept.conceptId}".`);
  }

  if (contract.canonicalBinding.canonicalHash !== expectedHash) {
    throw new Error(`Published overlay contract canonicalHash mismatch for "${concept.conceptId}".`);
  }

  for (const modeName of GENERATED_OVERLAY_MODES) {
    certifyGeneratedMode(concept, expectedHash, modeName, contract.modes[modeName]);
  }
}

function hasMatchingCanonicalBinding(concept, contract) {
  const expectedHash = computeCanonicalConceptHash(concept, GENERATED_OVERLAY_HASH_ALGORITHM);

  return Boolean(
    contract
    && contract.canonicalBinding
    && contract.canonicalBinding.conceptId === concept.conceptId
    && contract.canonicalBinding.conceptVersion === concept.version
    && contract.canonicalBinding.canonicalHash === expectedHash,
  );
}

function resolveDerivedExplanationOverlaysForConcept(concept, options = {}) {
  const store = loadPublishedDerivedExplanationOverlayStore(options);
  const publishedContract = store.concepts[concept.conceptId];
  const nowMs = Number.isFinite(options.nowMs) ? options.nowMs : Date.now();

  if (!publishedContract) {
    return buildStatusOnlyOverlayContract(concept, GENERATED_OVERLAY_STATUS_PENDING);
  }

  if (!hasMatchingCanonicalBinding(concept, publishedContract)) {
    return buildStatusOnlyOverlayContract(concept, GENERATED_OVERLAY_STATUS_PENDING);
  }

  if (!isStoreWithinSemanticLagWindow(store, nowMs)) {
    return buildStatusOnlyOverlayContract(concept, GENERATED_OVERLAY_STATUS_PENDING);
  }

  try {
    assertPublishedOverlayContract(concept, publishedContract);
    return cloneJson(publishedContract);
  } catch (_error) {
    return buildStatusOnlyOverlayContract(concept, GENERATED_OVERLAY_STATUS_INVALID);
  }
}

module.exports = {
  GENERATED_OVERLAY_CERTIFICATE_VERSION,
  GENERATED_OVERLAY_HASH_ALGORITHM,
  GENERATED_OVERLAY_STATUS_GENERATED,
  GENERATED_OVERLAY_STATUS_INVALID,
  GENERATED_OVERLAY_STATUS_PENDING,
  GENERATED_OVERLAY_STORE_VERSION,
  GENERATED_OVERLAY_TEMPLATE_VERSION,
  assertPublishedOverlayContract,
  buildGeneratedOverlayContract,
  hasValidPublishedAtMs,
  isStoreWithinSemanticLagWindow,
  loadPublishedDerivedExplanationOverlayStore,
  regenerateDerivedExplanationOverlayStore,
  resolveDerivedExplanationOverlaysForConcept,
};

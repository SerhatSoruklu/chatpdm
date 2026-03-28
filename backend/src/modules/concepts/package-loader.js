'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Ajv2020 = require('ajv/dist/2020');
const { SEED_CONCEPT_IDS } = require('./constants');

const coreConceptsDirectory = path.resolve(__dirname, '../../../../data/concepts');
const packagesDirectory = path.resolve(__dirname, '../../../../data/packages');
const packageManifestSchemaPath = path.join(packagesDirectory, 'package-manifest.schema.json');
const packageConceptSchemaPath = path.join(packagesDirectory, 'package-concept.schema.json');
const defaultConceptsPath = 'concepts';

const PACKAGE_AUTHORITY_BOUNDARY = 'package-local';
const PACKAGE_BACK_PROPAGATION_POLICY = 'forbidden-without-constitutional-review';
const PACKAGE_CORE_PROMOTION_PATH = 'constitutional-review-required';

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
});

const packageManifestSchema = JSON.parse(fs.readFileSync(packageManifestSchemaPath, 'utf8'));
const packageConceptSchema = JSON.parse(fs.readFileSync(packageConceptSchemaPath, 'utf8'));
const validatePackageManifestSchema = ajv.compile(packageManifestSchema);
const validatePackageConceptSchema = ajv.compile(packageConceptSchema);

let cachedPackageRegistry = null;

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object') {
    return value;
  }

  if (seen.has(value)) {
    return value;
  }

  seen.add(value);

  for (const key of Reflect.ownKeys(value)) {
    deepFreeze(value[key], seen);
  }

  return Object.freeze(value);
}

function formatSchemaErrors(errors) {
  return (errors || [])
    .map((error) => `${error.instancePath || '/'} ${error.message}`)
    .join('; ');
}

function loadJsonFile(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${label} at "${filePath}" could not be parsed: ${error.message}`);
  }
}

function isPathWithinBoundary(targetPath, boundaryPath, allowEqual = true) {
  const relativePath = path.relative(boundaryPath, targetPath);

  if (relativePath === '') {
    return allowEqual;
  }

  return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

function assertPathWithinBoundary(targetPath, boundaryPath, errorMessage, allowEqual = true) {
  if (!isPathWithinBoundary(targetPath, boundaryPath, allowEqual)) {
    throw new Error(errorMessage);
  }
}

function listJsonFilesRecursively(directoryPath) {
  const jsonFiles = [];
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    const resolvedPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      jsonFiles.push(...listJsonFilesRecursively(resolvedPath));
      continue;
    }

    if (entry.isFile() && path.extname(entry.name) === '.json') {
      jsonFiles.push(resolvedPath);
    }
  }

  return jsonFiles.sort();
}

function assertValidSovereigntyBoundary(manifest, packageId) {
  const sovereigntyBoundary = manifest.sovereigntyBoundary;

  if (sovereigntyBoundary?.authorityBoundary !== PACKAGE_AUTHORITY_BOUNDARY) {
    throw new Error(`Package "${packageId}" attempted forbidden core mutation: sovereigntyBoundary.authorityBoundary must remain "${PACKAGE_AUTHORITY_BOUNDARY}".`);
  }

  if (sovereigntyBoundary?.nonTransitive !== true) {
    throw new Error(`Package "${packageId}" attempted forbidden core mutation: sovereigntyBoundary.nonTransitive must remain true.`);
  }

  if (sovereigntyBoundary?.canAffectCore !== false) {
    throw new Error(`Package "${packageId}" attempted forbidden core mutation: sovereigntyBoundary.canAffectCore must remain false.`);
  }

  if (sovereigntyBoundary?.kernelOverrideAllowed !== false) {
    throw new Error(`Package "${packageId}" attempted forbidden core mutation: sovereigntyBoundary.kernelOverrideAllowed must remain false.`);
  }

  if (sovereigntyBoundary?.backPropagationPolicy !== PACKAGE_BACK_PROPAGATION_POLICY) {
    throw new Error(`Package "${packageId}" attempted forbidden core mutation: sovereigntyBoundary.backPropagationPolicy must remain "${PACKAGE_BACK_PROPAGATION_POLICY}".`);
  }

  if (sovereigntyBoundary?.corePromotionPath !== PACKAGE_CORE_PROMOTION_PATH) {
    throw new Error(`Package "${packageId}" attempted forbidden core mutation: sovereigntyBoundary.corePromotionPath must remain "${PACKAGE_CORE_PROMOTION_PATH}".`);
  }
}

function resolvePackageConceptsDirectory(manifest, packageDirectory) {
  const conceptsPath = typeof manifest.conceptsPath === 'string' && manifest.conceptsPath.trim() !== ''
    ? manifest.conceptsPath
    : defaultConceptsPath;

  if (path.isAbsolute(conceptsPath)) {
    throw new Error(`Package "${manifest.packageId}" conceptsPath escaped package boundary.`);
  }

  const resolvedConceptsPath = path.resolve(packageDirectory, conceptsPath);

  assertPathWithinBoundary(
    resolvedConceptsPath,
    packageDirectory,
    `Package "${manifest.packageId}" conceptsPath escaped package boundary.`,
    false,
  );

  if (isPathWithinBoundary(resolvedConceptsPath, coreConceptsDirectory, true)) {
    throw new Error(`Package "${manifest.packageId}" conceptsPath escaped package boundary into data/concepts.`);
  }

  if (!fs.existsSync(resolvedConceptsPath) || !fs.statSync(resolvedConceptsPath).isDirectory()) {
    throw new Error(`Package "${manifest.packageId}" conceptsPath "${conceptsPath}" does not resolve to a directory inside the package boundary.`);
  }

  return resolvedConceptsPath;
}

function validatePackageManifest(packageDirectory) {
  const folderName = path.basename(packageDirectory);
  const manifestPath = path.join(packageDirectory, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Package "${folderName}" is missing manifest.json.`);
  }

  const manifest = loadJsonFile(manifestPath, `Package manifest "${folderName}"`);

  if (manifest.packageId !== folderName) {
    throw new Error(`Package manifest packageId mismatch: folder "${folderName}" does not match manifest packageId "${manifest.packageId}".`);
  }

  assertValidSovereigntyBoundary(manifest, manifest.packageId || folderName);

  const manifestValid = validatePackageManifestSchema(manifest);

  if (!manifestValid) {
    const detail = formatSchemaErrors(validatePackageManifestSchema.errors);
    throw new Error(`Package manifest "${folderName}" failed schema validation: ${detail}`);
  }

  const resolvedConceptsPath = resolvePackageConceptsDirectory(manifest, packageDirectory);

  return {
    manifest,
    manifestPath,
    resolvedConceptsPath,
  };
}

function assertValidDoctrineTypePairing(concept, conceptId) {
  if (concept.doctrineType === 'package-local-doctrine' && concept.coreEquivalent !== null) {
    throw new Error(`Invalid doctrineType/coreEquivalent pairing for package concept "${conceptId}": package-local-doctrine requires coreEquivalent = null.`);
  }

  if (
    (concept.doctrineType === 'package-local-extension' || concept.doctrineType === 'package-local-comparison')
    && (typeof concept.coreEquivalent !== 'string' || concept.coreEquivalent.trim() === '')
  ) {
    throw new Error(`Invalid doctrineType/coreEquivalent pairing for package concept "${conceptId}": ${concept.doctrineType} requires a non-null coreEquivalent.`);
  }
}

function assertValidPackageConceptBoundary(concept, conceptId) {
  if (concept.authorityBoundary !== PACKAGE_AUTHORITY_BOUNDARY) {
    throw new Error(`Package concept "${conceptId}" attempted forbidden core mutation: authorityBoundary must remain "${PACKAGE_AUTHORITY_BOUNDARY}".`);
  }

  if (concept.canAffectCore !== false) {
    throw new Error(`Package concept "${conceptId}" attempted forbidden core mutation: canAffectCore must remain false.`);
  }

  if (concept.nonTransitive !== true) {
    throw new Error(`Package concept "${conceptId}" attempted forbidden core mutation: nonTransitive must remain true.`);
  }

  if (concept.backPropagationPolicy !== PACKAGE_BACK_PROPAGATION_POLICY) {
    throw new Error(`Package concept "${conceptId}" attempted forbidden core mutation: backPropagationPolicy must remain "${PACKAGE_BACK_PROPAGATION_POLICY}".`);
  }

  if (concept.corePromotionPath !== PACKAGE_CORE_PROMOTION_PATH) {
    throw new Error(`Package concept "${conceptId}" attempted forbidden core mutation: corePromotionPath must remain "${PACKAGE_CORE_PROMOTION_PATH}".`);
  }
}

function freezePackageRecord(packageRecord) {
  const frozenManifest = deepFreeze({ ...packageRecord.manifest });
  const frozenConcepts = packageRecord.concepts.map((concept) => deepFreeze({ ...concept }));
  const frozenConceptsById = Object.create(null);

  for (const concept of frozenConcepts) {
    frozenConceptsById[concept.conceptId] = concept;
  }

  return deepFreeze({
    packageId: packageRecord.packageId,
    packagePath: packageRecord.packagePath,
    conceptsPath: packageRecord.conceptsPath,
    manifest: frozenManifest,
    concepts: frozenConcepts,
    conceptsById: frozenConceptsById,
    coreEquivalentReferences: packageRecord.coreEquivalentReferences.map((reference) => deepFreeze({ ...reference })),
  });
}

function validatePackageConceptFile(conceptFilePath, manifest, packageDirectory, conceptsPath, coreConceptIdSet, seenConceptIds) {
  const concept = loadJsonFile(conceptFilePath, `Package concept "${path.basename(conceptFilePath, '.json')}"`);
  const expectedConceptId = path.basename(conceptFilePath, '.json');

  assertPathWithinBoundary(
    conceptFilePath,
    conceptsPath,
    `Package concept "${expectedConceptId}" was loaded from outside its declared conceptsPath.`,
    false,
  );
  assertPathWithinBoundary(
    conceptFilePath,
    packageDirectory,
    `Package concept "${expectedConceptId}" escaped its package boundary.`,
    false,
  );

  if (isPathWithinBoundary(conceptFilePath, coreConceptsDirectory, true)) {
    throw new Error(`Package concept "${expectedConceptId}" must not be loaded from data/concepts.`);
  }

  if (concept.conceptId !== expectedConceptId) {
    throw new Error(`Package concept file "${expectedConceptId}" does not match conceptId "${concept.conceptId}".`);
  }

  if (concept.packageId !== manifest.packageId) {
    throw new Error(`Package concept "${concept.conceptId}" packageId mismatch: expected "${manifest.packageId}", received "${concept.packageId}".`);
  }

  assertValidDoctrineTypePairing(concept, concept.conceptId);
  assertValidPackageConceptBoundary(concept, concept.conceptId);

  const conceptValid = validatePackageConceptSchema(concept);

  if (!conceptValid) {
    const detail = formatSchemaErrors(validatePackageConceptSchema.errors);
    throw new Error(`Package concept "${concept.conceptId}" failed schema validation: ${detail}`);
  }

  if (coreConceptIdSet.has(concept.conceptId)) {
    throw new Error(`Package concept "${concept.conceptId}" must not reuse core conceptId "${concept.conceptId}".`);
  }

  if (typeof concept.coreEquivalent === 'string' && !coreConceptIdSet.has(concept.coreEquivalent)) {
    throw new Error(`Package concept "${concept.conceptId}" references unknown coreEquivalent "${concept.coreEquivalent}".`);
  }

  if (seenConceptIds.has(concept.conceptId)) {
    throw new Error(`Package "${manifest.packageId}" declares duplicate conceptId "${concept.conceptId}".`);
  }

  seenConceptIds.add(concept.conceptId);

  return concept;
}

function buildEmptyPackageRegistry() {
  return deepFreeze({
    packageIds: [],
    packagesById: {},
  });
}

function loadPackageRegistryFromDirectory(packageRoot = packagesDirectory, coreConceptIds = SEED_CONCEPT_IDS) {
  if (!fs.existsSync(packageRoot)) {
    return buildEmptyPackageRegistry();
  }

  const packageEntries = fs.readdirSync(packageRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  if (packageEntries.length === 0) {
    return buildEmptyPackageRegistry();
  }

  const coreConceptIdSet = new Set(coreConceptIds);
  const packagesById = Object.create(null);
  const packageConceptOwners = new Map();

  for (const entryName of packageEntries) {
    const packageDirectory = path.join(packageRoot, entryName);
    const {
      manifest,
      resolvedConceptsPath,
    } = validatePackageManifest(packageDirectory);
    const conceptFiles = listJsonFilesRecursively(resolvedConceptsPath);
    const seenConceptIds = new Set();
    const concepts = conceptFiles.map((conceptFilePath) => (
      validatePackageConceptFile(
        conceptFilePath,
        manifest,
        packageDirectory,
        resolvedConceptsPath,
        coreConceptIdSet,
        seenConceptIds,
      )
    ));
    const conceptsById = Object.create(null);

    for (const concept of concepts) {
      const existingOwner = packageConceptOwners.get(concept.conceptId);

      if (existingOwner) {
        throw new Error(`Duplicate package conceptId across packages: "${concept.conceptId}" declared in "${existingOwner}" and "${manifest.packageId}".`);
      }

      packageConceptOwners.set(concept.conceptId, manifest.packageId);
      conceptsById[concept.conceptId] = concept;
    }

    packagesById[manifest.packageId] = freezePackageRecord({
      packageId: manifest.packageId,
      packagePath: packageDirectory,
      conceptsPath: resolvedConceptsPath,
      manifest,
      concepts,
      conceptsById,
      coreEquivalentReferences: concepts
        .filter((concept) => typeof concept.coreEquivalent === 'string' && concept.coreEquivalent.trim() !== '')
        .map((concept) => ({
          conceptId: concept.conceptId,
          coreEquivalent: concept.coreEquivalent,
        })),
    });
  }

  return deepFreeze({
    packageIds: Object.keys(packagesById).sort(),
    packagesById,
  });
}

function loadPackageRegistry(coreConceptIds = SEED_CONCEPT_IDS, forceReload = false) {
  if (forceReload) {
    clearPackageRegistryCache();
  }

  if (!cachedPackageRegistry) {
    cachedPackageRegistry = loadPackageRegistryFromDirectory(packagesDirectory, coreConceptIds);
  }

  return cachedPackageRegistry;
}

function clearPackageRegistryCache() {
  cachedPackageRegistry = null;
}

module.exports = {
  clearPackageRegistryCache,
  loadPackageRegistry,
  loadPackageRegistryFromDirectory,
};

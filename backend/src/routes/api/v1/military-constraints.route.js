'use strict';

const path = require('node:path');
const { Router } = require('express');

const PACK_ID_PATTERN = /^[A-Za-z0-9._-]+$/;
const MILITARY_CONSTRAINTS_UNAVAILABLE_CODE = 'military_constraints_unavailable';
const MILITARY_CONSTRAINTS_UNAVAILABLE_MESSAGE = 'The military constraints service is temporarily unavailable.';

const router = Router();

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

let militaryConstraintsRuntime = null;

function loadMilitaryConstraintsRuntime() {
  if (militaryConstraintsRuntime !== null) {
    return militaryConstraintsRuntime;
  }

  try {
    const { listReferencePacks } = require('../../../modules/military-constraints/list-reference-packs');
    const { evaluateBundle } = require('../../../modules/military-constraints/evaluate-bundle');
    const { validateFactPacket } = require('../../../modules/military-constraints/fact-schema-utils');
    const { createPreparedBundleCache } = require('../../../modules/military-constraints/prepared-bundle-cache');
    const { loadPackRegistry, validatePackRegistry } = require('../../../modules/military-constraints/reference-pack-utils');

    const moduleRoot = path.resolve(__dirname, '../../../modules/military-constraints');
    const factSchema = require('../../../modules/military-constraints/military-constraint-fact.schema.json');
    const packIndex = listReferencePacks({ rootDir: moduleRoot });
    const packRegistry = loadPackRegistry(moduleRoot);
    const packRegistryValidation = validatePackRegistry(packRegistry);
    const packBundleCache = createPreparedBundleCache({
      rootDir: moduleRoot,
      packIndex,
    });

    militaryConstraintsRuntime = Object.freeze({
      available: true,
      moduleRoot,
      factSchema,
      evaluateBundle,
      validateFactPacket,
      packIndex,
      packRegistry,
      packRegistryValidation,
      packBundleCache,
    });
  } catch (error) {
    militaryConstraintsRuntime = Object.freeze({
      available: false,
      error,
    });
  }

  return militaryConstraintsRuntime;
}

const MILITARY_CONSTRAINTS_RUNTIME = loadMilitaryConstraintsRuntime();

function ensureMilitaryConstraintsRuntime(res) {
  if (MILITARY_CONSTRAINTS_RUNTIME.available) {
    return MILITARY_CONSTRAINTS_RUNTIME;
  }

  writeError(res, 503, MILITARY_CONSTRAINTS_UNAVAILABLE_CODE, MILITARY_CONSTRAINTS_UNAVAILABLE_MESSAGE);
  return null;
}

function countRegistryEntries(predicate) {
  if (!MILITARY_CONSTRAINTS_RUNTIME.available) {
    return 0;
  }

  const { packRegistry, packRegistryValidation } = MILITARY_CONSTRAINTS_RUNTIME;

  if (!Array.isArray(packRegistry) || !packRegistryValidation.valid) {
    return 0;
  }

  return packRegistry.filter((entry) => {
    return entry && typeof entry === 'object' && predicate(entry);
  }).length;
}

function writeError(res, statusCode, code, message) {
  res.status(statusCode).json({
    error: {
      code,
      message,
    },
  });
}

function sanitizeListedPackRecord(pack) {
  return {
    packId: pack.packId,
    bundleId: pack.bundleId,
    bundleVersion: pack.bundleVersion,
    jurisdiction: pack.jurisdiction,
    authorityGraphId: pack.authorityGraphId,
    reviewedClauseSetIds: Array.isArray(pack.reviewedClauseSetIds) ? [...pack.reviewedClauseSetIds] : [],
    kind: typeof pack.kind === 'string' ? pack.kind : null,
    status: typeof pack.status === 'string' ? pack.status : null,
    dependsOn: Array.isArray(pack.dependsOn) ? [...pack.dependsOn] : [],
    overlayFamily: typeof pack.overlayFamily === 'string' ? pack.overlayFamily : null,
    overlayBoundary: typeof pack.overlayBoundary === 'string' ? pack.overlayBoundary : null,
    overlayScope: typeof pack.overlayScope === 'string' ? pack.overlayScope : null,
    registryOrder: Number.isInteger(pack.registryOrder) ? pack.registryOrder : null,
    registryPresent: pack.registryPresent === true,
  };
}

function sanitizeDetailPackRecord(pack) {
  return {
    ...sanitizeListedPackRecord(pack),
    sourceRegistryVersion: typeof pack.sourceRegistryVersion === 'string' ? pack.sourceRegistryVersion : null,
    regressionSuiteVersion: typeof pack.regressionSuiteVersion === 'string' ? pack.regressionSuiteVersion : null,
  };
}

function readPackId(rawPackId) {
  if (typeof rawPackId !== 'string') {
    return null;
  }

  const packId = rawPackId.trim();
  if (packId.length === 0 || !PACK_ID_PATTERN.test(packId)) {
    return null;
  }

  return packId;
}

function getPackRecord(packIndex, packId) {
  if (!Array.isArray(packIndex)) {
    return null;
  }

  return packIndex.find((pack) => pack.packId === packId) || null;
}

function buildPackDetail(runtime, packRecord) {
  if (!runtime || !runtime.available) {
    return null;
  }

  if (!packRecord || typeof packRecord.manifestPath !== 'string' || packRecord.manifestPath.length === 0) {
    return null;
  }

  const cacheRecord = runtime.packBundleCache.get(packRecord.packId);
  if (!cacheRecord || !cacheRecord.valid || !cacheRecord.metadata) {
    return {
      valid: false,
      error: cacheRecord && Array.isArray(cacheRecord.errors) && cacheRecord.errors.length > 0
        ? cacheRecord.errors[0]
        : 'The military constraints pack could not be loaded from the prepared cache.',
    };
  }

  return {
    valid: true,
    pack: sanitizeDetailPackRecord({
      ...packRecord,
      ...cacheRecord.metadata,
    }),
  };
}

function buildEvaluateResponse(decision) {
  return {
    decision: decision.decision,
    reasonCode: decision.reasonCode,
    failedStage: decision.failedStage,
    failingRuleIds: Array.isArray(decision.failingRuleIds) ? [...decision.failingRuleIds] : [],
    missingFactIds: Array.isArray(decision.missingFactIds) ? [...decision.missingFactIds] : [],
    bundleVersion: decision.bundleVersion,
    bundleHash: decision.bundleHash,
  };
}

function stampBundleIdentity(facts, bundle) {
  const stampedFacts = {
    ...facts,
  };

  if (!Object.prototype.hasOwnProperty.call(stampedFacts, 'bundleId')) {
    stampedFacts.bundleId = bundle.bundleId;
  }

  if (!Object.prototype.hasOwnProperty.call(stampedFacts, 'bundleVersion')) {
    stampedFacts.bundleVersion = bundle.bundleVersion;
  }

  if (!Object.prototype.hasOwnProperty.call(stampedFacts, 'bundleHash')) {
    stampedFacts.bundleHash = bundle.bundleHash;
  }

  return stampedFacts;
}

function handleRootRequest(_req, res) {
  const runtime = ensureMilitaryConstraintsRuntime(res);
  if (!runtime) {
    return;
  }

  res.json({
    resource: 'military-constraints',
    status: 'active',
    availableOperations: ['packs', 'evaluate'],
    packCount: runtime.packIndex.length,
    registryPackCount: Array.isArray(runtime.packRegistry) ? runtime.packRegistry.length : 0,
    baselinePackCount: countRegistryEntries((entry) => entry.status === 'baseline'),
    admittedPackCount: countRegistryEntries((entry) => entry.status === 'admitted'),
    plannedPackCount: countRegistryEntries((entry) => entry.status === 'planned'),
    umbrellaLabelCount: countRegistryEntries((entry) => entry.kind === 'umbrella-label'),
  });
}

function handleListPacksRequest(_req, res) {
  const runtime = ensureMilitaryConstraintsRuntime(res);
  if (!runtime) {
    return;
  }

  res.json({
    resource: 'military-constraints',
    status: 'active',
    packs: runtime.packIndex.map((pack) => sanitizeListedPackRecord(pack)),
  });
}

function handlePackRequest(req, res) {
  const runtime = ensureMilitaryConstraintsRuntime(res);
  if (!runtime) {
    return;
  }

  const packId = readPackId(req.params.packId);
  if (packId === null) {
    writeError(
      res,
      400,
      'invalid_military_constraints_pack_id',
      'packId must be a non-empty pack identifier using letters, numbers, periods, underscores, or hyphens.',
    );
    return;
  }

  const packRecord = getPackRecord(runtime.packIndex, packId);
  if (packRecord === null) {
    writeError(res, 404, 'military_constraints_pack_not_found', `No military constraints pack was found for packId "${packId}".`);
    return;
  }

  const builtPack = buildPackDetail(runtime, packRecord);
  if (!builtPack) {
    writeError(res, 500, 'military_constraints_pack_failed', 'The military constraints pack could not be loaded from the prepared cache.');
    return;
  }

  if (!builtPack.valid) {
    writeError(res, 500, 'military_constraints_pack_failed', builtPack.error);
    return;
  }

  res.json({
    resource: 'military-constraints',
    status: 'active',
    pack: builtPack.pack,
  });
}

function validateEvaluateBody(body) {
  if (!isPlainObject(body)) {
    return 'request body must be a plain object containing packId and facts.';
  }

  const keys = Object.keys(body).sort();
  if (keys.length !== 2 || keys[0] !== 'facts' || keys[1] !== 'packId') {
    return 'request body must contain only packId and facts.';
  }

  const packId = readPackId(body.packId);
  if (packId === null) {
    return 'packId must be a non-empty pack identifier using letters, numbers, periods, underscores, or hyphens.';
  }

  if (!isPlainObject(body.facts)) {
    return 'facts must be a plain object.';
  }

  return null;
}

function handleEvaluateRequest(req, res) {
  const runtime = ensureMilitaryConstraintsRuntime(res);
  if (!runtime) {
    return;
  }

  const validationMessage = validateEvaluateBody(req.body);
  if (validationMessage !== null) {
    writeError(res, 400, 'invalid_military_constraints_request', validationMessage);
    return;
  }

  const packId = readPackId(req.body.packId);
  const packRecord = getPackRecord(runtime.packIndex, packId);
  if (!packRecord) {
    writeError(res, 404, 'military_constraints_pack_not_found', `No military constraints pack was found for packId "${packId}".`);
    return;
  }

  const bundleRecord = runtime.packBundleCache.get(packId);
  if (!bundleRecord || !bundleRecord.valid || !bundleRecord.bundle || !bundleRecord.preparedBundle) {
    writeError(res, 500, 'military_constraints_bundle_failed', 'The military constraints bundle could not be loaded from the prepared cache.');
    return;
  }

  const evaluationFacts = stampBundleIdentity(req.body.facts, bundleRecord.bundle);
  const stampedFactValidation = runtime.validateFactPacket(evaluationFacts, runtime.factSchema);
  if (!stampedFactValidation.valid) {
    writeError(res, 400, 'invalid_military_constraints_facts', stampedFactValidation.errors[0] || 'facts do not match the military constraints fact schema.');
    return;
  }

  const decision = runtime.evaluateBundle({
    preparedBundle: bundleRecord.preparedBundle,
    bundle: bundleRecord.bundle,
    facts: evaluationFacts,
    factSchema: runtime.factSchema,
  });

  res.json(buildEvaluateResponse(decision));
}

router.get('/', handleRootRequest);
router.get('/packs', handleListPacksRequest);
router.get('/packs/:packId', handlePackRequest);
router.post('/evaluate', handleEvaluateRequest);

module.exports = router;

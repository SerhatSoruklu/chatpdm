'use strict';

const path = require('node:path');
const { Router } = require('express');

const { listReferencePacks } = require('../../../modules/military-constraints/list-reference-packs');
const { buildReferenceBundle } = require('../../../modules/military-constraints/build-reference-pack');
const { evaluateBundle } = require('../../../modules/military-constraints/evaluate-bundle');
const { validateFactPacket, isPlainObject } = require('../../../modules/military-constraints/fact-schema-utils');

const MODULE_ROOT = path.resolve(__dirname, '../../../modules/military-constraints');
const FACT_SCHEMA = require('../../../modules/military-constraints/military-constraint-fact.schema.json');
const PACK_ID_PATTERN = /^[a-z0-9.-]+$/;

const router = Router();
const PACK_INDEX = listReferencePacks({ rootDir: MODULE_ROOT });

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

function getPackRecord(packId) {
  return PACK_INDEX.find((pack) => pack.packId === packId) || null;
}

function buildPackDetail(packRecord) {
  if (!packRecord || typeof packRecord.manifestPath !== 'string' || packRecord.manifestPath.length === 0) {
    return null;
  }

  const built = buildReferenceBundle({
    rootDir: MODULE_ROOT,
    manifestPath: packRecord.manifestPath,
  });

  if (!built.valid || !built.metadata) {
    return {
      valid: false,
      error: built.errors[0] || 'The military constraints pack could not be built.',
    };
  }

  return {
    valid: true,
    pack: sanitizeDetailPackRecord({
      ...packRecord,
      ...built.metadata,
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

function handleRootRequest(_req, res) {
  res.json({
    resource: 'military-constraints',
    status: 'active',
    availableOperations: ['packs', 'evaluate'],
    packCount: PACK_INDEX.length,
  });
}

function handleListPacksRequest(_req, res) {
  res.json({
    resource: 'military-constraints',
    status: 'active',
    packs: PACK_INDEX.map((pack) => sanitizeListedPackRecord(pack)),
  });
}

function handlePackRequest(req, res) {
  const packId = readPackId(req.params.packId);
  if (packId === null) {
    writeError(res, 400, 'invalid_military_constraints_pack_id', 'packId must be a non-empty lowercase pack identifier.');
    return;
  }

  const packRecord = getPackRecord(packId);
  if (packRecord === null) {
    writeError(res, 404, 'military_constraints_pack_not_found', `No military constraints pack was found for packId "${packId}".`);
    return;
  }

  const builtPack = buildPackDetail(packRecord);
  if (!builtPack) {
    writeError(res, 500, 'military_constraints_pack_failed', 'The military constraints pack could not be built.');
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
    return 'packId must be a non-empty lowercase pack identifier.';
  }

  if (!isPlainObject(body.facts)) {
    return 'facts must be a plain object.';
  }

  return null;
}

function handleEvaluateRequest(req, res) {
  const validationMessage = validateEvaluateBody(req.body);
  if (validationMessage !== null) {
    writeError(res, 400, 'invalid_military_constraints_request', validationMessage);
    return;
  }

  const packId = readPackId(req.body.packId);
  const packRecord = getPackRecord(packId);
  if (!packRecord) {
    writeError(res, 404, 'military_constraints_pack_not_found', `No military constraints pack was found for packId "${packId}".`);
    return;
  }

  const bundleResult = buildReferenceBundle({
    rootDir: MODULE_ROOT,
    manifestPath: packRecord.manifestPath,
  });

  if (!bundleResult.valid || !bundleResult.bundle) {
    writeError(res, 500, 'military_constraints_bundle_failed', 'The military constraints bundle could not be built.');
    return;
  }

  const factValidation = validateFactPacket(req.body.facts, FACT_SCHEMA);
  if (!factValidation.valid) {
    writeError(res, 400, 'invalid_military_constraints_facts', factValidation.errors[0] || 'facts do not match the military constraints fact schema.');
    return;
  }

  const decision = evaluateBundle({
    bundle: bundleResult.bundle,
    facts: req.body.facts,
    factSchema: FACT_SCHEMA,
  });

  res.json(buildEvaluateResponse(decision));
}

router.get('/', handleRootRequest);
router.get('/packs', handleListPacksRequest);
router.get('/packs/:packId', handlePackRequest);
router.post('/evaluate', handleEvaluateRequest);

module.exports = router;

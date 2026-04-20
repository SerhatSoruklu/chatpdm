'use strict';

const { Router } = require('express');

const legalValidatorSchemas = require('../../../modules/legal-validator/shared/legal-validator.schemas');
const {
  LEGAL_VALIDATOR_PRODUCT,
  LEGAL_VALIDATOR_SCOPE,
} = require('../../../modules/legal-validator/shared/legal-validator-runtime.contract');
const {
  inspectDoctrineGovernance,
  promoteDoctrineArtifact,
  validatePromotionRequest,
} = require('../../../modules/legal-validator/governance/doctrine-governance.service');
const { readWrappedInput } = require('../../../modules/legal-validator/shared/legal-validator-runtime.contract');

const router = Router();

function writeError(res, statusCode, code, message, extra = null) {
  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(extra ? { extra } : {}),
    },
  });
}

function setNoStoreHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, private, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

function validateArtifactId(artifactId) {
  if (!legalValidatorSchemas.isNonEmptyTrimmedString(artifactId)) {
    return {
      kind: 'invalid',
      message: 'Legal Argument Validator governance operations require an artifactId.',
    };
  }

  return {
    kind: 'ok',
    artifactId: artifactId.trim(),
  };
}

async function handleInspectRequest(req, res) {
  const validation = validateArtifactId(req.params.artifactId);

  if (validation.kind !== 'ok') {
    writeError(res, 400, 'invalid_legal_validator_input', validation.message);
    return;
  }

  try {
    const validationRunId = typeof req.query.validationRunId === 'string' && legalValidatorSchemas.isNonEmptyTrimmedString(req.query.validationRunId)
      ? req.query.validationRunId.trim()
      : null;
    const inspection = await inspectDoctrineGovernance({
      artifactId: validation.artifactId,
      validationRunId,
    });

    if (!inspection) {
      writeError(res, 404, 'doctrine_artifact_not_found', `DoctrineArtifact ${validation.artifactId} was not found.`);
      return;
    }

    res.json(inspection);
  } catch (error) {
    process.stderr.write(`[chatpdm-backend] doctrine governance inspection failed: ${error.stack || error.message}\n`);
    writeError(res, 500, 'legal_validator_governance_failed', 'The legal-validator governance surface could not be loaded.');
  }
}

async function handlePromoteRequest(req, res) {
  const artifactValidation = validateArtifactId(req.params.artifactId);

  if (artifactValidation.kind !== 'ok') {
    writeError(res, 400, 'invalid_legal_validator_input', artifactValidation.message);
    return;
  }

  const wrappedInput = readWrappedInput(req.body);

  if (wrappedInput.kind !== 'ok') {
    writeError(res, 400, 'invalid_legal_validator_input', wrappedInput.message);
    return;
  }

  const promotionValidation = validatePromotionRequest(wrappedInput.input);

  if (promotionValidation.kind !== 'ok') {
    writeError(res, 400, 'invalid_legal_validator_input', promotionValidation.message);
    return;
  }

  try {
    const promotionResult = await promoteDoctrineArtifact({
      artifactId: artifactValidation.artifactId,
      ...promotionValidation.input,
    });

    if (!promotionResult) {
      writeError(res, 404, 'doctrine_artifact_not_found', `DoctrineArtifact ${artifactValidation.artifactId} was not found.`);
      return;
    }

    if (promotionResult.terminal) {
      writeError(res, 422, promotionResult.failureCode, promotionResult.reason, {
        artifactId: artifactValidation.artifactId,
        currentStatus: promotionResult.currentStatus,
        targetStatus: promotionResult.targetStatus,
      });
      return;
    }

    res.json(promotionResult);
  } catch (error) {
    process.stderr.write(`[chatpdm-backend] doctrine governance promotion failed: ${error.stack || error.message}\n`);
    writeError(res, 500, 'legal_validator_governance_failed', 'The legal-validator governance promotion surface could not be loaded.');
  }
}

router.use((_req, res, next) => {
  setNoStoreHeaders(res);
  next();
});

router.get('/', (_req, res) => {
  res.json({
    resource: 'legal-validator-governance',
    status: 'active',
    contractVersion: 'doctrine-governance-v1',
    boundary: {
      product: LEGAL_VALIDATOR_PRODUCT,
      scope: LEGAL_VALIDATOR_SCOPE,
    },
    allowedOperations: ['inspect-doctrine-governance', 'promote-doctrine-artifact'],
    operationalControls: {
      singleTenant: true,
      authzRequired: false,
      cachePolicy: 'no-store',
      retainedArtifacts: ['DoctrineArtifact', 'ValidationRun', 'Mapping', 'OverrideRecord'],
    },
    requestShape: {
      pathParameters: ['artifactId'],
      queryParameters: ['validationRunId'],
      topLevel: ['input'],
      promotionInputFields: ['targetStatus', 'reviewedBy', 'approvedBy'],
    },
    allowedOutcomes: ['valid', 'invalid', 'unresolved'],
  });
});

router.get('/:artifactId', handleInspectRequest);
router.post('/:artifactId/promote', handlePromoteRequest);

module.exports = router;

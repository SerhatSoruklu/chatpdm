'use strict';

const { Router } = require('express');
const {
  LEGAL_VALIDATOR_ORCHESTRATOR_CONTRACT_VERSION,
  LEGAL_VALIDATOR_PRODUCT,
  LEGAL_VALIDATOR_SCOPE,
  LEGAL_VALIDATOR_REQUIRED_SCOPE_KEYS,
  readWrappedInput,
  validateOrchestratorInput,
} = require('../../../modules/legal-validator/shared/legal-validator-runtime.contract');
const {
  PHASE_ORDER,
  orchestrateLegalValidator,
} = require('../../../modules/legal-validator/orchestrator/legal-validator-orchestrator.service');

const router = Router();

function writeError(res, statusCode, code, message) {
  res.status(statusCode).json({
    error: {
      code,
      message,
    },
  });
}

function handleOrchestrateRequest(req, res) {
  const wrappedInput = readWrappedInput(req.body);

  if (wrappedInput.kind !== 'ok') {
    writeError(res, 400, 'invalid_legal_validator_input', wrappedInput.message);
    return;
  }

  const validation = validateOrchestratorInput(wrappedInput.input);

  if (validation.kind === 'invalid') {
    writeError(res, 400, 'invalid_legal_validator_input', validation.message);
    return;
  }

  if (validation.kind === 'scope_violation') {
    writeError(res, 422, 'legal_validator_scope_lock_violation', validation.message);
    return;
  }

  orchestrateLegalValidator(validation)
    .then((result) => {
      res.json(result);
    })
    .catch((error) => {
      writeError(res, 500, 'legal_validator_orchestrator_failed', error.message);
    });
}

router.get('/', (_req, res) => {
  res.json({
    resource: 'legal-validator-orchestrator',
    status: 'active',
    contractVersion: LEGAL_VALIDATOR_ORCHESTRATOR_CONTRACT_VERSION,
    phaseOrder: PHASE_ORDER,
    boundary: {
      product: LEGAL_VALIDATOR_PRODUCT,
      scope: LEGAL_VALIDATOR_SCOPE,
    },
    requestShape: {
      topLevel: ['input'],
      boundaryFields: LEGAL_VALIDATOR_REQUIRED_SCOPE_KEYS,
      requiredOrchestratorFields: [
        'sourceDocumentId',
        'doctrineArtifactId',
        'traceInput',
      ],
      optionalOrchestratorFields: [
        'authorityInput',
        'resolverDecision',
        'validationDecision',
      ],
      traceInputFields: [
        'validationRunId',
        'resolverVersion',
        'inputHash',
      ],
    },
    allowedOutcomes: ['valid', 'invalid', 'unresolved'],
  });
});

router.post('/', handleOrchestrateRequest);

module.exports = router;

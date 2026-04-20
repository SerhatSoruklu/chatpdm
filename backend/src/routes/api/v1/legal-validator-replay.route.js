'use strict';

const { Router } = require('express');
const {
  LEGAL_VALIDATOR_REPLAY_CONTRACT_VERSION,
  LEGAL_VALIDATOR_PRODUCT,
  LEGAL_VALIDATOR_SCOPE,
  LEGAL_VALIDATOR_REQUIRED_REPLAY_KEYS,
  readWrappedInput,
  validateReplayInput,
} = require('../../../modules/legal-validator/shared/legal-validator-runtime.contract');
const {
  replayValidationRun,
} = require('../../../modules/legal-validator/validation/trace.service');

const router = Router();

function writeError(res, statusCode, code, message) {
  res.status(statusCode).json({
    error: {
      code,
      message,
    },
  });
}

function handleReplayRequest(req, res) {
  const wrappedInput = readWrappedInput(req.body);

  if (wrappedInput.kind !== 'ok') {
    writeError(res, 400, 'invalid_legal_validator_input', wrappedInput.message);
    return;
  }

  const validation = validateReplayInput(wrappedInput.input);

  if (validation.kind !== 'ok') {
    writeError(res, 400, 'invalid_legal_validator_input', validation.message);
    return;
  }

  replayValidationRun(validation)
    .then((result) => {
      if (result.terminal) {
        res.status(422).json({
          resource: 'legal-validator-replay',
          status: 'terminal',
          contractVersion: LEGAL_VALIDATOR_REPLAY_CONTRACT_VERSION,
          request: {
            validationRunId: validation.validationRunId,
          },
          final: {
            result: result.result,
            failureCode: result.failureCode,
            reason: result.reason,
            replayComparison: result.replayComparison || null,
          },
        });
        return;
      }

      res.json({
        resource: 'legal-validator-replay',
        status: 'completed',
        contractVersion: LEGAL_VALIDATOR_REPLAY_CONTRACT_VERSION,
        request: {
          validationRunId: validation.validationRunId,
        },
        final: {
          result: result.replayedResult,
          failureCodes: result.replayedFailureCodes,
          replayComparison: result.replayComparison,
          replayedTraceSummary: result.replayedTraceSummary,
          originalValidationRunId: result.originalValidationRun?.validationRunId || validation.validationRunId,
        },
      });
    })
    .catch((error) => {
      writeError(res, 500, 'legal_validator_replay_failed', error.message);
    });
}

router.get('/', (_req, res) => {
  res.json({
    resource: 'legal-validator-replay',
    status: 'active',
    contractVersion: LEGAL_VALIDATOR_REPLAY_CONTRACT_VERSION,
    boundary: {
      product: LEGAL_VALIDATOR_PRODUCT,
      scope: LEGAL_VALIDATOR_SCOPE,
    },
    allowedOperations: ['replay-validation-run'],
    requestShape: {
      topLevel: ['input'],
      inputFields: LEGAL_VALIDATOR_REQUIRED_REPLAY_KEYS,
    },
    allowedOutcomes: ['valid', 'invalid', 'unresolved'],
  });
});

router.post('/', handleReplayRequest);

module.exports = router;

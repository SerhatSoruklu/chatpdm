'use strict';

const { Router } = require('express');
const {
  LEGAL_VALIDATOR_PRODUCT,
  LEGAL_VALIDATOR_SCOPE,
  LEGAL_VALIDATOR_MATTER_CONTRACT_VERSION,
  LEGAL_VALIDATOR_REQUIRED_MATTER_KEYS,
  readWrappedInput,
  validateMatterIntakeInput,
} = require('../../../modules/legal-validator/shared/legal-validator-runtime.contract');
const {
  upsertMatterForIntake,
} = require('../../../modules/legal-validator/matter/matter-intake.service');

const router = Router();

function writeError(res, statusCode, code, message) {
  res.status(statusCode).json({
    error: {
      code,
      message,
    },
  });
}

function handleIntakeRequest(req, res) {
  const wrappedInput = readWrappedInput(req.body);

  if (wrappedInput.kind !== 'ok') {
    writeError(res, 400, 'invalid_legal_validator_input', wrappedInput.message);
    return;
  }

  const validation = validateMatterIntakeInput(wrappedInput.input);

  if (validation.kind !== 'ok') {
    writeError(res, 400, 'invalid_legal_validator_input', validation.message);
    return;
  }

  upsertMatterForIntake({
    matter: validation.matter,
    sourceDocumentIds: validation.sourceDocumentIds,
  })
    .then((result) => {
      if (result.terminal) {
        writeError(res, 422, result.failureCode, result.reason);
        return;
      }

      res.json({
        resource: 'legal-validator-intake',
        status: 'active',
        contractVersion: LEGAL_VALIDATOR_MATTER_CONTRACT_VERSION,
        boundary: {
          product: LEGAL_VALIDATOR_PRODUCT,
          scope: LEGAL_VALIDATOR_SCOPE,
        },
        matterMode: result.matterMode,
        matter: {
          matterId: result.matter.matterId,
          title: result.matter.title,
          jurisdiction: result.matter.jurisdiction,
          practiceArea: result.matter.practiceArea,
          status: result.matter.status,
          createdBy: result.matter.createdBy,
        },
        sourceDocumentIds: result.sourceDocumentIds,
        sourceDocumentCount: result.sourceDocumentCount,
      });
    })
    .catch((error) => {
      writeError(res, 500, 'legal_validator_intake_failed', error.message);
    });
}

router.get('/', (_req, res) => {
  res.json({
    resource: 'legal-validator-intake',
    status: 'active',
    contractVersion: LEGAL_VALIDATOR_MATTER_CONTRACT_VERSION,
    boundary: {
      product: LEGAL_VALIDATOR_PRODUCT,
      scope: LEGAL_VALIDATOR_SCOPE,
    },
    allowedOperations: ['create-or-bind-matter'],
    requestShape: {
      topLevel: ['input'],
      inputFields: ['matter', 'sourceDocumentIds'],
      matterFields: LEGAL_VALIDATOR_REQUIRED_MATTER_KEYS,
      sourceDocumentIdsField: 'optional unique array of sourceDocumentId strings',
    },
    allowedOutcomes: ['valid', 'invalid', 'unresolved'],
  });
});

router.post('/', handleIntakeRequest);

module.exports = router;

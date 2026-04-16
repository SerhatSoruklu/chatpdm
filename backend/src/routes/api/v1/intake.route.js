'use strict';

const { Router } = require('express');
const { resolveSharedIntakeQuery } = require('../../../modules/intake/shared-intake-router');

const router = Router();

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function writeError(res, statusCode, code, message) {
  res.status(statusCode).json({
    error: {
      code,
      message,
    },
  });
}

function readIntakeInput(body) {
  if (!isPlainObject(body)) {
    return undefined;
  }

  const keys = Object.keys(body);

  if (keys.length !== 1 || !Object.prototype.hasOwnProperty.call(body, 'input')) {
    return undefined;
  }

  return body.input;
}

function handleDispatchRequest(req, res) {
  const intakeInput = readIntakeInput(req.body);

  if (intakeInput === undefined) {
    writeError(
      res,
      400,
      'invalid_intake_input',
      'Request body must contain exactly one field named "input".',
    );
    return;
  }

  try {
    const dispatchResult = resolveSharedIntakeQuery(intakeInput);

    res.json({
      resource: 'intake',
      status: 'active',
      selectedSurface: dispatchResult.selectedSurface,
      inputType: dispatchResult.inputType,
      output: dispatchResult.output,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      writeError(res, 400, 'invalid_intake_input', error.message);
      return;
    }

    process.stderr.write(`[chatpdm-backend] intake dispatch failed: ${error.stack || error.message}\n`);
    writeError(res, 500, 'intake_dispatch_failed', 'The shared intake router could not produce a valid response.');
  }
}

router.get('/', (_req, res) => {
  res.json({
    resource: 'intake',
    status: 'active',
    availableOperations: ['dispatch'],
    availableTargets: ['concepts', 'risk-mapping'],
  });
});

router.post('/', handleDispatchRequest);

module.exports = router;

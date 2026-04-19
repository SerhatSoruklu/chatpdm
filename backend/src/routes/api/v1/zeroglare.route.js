'use strict';

const { Router } = require('express');
const {
  ZEROGLOARE_PIPELINE_STAGES,
  buildZeroglareAnalysis,
} = require('../../../modules/concepts/zeroglare-diagnostics');
const {
  ZEROGLARE_API_ERROR_CODES,
  ZEROGLARE_API_ERROR_MESSAGES,
  ZEROGLARE_API_INPUT_LIMIT,
  buildZeroGlareErrorResponse,
} = require('../../../modules/concepts/zeroglare-api-contract');

const router = Router();

function readAnalysisInput(req) {
  if (typeof req.query.q === 'string') {
    return req.query.q;
  }

  if (typeof req.body?.input === 'string') {
    return req.body.input;
  }

  return null;
}

function handleAnalyzeRequest(rawQuery, res, invalidInputMessage) {
  if (typeof rawQuery !== 'string' || rawQuery.trim() === '') {
    res.status(400).json(
      buildZeroGlareErrorResponse(
        ZEROGLARE_API_ERROR_CODES.invalidInput,
        invalidInputMessage,
      ),
    );
    return;
  }

  if (rawQuery.length > ZEROGLARE_API_INPUT_LIMIT) {
    res.status(413).json(
      buildZeroGlareErrorResponse(
        ZEROGLARE_API_ERROR_CODES.inputTooLarge,
        ZEROGLARE_API_ERROR_MESSAGES.inputTooLarge,
      ),
    );
    return;
  }

  try {
    res.json(buildZeroglareAnalysis(rawQuery));
  } catch (error) {
    process.stderr.write(`[chatpdm-backend] zeroglare analysis failed: ${error.stack || error.message}\n`);
    res.status(500).json(
      buildZeroGlareErrorResponse(
        ZEROGLARE_API_ERROR_CODES.analysisFailed,
        ZEROGLARE_API_ERROR_MESSAGES.analysisFailed,
      ),
    );
  }
}

router.get('/', (_req, res) => {
  res.json({
    resource: 'zeroglare',
    status: 'active',
    availableOperations: ['analyze'],
    pipeline_position: [...ZEROGLOARE_PIPELINE_STAGES],
  });
});

router.get('/analyze', (req, res) => {
  handleAnalyzeRequest(
    req.query.q,
    res,
    ZEROGLARE_API_ERROR_MESSAGES.invalidQuery,
  );
});

router.post('/analyze', (req, res) => {
  handleAnalyzeRequest(
    readAnalysisInput(req),
    res,
    ZEROGLARE_API_ERROR_MESSAGES.invalidBody,
  );
});

module.exports = router;

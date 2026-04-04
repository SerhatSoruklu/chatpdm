'use strict';

const { Router } = require('express');
const {
  ZEROGLOARE_PIPELINE_STAGES,
  buildZeroglareAnalysis,
} = require('../../../modules/concepts/zeroglare-diagnostics');

const router = Router();
const MAX_ANALYSIS_INPUT_LENGTH = 1_000_000;

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
    res.status(400).json({
      error: {
        code: 'invalid_zeroglare_input',
        message: invalidInputMessage,
      },
    });
    return;
  }

  if (rawQuery.length > MAX_ANALYSIS_INPUT_LENGTH) {
    res.status(413).json({
      error: 'INPUT_TOO_LARGE',
      message: 'Input exceeds maximum allowed length (1,000,000 characters).',
    });
    return;
  }

  try {
    res.json(buildZeroglareAnalysis(rawQuery));
  } catch (error) {
    process.stderr.write(`[chatpdm-backend] zeroglare analysis failed: ${error.stack || error.message}\n`);
    res.status(500).json({
      error: {
        code: 'zeroglare_analysis_failed',
        message: 'The Zeroglare diagnostics endpoint could not produce a valid response.',
      },
    });
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
    'Query parameter q must be a non-empty string.',
  );
});

router.post('/analyze', (req, res) => {
  handleAnalyzeRequest(
    readAnalysisInput(req),
    res,
    'Request body field "input" must be a non-empty string.',
  );
});

module.exports = router;

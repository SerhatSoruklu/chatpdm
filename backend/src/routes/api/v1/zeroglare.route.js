'use strict';

const { Router } = require('express');
const {
  ZEROGLOARE_PIPELINE_STAGES,
  buildZeroglareDiagnostics,
} = require('../../../modules/concepts/zeroglare-diagnostics');
const {
  runFullPipeline,
} = require('../../../modules/concepts/pipeline-runner');

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
    res.status(400).json({
      error: {
        code: 'invalid_zeroglare_input',
        message: invalidInputMessage,
      },
    });
    return;
  }

  try {
    const pipelineResult = runFullPipeline(rawQuery);
    const diagnostics = pipelineResult.zeroglare_diagnostics
      ?? buildZeroglareDiagnostics(rawQuery);

    res.json({
      resource: 'zeroglare',
      status: 'active',
      pipeline_position: [...ZEROGLOARE_PIPELINE_STAGES],
      diagnostics,
    });
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

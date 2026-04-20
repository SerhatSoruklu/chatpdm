'use strict';

const { Router } = require('express');

const {
  buildCanonicalSignatureResponse,
} = require('../../../modules/canonical-signature/canonical-signature.service');

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    resource: 'vision',
    status: 'active',
    availableOperations: ['signature'],
  });
});

router.get('/signature', (_req, res) => {
  try {
    res.json(buildCanonicalSignatureResponse());
  } catch (error) {
    process.stderr.write(`[chatpdm-backend] vision signature failed: ${error.stack || error.message}\n`);
    res.status(500).json({
      error: {
        code: 'vision_signature_failed',
        message: 'The canonical signature envelope could not be produced.',
      },
    });
  }
});

module.exports = router;

'use strict';

const { Router } = require('express');
const {
  buildVocabularyBoundaryResponse,
} = require('../../../modules/legal-vocabulary/vocabulary-boundary');

const router = Router();

router.get('/', (_req, res) => {
  try {
    res.json(buildVocabularyBoundaryResponse());
  } catch (error) {
    process.stderr.write(`[chatpdm-backend] vocabulary boundary failed: ${error.stack || error.message}\n`);
    res.status(500).json({
      error: {
        code: 'vocabulary_boundary_failed',
        message: 'The vocabulary boundary endpoint could not produce a valid response.',
      },
    });
  }
});

module.exports = router;

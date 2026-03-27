'use strict';

const { Router } = require('express');
const { resolveConceptQuery } = require('../../../modules/concepts');

const router = Router();

router.get('/', (req, res) => {
  res.json({
    resource: 'concepts',
    status: 'active',
    availableOperations: ['resolve'],
  });
});

router.get('/resolve', (req, res) => {
  const rawQuery = req.query.q;

  if (typeof rawQuery !== 'string' || rawQuery.length === 0) {
    res.status(400).json({
      error: {
        code: 'invalid_query',
        message: 'Query parameter q must be a non-empty string.',
      },
    });
    return;
  }

  try {
    const response = resolveConceptQuery(rawQuery);
    res.json(response);
  } catch (error) {
    process.stderr.write(`[chatpdm-backend] concept resolve failed: ${error.stack || error.message}\n`);
    res.status(500).json({
      error: {
        code: 'concept_resolve_failed',
        message: 'The concept resolver could not produce a valid product response.',
      },
    });
  }
});

module.exports = router;

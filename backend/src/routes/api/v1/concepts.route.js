'use strict';

const { Router } = require('express');
const { buildConceptDetail, resolveConceptQuery } = require('../../../modules/concepts');

const router = Router();

function handleResolveRequest(rawQuery, res, invalidInputMessage) {
  if (typeof rawQuery !== 'string' || rawQuery.length === 0) {
    res.status(400).json({
      error: {
        code: 'invalid_query',
        message: invalidInputMessage,
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
}

router.get('/', (req, res) => {
  res.json({
    resource: 'concepts',
    status: 'active',
    availableOperations: ['resolve', 'detail'],
  });
});

router.get('/resolve', (req, res) => {
  handleResolveRequest(
    req.query.q,
    res,
    'Query parameter q must be a non-empty string.',
  );
});

router.post('/resolve', (req, res) => {
  handleResolveRequest(
    req.body?.input,
    res,
    'Request body field "input" must be a non-empty string.',
  );
});

router.get('/:conceptId', (req, res) => {
  const rawConceptId = req.params.conceptId;

  if (typeof rawConceptId !== 'string' || rawConceptId.length === 0) {
    res.status(400).json({
      error: {
        code: 'invalid_concept_id',
        message: 'Route parameter conceptId must be a non-empty string.',
      },
    });
    return;
  }

  try {
    const detail = buildConceptDetail(rawConceptId);

    if (!detail) {
      res.status(404).json({
        error: {
          code: 'concept_not_found',
          message: 'No concept detail record is available for this conceptId.',
        },
      });
      return;
    }

    res.json(detail);
  } catch (error) {
    process.stderr.write(`[chatpdm-backend] concept detail failed: ${error.stack || error.message}\n`);
    res.status(500).json({
      error: {
        code: 'concept_detail_failed',
        message: 'The concept detail endpoint could not produce a valid response.',
      },
    });
  }
});

module.exports = router;

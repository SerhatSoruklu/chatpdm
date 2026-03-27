'use strict';

const { Router } = require('express');
const { recordFeedback } = require('../../../modules/feedback/service');

const router = Router();

router.get('/', (req, res) => {
  res.json({
    resource: 'feedback',
    status: 'active',
    availableOperations: ['submit'],
  });
});

router.post('/', async (req, res) => {
  try {
    const receipt = await recordFeedback(req.body);
    res.status(201).json(receipt);
  } catch (error) {
    if (error instanceof TypeError) {
      res.status(400).json({
        error: {
          code: 'invalid_feedback',
          message: error.message,
        },
      });
      return;
    }

    process.stderr.write(`[chatpdm-backend] feedback store failed: ${error.stack || error.message}\n`);
    res.status(500).json({
      error: {
        code: 'feedback_store_failed',
        message: 'The feedback event could not be recorded.',
      },
    });
  }
});

module.exports = router;

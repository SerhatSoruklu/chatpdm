'use strict';

const { Router } = require('express');
const { recordAiUsageEvent } = require('../../modules/ai/service');

const router = Router();

router.get('/', (req, res) => {
  res.json({
    resource: 'ai-events',
    status: 'active',
    availableOperations: ['record_usage_event'],
  });
});

router.post('/', async (req, res) => {
  try {
    const receipt = await recordAiUsageEvent(req.body);
    res.status(201).json(receipt);
  } catch (error) {
    if (error instanceof TypeError) {
      res.status(400).json({
        error: {
          code: 'invalid_ai_event',
          message: error.message,
        },
      });
      return;
    }

    process.stderr.write(`[chatpdm-backend] ai event store failed: ${error.stack || error.message}\n`);
    res.status(500).json({
      error: {
        code: 'ai_event_store_failed',
        message: 'The AI event could not be recorded.',
      },
    });
  }
});

module.exports = router;

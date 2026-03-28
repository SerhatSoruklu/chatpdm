'use strict';

const { Router } = require('express');
const {
  deleteFeedbackBySessionId,
  exportFeedbackBySessionId,
  recordFeedback,
} = require('../../../modules/feedback/service');

const router = Router();

router.get('/', (req, res) => {
  res.json({
    resource: 'feedback',
    status: 'active',
    availableOperations: ['submit', 'export_by_session', 'delete_by_session'],
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

router.get('/session/:sessionId/export', async (req, res) => {
  try {
    const exportReceipt = await exportFeedbackBySessionId(req.params.sessionId);
    res.json(exportReceipt);
  } catch (error) {
    if (error instanceof TypeError) {
      res.status(400).json({
        error: {
          code: 'invalid_feedback_session_control',
          message: error.message,
        },
      });
      return;
    }

    process.stderr.write(`[chatpdm-backend] feedback export failed: ${error.stack || error.message}\n`);
    res.status(500).json({
      error: {
        code: 'feedback_export_failed',
        message: 'The feedback events could not be exported for this session.',
      },
    });
  }
});

router.delete('/session/:sessionId', async (req, res) => {
  try {
    const deleteReceipt = await deleteFeedbackBySessionId(req.params.sessionId);
    res.json(deleteReceipt);
  } catch (error) {
    if (error instanceof TypeError) {
      res.status(400).json({
        error: {
          code: 'invalid_feedback_session_control',
          message: error.message,
        },
      });
      return;
    }

    process.stderr.write(`[chatpdm-backend] feedback delete failed: ${error.stack || error.message}\n`);
    res.status(500).json({
      error: {
        code: 'feedback_delete_failed',
        message: 'The feedback events could not be deleted for this session.',
      },
    });
  }
});

module.exports = router;

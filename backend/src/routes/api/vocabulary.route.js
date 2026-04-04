'use strict';

const { Router } = require('express');
const { classifyVocabularySurface } = require('../../vocabulary/vocabulary-service.ts');

const router = Router();

function extractVocabularyInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return null;
  }

  return body.input;
}

router.get('/', (req, res) => {
  res.json({
    resource: 'vocabulary',
    status: 'active',
    availableOperations: ['classify'],
  });
});

router.post('/classify', (req, res) => {
  const input = extractVocabularyInput(req.body);

  if (typeof input !== 'string' || input.length === 0) {
    res.status(400).json({
      error: {
        code: 'invalid_vocabulary_input',
        message: 'Request body field "input" must be a non-empty string.',
      },
    });
    return;
  }

  try {
    const response = classifyVocabularySurface(input);
    res.json(response);
  } catch (error) {
    process.stderr.write(`[chatpdm-backend] vocabulary classify failed: ${error.stack || error.message}\n`);
    res.status(500).json({
      error: {
        code: 'vocabulary_classify_failed',
        message: 'The vocabulary classifier could not produce a valid response.',
      },
    });
  }
});

module.exports = router;

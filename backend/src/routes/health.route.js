'use strict';

const { Router } = require('express');

const router = Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'chatpdm-backend',
    stage: 'scaffold',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;

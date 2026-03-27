'use strict';

const { Router } = require('express');
const { getMongoHealth } = require('../config/mongoose');

const router = Router();

router.get('/', (req, res) => {
  const mongo = getMongoHealth();

  res.json({
    status: mongo.connected ? 'ok' : 'degraded',
    service: 'chatpdm-backend',
    stage: 'scaffold',
    mongo,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;

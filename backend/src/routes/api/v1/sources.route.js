'use strict';

const { Router } = require('express');

const router = Router();

router.get('/', (req, res) => {
  res.json({
    resource: 'sources',
    status: 'placeholder',
    message: 'Source APIs have not been implemented yet.',
  });
});

module.exports = router;

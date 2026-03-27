'use strict';

const { Router } = require('express');

const router = Router();

router.get('/', (req, res) => {
  res.json({
    resource: 'perspectives',
    status: 'placeholder',
    message: 'Perspective APIs have not been implemented yet.',
  });
});

module.exports = router;

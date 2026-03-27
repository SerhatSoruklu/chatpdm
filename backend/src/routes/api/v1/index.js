'use strict';

const { Router } = require('express');
const conceptsRoute = require('./concepts.route');
const feedbackRoute = require('./feedback.route');
const sourcesRoute = require('./sources.route');
const perspectivesRoute = require('./perspectives.route');

const router = Router();

router.get('/', (req, res) => {
  res.json({
    namespace: 'api/v1',
    stage: 'scaffold',
    availableResources: ['concepts', 'feedback', 'sources', 'perspectives'],
  });
});

router.use('/concepts', conceptsRoute);
router.use('/feedback', feedbackRoute);
router.use('/sources', sourcesRoute);
router.use('/perspectives', perspectivesRoute);

module.exports = router;

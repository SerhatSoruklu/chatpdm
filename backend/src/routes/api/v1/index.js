'use strict';

const { Router } = require('express');
const conceptsRoute = require('./concepts.route');
const feedbackRoute = require('./feedback.route');
const managedAccessRoute = require('../../../modules/managed-access/managed-access.routes');
const sourcesRoute = require('./sources.route');
const perspectivesRoute = require('./perspectives.route');

const router = Router();

router.get('/', (req, res) => {
  res.json({
    namespace: 'api/v1',
    stage: 'scaffold',
    availableResources: ['concepts', 'feedback', 'managed-access', 'sources', 'perspectives'],
  });
});

router.use('/concepts', conceptsRoute);
router.use('/feedback', feedbackRoute);
router.use('/managed-access', managedAccessRoute);
router.use('/sources', sourcesRoute);
router.use('/perspectives', perspectivesRoute);

module.exports = router;

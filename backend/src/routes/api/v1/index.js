'use strict';

const { Router } = require('express');
const conceptsRoute = require('./concepts.route');
const feedbackRoute = require('./feedback.route');
const intakeRoute = require('./intake.route');
const legalValidatorRoute = require('./legal-validator.route');
const militaryConstraintsRoute = require('./military-constraints.route');
const riskMappingRoute = require('./risk-mapping.route');
const sourcesRoute = require('./sources.route');
const perspectivesRoute = require('./perspectives.route');
const zeeRoute = require('./zee.route');
const vocabularyRoute = require('./vocabulary.route');
const zeroglareRoute = require('./zeroglare.route');

const router = Router();

router.get('/', (req, res) => {
  res.json({
    namespace: 'api/v1',
    stage: 'scaffold',
    availableResources: ['concepts', 'feedback', 'intake', 'legal-validator', 'military-constraints', 'risk-mapping', 'sources', 'perspectives', 'vocabulary', 'zeroglare', 'zee'],
  });
});

router.use('/concepts', conceptsRoute);
router.use('/feedback', feedbackRoute);
router.use('/intake', intakeRoute);
router.use('/legal-validator', legalValidatorRoute);
router.use('/military-constraints', militaryConstraintsRoute);
router.use('/risk-mapping', riskMappingRoute);
router.use('/sources', sourcesRoute);
router.use('/perspectives', perspectivesRoute);
router.use('/vocabulary', vocabularyRoute);
router.use('/zeroglare', zeroglareRoute);
router.use('/zee', zeeRoute);

module.exports = router;

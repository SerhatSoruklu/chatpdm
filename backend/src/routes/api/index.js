'use strict';

const { Router } = require('express');
const aiEventsRoute = require('./ai-events.route');
const v1Routes = require('./v1');

const router = Router();

router.use('/ai-events', aiEventsRoute);
router.use('/v1', v1Routes);

module.exports = router;

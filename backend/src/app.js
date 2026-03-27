'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const healthRoute = require('./routes/health.route');
const apiRoutes = require('./routes/api');

const app = express();

app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    name: 'ChatPDM backend',
    stage: 'scaffold',
    message: 'Deterministic meaning APIs will live under /api/v1.',
  });
});

app.use('/health', healthRoute);
app.use('/api', apiRoutes);

module.exports = app;

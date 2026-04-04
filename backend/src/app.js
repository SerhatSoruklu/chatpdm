'use strict';

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const env = require('./config/env');
const { createCorsOptions } = require('./security/cors');
const healthRoute = require('./routes/health.route');
const apiRoutes = require('./routes/api');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', env.trustProxy);

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

if (env.enableCompression) {
  app.use(compression({ threshold: 1024 }));
}

app.use(cors(createCorsOptions(env.frontendOrigins)));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

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

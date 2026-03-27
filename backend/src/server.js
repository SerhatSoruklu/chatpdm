'use strict';

const app = require('./app');
const env = require('./config/env');

app.listen(env.port, () => {
  process.stdout.write(
    `[chatpdm-backend] listening on http://localhost:${env.port} in ${env.nodeEnv}\n`,
  );
});

'use strict';

const app = require('./app');
const env = require('./config/env');
const { connectMongo } = require('./config/mongoose');

async function start() {
  await connectMongo(env.mongoUri);

  app.listen(env.port, env.host, () => {
    process.stdout.write(
      `[chatpdm-backend] listening on http://${env.host}:${env.port} in ${env.nodeEnv}\n`,
    );
  });
}

start().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});

'use strict';

const app = require('./app');
const env = require('./config/env');
const { connectMongo } = require('./config/mongoose');

async function start() {
  app.listen(env.port, env.host, () => {
    process.stdout.write(
      `[chatpdm-backend] listening on http://${env.host}:${env.port} in ${env.nodeEnv}\n`,
    );
  });

  try {
    await connectMongo(env.mongoUri);
  } catch (error) {
    process.stderr.write(
      `[chatpdm-backend] Mongo connection did not complete after server bind: ${error.message}\n`,
    );
  }
}

start().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});

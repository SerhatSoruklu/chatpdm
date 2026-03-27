'use strict';

const mongoose = require('mongoose');

async function connectMongo(uri) {
  try {
    await mongoose.connect(uri);
    process.stdout.write('[chatpdm-backend] MongoDB connected\n');
  } catch (error) {
    process.stderr.write(`[chatpdm-backend] MongoDB connection failed: ${error.message}\n`);
    throw error;
  }
}

async function disconnectMongo() {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
}

function getMongoHealth() {
  const { connection } = mongoose;

  return {
    connected: connection.readyState === 1,
    readyState: connection.readyState,
    host: connection.host || null,
    name: connection.name || null,
  };
}

module.exports = {
  connectMongo,
  disconnectMongo,
  getMongoHealth,
};

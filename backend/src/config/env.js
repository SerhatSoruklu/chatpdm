'use strict';

const path = require('node:path');

function readNumber(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: readNumber(process.env.PORT, 4301),
  feedbackDbPath: process.env.CHATPDM_FEEDBACK_DB_PATH
    || path.resolve(__dirname, '../../data/chatpdm-feedback.sqlite'),
};

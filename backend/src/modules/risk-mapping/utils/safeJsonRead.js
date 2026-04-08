'use strict';

const fs = require('node:fs');

/**
 * @param {string} filePath
 * @returns {unknown}
 */
function safeJsonRead(filePath) {
  if (typeof filePath !== 'string' || filePath.trim().length === 0) {
    throw new TypeError('safeJsonRead requires a non-empty file path string.');
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error && typeof error === 'object') {
      if (error.code === 'ENOENT') {
        throw new Error(`Missing JSON artifact: ${filePath}`);
      }

      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON artifact: ${filePath}`);
      }
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read JSON artifact: ${filePath}: ${message}`);
  }
}

module.exports = Object.freeze({
  safeJsonRead,
});


'use strict';

const { runPackRegressionSuite } = require('./reference-pack-lifecycle');

function runReferencePackRegression(input) {
  return runPackRegressionSuite(
    typeof input === 'object' && input !== null && typeof input.rootDir === 'string'
      ? input.rootDir
      : null,
    typeof input === 'object' && input !== null && typeof input.manifestPath === 'string'
      ? input.manifestPath
      : null,
  );
}

module.exports = {
  runReferencePackRegression,
};

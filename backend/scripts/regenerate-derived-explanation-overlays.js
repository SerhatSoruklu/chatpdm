'use strict';

const path = require('node:path');
const {
  regenerateDerivedExplanationOverlayStore,
} = require('../src/modules/concepts/derived-explanation-overlays');

function main() {
  const snapshot = regenerateDerivedExplanationOverlayStore();
  const conceptCount = Object.keys(snapshot.concepts).length;
  const outputPath = path.resolve(__dirname, '../../data/generated/derived-explanation-overlays.json');

  process.stdout.write(
    `Regenerated derived explanation overlays for ${conceptCount} concepts at ${outputPath}.\n`,
  );
}

main();

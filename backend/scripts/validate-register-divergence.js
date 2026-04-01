'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { LIVE_CONCEPT_IDS } = require('../src/modules/concepts/constants');
const { validateConceptShape } = require('../src/modules/concepts/concept-loader');
const { validateRegisterDivergenceForConcept } = require('../src/modules/concepts/register-divergence-validator');

const conceptsDirectory = path.resolve(__dirname, '../../data/concepts');
const NON_CONCEPT_PACKET_FILES = new Set([
  'concept-admission-state.json',
  'overlap-boundary-change-approvals.json',
  'overlap-classification-snapshot.json',
  'resolve-rules.json',
]);

function loadPublishedConceptPackets() {
  return fs.readdirSync(conceptsDirectory)
    .filter((fileName) => fileName.endsWith('.json'))
    .filter((fileName) => !NON_CONCEPT_PACKET_FILES.has(fileName))
    .sort()
    .map((fileName) => {
      const conceptId = path.basename(fileName, '.json');
      const concept = JSON.parse(fs.readFileSync(path.join(conceptsDirectory, fileName), 'utf8'));

      validateConceptShape(concept, conceptId);
      return concept;
    });
}

function main() {
  const concepts = loadPublishedConceptPackets();
  const activeConceptIds = new Set(LIVE_CONCEPT_IDS);
  const inactivePublishedConceptIds = concepts
    .map((concept) => concept.conceptId)
    .filter((conceptId) => !activeConceptIds.has(conceptId));
  const validRegisterCount = {
    1: 0,
    2: 0,
    3: 0,
  };
  const failureCategoryCounts = new Map();
  let hasFatalFailure = false;

  concepts.forEach((concept) => {
    const validation = validateRegisterDivergenceForConcept(concept);
    const availableModes = validation.availableModes.join(',') || 'none';

    if (!validation.availableModes.includes('standard')) {
      hasFatalFailure = true;
      process.stdout.write(`FAIL ${concept.conceptId} availableModes=${availableModes} reasonCodes=STANDARD_NOT_AVAILABLE\n`);
    } else {
      validRegisterCount[validation.availableModes.length] += 1;
      process.stdout.write(`PASS ${concept.conceptId} availableModes=${availableModes}\n`);
    }

    ['standard', 'simplified', 'formal'].forEach((modeName) => {
      const modeValidation = validation.modes[modeName];

      if (modeValidation.status !== 'rejected') {
        return;
      }

      const reasonCodes = modeValidation.reasons.map((reason) => reason.code);

      reasonCodes.forEach((code) => {
        failureCategoryCounts.set(code, (failureCategoryCounts.get(code) || 0) + 1);
      });

      process.stdout.write(
        `REJECT ${concept.conceptId}.${modeName} reasonCodes=${reasonCodes.join(',')} details=${JSON.stringify(modeValidation.reasons)}\n`,
      );
    });
  });

  process.stdout.write(
    `SUMMARY valid_register_counts={1:${validRegisterCount[1]},2:${validRegisterCount[2]},3:${validRegisterCount[3]}}\n`,
  );
  process.stdout.write(
    `SUMMARY concept_inventory={published:${concepts.length},active:${LIVE_CONCEPT_IDS.length},inactive_published:${inactivePublishedConceptIds.length}}\n`,
  );

  if (failureCategoryCounts.size > 0) {
    process.stdout.write(
      `SUMMARY failure_categories=${JSON.stringify(Object.fromEntries([...failureCategoryCounts.entries()].sort()))}\n`,
    );
  }

  if (inactivePublishedConceptIds.length > 0) {
    process.stdout.write(
      `SUMMARY inactive_published_concepts=${JSON.stringify(inactivePublishedConceptIds)}\n`,
    );
  }

  if (hasFatalFailure) {
    process.exitCode = 1;
    return;
  }

  process.stdout.write('ChatPDM register divergence validation passed.\n');
}

main();

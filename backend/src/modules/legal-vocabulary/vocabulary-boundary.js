'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  LIVE_CONCEPT_IDS,
  REJECTED_CONCEPT_IDS,
  VISIBLE_ONLY_PUBLIC_CONCEPT_IDS,
} = require('../concepts/admission-state');
const {
  loadLegalVocabularyRegistry,
} = require('./recognition-registry-loader');

const conceptsDirectoryPath = path.resolve(__dirname, '../../../../data/concepts');

function isPublishedConceptPacketRecord(record) {
  return Boolean(
    record
    && typeof record === 'object'
    && !Array.isArray(record)
    && typeof record.concept === 'string'
    && record.concept.trim() !== ''
    && Number.isInteger(record.version)
    && typeof record.state === 'string'
    && record.state.trim() !== '',
  );
}

function loadPublishedConceptPacketCount() {
  const entries = fs.readdirSync(conceptsDirectoryPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(conceptsDirectoryPath, entry.name))
    .reduce((count, filePath) => {
      const record = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return count + (isPublishedConceptPacketRecord(record) ? 1 : 0);
    }, 0);
}

function buildVocabularyBoundaryResponse() {
  const registry = loadLegalVocabularyRegistry();
  const terms = Array.from(registry.recordsByTerm.keys()).sort((left, right) => (
    left.localeCompare(right)
  ));

  return {
    total: registry.totalTerms,
    terms,
    buckets: registry.countsByClassification,
    surfaceCounts: {
      publishedConceptPackets: loadPublishedConceptPacketCount(),
      liveRuntimeConcepts: LIVE_CONCEPT_IDS.length,
      visibleOnlyConcepts: VISIBLE_ONLY_PUBLIC_CONCEPT_IDS.length,
      rejectedConcepts: REJECTED_CONCEPT_IDS.length,
    },
  };
}

module.exports = {
  buildVocabularyBoundaryResponse,
  loadPublishedConceptPacketCount,
};

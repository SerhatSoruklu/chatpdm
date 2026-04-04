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
const {
  loadTermDefinitions,
} = require('./term-definitions');

const conceptsDirectoryPath = path.resolve(__dirname, '../../../../data/concepts');
let cachedConceptPacketIndex = null;

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

function loadConceptPacketIndex() {
  if (cachedConceptPacketIndex) {
    return cachedConceptPacketIndex;
  }

  const entries = fs.readdirSync(conceptsDirectoryPath, { withFileTypes: true });
  const packets = new Map();

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue;
    }

    const filePath = path.join(conceptsDirectoryPath, entry.name);

    try {
      const record = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      if (isPublishedConceptPacketRecord(record)) {
        packets.set(record.concept, record);
      }
    } catch (_error) {
      continue;
    }
  }

  cachedConceptPacketIndex = packets;
  return cachedConceptPacketIndex;
}

function formatTitleCase(value) {
  return value
    .split(' ')
    .map((word) => {
      if (word === '/' || word.length === 0) {
        return word;
      }

      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function formatFamilyLabel(rawFamily) {
  return rawFamily
    .split(' / ')
    .map((segment) => formatTitleCase(segment.trim()))
    .join(' / ');
}

function formatClassificationLabel(classification) {
  return formatTitleCase(classification.replaceAll('_', ' '));
}

function firstSentence(value) {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return '';
  }

  const sentenceEnd = trimmed.search(/[.!?]\s/);
  if (sentenceEnd === -1) {
    return trimmed;
  }

  return trimmed.slice(0, sentenceEnd + 1).trim();
}

function buildRegistryOnlyEntry(term, family, classification) {
  const familyLabel = formatFamilyLabel(family);
  const classificationLabel = formatClassificationLabel(classification);

  return {
    term,
    family,
    familyLabel,
    classification,
    classificationLabel,
    sourceStatus: 'registry_only',
    sourceStatusLabel: 'Registry-only',
    shortMeaning: `${familyLabel} registry term.`,
    example: null,
    nearMiss: null,
    nonGoal: 'This surface does not invent a canonical definition for registry-only rows.',
    boundaryNote: `Registry term classified as ${classificationLabel.toLowerCase()}.`,
    relatedTerms: [],
  };
}

function getPacketBoundaryNote(packet) {
  const primaryNote = packet?.coreMeaning ?? packet?.shortDefinition ?? '';
  if (primaryNote.trim().length > 0) {
    return primaryNote.trim();
  }

  const comparisonKeys = packet?.comparison ? Object.keys(packet.comparison) : [];
  const firstComparison = comparisonKeys.length > 0 ? packet.comparison[comparisonKeys[0]] : null;
  const axisStatement = firstComparison?.axes?.find((axis) => typeof axis?.statement === 'string')?.statement;
  return typeof axisStatement === 'string' ? axisStatement : '';
}

function getPacketExample(packet) {
  if (!packet || typeof packet !== 'object') {
    return null;
  }

  const boundaryProofValues = packet.boundaryProofs ? Object.values(packet.boundaryProofs) : [];
  for (const proof of boundaryProofValues) {
    if (proof && typeof proof.validSeparationExample === 'string' && proof.validSeparationExample.trim() !== '') {
      return proof.validSeparationExample.trim();
    }
    if (proof && typeof proof.boundaryStatement === 'string' && proof.boundaryStatement.trim() !== '') {
      return proof.boundaryStatement.trim();
    }
  }

  if (packet.reviewMetadata?.contrast_prompts?.length > 0) {
    return packet.reviewMetadata.contrast_prompts[0];
  }

  const comparisonKeys = packet.comparison ? Object.keys(packet.comparison) : [];
  for (const key of comparisonKeys) {
    const comparison = packet.comparison[key];
    const statement = comparison?.axes?.find((axis) => typeof axis?.statement === 'string')?.statement;
    if (typeof statement === 'string' && statement.trim() !== '') {
      return statement.trim();
    }
  }

  return null;
}

function getPacketNearMiss(packet) {
  if (packet?.reviewMetadata?.contrast_prompts?.length > 0) {
    return packet.reviewMetadata.contrast_prompts[0];
  }

  const comparisonKeys = packet?.comparison ? Object.keys(packet.comparison) : [];
  for (const key of comparisonKeys) {
    const comparison = packet.comparison[key];
    const statement = comparison?.axes?.find((axis) => typeof axis?.statement === 'string')?.statement;
    if (typeof statement === 'string' && statement.trim() !== '') {
      return statement.trim();
    }
  }

  return null;
}

function getPacketNonGoal(packet) {
  const excluded = packet?.canonical?.excludes;
  if (Array.isArray(excluded) && excluded.length > 0) {
    return `Does not mean: ${excluded.join('; ')}.`;
  }

  const whatItIsNot = packet?.reviewMetadata?.what_it_is_not;
  if (Array.isArray(whatItIsNot) && whatItIsNot.length > 0) {
    return `Does not mean: ${whatItIsNot.join('; ')}.`;
  }

  return null;
}

function getPacketRelatedTerms(packet) {
  const relatedTerms = new Set();

  if (Array.isArray(packet?.relatedConcepts)) {
    for (const entry of packet.relatedConcepts) {
      if (entry && typeof entry.conceptId === 'string') {
        relatedTerms.add(entry.conceptId);
      }
    }
  }

  if (Array.isArray(packet?.reviewMetadata?.related_concepts)) {
    for (const related of packet.reviewMetadata.related_concepts) {
      if (typeof related === 'string' && related.trim() !== '') {
        relatedTerms.add(related.trim());
      }
    }
  }

  if (packet?.boundaryProofs && typeof packet.boundaryProofs === 'object') {
    for (const related of Object.keys(packet.boundaryProofs)) {
      relatedTerms.add(related);
    }
  }

  return [...relatedTerms];
}

function buildPacketBackedEntry(term, family, classification, packet) {
  const familyLabel = formatFamilyLabel(family);
  const classificationLabel = formatClassificationLabel(classification);
  const shortMeaning = packet.shortDefinition ?? firstSentence(packet.coreMeaning ?? packet.fullDefinition ?? '');
  const boundaryNote = getPacketBoundaryNote(packet);
  const example = getPacketExample(packet);
  const nearMiss = getPacketNearMiss(packet);
  const nonGoal = getPacketNonGoal(packet);
  const relatedTerms = getPacketRelatedTerms(packet);

  return {
    term,
    family,
    familyLabel,
    classification,
    classificationLabel,
    sourceStatus: 'packet_backed',
    sourceStatusLabel: 'Packet-backed',
    shortMeaning: shortMeaning || `${familyLabel} concept packet.`,
    example,
    nearMiss,
    nonGoal,
    boundaryNote: boundaryNote || null,
    relatedTerms,
  };
}

function attachOptionalTermDefinition(term, entry) {
  const termDefinitions = loadTermDefinitions();
  const definition = termDefinitions.definitionsByTerm.get(term);

  if (!definition) {
    return entry;
  }

  return {
    ...entry,
    definition,
  };
}

function buildVocabularyBoundaryEntry(term, record) {
  const conceptPackets = loadConceptPacketIndex();
  const packet = conceptPackets.get(term) ?? null;

  if (packet) {
    return attachOptionalTermDefinition(
      term,
      buildPacketBackedEntry(term, record.family, record.classification, packet),
    );
  }

  return attachOptionalTermDefinition(
    term,
    buildRegistryOnlyEntry(term, record.family, record.classification),
  );
}

function buildVocabularyBoundaryResponse() {
  const registry = loadLegalVocabularyRegistry();
  const terms = Array.from(registry.recordsByTerm.keys()).sort((left, right) => (
    left.localeCompare(right)
  ));
  const entries = terms.map((term) => buildVocabularyBoundaryEntry(term, registry.recordsByTerm.get(term)));

  return {
    total: registry.totalTerms,
    terms,
    entries,
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

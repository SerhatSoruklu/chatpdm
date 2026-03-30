'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  CONCEPT_RELATION_SCHEMA_VERSION,
  GOVERNANCE_CONCEPT_IDS,
  RELATION_BASIS_KINDS,
  RELATION_EFFECT_KINDS,
  RELATION_TYPES,
} = require('./concept-relation-schema');
const { getRelationPolicy } = require('./relation-policy');
const { assertCanonicalStoreFreeOfAiMarkers } = require('../../lib/ai-governance-guard');

const relationPacketsDirectory = path.resolve(__dirname, '../../../../data/concepts/relations');

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function createPacketEntry(code, conceptId, detail, filePath, relationIndex = null) {
  return {
    code,
    conceptId,
    filePath,
    relationIndex,
    detail,
  };
}

function isValidConditions(value) {
  if (value === undefined) {
    return true;
  }

  if (!isPlainObject(value)) {
    return false;
  }

  return ['when', 'unless'].every((key) => (
    value[key] === undefined
    || (
      Array.isArray(value[key])
      && value[key].every(isNonEmptyString)
    )
  ));
}

function validateRelationRecordShape(relation, conceptId, filePath, relationIndex) {
  const failures = [];

  if (!isPlainObject(relation)) {
    failures.push(createPacketEntry(
      'RELATION_SCHEMA_VIOLATION',
      conceptId,
      'Relation entry must be an object.',
      filePath,
      relationIndex,
    ));
    return failures;
  }

  if (relation.schemaVersion !== CONCEPT_RELATION_SCHEMA_VERSION) {
    failures.push(createPacketEntry(
      'RELATION_SCHEMA_VIOLATION',
      conceptId,
      `Relation schemaVersion must equal ${CONCEPT_RELATION_SCHEMA_VERSION}.`,
      filePath,
      relationIndex,
    ));
  }

  if (!isPlainObject(relation.subject) || relation.subject.conceptId !== conceptId) {
    failures.push(createPacketEntry(
      'RELATION_SCHEMA_VIOLATION',
      conceptId,
      'Relation subject.conceptId must match the packet conceptId.',
      filePath,
      relationIndex,
    ));
  }

  if (!isPlainObject(relation.target) || !GOVERNANCE_CONCEPT_IDS.includes(relation.target.conceptId)) {
    failures.push(createPacketEntry(
      'RELATION_SCHEMA_VIOLATION',
      conceptId,
      'Relation target.conceptId must be one of the governance concept IDs.',
      filePath,
      relationIndex,
    ));
  }

  if (!Object.values(RELATION_TYPES).includes(relation.type)) {
    failures.push(createPacketEntry(
      'RELATION_SCHEMA_VIOLATION',
      conceptId,
      'Relation type is not supported by the concept relation schema.',
      filePath,
      relationIndex,
    ));
  }

  if (!isPlainObject(relation.basis) || !RELATION_BASIS_KINDS.includes(relation.basis.kind) || !isNonEmptyString(relation.basis.description)) {
    failures.push(createPacketEntry(
      'RELATION_SCHEMA_VIOLATION',
      conceptId,
      'Relation basis must include a supported kind and non-empty description.',
      filePath,
      relationIndex,
    ));
  }

  if (!isValidConditions(relation.conditions)) {
    failures.push(createPacketEntry(
      'RELATION_SCHEMA_VIOLATION',
      conceptId,
      'Relation conditions must use string arrays for when/unless.',
      filePath,
      relationIndex,
    ));
  }

  if (!isPlainObject(relation.effect) || !RELATION_EFFECT_KINDS.includes(relation.effect.kind) || !isNonEmptyString(relation.effect.description)) {
    failures.push(createPacketEntry(
      'RELATION_SCHEMA_VIOLATION',
      conceptId,
      'Relation effect must include a supported kind and non-empty description.',
      filePath,
      relationIndex,
    ));
  }

  if (!isPlainObject(relation.status) || typeof relation.status.active !== 'boolean' || typeof relation.status.blocking !== 'boolean') {
    failures.push(createPacketEntry(
      'RELATION_SCHEMA_VIOLATION',
      conceptId,
      'Relation status must include boolean active and blocking fields.',
      filePath,
      relationIndex,
    ));
  }

  return failures;
}

function validatePacketShape(packet, conceptId, filePath) {
  const failures = [];

  if (!isPlainObject(packet)) {
    failures.push(createPacketEntry(
      'RELATION_PACKET_INVALID',
      conceptId,
      'Relation packet must be a JSON object.',
      filePath,
    ));
    return failures;
  }

  if (packet.schemaVersion !== CONCEPT_RELATION_SCHEMA_VERSION) {
    failures.push(createPacketEntry(
      'RELATION_PACKET_INVALID',
      conceptId,
      `Packet schemaVersion must equal ${CONCEPT_RELATION_SCHEMA_VERSION}.`,
      filePath,
    ));
  }

  if (packet.conceptId !== conceptId) {
    failures.push(createPacketEntry(
      'RELATION_PACKET_INVALID',
      conceptId,
      `Packet conceptId must equal "${conceptId}".`,
      filePath,
    ));
  }

  if (!Array.isArray(packet.relations)) {
    failures.push(createPacketEntry(
      'RELATION_PACKET_INVALID',
      conceptId,
      'Packet relations must be an array.',
      filePath,
    ));
    return failures;
  }

  packet.relations.forEach((relation, relationIndex) => {
    failures.push(...validateRelationRecordShape(relation, conceptId, filePath, relationIndex));
  });

  return failures;
}

function loadAuthoredRelationPackets(options = {}) {
  const relationPolicy = getRelationPolicy();
  const strictMode = options.requireAuthoredRelations ?? relationPolicy.requireAuthoredRelations;
  const directory = typeof options.directory === 'string' && options.directory.trim() !== ''
    ? options.directory
    : relationPacketsDirectory;
  const packetResults = [];
  const failures = [];
  const warnings = [];
  const relations = [];
  const missingConceptIds = [];

  GOVERNANCE_CONCEPT_IDS.forEach((conceptId) => {
    const filePath = path.join(directory, `${conceptId}.json`);

    if (!fs.existsSync(filePath)) {
      missingConceptIds.push(conceptId);

      if (strictMode) {
        const failure = createPacketEntry(
          'RELATION_REQUIRED_MISSING_STRICT',
          conceptId,
          'Authored relation packet is required because REQUIRE_AUTHORED_RELATIONS is enabled.',
          filePath,
        );
        failures.push(failure);
        packetResults.push({
          conceptId,
          filePath,
          present: false,
          passed: false,
          source: 'authored',
          relationCount: 0,
          failures: [failure],
          warnings: [],
        });
      } else {
        const packetMissingWarning = createPacketEntry(
          'RELATION_PACKET_MISSING',
          conceptId,
          'Authored relation packet is missing; fallback relation seeds may be used.',
          filePath,
        );
        const fallbackWarning = createPacketEntry(
          'RELATION_FALLBACK_USED',
          conceptId,
          'Fallback relation seeds were used because an authored relation packet is missing.',
          filePath,
        );
        warnings.push(packetMissingWarning, fallbackWarning);
        packetResults.push({
          conceptId,
          filePath,
          present: false,
          passed: false,
          source: 'fallback',
          relationCount: 0,
          failures: [],
          warnings: [packetMissingWarning, fallbackWarning],
        });
      }

      return;
    }

    let packet = null;

    try {
      packet = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      assertCanonicalStoreFreeOfAiMarkers(packet, `Relation packet "${conceptId}"`);
    } catch (error) {
      const failure = createPacketEntry(
        'RELATION_PACKET_INVALID',
        conceptId,
        `Relation packet could not be loaded safely: ${error.message}`,
        filePath,
      );
      failures.push(failure);
      packetResults.push({
        conceptId,
        filePath,
        present: true,
        passed: false,
        source: 'authored',
        relationCount: 0,
        failures: [failure],
        warnings: [],
      });
      return;
    }

    const packetFailures = validatePacketShape(packet, conceptId, filePath);

    if (packetFailures.length > 0) {
      failures.push(...packetFailures);
      packetResults.push({
        conceptId,
        filePath,
        present: true,
        passed: false,
        source: 'authored',
        relationCount: 0,
        failures: packetFailures,
        warnings: [],
      });
      return;
    }

    relations.push(...packet.relations);
    packetResults.push({
      conceptId,
      filePath,
      present: true,
      passed: true,
      source: 'authored',
      relationCount: packet.relations.length,
      failures: [],
      warnings: [],
    });
  });

  const fallbackUsed = missingConceptIds.length > 0 && !strictMode;
  const source = fallbackUsed && !strictMode ? 'fallback' : 'authored';

  return {
    passed: failures.length === 0,
    strictMode,
    source,
    dataSource: source === 'authored' ? 'authored_relation_packets' : 'default_seed_relations',
    relationDataPresent: source === 'authored' && failures.length === 0 && !fallbackUsed,
    fallbackUsed,
    relations,
    packetResults,
    failures,
    warnings,
    missingConceptIds,
  };
}

module.exports = {
  loadAuthoredRelationPackets,
  relationPacketsDirectory,
};

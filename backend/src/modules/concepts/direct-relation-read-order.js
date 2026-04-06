'use strict';

const { DIRECT_RELATION_READ_SUPPORTED_TYPES } = require('./direct-relation-read-types');

const DIRECT_RELATION_READ_TYPE_PRIORITY = Object.freeze(
  new Map(DIRECT_RELATION_READ_SUPPORTED_TYPES.map((type, index) => [type, index])),
);

function compareStrings(left, right) {
  return (left ?? '').localeCompare(right ?? '');
}

function compareMaybeStringArrays(left, right) {
  return compareStrings(
    Array.isArray(left) ? left.join('\u0000') : '',
    Array.isArray(right) ? right.join('\u0000') : '',
  );
}

function compareRelationEntries(left, right) {
  const leftPriority = DIRECT_RELATION_READ_TYPE_PRIORITY.get(left?.type);
  const rightPriority = DIRECT_RELATION_READ_TYPE_PRIORITY.get(right?.type);
  const normalizedLeftPriority = leftPriority ?? Number.MAX_SAFE_INTEGER;
  const normalizedRightPriority = rightPriority ?? Number.MAX_SAFE_INTEGER;

  if (normalizedLeftPriority !== normalizedRightPriority) {
    return normalizedLeftPriority - normalizedRightPriority;
  }

  return (
    compareStrings(left?.subject?.conceptId, right?.subject?.conceptId)
    || compareStrings(left?.target?.conceptId, right?.target?.conceptId)
    || compareStrings(left?.subject?.path, right?.subject?.path)
    || compareStrings(left?.target?.path, right?.target?.path)
    || compareStrings(left?.subject?.label, right?.subject?.label)
    || compareStrings(left?.target?.label, right?.target?.label)
    || compareStrings(left?.basis?.kind, right?.basis?.kind)
    || compareStrings(left?.effect?.kind, right?.effect?.kind)
    || compareMaybeStringArrays(left?.conditions?.when, right?.conditions?.when)
    || compareMaybeStringArrays(left?.conditions?.unless, right?.conditions?.unless)
    || compareStrings(left?.basis?.description, right?.basis?.description)
    || compareStrings(left?.effect?.description, right?.effect?.description)
    || compareStrings(left?.status?.note, right?.status?.note)
    || compareStrings(String(left?.schemaVersion ?? ''), String(right?.schemaVersion ?? ''))
    || compareStrings(String(left?.status?.active ?? ''), String(right?.status?.active ?? ''))
    || compareStrings(String(left?.status?.blocking ?? ''), String(right?.status?.blocking ?? ''))
  );
}

function normalizeDirectRelationEntries(entries) {
  return [...entries].sort(compareRelationEntries);
}

module.exports = {
  DIRECT_RELATION_READ_TYPE_PRIORITY,
  compareRelationEntries,
  normalizeDirectRelationEntries,
};

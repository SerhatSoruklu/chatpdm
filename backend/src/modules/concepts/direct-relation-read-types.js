'use strict';

const { RELATION_TYPES } = require('./concept-relation-schema');

// Phase 12.8B keeps public exposure aligned with the authored direct-relation set.
// Exposure is a public-surface policy; relation existence in governed data is separate.
const DIRECT_RELATION_READ_SUPPORTED_TYPES = Object.freeze([
  RELATION_TYPES.GROUNDS_DUTY,
  RELATION_TYPES.TRIGGERS_RESPONSIBILITY,
  RELATION_TYPES.VALIDATES_AUTHORITY,
  RELATION_TYPES.REQUIRES_AUTHORITY,
  RELATION_TYPES.DOES_NOT_IMPLY,
]);

const DIRECT_RELATION_READ_EXPOSED_TYPES = DIRECT_RELATION_READ_SUPPORTED_TYPES;
const DIRECT_RELATION_READ_SUPPORTED_TYPE_SET = new Set(DIRECT_RELATION_READ_SUPPORTED_TYPES);

function isDirectRelationReadSupportedType(type) {
  return DIRECT_RELATION_READ_SUPPORTED_TYPE_SET.has(type);
}

function isDirectRelationReadExposedType(type) {
  return isDirectRelationReadSupportedType(type);
}

module.exports = {
  DIRECT_RELATION_READ_EXPOSED_TYPES,
  DIRECT_RELATION_READ_SUPPORTED_TYPE_SET,
  DIRECT_RELATION_READ_SUPPORTED_TYPES,
  isDirectRelationReadExposedType,
  isDirectRelationReadSupportedType,
};

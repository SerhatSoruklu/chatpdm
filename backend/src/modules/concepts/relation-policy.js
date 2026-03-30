'use strict';

function parseBoolean(value, fallbackValue = false) {
  if (typeof value !== 'string') {
    return fallbackValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function getRelationPolicy() {
  const requireAuthoredRelations = parseBoolean(process.env.REQUIRE_AUTHORED_RELATIONS, false);

  return {
    requireAuthoredRelations,
    mode: requireAuthoredRelations ? 'strict' : 'compatible',
  };
}

module.exports = {
  getRelationPolicy,
};

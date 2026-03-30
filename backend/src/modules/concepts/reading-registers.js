'use strict';

const {
  AUTHORED_REGISTER_FIELDS,
  AUTHORED_REGISTER_MODES,
  computeCanonicalConceptHash,
} = require('./concept-loader');
const { validateRegisterDivergenceForConcept } = require('./register-divergence-validator');

function buildRegisterFieldPayload(registerRecord) {
  const payload = {};

  AUTHORED_REGISTER_FIELDS.forEach((fieldName) => {
    payload[fieldName] = registerRecord[fieldName];
  });

  return payload;
}

function buildReadingRegistersForConcept(concept) {
  const registers = {};
  const validation = validateRegisterDivergenceForConcept(concept);

  AUTHORED_REGISTER_MODES.forEach((modeName) => {
    registers[modeName] = buildRegisterFieldPayload(concept.registers[modeName]);
  });

  return {
    readOnly: true,
    canonicalBinding: {
      conceptId: concept.conceptId,
      conceptVersion: concept.version,
      canonicalHash: computeCanonicalConceptHash(concept),
    },
    validation,
    ...registers,
  };
}

module.exports = {
  buildReadingRegistersForConcept,
};

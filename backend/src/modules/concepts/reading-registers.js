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

function assertModePayloadExists(concept, modeName) {
  const registerRecord = concept.registers[modeName];

  if (!registerRecord) {
    throw new Error(`Concept "${concept.conceptId}" is missing authored registers.${modeName}.`);
  }

  return registerRecord;
}

function buildExposedRegisterPayloads(concept, validation) {
  const registers = {};
  const exposedModeSet = new Set(validation.availableModes);

  AUTHORED_REGISTER_MODES.forEach((modeName) => {
    if (!exposedModeSet.has(modeName)) {
      return;
    }

    registers[modeName] = buildRegisterFieldPayload(assertModePayloadExists(concept, modeName));
  });

  return registers;
}

function buildReadingRegistersForConcept(concept) {
  const validation = validateRegisterDivergenceForConcept(concept);

  return {
    readOnly: true,
    canonicalBinding: {
      conceptId: concept.conceptId,
      conceptVersion: concept.version,
      canonicalHash: computeCanonicalConceptHash(concept),
    },
    validation,
    ...buildExposedRegisterPayloads(concept, validation),
  };
}

module.exports = {
  buildExposedRegisterPayloads,
  buildReadingRegistersForConcept,
};

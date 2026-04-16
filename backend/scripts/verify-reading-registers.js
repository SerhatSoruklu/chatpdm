'use strict';

const assert = require('node:assert/strict');
const { resolveConceptQuery } = require('../src/modules/concepts');
const { computeCanonicalConceptHash, loadConceptSet } = require('../src/modules/concepts/concept-loader');
const { buildExposedRegisterPayloads } = require('../src/modules/concepts/reading-registers');
const gate = require('../src/modules/concepts/derived-explanation-reading-lens-gate.json');

function findConcept(concepts, conceptId) {
  const concept = concepts.find((entry) => entry.conceptId === conceptId);
  assert.notEqual(concept, undefined, `Concept "${conceptId}" should exist in the concept set.`);
  return concept;
}

function assertRegisterFieldsEqual(actualFields, expectedFields, context) {
  assert.equal(actualFields.shortDefinition, expectedFields.shortDefinition, `${context}.shortDefinition mismatch.`);
  assert.equal(actualFields.coreMeaning, expectedFields.coreMeaning, `${context}.coreMeaning mismatch.`);
  assert.equal(actualFields.fullDefinition, expectedFields.fullDefinition, `${context}.fullDefinition mismatch.`);
}

function assertReadingRegistersPayload(concept, result, context) {
  assert.equal(result.type, 'concept_match', `${context} must resolve to concept_match.`);

  const { answer, resolution } = result;
  const registers = answer.registers;

  assert.notEqual(registers, null, `${context}.registers is missing.`);
  assert.equal(registers.readOnly, true, `${context}.registers.readOnly mismatch.`);
  assert.equal(registers.canonicalBinding.conceptId, concept.conceptId, `${context}.registers.canonicalBinding.conceptId mismatch.`);
  assert.equal(
    registers.canonicalBinding.conceptVersion,
    resolution.conceptVersion,
    `${context}.registers.canonicalBinding.conceptVersion mismatch.`,
  );
  assert.equal(
    registers.canonicalBinding.canonicalHash,
    computeCanonicalConceptHash(concept),
    `${context}.registers.canonicalBinding.canonicalHash mismatch.`,
  );
  assert.ok(Array.isArray(registers.validation.availableModes), `${context}.registers.validation.availableModes mismatch.`);
  assert.notEqual(registers.validation.modes, null, `${context}.registers.validation.modes mismatch.`);

  const exposedModes = registers.validation.availableModes;
  const presentModes = ['standard', 'simplified', 'formal'].filter(
    (modeName) => Object.hasOwn(registers, modeName),
  );

  assert.deepEqual(
    presentModes,
    exposedModes,
    `${context}.registers payload must be filtered to the exposed modes.`,
  );

  ['standard', 'simplified', 'formal'].forEach((modeName) => {
    assert.equal(
      typeof registers.validation.modes[modeName].status,
      'string',
      `${context}.registers.validation.modes.${modeName}.status mismatch.`,
    );
    assert.ok(
      Array.isArray(registers.validation.modes[modeName].reasons),
      `${context}.registers.validation.modes.${modeName}.reasons mismatch.`,
    );
    assert.equal(
      exposedModes.includes(modeName),
      registers.validation.modes[modeName].status === 'available',
      `${context}.registers.validation exposure mismatch for ${modeName}.`,
    );

    if (presentModes.includes(modeName)) {
      assertRegisterFieldsEqual(
        registers[modeName],
        concept.registers[modeName],
        `${context}.registers.${modeName}`,
      );
    } else {
      assert.equal(
        Object.hasOwn(registers, modeName),
        false,
        `${context}.registers.${modeName} must be omitted when unavailable.`,
      );
    }
  });

  assert.equal(registers.standard.shortDefinition, answer.shortDefinition, `${context}.answer.shortDefinition mismatch.`);
  assert.equal(registers.standard.coreMeaning, answer.coreMeaning, `${context}.answer.coreMeaning mismatch.`);
  assert.equal(registers.standard.fullDefinition, answer.fullDefinition, `${context}.answer.fullDefinition mismatch.`);
  assert.ok(registers.validation.availableModes.includes('standard'), `${context}.registers.validation must expose standard.`);
}

function verifyExposedModeFiltering() {
  const syntheticConcept = {
    conceptId: 'synthetic',
    version: 1,
    registers: {
      standard: {
        shortDefinition: 'Standard short',
        coreMeaning: 'Standard core',
        fullDefinition: 'Standard full',
      },
      simplified: {
        shortDefinition: 'Simplified short',
        coreMeaning: 'Simplified core',
        fullDefinition: 'Simplified full',
      },
      formal: {
        shortDefinition: 'Formal short',
        coreMeaning: 'Formal core',
        fullDefinition: 'Formal full',
      },
    },
  };

  const filteredRegisters = buildExposedRegisterPayloads(syntheticConcept, {
    availableModes: ['standard'],
    modes: {
      standard: { status: 'available', reasons: [] },
      simplified: { status: 'rejected', reasons: [] },
      formal: { status: 'rejected', reasons: [] },
    },
  });

  assert.deepEqual(Object.keys(filteredRegisters), ['standard'], 'filtered register payload must only expose standard.');
  assert.equal(filteredRegisters.standard.shortDefinition, 'Standard short', 'filtered register payload must preserve the standard register payload.');

  process.stdout.write('PASS reading_register_exposure_filtered_to_available_modes\n');
}

function verifyTrustCopyLock() {
  assert.deepEqual(
    gate.modeLabels,
    ['standard', 'simplified', 'formal'],
    'reading register labels must stay locked to Standard/Simplified/Formal.',
  );
  assert.equal(
    gate.trustCopy.primaryLine,
    'Same canonical meaning. Different reading register.',
    'trust copy lock mismatch.',
  );

  const normalizedPrimaryLine = gate.trustCopy.primaryLine.toLowerCase();

  gate.trustCopy.forbiddenPhrases.forEach((phrase) => {
    assert.equal(
      normalizedPrimaryLine.includes(phrase.toLowerCase()),
      false,
      `trust copy must not contain forbidden phrase "${phrase}".`,
    );
  });

  process.stdout.write('PASS reading_register_trust_copy_locked\n');
}

function verifyReadingRegisterPayloads() {
  const concepts = loadConceptSet();
  let verifiedCount = 0;

  gate.semanticParityAudit.conceptIds.forEach((conceptId) => {
    const concept = findConcept(concepts, conceptId);
    const result = resolveConceptQuery(conceptId);

    if (result.type !== 'concept_match') {
      return;
    }

    assertReadingRegistersPayload(concept, result, conceptId);
    verifiedCount += 1;
  });

  assert.ok(verifiedCount > 0, 'reading register verification must cover at least one concept_match surface.');
  process.stdout.write('PASS reading_register_payloads_bound_to_authored_registers\n');
}

function verifyCanonicalVisualAnchorSpec() {
  const concepts = loadConceptSet();
  let verifiedCount = 0;

  gate.semanticParityAudit.conceptIds.forEach((conceptId) => {
    const concept = findConcept(concepts, conceptId);
    const result = resolveConceptQuery(conceptId);

    if (result.type !== 'concept_match') {
      return;
    }

    const registers = result.answer.registers;
    const canonicalHashShort = registers.canonicalBinding.canonicalHash.slice(
      0,
      gate.canonicalVisualAnchor.canonicalHashLength,
    );

    assert.equal(canonicalHashShort.length, gate.canonicalVisualAnchor.canonicalHashLength, `${conceptId} canonical hash short length mismatch.`);
    assert.equal(registers.canonicalBinding.conceptId, conceptId, `${conceptId} canonical visual anchor conceptId mismatch.`);
    assert.equal(registers.canonicalBinding.conceptVersion, concept.version, `${conceptId} canonical visual anchor conceptVersion mismatch.`);
    assert.equal(
      result.answer.sources[0]?.id ?? null,
      concept.sourcePriority?.[0] ?? null,
      `${conceptId} source anchor mismatch.`,
    );
    verifiedCount += 1;
  });

  assert.ok(verifiedCount > 0, 'canonical visual anchor verification must cover at least one concept_match surface.');
  process.stdout.write('PASS reading_register_canonical_visual_anchor_locked\n');
}

function verifyRefusalSurfacesDoNotExposeRegisters() {
  gate.semanticParityAudit.refusalQueries.forEach((query) => {
    const result = resolveConceptQuery(query);
    assert.equal(result.type, 'no_exact_match', `${query} must remain a refusal surface.`);
    assert.equal(Object.hasOwn(result, 'answer'), false, `${query} must not expose reading registers on refusal surfaces.`);
  });

  process.stdout.write('PASS reading_registers_hidden_on_refusal_surfaces\n');
}

function main() {
  verifyTrustCopyLock();
  verifyReadingRegisterPayloads();
  verifyExposedModeFiltering();
  verifyCanonicalVisualAnchorSpec();
  verifyRefusalSurfacesDoNotExposeRegisters();
  process.stdout.write('ChatPDM reading register verification passed.\n');
}

main();

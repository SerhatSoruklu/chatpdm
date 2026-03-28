'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { resolveConceptQuery } = require('../src/modules/concepts');
const { loadConceptSet } = require('../src/modules/concepts/concept-loader');
const manifest = require('../src/modules/concepts/derived-explanation-overlay-manifest.json');
const gate = require('../src/modules/concepts/derived-explanation-reading-lens-gate.json');
const {
  GENERATED_OVERLAY_CERTIFICATE_VERSION,
  GENERATED_OVERLAY_HASH_ALGORITHM,
  GENERATED_OVERLAY_STORE_VERSION,
  GENERATED_OVERLAY_TEMPLATE_VERSION,
  assertPublishedOverlayContract,
  buildGeneratedOverlayContract,
  regenerateDerivedExplanationOverlayStore,
  resolveDerivedExplanationOverlaysForConcept,
} = require('../src/modules/concepts/derived-explanation-overlays');

function withTempStore(callback) {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'chatpdm-derived-overlays-'));
  const storePath = path.join(tempDirectory, 'derived-explanation-overlays.json');

  try {
    callback(storePath);
  } finally {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
}

function findConcept(concepts, conceptId) {
  const concept = concepts.find((entry) => entry.conceptId === conceptId);

  assert.notEqual(concept, undefined, `Concept "${conceptId}" should exist in the seeded concept set.`);

  return concept;
}

function expectedStrategyForMode(modeName) {
  return manifest.modes[modeName].templateId === 'identity-copy.v1' ? 'identity' : 'prefixed_copy';
}

function buildCanonicalVisualAnchor(concept, contract) {
  return {
    conceptId: concept.conceptId,
    canonicalHashShort: contract.canonicalBinding.canonicalHash.slice(0, gate.canonicalVisualAnchor.canonicalHashLength),
    conceptVersion: concept.version,
    sourceAnchor: concept.sourcePriority?.[0] ?? null,
  };
}

function assertManifestPinnedGeneratedOutput(concept, contract, context) {
  assert.equal(contract.canonicalBinding.canonicalHash.length, 64, `${context}.canonicalHash length mismatch.`);

  for (const modeName of ['standard', 'simplified', 'formal']) {
    const mode = contract.modes[modeName];

    assert.equal(
      mode.equivalenceCertificate.templateVersion,
      manifest.templateVersion,
      `${context}.${modeName}.templateVersion mismatch.`,
    );
    assert.equal(
      mode.equivalenceCertificate.certificateVersion,
      manifest.certificateVersion,
      `${context}.${modeName}.certificateVersion mismatch.`,
    );
    assert.equal(
      mode.equivalenceCertificate.mode,
      modeName,
      `${context}.${modeName}.certificate mode mismatch.`,
    );

    for (const fieldName of ['shortDefinition', 'coreMeaning', 'fullDefinition']) {
      const expectedPrefix = manifest.modes[modeName].fieldPrefixes[fieldName];
      assert.equal(
        mode.fields[fieldName],
        `${expectedPrefix}${concept[fieldName]}`,
        `${context}.${modeName}.fields.${fieldName} mismatch.`,
      );
      assert.equal(
        mode.equivalenceCertificate.fieldChecks[fieldName].prefix,
        expectedPrefix,
        `${context}.${modeName}.fieldChecks.${fieldName}.prefix mismatch.`,
      );
      assert.equal(
        mode.equivalenceCertificate.fieldChecks[fieldName].strategy,
        expectedStrategyForMode(modeName),
        `${context}.${modeName}.fieldChecks.${fieldName}.strategy mismatch.`,
      );
    }
  }
}

function assertOverlayModesDoNotOwnCanonicalAncillaryState(mode, context) {
  ['sources', 'citations', 'ambiguity', 'refusal', 'interpretation', 'relatedConcepts'].forEach((fieldName) => {
    assert.equal(Object.hasOwn(mode, fieldName), false, `${context}.${fieldName} must remain outside overlay modes.`);
  });
}

function verifyAtomicGenerationAndPublish() {
  withTempStore((storePath) => {
    const concepts = loadConceptSet();
    const snapshot = regenerateDerivedExplanationOverlayStore({ outputPath: storePath, concepts, currentConcepts: concepts });

    assert.equal(snapshot.storeVersion, manifest.storeVersion, 'overlay store version mismatch.');
    assert.equal(GENERATED_OVERLAY_STORE_VERSION, manifest.storeVersion, 'live module store version must be manifest-pinned.');
    assert.equal(GENERATED_OVERLAY_TEMPLATE_VERSION, manifest.templateVersion, 'live module template version must be manifest-pinned.');
    assert.equal(
      GENERATED_OVERLAY_CERTIFICATE_VERSION,
      manifest.certificateVersion,
      'live module certificate version must be manifest-pinned.',
    );
    assert.equal(GENERATED_OVERLAY_HASH_ALGORITHM, manifest.hashAlgorithm, 'live module hash algorithm must be manifest-pinned.');
    assert.ok(fs.existsSync(storePath), 'overlay store should be written atomically.');

    concepts.forEach((concept) => {
      const publishedContract = snapshot.concepts[concept.conceptId];
      assertPublishedOverlayContract(concept, publishedContract);
      assertManifestPinnedGeneratedOutput(concept, publishedContract, `publishedContract.${concept.conceptId}`);
    });
  });

  process.stdout.write('PASS overlay_atomic_generation_and_publish\n');
}

function verifyCertificationFailureIsRejected() {
  const concept = findConcept(loadConceptSet(), 'authority');
  const contract = buildGeneratedOverlayContract(concept);
  contract.modes.formal.fields.fullDefinition = 'Formal framing: drifted output';

  assert.throws(
    () => assertPublishedOverlayContract(concept, contract),
    /failed deterministic certification/,
    'certification should reject drifted generated overlays.',
  );

  process.stdout.write('PASS overlay_certification_rejects_drift\n');
}

function verifyFailedGenerationLeavesPreviousPublishActive() {
  withTempStore((storePath) => {
    const concepts = loadConceptSet();
    regenerateDerivedExplanationOverlayStore({ outputPath: storePath, concepts, currentConcepts: concepts });
    const previousStore = fs.readFileSync(storePath, 'utf8');

    const invalidConcepts = concepts.map((concept) => ({ ...concept }));
    invalidConcepts[0].shortDefinition = '';

    assert.throws(
      () => regenerateDerivedExplanationOverlayStore({
        outputPath: storePath,
        concepts: invalidConcepts,
        currentConcepts: invalidConcepts,
      }),
      /invalid shortDefinition/,
      'generation failure should block publish.',
    );

    assert.equal(fs.readFileSync(storePath, 'utf8'), previousStore, 'failed generation must not replace the previous store.');

    const unaffectedConcept = findConcept(concepts, 'duty');
    const resolved = resolveDerivedExplanationOverlaysForConcept(unaffectedConcept, { storePath });
    assert.equal(resolved.status, 'generated', 'previous valid overlay state should remain active for unaffected concepts.');
  });

  process.stdout.write('PASS overlay_failed_generation_preserves_previous_publish\n');
}

function verifyCanonicalBindingInvalidatesStaleOverlays() {
  withTempStore((storePath) => {
    const concepts = loadConceptSet();
    regenerateDerivedExplanationOverlayStore({ outputPath: storePath, concepts, currentConcepts: concepts });

    const updatedAuthority = {
      ...findConcept(concepts, 'authority'),
      fullDefinition: `${findConcept(concepts, 'authority').fullDefinition}\n\nA later canonical revision changes this definition boundary.`,
    };

    const resolved = resolveDerivedExplanationOverlaysForConcept(updatedAuthority, { storePath });
    assert.equal(resolved.status, 'pending_generation', 'canonical hash mismatch should invalidate stale overlays.');
    assert.equal(resolved.modes.standard.fields.shortDefinition, null, 'stale overlays must not remain active.');
    assert.equal(resolved.modes.simplified.fields.coreMeaning, null, 'stale overlays must not remain active.');
    assert.equal(resolved.modes.formal.fields.fullDefinition, null, 'stale overlays must not remain active.');
  });

  process.stdout.write('PASS overlay_canonical_binding_invalidates_stale_publish\n');
}

function verifyCorruptPublishedOverlayFailsClosed() {
  withTempStore((storePath) => {
    const concepts = loadConceptSet();
    const snapshot = regenerateDerivedExplanationOverlayStore({ outputPath: storePath, concepts, currentConcepts: concepts });
    snapshot.concepts.authority.modes.simplified.fields.coreMeaning = 'Simplified explanation: corrupted output';
    fs.writeFileSync(storePath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

    const resolved = resolveDerivedExplanationOverlaysForConcept(findConcept(concepts, 'authority'), { storePath });
    assert.equal(resolved.status, 'invalid', 'corrupted published overlays should fail closed.');
    assert.equal(resolved.modes.standard.fields.shortDefinition, null, 'invalid overlays must not leak generated text.');
  });

  process.stdout.write('PASS overlay_corrupt_publish_fails_closed\n');
}

function verifyOverlayLagWindowAllowsFreshPublishedStore() {
  withTempStore((storePath) => {
    const concepts = loadConceptSet();
    const nowMs = 1_750_000_000_000;

    regenerateDerivedExplanationOverlayStore({
      outputPath: storePath,
      concepts,
      currentConcepts: concepts,
      nowMs,
    });

    const resolved = resolveDerivedExplanationOverlaysForConcept(findConcept(concepts, 'authority'), {
      storePath,
      nowMs: nowMs + manifest.maxSemanticLagMs - 1,
    });

    assert.equal(resolved.status, 'generated', 'fresh published overlays should remain active within the lag window.');
  });

  process.stdout.write('PASS overlay_lag_window_allows_fresh_publish\n');
}

function verifyExpiredLagWindowDowngradesToPending() {
  withTempStore((storePath) => {
    const concepts = loadConceptSet();
    const nowMs = 1_750_000_000_000;

    regenerateDerivedExplanationOverlayStore({
      outputPath: storePath,
      concepts,
      currentConcepts: concepts,
      nowMs,
    });

    const resolved = resolveDerivedExplanationOverlaysForConcept(findConcept(concepts, 'authority'), {
      storePath,
      nowMs: nowMs + manifest.maxSemanticLagMs + 1,
    });

    assert.equal(resolved.status, 'pending_generation', 'expired published overlays should downgrade to pending generation.');
    assert.equal(resolved.modes.standard.fields.shortDefinition, null, 'expired overlays must not leak generated text.');
  });

  process.stdout.write('PASS overlay_lag_window_expires_stale_publish\n');
}

function verifyTrustCopyLock() {
  assert.deepEqual(
    gate.modeLabels,
    ['standard', 'simplified', 'formal'],
    'reading lens labels must stay locked to Standard/Simplified/Formal.',
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

  process.stdout.write('PASS overlay_trust_copy_locked\n');
}

function verifySemanticParityAuditGate() {
  const concepts = loadConceptSet();

  gate.semanticParityAudit.conceptIds.forEach((conceptId) => {
    const concept = findConcept(concepts, conceptId);
    const result = resolveConceptQuery(conceptId);

    assert.equal(result.type, 'concept_match', `${conceptId} must resolve to concept_match for the parity gate.`);
    assert.deepEqual(result.answer.sources, concept.sources, `${conceptId} source parity mismatch.`);

    const contract = result.answer.derivedExplanationOverlays;
    assert.equal(contract.status, 'generated', `${conceptId} overlay contract must be generated for parity audit.`);
    assert.equal(contract.canonicalBinding.conceptId, conceptId, `${conceptId} canonicalBinding.conceptId mismatch.`);
    assert.equal(contract.canonicalBinding.conceptVersion, concept.version, `${conceptId} canonicalBinding.conceptVersion mismatch.`);

    gate.modeLabels.forEach((modeName) => {
      const mode = contract.modes[modeName];
      assert.equal(mode.status, 'generated', `${conceptId}.${modeName} should remain generated during the parity audit.`);
      assert.equal(
        mode.equivalenceCertificate.canonicalHash,
        contract.canonicalBinding.canonicalHash,
        `${conceptId}.${modeName} certificate canonicalHash mismatch.`,
      );
      assertOverlayModesDoNotOwnCanonicalAncillaryState(mode, `${conceptId}.${modeName}`);
    });

    ['shortDefinition', 'coreMeaning', 'fullDefinition'].forEach((fieldName) => {
      assert.equal(
        contract.modes.standard.fields[fieldName],
        concept[fieldName],
        `${conceptId}.standard.${fieldName} must preserve canonical text exactly.`,
      );

      gate.modeLabels
        .filter((modeName) => modeName !== 'standard')
        .forEach((modeName) => {
          const expectedPrefix = manifest.modes[modeName].fieldPrefixes[fieldName];
          const actualValue = contract.modes[modeName].fields[fieldName];

          assert.equal(
            actualValue,
            `${expectedPrefix}${concept[fieldName]}`,
            `${conceptId}.${modeName}.${fieldName} must remain a register shift only.`,
          );
          assert.equal(
            actualValue.endsWith(concept[fieldName]),
            true,
            `${conceptId}.${modeName}.${fieldName} must preserve the canonical suffix verbatim.`,
          );
        });
    });
  });

  gate.semanticParityAudit.ambiguityQueries.forEach((query) => {
    const result = resolveConceptQuery(query);
    assert.equal(result.type, 'ambiguous_match', `${query} must remain an ambiguity surface.`);
    assert.equal(Object.hasOwn(result, 'answer'), false, `${query} must not expose a concept answer during ambiguity handling.`);
  });

  gate.semanticParityAudit.refusalQueries.forEach((query) => {
    const result = resolveConceptQuery(query);
    assert.equal(result.type, 'no_exact_match', `${query} must remain a refusal surface.`);
    assert.equal(Object.hasOwn(result, 'answer'), false, `${query} must not expose concept overlays on refusal surfaces.`);
    assert.notEqual(result.interpretation, null, `${query} refusal interpretation must remain present.`);
  });

  process.stdout.write('PASS overlay_semantic_parity_release_gate\n');
}

function verifyCanonicalVisualAnchorSpec() {
  assert.deepEqual(
    gate.canonicalVisualAnchor.requiredStaticFields,
    ['conceptId', 'canonicalHashShort', 'conceptVersion'],
    'canonical visual anchor required fields mismatch.',
  );
  assert.deepEqual(
    gate.canonicalVisualAnchor.optionalStaticFields,
    ['sourceAnchor'],
    'canonical visual anchor optional fields mismatch.',
  );
  assert.equal(
    gate.canonicalVisualAnchor.sourceAnchorStrategy,
    'primary_source_priority_id_if_present',
    'canonical visual anchor source strategy mismatch.',
  );

  const concepts = loadConceptSet();

  gate.semanticParityAudit.conceptIds.forEach((conceptId) => {
    const concept = findConcept(concepts, conceptId);
    const contract = resolveConceptQuery(conceptId).answer.derivedExplanationOverlays;
    const anchor = buildCanonicalVisualAnchor(concept, contract);

    assert.equal(anchor.conceptId, conceptId, `${conceptId} visual anchor conceptId mismatch.`);
    assert.equal(anchor.conceptVersion, concept.version, `${conceptId} visual anchor conceptVersion mismatch.`);
    assert.equal(
      anchor.canonicalHashShort.length,
      gate.canonicalVisualAnchor.canonicalHashLength,
      `${conceptId} visual anchor canonicalHashShort length mismatch.`,
    );
    assert.equal(
      anchor.canonicalHashShort,
      contract.canonicalBinding.canonicalHash.slice(0, gate.canonicalVisualAnchor.canonicalHashLength),
      `${conceptId} visual anchor canonicalHashShort mismatch.`,
    );

    if (concept.sourcePriority?.length) {
      assert.equal(
        anchor.sourceAnchor,
        concept.sourcePriority[0],
        `${conceptId} visual anchor sourceAnchor mismatch.`,
      );
      assert.equal(
        concept.sources.some((source) => source.id === anchor.sourceAnchor),
        true,
        `${conceptId} visual anchor sourceAnchor must remain canonical.`,
      );
      return;
    }

    assert.equal(anchor.sourceAnchor, null, `${conceptId} visual anchor sourceAnchor should be null when no canonical source anchor exists.`);
  });

  process.stdout.write('PASS overlay_canonical_visual_anchor_locked\n');
}

function main() {
  verifyAtomicGenerationAndPublish();
  verifyCertificationFailureIsRejected();
  verifyFailedGenerationLeavesPreviousPublishActive();
  verifyCanonicalBindingInvalidatesStaleOverlays();
  verifyCorruptPublishedOverlayFailsClosed();
  verifyOverlayLagWindowAllowsFreshPublishedStore();
  verifyExpiredLagWindowDowngradesToPending();
  verifyTrustCopyLock();
  verifySemanticParityAuditGate();
  verifyCanonicalVisualAnchorSpec();
  process.stdout.write('ChatPDM derived explanation overlay verification passed.\n');
}

main();

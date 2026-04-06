'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { relationPacketsDirectory, loadAuthoredRelationPackets } = require('../src/modules/concepts/concept-relation-loader');
const { loadConceptSet } = require('../src/modules/concepts/concept-loader');
const { RELATION_TYPES } = require('../src/modules/concepts/concept-relation-schema');
const { artifactPath } = require('../src/modules/concepts/concept-validation-state-loader');
const { resolveConceptQuery } = require('../src/modules/concepts/resolver');
const { REASON_CODES } = require('../../scripts/lib/register-validation/reason-codes');
const {
  deriveGovernanceEnforcement,
} = require('../../scripts/lib/register-validation/derive-governance-enforcement');
const {
  buildDefaultGovernanceRelations,
  validateConceptRelations,
} = require('../../scripts/lib/register-validation/validate-concept-relations');
const { validateGovernanceLaws } = require('../../scripts/lib/register-validation/validate-governance-laws');

function withTemporaryDirectory(callback) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'chatpdm-relations-'));

  try {
    return callback(directory);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function withCopiedRelationPackets(callback) {
  return withTemporaryDirectory((directory) => {
    fs.cpSync(relationPacketsDirectory, directory, { recursive: true });
    return callback(directory);
  });
}

function withTemporaryArtifact(mutator, callback) {
  const originalArtifact = fs.readFileSync(artifactPath, 'utf8');

  try {
    const artifact = JSON.parse(originalArtifact);
    const nextArtifact = mutator(artifact) || artifact;
    fs.writeFileSync(artifactPath, JSON.stringify(nextArtifact, null, 2), 'utf8');
    return callback();
  } finally {
    fs.writeFileSync(artifactPath, originalArtifact, 'utf8');
  }
}

function verifyMissingRelationPacketsRemainUnavailableInCompatibleMode() {
  withCopiedRelationPackets((directory) => {
    fs.rmSync(path.join(directory, 'power.json'));

    const report = loadAuthoredRelationPackets({
      directory,
      requireAuthoredRelations: false,
    });

    assert.equal(report.strictMode, false, 'compatible mode should not enable strict relation requirements.');
    assert.equal(report.source, 'unavailable', 'compatible mode should report unavailable source when a packet is missing.');
    assert.equal(report.dataSource, 'none', 'compatible mode should not claim authored data source when a packet is missing.');
    assert.equal(report.relationDataPresent, false, 'compatible mode should not report relation data present when a packet is missing.');
    assert.equal(report.fallbackUsed, false, 'compatible mode should not report fallback usage when fallback seeding is not surfaced.');
    assert.equal(report.passed, false, 'compatible mode should not pass on missing relation packets.');
    assert(report.warnings.some((entry) => entry.code === REASON_CODES.RELATION_PACKET_MISSING), 'missing packet warning not emitted in compatible mode.');
    assert.equal(
      report.warnings.some((entry) => entry.code === REASON_CODES.RELATION_FALLBACK_USED),
      false,
      'fallback warning should not be emitted in compatible mode when fallback is not surfaced.',
    );
  });

  process.stdout.write('PASS relation_missing_packets_remain_unavailable_compatible_mode\n');
}

function verifyStrictModeRequiresAuthoredRelations() {
  withCopiedRelationPackets((directory) => {
    fs.rmSync(path.join(directory, 'power.json'));

    const report = loadAuthoredRelationPackets({
      directory,
      requireAuthoredRelations: true,
    });

    assert.equal(report.strictMode, true, 'strict mode should enable authored relation requirements.');
    assert.equal(report.source, 'unavailable', 'strict mode should report unavailable source when authored packets are missing.');
    assert.equal(report.dataSource, 'none', 'strict mode should not claim authored data source when packets are missing.');
    assert.equal(report.relationDataPresent, false, 'strict mode should not report relation data present when packets are missing.');
    assert.equal(report.fallbackUsed, false, 'strict mode must not claim fallback usage when fallback is disabled.');
    assert.equal(report.passed, false, 'strict mode should not pass when authored packets are missing.');
    assert(report.failures.some((entry) => entry.code === REASON_CODES.RELATION_REQUIRED_MISSING_STRICT), 'strict mode missing-packet failure not emitted.');
  });

  process.stdout.write('PASS relation_strict_mode_requires_authored_packets\n');
}

function verifyMalformedRelationPacketFailsDeterministically() {
  withCopiedRelationPackets((directory) => {
    const malformedPacketPath = path.join(directory, 'legitimacy.json');
    fs.writeFileSync(malformedPacketPath, '{ invalid json', 'utf8');

    const report = loadAuthoredRelationPackets({
      directory,
      requireAuthoredRelations: false,
    });

    assert(report.failures.some((entry) => entry.code === REASON_CODES.RELATION_PACKET_INVALID), 'malformed relation packet should fail deterministically.');
    assert.equal(report.fallbackUsed, false, 'malformed authored packets must not silently fall back.');
  });

  process.stdout.write('PASS malformed_relation_packet_fails\n');
}

function verifyConflictingRelationsFailDeterministically() {
  withCopiedRelationPackets((directory) => {
    const legitimacyPacketPath = path.join(directory, 'legitimacy.json');
    const legitimacyPacket = JSON.parse(fs.readFileSync(legitimacyPacketPath, 'utf8'));
    const validationRelation = legitimacyPacket.relations[0];
    const invalidatingRelation = {
      ...validationRelation,
      type: RELATION_TYPES.INVALIDATES,
      effect: {
        kind: 'invalidates',
        description: 'A conflicting authored packet claims the same authority standing is invalidated outright.',
      },
      status: {
        active: true,
        blocking: true,
        note: 'Synthetic conflict fixture for verifier coverage.',
      },
    };

    legitimacyPacket.relations.push(invalidatingRelation);
    fs.writeFileSync(legitimacyPacketPath, JSON.stringify(legitimacyPacket, null, 2), 'utf8');

    const report = validateConceptRelations({
      concepts: loadConceptSet(),
      relationLoadOptions: {
        directory,
        requireAuthoredRelations: false,
      },
    });

    assert(report.failures.some((entry) => entry.code === REASON_CODES.RELATION_CONFLICT), 'conflicting relations should emit a deterministic conflict failure.');
  });

  process.stdout.write('PASS conflicting_relation_packets_fail\n');
}

function verifyLawViolationPropagatesToBlockingEnforcement() {
  const concepts = loadConceptSet().map((concept) => {
    if (concept.conceptId !== 'responsibility') {
      return concept;
    }

    return {
      ...concept,
      structureV3: {
        ...concept.structureV3,
        responsibility: {
          ...concept.structureV3.responsibility,
          trigger: {
            type: 'action',
            description: 'notional cause',
          },
        },
      },
    };
  });
  const relations = buildDefaultGovernanceRelations().map((relation) => {
    if (relation.type !== RELATION_TYPES.TRIGGERS_RESPONSIBILITY) {
      return relation;
    }

    return {
      ...relation,
      basis: {
        ...relation.basis,
        description: 'Responsibility is linked through an unrelated standing condition.',
      },
      conditions: {
        when: ['recognized standing remains active within governance order'],
        unless: ['no legitimacy dispute occurs'],
      },
      effect: {
        ...relation.effect,
        description: 'Responsibility relation remains active without specifying a trigger basis.',
      },
    };
  });
  const governanceLawReport = validateGovernanceLaws({
    concepts,
    relations,
  });
  const enforcement = deriveGovernanceEnforcement({
    relationFailures: governanceLawReport.relationReport.failures,
    relationWarnings: governanceLawReport.relationReport.warnings,
    lawFailures: governanceLawReport.lawFailures,
    lawWarnings: governanceLawReport.lawWarnings,
  });

  assert(
    governanceLawReport.lawFailures.some((entry) => entry.code === REASON_CODES.RESPONSIBILITY_MISSING_VALID_TRIGGER_RELATION),
    'law validation should fail when a duty-responsibility relation lacks a valid trigger basis.',
  );
  assert.equal(enforcement.enforcementStatus, 'blocked', 'law failure should escalate to blocked enforcement.');
  assert(
    enforcement.activations.some((entry) => entry.code === REASON_CODES.LAW_ENFORCEMENT_ACTIVE),
    'blocked enforcement should emit LAW_ENFORCEMENT_ACTIVE.',
  );

  process.stdout.write('PASS law_violation_propagates_to_blocked_enforcement\n');
}

function verifyBlockedConceptIsRefusedAtRuntime() {
  withTemporaryArtifact((artifact) => {
    const authorityConcept = artifact.concepts.find((concept) => concept.conceptId === 'authority');

    authorityConcept.enforcementStatus = 'blocked';
    authorityConcept.relationStatus = 'incomplete';
    authorityConcept.lawStatus = 'failing';
    authorityConcept.systemValidationState = 'law_blocked';
    authorityConcept.enforcement = {
      ...(authorityConcept.enforcement || {}),
      applicable: true,
      enforcementStatus: 'blocked',
      activations: [{
        code: REASON_CODES.LAW_ENFORCEMENT_ACTIVE,
        status: 'blocked',
        detail: 'Synthetic runtime hardening verifier activation.',
      }],
      blockingFailures: [{
        code: REASON_CODES.INVALID_RELATION_DIRECTION,
        detail: 'Synthetic runtime hardening verifier blocking relation failure.',
      }],
      nonBlockingWarnings: [],
    };

    return artifact;
  }, () => {
    const response = resolveConceptQuery('authority');

    assert.equal(response.type, 'no_exact_match', 'blocked concepts must refuse instead of returning concept_match.');
    assert.equal(response.queryType, 'exact_concept_query', 'blocked exact concept query should preserve exact query classification.');
    assert.equal(response.interpretation.interpretationType, 'validation_blocked', 'blocked concepts must surface validation_blocked interpretation.');
    assert.equal(response.interpretation.targetConceptId, 'authority', 'blocked runtime interpretation should identify the blocked concept.');
  });

  process.stdout.write('PASS blocked_concept_refused_in_runtime\n');
}

function main() {
  verifyMissingRelationPacketsRemainUnavailableInCompatibleMode();
  verifyStrictModeRequiresAuthoredRelations();
  verifyMalformedRelationPacketFailsDeterministically();
  verifyConflictingRelationsFailDeterministically();
  verifyLawViolationPropagatesToBlockingEnforcement();
  verifyBlockedConceptIsRefusedAtRuntime();
  process.stdout.write('ChatPDM relation hardening verification passed.\n');
}

main();

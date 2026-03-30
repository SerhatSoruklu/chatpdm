'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { connectMongo, disconnectMongo } = require('../../src/config/mongoose');
const DoctrineArtifact = require('../../src/modules/legal-validator/doctrine/doctrine-artifact.model');
const ArgumentUnit = require('../../src/modules/legal-validator/arguments/argument-unit.model');
const doctrineLoaderService = require('../../src/modules/legal-validator/doctrine/doctrine-loader.service');
const admissibilityService = require('../../src/modules/legal-validator/arguments/admissibility.service');
const resolverService = require('../../src/modules/legal-validator/mapping/resolver.service');
const validationKernelService = require('../../src/modules/legal-validator/validation/validation-kernel.service');
const Mapping = require('../../src/modules/legal-validator/mapping/mapping.model');

let mongoServer;

async function createDoctrineArtifact(overrides = {}) {
  const artifact = new DoctrineArtifact({
    artifactId: 'artifact-1',
    packageId: 'uk-negligence',
    version: '1.0.0',
    hash: 'a'.repeat(64),
    storageKey: 'doctrine/uk-negligence/1.0.0.json',
    manifest: {
      packageId: 'uk-negligence',
      jurisdiction: 'UK',
      practiceArea: 'negligence',
      sourceClasses: ['statute', 'case_law'],
      interpretationRegime: {
        regimeId: 'uk-textual-v1',
        name: 'UK Textual v1',
        hierarchy: ['text', 'definitions', 'whole_text'],
      },
      coreConceptsReferenced: ['authority'],
      packageConceptsDeclared: ['duty_of_care'],
      authorityIds: [],
      mappingRuleIds: [],
      validationRuleIds: [],
    },
    governance: {
      status: 'approved',
      approvedBy: 'reviewer-1',
      approvedAt: new Date('2026-03-30T10:00:00Z'),
    },
    replay: {
      isRetained: true,
      retainedAt: new Date('2026-03-30T10:00:00Z'),
    },
    createdBy: 'author-1',
    ...overrides,
  });

  await artifact.save();
  return artifact;
}

async function createArgumentUnit(overrides = {}) {
  const unit = new ArgumentUnit({
    argumentUnitId: 'argument-unit-1',
    matterId: 'matter-1',
    documentId: 'document-1',
    sourceSegmentIds: ['segment-1'],
    unitType: 'application_step',
    text: 'The defendant failed to inspect the equipment.',
    normalizedText: 'the defendant failed to inspect the equipment',
    speakerRole: 'claimant',
    positionSide: 'claimant',
    sequence: 1,
    extractionMethod: 'manual',
    reviewState: 'accepted',
    admissibility: 'admissible',
    unresolvedReason: null,
    ...overrides,
  });

  await unit.save();
  return unit;
}

async function createResolverSuccessResult(overrides = {}) {
  const artifact = await createDoctrineArtifact({
    artifactId: overrides.artifactId || 'artifact-kernel',
    hash: overrides.doctrineHash || 'f'.repeat(64),
  });
  const unit = await createArgumentUnit({
    argumentUnitId: overrides.argumentUnitId || 'argument-unit-kernel',
    matterId: overrides.matterId || 'matter-1',
    documentId: overrides.documentId || 'document-1',
  });

  const doctrineLoadResult = await doctrineLoaderService.loadDoctrineArtifact({ artifactId: artifact.artifactId });
  const admissibilityResult = await admissibilityService.evaluateArgumentUnits({ argumentUnits: [unit] });
  const resolverResult = await resolverService.resolve({
    doctrineLoadResult,
    admissibilityResult,
    resolverDecision: {
      status: 'success',
      mappingId: overrides.mappingId || 'mapping-kernel-success',
      mappingType: overrides.mappingType || 'concept',
      matchBasis: overrides.matchBasis || 'exact_canonical',
      conceptId: overrides.conceptId === undefined ? 'duty_of_care' : overrides.conceptId,
      authorityId: overrides.authorityId === undefined ? null : overrides.authorityId,
      resolverRuleId: overrides.resolverRuleId || 'resolver-rule-kernel',
    },
  });

  return {
    artifact,
    unit,
    doctrineLoadResult,
    admissibilityResult,
    resolverResult,
  };
}

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await connectMongo(mongoServer.getUri());
});

test.after(async () => {
  await disconnectMongo();

  if (mongoServer) {
    await mongoServer.stop();
  }
});

test.afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.db.dropDatabase();
  }
});

test('doctrine-loader.service loads an approved doctrine artifact by artifactId', async () => {
  const artifact = await createDoctrineArtifact();

  const result = await doctrineLoaderService.loadDoctrineArtifact({ artifactId: artifact.artifactId });

  assert.equal(result.ok, true);
  assert.equal(result.terminal, false);
  assert.equal(result.doctrineArtifactId, artifact.artifactId);
  assert.equal(result.doctrineHash, artifact.hash);
  assert.equal(result.runtimeEligible, true);
  assert.equal(result.interpretationRegime.regimeId, 'uk-textual-v1');
});

test('doctrine-loader.service rejects doctrine artifacts that are not runtime-eligible', async () => {
  await createDoctrineArtifact({
    artifactId: 'artifact-draft',
    hash: 'b'.repeat(64),
    governance: {
      status: 'reviewed',
      reviewedBy: 'reviewer-1',
      reviewedAt: new Date('2026-03-30T10:00:00Z'),
    },
  });

  const result = await doctrineLoaderService.loadDoctrineArtifact({ artifactId: 'artifact-draft' });

  assert.equal(result.ok, false);
  assert.equal(result.terminal, true);
  assert.equal(result.result, 'invalid');
  assert.equal(result.failureCode, 'DOCTRINE_NOT_RECOGNIZED');
});

test('doctrine-loader.service rejects artifactId and doctrineHash mismatches with a loader-local integrity code', async () => {
  const artifact = await createDoctrineArtifact({
    artifactId: 'artifact-hash-mismatch',
    hash: 'c'.repeat(64),
  });

  const result = await doctrineLoaderService.loadDoctrineArtifact({
    artifactId: artifact.artifactId,
    doctrineHash: 'd'.repeat(64),
  });

  assert.equal(result.ok, false);
  assert.equal(result.terminal, true);
  assert.equal(result.result, 'invalid');
  assert.equal(result.failureCode, 'DOCTRINE_HASH_MISMATCH');
  assert.equal(result.doctrineArtifactId, artifact.artifactId);
  assert.equal(result.doctrineHash, artifact.hash);
});

test('admissibility.service returns a continue outcome for accepted admissible argument units', async () => {
  const unit = await createArgumentUnit();

  const result = await admissibilityService.evaluateArgumentUnits({ argumentUnits: [unit] });

  assert.equal(result.ok, true);
  assert.equal(result.terminal, false);
  assert.equal(result.argumentUnitId, unit.argumentUnitId);
  assert.equal(result.matterId, unit.matterId);
  assert.equal(result.documentId, unit.documentId);
  assert.equal(result.reviewState, unit.reviewState);
  assert.equal(result.admissibility, unit.admissibility);
  assert.equal(Array.isArray(result.eligibleArgumentUnits), true);
  assert.equal(result.eligibleArgumentUnits.length, 1);
  assert.equal(result.eligibleArgumentUnits[0].argumentUnitId, unit.argumentUnitId);
});

test('admissibility.service blocks pending_review argument units', async () => {
  const unit = await createArgumentUnit({
    argumentUnitId: 'argument-unit-pending',
    reviewState: 'pending_review',
  });

  const result = await admissibilityService.evaluateArgumentUnits({ argumentUnits: [unit] });

  assert.equal(result.ok, false);
  assert.equal(result.terminal, true);
  assert.equal(result.result, 'unresolved');
  assert.equal(result.failureCode, 'PENDING_REVIEW_BLOCK');
  assert.equal(result.argumentUnitId, unit.argumentUnitId);
  assert.equal(result.reviewState, 'pending_review');
});

test('admissibility.service blocks rejected argument units', async () => {
  const unit = await createArgumentUnit({
    argumentUnitId: 'argument-unit-rejected',
    reviewState: 'rejected',
  });

  const result = await admissibilityService.evaluateArgumentUnits({ argumentUnits: [unit] });

  assert.equal(result.ok, false);
  assert.equal(result.terminal, true);
  assert.equal(result.result, 'unresolved');
  assert.equal(result.failureCode, 'FACT_INPUT_NOT_ADMISSIBLE');
  assert.equal(result.argumentUnitId, unit.argumentUnitId);
  assert.equal(result.reviewState, 'rejected');
});

test('admissibility.service blocks non-admissible argument units', async () => {
  const unit = await createArgumentUnit({
    argumentUnitId: 'argument-unit-blocked',
    admissibility: 'blocked',
  });

  const result = await admissibilityService.evaluateArgumentUnits({ argumentUnits: [unit] });

  assert.equal(result.ok, false);
  assert.equal(result.terminal, true);
  assert.equal(result.result, 'unresolved');
  assert.equal(result.failureCode, 'FACT_INPUT_NOT_ADMISSIBLE');
  assert.equal(result.argumentUnitId, unit.argumentUnitId);
  assert.equal(result.admissibility, 'blocked');
});

test('admissibility.service blocks argument units with missing reviewState', async () => {
  const result = await admissibilityService.evaluateArgumentUnits({
    argumentUnits: [
      {
        argumentUnitId: 'argument-unit-missing-review',
        matterId: 'matter-1',
        documentId: 'document-1',
        admissibility: 'admissible',
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(result.terminal, true);
  assert.equal(result.result, 'unresolved');
  assert.equal(result.failureCode, 'FACT_INPUT_NOT_ADMISSIBLE');
  assert.equal(result.argumentUnitId, 'argument-unit-missing-review');
  assert.equal(result.reviewState, null);
});

test('admissibility.service blocks argument units with missing admissibility state', async () => {
  const result = await admissibilityService.evaluateArgumentUnits({
    argumentUnits: [
      {
        argumentUnitId: 'argument-unit-missing-admissibility',
        matterId: 'matter-1',
        documentId: 'document-1',
        reviewState: 'accepted',
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(result.terminal, true);
  assert.equal(result.result, 'unresolved');
  assert.equal(result.failureCode, 'FACT_INPUT_NOT_ADMISSIBLE');
  assert.equal(result.argumentUnitId, 'argument-unit-missing-admissibility');
  assert.equal(result.admissibility, null);
});

test('admissibility.service blocks malformed argument unit objects deterministically', async () => {
  const result = await admissibilityService.evaluateArgumentUnits({
    argumentUnits: [null],
  });

  assert.equal(result.ok, false);
  assert.equal(result.terminal, true);
  assert.equal(result.result, 'unresolved');
  assert.equal(result.failureCode, 'FACT_INPUT_NOT_ADMISSIBLE');
  assert.equal(result.argumentUnitId, null);
  assert.equal(result.reviewState, null);
  assert.equal(result.admissibility, null);
});

test('resolver.service rejects entry when admissibility did not pass', async () => {
  const artifact = await createDoctrineArtifact();

  const doctrineLoadResult = await doctrineLoaderService.loadDoctrineArtifact({ artifactId: artifact.artifactId });

  await assert.rejects(
    resolverService.resolve({
      doctrineLoadResult,
      admissibilityResult: {
        ok: false,
        terminal: true,
        result: 'unresolved',
        failureCode: 'PENDING_REVIEW_BLOCK',
      },
      resolverDecision: {
        status: 'ambiguous',
      },
    }),
    /requires a continue outcome from admissibility\.service/,
  );
});

test('resolver.service rejects entry when doctrine-loader did not pass', async () => {
  const unit = await createArgumentUnit();
  const admissibilityResult = await admissibilityService.evaluateArgumentUnits({ argumentUnits: [unit] });

  await assert.rejects(
    resolverService.resolve({
      doctrineLoadResult: {
        ok: false,
        terminal: true,
        result: 'invalid',
        failureCode: 'DOCTRINE_NOT_RECOGNIZED',
      },
      admissibilityResult,
      resolverDecision: {
        status: 'ambiguous',
      },
    }),
    /requires a continue outcome from doctrine-loader\.service/,
  );
});

test('resolver.service rejects entry when required argument unit metadata is missing', async () => {
  const artifact = await createDoctrineArtifact({
    artifactId: 'artifact-metadata-missing',
    hash: 'f'.repeat(64),
  });
  const doctrineLoadResult = await doctrineLoaderService.loadDoctrineArtifact({ artifactId: artifact.artifactId });

  await assert.rejects(
    resolverService.resolve({
      doctrineLoadResult,
      admissibilityResult: {
        ok: true,
        terminal: false,
        service: 'admissibility.service',
        argumentUnitId: 'argument-unit-missing-document',
        matterId: 'matter-1',
        documentId: null,
        reviewState: 'accepted',
        admissibility: 'admissible',
      },
      resolverDecision: {
        status: 'ambiguous',
      },
    }),
    /requires argumentUnitId, matterId, and documentId from admissibility\.service/,
  );
});

test('resolver.service returns AMBIGUOUS_CONCEPT_MAPPING on explicit ambiguous decision', async () => {
  const artifact = await createDoctrineArtifact();
  const unit = await createArgumentUnit();
  const doctrineLoadResult = await doctrineLoaderService.loadDoctrineArtifact({ artifactId: artifact.artifactId });
  const admissibilityResult = await admissibilityService.evaluateArgumentUnits({ argumentUnits: [unit] });

  const result = await resolverService.resolve({
    doctrineLoadResult,
    admissibilityResult,
    resolverDecision: {
      status: 'ambiguous',
      reason: 'Two live concept mappings remain available.',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.terminal, true);
  assert.equal(result.result, 'unresolved');
  assert.equal(result.failureCode, 'AMBIGUOUS_CONCEPT_MAPPING');
  assert.equal(result.argumentUnitId, unit.argumentUnitId);
  assert.equal(result.doctrineArtifactId, artifact.artifactId);
  assert.equal(result.mappingWritten, false);
});

test('resolver.service returns RULE_NOT_DEFINED on explicit undefined-rule decision', async () => {
  const artifact = await createDoctrineArtifact();
  const unit = await createArgumentUnit();
  const doctrineLoadResult = await doctrineLoaderService.loadDoctrineArtifact({ artifactId: artifact.artifactId });
  const admissibilityResult = await admissibilityService.evaluateArgumentUnits({ argumentUnits: [unit] });

  const result = await resolverService.resolve({
    doctrineLoadResult,
    admissibilityResult,
    resolverDecision: {
      status: 'rule_not_defined',
      reason: 'The doctrine artifact does not define the required mapping rule.',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.terminal, true);
  assert.equal(result.result, 'unresolved');
  assert.equal(result.failureCode, 'RULE_NOT_DEFINED');
  assert.equal(result.argumentUnitId, unit.argumentUnitId);
  assert.equal(result.mappingWritten, false);
});

test('resolver.service returns PRECEDENT_NOT_STRUCTURED on explicit raw-precedent decision', async () => {
  const artifact = await createDoctrineArtifact();
  const unit = await createArgumentUnit();
  const doctrineLoadResult = await doctrineLoaderService.loadDoctrineArtifact({ artifactId: artifact.artifactId });
  const admissibilityResult = await admissibilityService.evaluateArgumentUnits({ argumentUnits: [unit] });

  const result = await resolverService.resolve({
    doctrineLoadResult,
    admissibilityResult,
    resolverDecision: {
      status: 'raw_precedent',
      reason: 'Precedent text exists, but no structured doctrine rule has been authored.',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.terminal, true);
  assert.equal(result.result, 'unresolved');
  assert.equal(result.failureCode, 'PRECEDENT_NOT_STRUCTURED');
  assert.equal(result.argumentUnitId, unit.argumentUnitId);
  assert.equal(result.mappingWritten, false);
});

test('resolver.service refuses a success write without deterministic matchBasis', async () => {
  const artifact = await createDoctrineArtifact();
  const unit = await createArgumentUnit();

  const doctrineLoadResult = await doctrineLoaderService.loadDoctrineArtifact({ artifactId: artifact.artifactId });
  const admissibilityResult = await admissibilityService.evaluateArgumentUnits({ argumentUnits: [unit] });

  const result = await resolverService.resolve({
    doctrineLoadResult,
    admissibilityResult,
    resolverDecision: {
      status: 'success',
      mappingId: 'mapping-invalid-success',
      mappingType: 'concept',
      conceptId: 'duty_of_care',
      resolverRuleId: 'resolver-rule-1',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.terminal, true);
  assert.equal(result.result, 'invalid');
  assert.equal(result.failureCode, 'NON_DETERMINISTIC_SUCCESS_PATH');
  assert.equal(result.argumentUnitId, unit.argumentUnitId);
  assert.equal(result.mappingWritten, false);
  assert.equal(await Mapping.countDocuments({}), 0);
});

test('resolver.service writes a Mapping only on the narrow explicit deterministic success path', async () => {
  const artifact = await createDoctrineArtifact({
    artifactId: 'artifact-success',
    hash: 'e'.repeat(64),
  });
  const unit = await createArgumentUnit({
    argumentUnitId: 'argument-unit-success',
  });

  const doctrineLoadResult = await doctrineLoaderService.loadDoctrineArtifact({ artifactId: artifact.artifactId });
  const admissibilityResult = await admissibilityService.evaluateArgumentUnits({ argumentUnits: [unit] });

  const result = await resolverService.resolve({
    doctrineLoadResult,
    admissibilityResult,
    resolverDecision: {
      status: 'success',
      mappingId: 'mapping-success-1',
      mappingType: 'concept',
      matchBasis: 'exact_canonical',
      conceptId: 'duty_of_care',
      resolverRuleId: 'resolver-rule-duty-of-care',
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.terminal, false);
  assert.equal(result.argumentUnitId, unit.argumentUnitId);
  assert.equal(result.matterId, unit.matterId);
  assert.equal(result.documentId, unit.documentId);
  assert.equal(result.doctrineArtifactId, artifact.artifactId);
  assert.equal(result.doctrineHash, artifact.hash);
  assert.equal(result.mappingId, 'mapping-success-1');
  assert.equal(result.mappingStatus, 'success');
  assert.equal(result.matchBasis, 'exact_canonical');
  assert.equal(result.mappingType, 'concept');
  assert.equal(result.conceptId, 'duty_of_care');
  assert.equal(result.authorityId, null);
  assert.equal(result.resolverRuleId, 'resolver-rule-duty-of-care');
  assert.equal(result.mappingWritten, true);

  const persistedMapping = await Mapping.findOne({ mappingId: 'mapping-success-1' }).lean().exec();

  assert.ok(persistedMapping);
  assert.equal(persistedMapping.argumentUnitId, unit.argumentUnitId);
  assert.equal(persistedMapping.doctrineArtifactId, artifact.artifactId);
  assert.equal(await Mapping.countDocuments({}), 1);
});

test('validation-kernel.service rejects entry if resolver did not return continue', async () => {
  const artifact = await createDoctrineArtifact({
    artifactId: 'artifact-kernel-resolver-reject',
    hash: '1'.repeat(64),
  });
  const doctrineLoadResult = await doctrineLoaderService.loadDoctrineArtifact({ artifactId: artifact.artifactId });

  await assert.rejects(
    validationKernelService.evaluate({
      doctrineLoadResult,
      resolverResult: {
        ok: false,
        terminal: true,
        result: 'unresolved',
        failureCode: 'RULE_NOT_DEFINED',
      },
      validationDecision: {
        status: 'valid',
        validationRuleIds: ['validation-rule-1'],
      },
    }),
    /requires a continue outcome from resolver\.service/,
  );
});

test('validation-kernel.service returns INSUFFICIENT_DOCTRINE on explicit doctrine gap', async () => {
  const { artifact, unit, doctrineLoadResult, resolverResult } = await createResolverSuccessResult({
    artifactId: 'artifact-kernel-doctrine-gap',
    doctrineHash: '2'.repeat(64),
    argumentUnitId: 'argument-unit-kernel-doctrine-gap',
    mappingId: 'mapping-kernel-doctrine-gap',
  });

  const result = await validationKernelService.evaluate({
    doctrineLoadResult,
    resolverResult,
    validationDecision: {
      status: 'doctrine_gap',
      reason: 'The doctrine package lacks the rule needed to complete validation.',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.terminal, true);
  assert.equal(result.result, 'unresolved');
  assert.equal(result.failureCode, 'INSUFFICIENT_DOCTRINE');
  assert.equal(result.argumentUnitId, unit.argumentUnitId);
  assert.equal(result.doctrineArtifactId, artifact.artifactId);
  assert.equal(result.mappingId, resolverResult.mappingId);
  assert.equal(result.validationWritten, false);
});

test('validation-kernel.service returns SOURCE_OVERRIDE_ATTEMPT on explicit override attempt', async () => {
  const { unit, doctrineLoadResult, resolverResult } = await createResolverSuccessResult({
    artifactId: 'artifact-kernel-source-override',
    doctrineHash: '3'.repeat(64),
    argumentUnitId: 'argument-unit-kernel-source-override',
    mappingId: 'mapping-kernel-source-override',
  });

  const result = await validationKernelService.evaluate({
    doctrineLoadResult,
    resolverResult,
    validationDecision: {
      status: 'source_override',
      reason: 'The claim attempts to override the mapped source with extra-source reasoning.',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.terminal, true);
  assert.equal(result.result, 'invalid');
  assert.equal(result.failureCode, 'SOURCE_OVERRIDE_ATTEMPT');
  assert.equal(result.argumentUnitId, unit.argumentUnitId);
  assert.equal(result.validationWritten, false);
});

test('validation-kernel.service returns FACTUAL_LINKAGE_MISSING on explicit missing factual chain', async () => {
  const { unit, doctrineLoadResult, resolverResult } = await createResolverSuccessResult({
    artifactId: 'artifact-kernel-factual-linkage',
    doctrineHash: '4'.repeat(64),
    argumentUnitId: 'argument-unit-kernel-factual-linkage',
    mappingId: 'mapping-kernel-factual-linkage',
  });

  const result = await validationKernelService.evaluate({
    doctrineLoadResult,
    resolverResult,
    validationDecision: {
      status: 'factual_linkage_missing',
      reason: 'The application step lacks the required factual chain.',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.terminal, true);
  assert.equal(result.result, 'unresolved');
  assert.equal(result.failureCode, 'FACTUAL_LINKAGE_MISSING');
  assert.equal(result.argumentUnitId, unit.argumentUnitId);
  assert.equal(result.validationWritten, false);
});

test('validation-kernel.service propagates a terminal authority-registry result without reclassifying it', async () => {
  const { doctrineLoadResult, resolverResult } = await createResolverSuccessResult({
    artifactId: 'artifact-kernel-authority-terminal',
    doctrineHash: '7'.repeat(64),
    argumentUnitId: 'argument-unit-kernel-authority-terminal',
    mappingId: 'mapping-kernel-authority-terminal',
  });

  const authorityResult = {
    ok: false,
    terminal: true,
    result: 'invalid',
    failureCode: 'AUTHORITY_SCOPE_VIOLATION',
    reason: 'Authority falls outside the governing jurisdiction scope.',
    service: 'authority-registry.service',
  };

  const result = await validationKernelService.evaluate({
    doctrineLoadResult,
    resolverResult,
    authorityLookupResult: authorityResult,
    validationDecision: {
      status: 'valid',
      validationRuleIds: ['validation-rule-1'],
    },
  });

  assert.equal(result, authorityResult);
});

test('validation-kernel.service rejects unsupported decision.status values', async () => {
  const { doctrineLoadResult, resolverResult } = await createResolverSuccessResult({
    artifactId: 'artifact-kernel-unsupported-status',
    doctrineHash: '8'.repeat(64),
    argumentUnitId: 'argument-unit-kernel-unsupported-status',
    mappingId: 'mapping-kernel-unsupported-status',
  });

  await assert.rejects(
    validationKernelService.evaluate({
      doctrineLoadResult,
      resolverResult,
      validationDecision: {
        status: 'invented_status',
      },
    }),
    /received unsupported decision\.status=invented_status/,
  );
});

test('validation-kernel.service refuses to originate AUTHORITY_SCOPE_VIOLATION', async () => {
  const { doctrineLoadResult, resolverResult } = await createResolverSuccessResult({
    artifactId: 'artifact-kernel-authority-origin',
    doctrineHash: '9'.repeat(64),
    argumentUnitId: 'argument-unit-kernel-authority-origin',
    mappingId: 'mapping-kernel-authority-origin',
  });

  await assert.rejects(
    validationKernelService.evaluate({
      doctrineLoadResult,
      resolverResult,
      validationDecision: {
        status: 'authority_scope_violation',
        reason: 'Scope defect invented inside kernel.',
      },
    }),
    /cannot originate AUTHORITY_SCOPE_VIOLATION/,
  );
});

test('validation-kernel.service may propagate AUTHORITY_SCOPE_VIOLATION only when marked from authority layer', async () => {
  const { unit, doctrineLoadResult, resolverResult } = await createResolverSuccessResult({
    artifactId: 'artifact-kernel-authority-propagation',
    doctrineHash: 'a'.repeat(64),
    argumentUnitId: 'argument-unit-kernel-authority-propagation',
    mappingId: 'mapping-kernel-authority-propagation',
  });

  const result = await validationKernelService.evaluate({
    doctrineLoadResult,
    resolverResult,
    validationDecision: {
      status: 'authority_scope_violation',
      fromAuthorityLayer: true,
      reason: 'Authority registry marked the source as outside allowed scope.',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.terminal, true);
  assert.equal(result.result, 'invalid');
  assert.equal(result.failureCode, 'AUTHORITY_SCOPE_VIOLATION');
  assert.equal(result.argumentUnitId, unit.argumentUnitId);
  assert.equal(result.validationWritten, false);
});

test('validation-kernel.service refuses success if mapping is missing or invalid', async () => {
  const artifact = await createDoctrineArtifact({
    artifactId: 'artifact-kernel-missing-mapping',
    hash: '5'.repeat(64),
  });
  const doctrineLoadResult = await doctrineLoaderService.loadDoctrineArtifact({ artifactId: artifact.artifactId });

  const result = await validationKernelService.evaluate({
    doctrineLoadResult,
    resolverResult: {
      ok: true,
      terminal: false,
      service: 'resolver.service',
      argumentUnitId: 'argument-unit-kernel-missing-mapping',
      matterId: 'matter-1',
      documentId: 'document-1',
      doctrineArtifactId: artifact.artifactId,
      doctrineHash: artifact.hash,
      mappingId: 'mapping-does-not-exist',
      mappingWritten: true,
    },
    validationDecision: {
      status: 'valid',
      validationRuleIds: ['validation-rule-valid'],
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.terminal, true);
  assert.equal(result.result, 'invalid');
  assert.equal(result.failureCode, 'UNAUTHORIZED_DECISION_PATH');
  assert.equal(result.mappingId, 'mapping-does-not-exist');
  assert.equal(result.validationWritten, false);
});

test('validation-kernel.service refuses success if the persisted mapping is missing deterministic fields', async () => {
  const artifact = await createDoctrineArtifact({
    artifactId: 'artifact-kernel-partial-mapping',
    hash: 'b'.repeat(64),
  });
  const doctrineLoadResult = await doctrineLoaderService.loadDoctrineArtifact({ artifactId: artifact.artifactId });

  await Mapping.collection.insertOne({
    mappingId: 'mapping-partial-fields',
    matterId: 'matter-1',
    argumentUnitId: 'argument-unit-partial-fields',
    doctrineArtifactId: artifact.artifactId,
    status: 'success',
    conceptId: 'duty_of_care',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const result = await validationKernelService.evaluate({
    doctrineLoadResult,
    resolverResult: {
      ok: true,
      terminal: false,
      service: 'resolver.service',
      argumentUnitId: 'argument-unit-partial-fields',
      matterId: 'matter-1',
      documentId: 'document-1',
      doctrineArtifactId: artifact.artifactId,
      doctrineHash: artifact.hash,
      mappingId: 'mapping-partial-fields',
      mappingWritten: true,
    },
    validationDecision: {
      status: 'valid',
      validationRuleIds: ['validation-rule-valid'],
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.terminal, true);
  assert.equal(result.result, 'invalid');
  assert.equal(result.failureCode, 'UNAUTHORIZED_DECISION_PATH');
  assert.equal(result.mappingId, 'mapping-partial-fields');
  assert.equal(result.validationWritten, false);
});

test('validation-kernel.service returns continue only on the narrow explicit valid path', async () => {
  const { artifact, unit, doctrineLoadResult, resolverResult } = await createResolverSuccessResult({
    artifactId: 'artifact-kernel-valid',
    doctrineHash: '6'.repeat(64),
    argumentUnitId: 'argument-unit-kernel-valid',
    mappingId: 'mapping-kernel-valid',
  });

  const result = await validationKernelService.evaluate({
    doctrineLoadResult,
    resolverResult,
    validationDecision: {
      status: 'valid',
      validationRuleIds: ['validation-rule-1', 'validation-rule-2'],
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.terminal, false);
  assert.equal(result.argumentUnitId, unit.argumentUnitId);
  assert.equal(result.matterId, unit.matterId);
  assert.equal(result.documentId, unit.documentId);
  assert.equal(result.doctrineArtifactId, artifact.artifactId);
  assert.equal(result.doctrineHash, artifact.hash);
  assert.equal(result.mappingId, resolverResult.mappingId);
  assert.equal(result.validationOutcome, 'valid');
  assert.deepEqual(result.validationRuleIds, ['validation-rule-1', 'validation-rule-2']);
  assert.equal(result.validationWritten, false);
});

test('validation-kernel.service refuses valid continuation when validationRuleIds contain duplicates', async () => {
  const { doctrineLoadResult, resolverResult } = await createResolverSuccessResult({
    artifactId: 'artifact-kernel-duplicate-rules',
    doctrineHash: 'c'.repeat(64),
    argumentUnitId: 'argument-unit-kernel-duplicate-rules',
    mappingId: 'mapping-kernel-duplicate-rules',
  });

  const result = await validationKernelService.evaluate({
    doctrineLoadResult,
    resolverResult,
    validationDecision: {
      status: 'valid',
      validationRuleIds: ['validation-rule-1', 'validation-rule-1'],
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.terminal, true);
  assert.equal(result.result, 'invalid');
  assert.equal(result.failureCode, 'UNAUTHORIZED_DECISION_PATH');
  assert.equal(result.validationWritten, false);
});

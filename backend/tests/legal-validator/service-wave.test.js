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

test('resolver.service cannot persist illegal success mappings', async () => {
  const artifact = await createDoctrineArtifact();
  const unit = await createArgumentUnit();

  const doctrineLoadResult = await doctrineLoaderService.loadDoctrineArtifact({ artifactId: artifact.artifactId });
  const admissibilityResult = await admissibilityService.evaluateArgumentUnits({ argumentUnits: [unit] });

  const result = await resolverService.resolve({
    matterId: 'matter-1',
    doctrineLoadResult,
    admissibilityResult,
    proposedMappings: [
      {
        mappingId: 'mapping-1',
        argumentUnitId: unit.argumentUnitId,
        mappingType: 'concept',
        status: 'success',
        conceptId: 'duty_of_care',
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(result.terminal, true);
  assert.equal(result.result, 'invalid');
  assert.equal(result.failureCode, 'NON_DETERMINISTIC_SUCCESS_PATH');
  assert.equal(await Mapping.countDocuments({}), 0);
});

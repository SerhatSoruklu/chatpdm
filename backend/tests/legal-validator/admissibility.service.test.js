'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { connectMongo, disconnectMongo } = require('../../src/config/mongoose');
const ArgumentUnit = require('../../src/modules/legal-validator/arguments/argument-unit.model');
const admissibilityService = require('../../src/modules/legal-validator/arguments/admissibility.service');

let mongoServer;

async function createArgumentUnit(overrides = {}) {
  const unit = new ArgumentUnit({
    argumentUnitId: 'argument-unit-admissibility-1',
    matterId: 'matter-admissibility-1',
    documentId: 'document-admissibility-1',
    sourceSegmentIds: ['source-document-admissibility-1:aaaaaaaaaaaa:p1:s2'],
    unitType: 'application_step',
    text: 'The defendant failed to inspect the equipment.',
    normalizedText: 'the defendant failed to inspect the equipment.',
    speakerRole: 'claimant',
    positionSide: 'claimant',
    sequence: 1,
    extractionMethod: 'machine_assisted',
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

test('admissibility.service persists admissible extracted units as runtime truth', async () => {
  const unit = await createArgumentUnit();

  const result = await admissibilityService.evaluateArgumentUnits({
    argumentUnits: [unit],
  });

  assert.equal(result.ok, true);
  assert.equal(result.terminal, false);
  assert.equal(result.reviewState, 'accepted');
  assert.equal(result.admissibility, 'admissible');
  assert.equal(result.eligibleArgumentUnits.length, 1);
  assert.equal(result.eligibleArgumentUnits[0].argumentUnitId, unit.argumentUnitId);

  const persistedUnit = await ArgumentUnit.findOne({ argumentUnitId: unit.argumentUnitId }).lean().exec();

  assert.ok(persistedUnit);
  assert.equal(persistedUnit.reviewState, 'accepted');
  assert.equal(persistedUnit.admissibility, 'admissible');
  assert.equal(persistedUnit.unresolvedReason, null);
});

test('admissibility.service persists pending_review units as blocked runtime state', async () => {
  const unit = await createArgumentUnit({
    argumentUnitId: 'argument-unit-admissibility-pending',
    reviewState: 'pending_review',
    admissibility: 'admissible',
  });

  const result = await admissibilityService.evaluateArgumentUnits({
    argumentUnits: [unit],
  });

  assert.equal(result.ok, false);
  assert.equal(result.terminal, true);
  assert.equal(result.result, 'unresolved');
  assert.equal(result.failureCode, 'PENDING_REVIEW_BLOCK');

  const persistedUnit = await ArgumentUnit.findOne({ argumentUnitId: unit.argumentUnitId }).lean().exec();

  assert.ok(persistedUnit);
  assert.equal(persistedUnit.reviewState, 'pending_review');
  assert.equal(persistedUnit.admissibility, 'blocked');
  assert.match(persistedUnit.unresolvedReason, /pending review/);
});

test('admissibility.service persists rejected units as blocked runtime state', async () => {
  const unit = await createArgumentUnit({
    argumentUnitId: 'argument-unit-admissibility-rejected',
    reviewState: 'rejected',
    admissibility: 'blocked',
  });

  const result = await admissibilityService.evaluateArgumentUnits({
    argumentUnits: [unit],
  });

  assert.equal(result.ok, false);
  assert.equal(result.terminal, true);
  assert.equal(result.result, 'unresolved');
  assert.equal(result.failureCode, 'FACT_INPUT_NOT_ADMISSIBLE');

  const persistedUnit = await ArgumentUnit.findOne({ argumentUnitId: unit.argumentUnitId }).lean().exec();

  assert.ok(persistedUnit);
  assert.equal(persistedUnit.reviewState, 'rejected');
  assert.equal(persistedUnit.admissibility, 'blocked');
  assert.match(persistedUnit.unresolvedReason, /rejected/);
});

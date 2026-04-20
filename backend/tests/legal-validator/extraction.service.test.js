'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { connectMongo, disconnectMongo } = require('../../src/config/mongoose');
const SourceDocument = require('../../src/modules/legal-validator/sources/source-document.model');
const SourceSegment = require('../../src/modules/legal-validator/sources/source-segment.model');
const ArgumentUnit = require('../../src/modules/legal-validator/arguments/argument-unit.model');
const segmentationService = require('../../src/modules/legal-validator/sources/segmentation.service');
const extractionService = require('../../src/modules/legal-validator/arguments/extraction.service');

let mongoServer;

async function createSourceDocument({ sourceDocumentId, matterId, documentId, content }) {
  const sourceDocument = new SourceDocument({
    sourceDocumentId,
    matterId,
    documentId,
    contentFormat: 'markdown',
    content,
  });

  await sourceDocument.save();
  return sourceDocument;
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

test('argument-extraction.service deterministically persists an extracted ArgumentUnit', async () => {
  const sourceDocument = await createSourceDocument({
    sourceDocumentId: 'source-document-extraction-1',
    matterId: 'matter-extraction-1',
    documentId: 'document-extraction-1',
    content: [
      '# Duty of Care',
      '',
      'The defendant owed a duty of care and failed to inspect the equipment.',
      '',
      'The defendant did not maintain a safe system of work.',
    ].join('\n'),
  });

  const segmentationResult = await segmentationService.segmentSourceDocument({ sourceDocument });
  const sourceSegments = await SourceSegment.find({ sourceDocumentId: sourceDocument.sourceDocumentId })
    .sort({ sequence: 1 })
    .lean()
    .exec();

  const firstExtraction = await extractionService.extractArgumentUnitsFromSourceDocument({
    sourceDocument,
    sourceSegments,
  });

  assert.equal(firstExtraction.ok, true);
  assert.equal(firstExtraction.terminal, false);
  assert.equal(firstExtraction.extractionVersion, 'argument-extraction-v1');
  assert.equal(firstExtraction.extractionMethod, 'machine_assisted');
  assert.equal(firstExtraction.extractedCount, 1);
  assert.equal(firstExtraction.extractedArgumentUnitIds.length, 1);
  assert.equal(firstExtraction.sourceAnchors.length, 2);
  assert.equal(segmentationResult.segmentCount, 3);

  const persistedUnitsAfterFirstExtraction = await ArgumentUnit.find({
    matterId: sourceDocument.matterId,
    documentId: sourceDocument.documentId,
  }).lean().exec();

  assert.equal(persistedUnitsAfterFirstExtraction.length, 1);
  assert.equal(persistedUnitsAfterFirstExtraction[0].extractionMethod, 'machine_assisted');
  assert.equal(persistedUnitsAfterFirstExtraction[0].reviewState, 'auto_accepted');
  assert.equal(persistedUnitsAfterFirstExtraction[0].admissibility, 'admissible');
  assert.equal(persistedUnitsAfterFirstExtraction[0].sourceSegmentIds.length, 2);

  const secondExtraction = await extractionService.extractArgumentUnitsFromSourceDocument({
    sourceDocument,
    sourceSegments,
  });

  assert.equal(secondExtraction.ok, true);
  assert.deepEqual(secondExtraction.extractedArgumentUnitIds, firstExtraction.extractedArgumentUnitIds);
  assert.equal(await ArgumentUnit.countDocuments({ matterId: sourceDocument.matterId, documentId: sourceDocument.documentId }), 1);
});

test('argument-extraction.service refuses documents without extractable paragraph segments', async () => {
  const sourceDocument = await createSourceDocument({
    sourceDocumentId: 'source-document-extraction-2',
    matterId: 'matter-extraction-2',
    documentId: 'document-extraction-2',
    content: [
      '# Standalone Heading',
      '',
    ].join('\n'),
  });

  await segmentationService.segmentSourceDocument({ sourceDocument });
  const sourceSegments = await SourceSegment.find({ sourceDocumentId: sourceDocument.sourceDocumentId })
    .sort({ sequence: 1 })
    .lean()
    .exec();

  const extractionResult = await extractionService.extractArgumentUnitsFromSourceDocument({
    sourceDocument,
    sourceSegments,
  });

  assert.equal(extractionResult.ok, false);
  assert.equal(extractionResult.terminal, true);
  assert.equal(extractionResult.result, 'unresolved');
  assert.equal(extractionResult.failureCode, 'NO_ARGUMENT_CANDIDATES');
  assert.equal(await ArgumentUnit.countDocuments({}), 0);
});

test('argument-extraction.service refuses malformed segment artifacts before extraction', async () => {
  const sourceDocument = await createSourceDocument({
    sourceDocumentId: 'source-document-extraction-3',
    matterId: 'matter-extraction-3',
    documentId: 'document-extraction-3',
    content: [
      '# Duty of Care',
      '',
      'The defendant owed a duty of care and failed to inspect the equipment.',
    ].join('\n'),
  });

  await segmentationService.segmentSourceDocument({ sourceDocument });
  const sourceSegments = await SourceSegment.find({ sourceDocumentId: sourceDocument.sourceDocumentId })
    .sort({ sequence: 1 })
    .lean()
    .exec();

  const tamperedSegments = sourceSegments.map((segment) => ({ ...segment }));
  tamperedSegments[1] = {
    ...tamperedSegments[1],
    sourceAnchor: 'tampered-anchor',
  };

  const extractionResult = await extractionService.extractArgumentUnitsFromSourceDocument({
    sourceDocument,
    sourceSegments: tamperedSegments,
  });

  assert.equal(extractionResult.ok, false);
  assert.equal(extractionResult.terminal, true);
  assert.equal(extractionResult.result, 'invalid');
  assert.equal(extractionResult.failureCode, 'MALFORMED_ARGUMENT_EXTRACTION_CANDIDATE');
  assert.equal(await ArgumentUnit.countDocuments({}), 0);
});

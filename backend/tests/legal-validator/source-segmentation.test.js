'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { connectMongo, disconnectMongo } = require('../../src/config/mongoose');
const SourceDocument = require('../../src/modules/legal-validator/sources/source-document.model');
const SourceSegment = require('../../src/modules/legal-validator/sources/source-segment.model');
const segmentationService = require('../../src/modules/legal-validator/sources/segmentation.service');

let mongoServer;

async function createSourceDocument(overrides = {}) {
  const sourceDocument = new SourceDocument({
    sourceDocumentId: 'source-document-test-1',
    matterId: 'matter-test-1',
    documentId: 'document-test-1',
    contentFormat: 'markdown',
    content: [
      '# Duty of Care',
      '',
      'The defendant owed a duty of care.',
      '\f',
      '## Breach',
      '',
      'The defendant failed to inspect the equipment.',
    ].join('\n'),
    ...overrides,
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

test('segmentation.service deterministically reproduces the same segment IDs and anchors for the same source document', async () => {
  const sourceDocument = await createSourceDocument();

  const firstResult = await segmentationService.segmentSourceDocument({ sourceDocument });
  const firstSegments = await SourceSegment.find({ sourceDocumentId: sourceDocument.sourceDocumentId })
    .sort({ sequence: 1 })
    .lean()
    .exec();

  const secondResult = await segmentationService.segmentSourceDocument({
    sourceDocumentId: sourceDocument.sourceDocumentId,
  });
  const secondSegments = await SourceSegment.find({ sourceDocumentId: sourceDocument.sourceDocumentId })
    .sort({ sequence: 1 })
    .lean()
    .exec();

  assert.equal(firstResult.ok, true);
  assert.equal(secondResult.ok, true);
  assert.equal(firstResult.segmentCount, 4);
  assert.equal(secondResult.segmentCount, 4);
  assert.deepEqual(
    firstSegments.map((segment) => ({
      sourceSegmentId: segment.sourceSegmentId,
      sourceAnchor: segment.sourceAnchor,
      sequence: segment.sequence,
      pageNumber: segment.pageNumber,
      segmentType: segment.segmentType,
      sectionLabel: segment.sectionLabel,
    })),
    secondSegments.map((segment) => ({
      sourceSegmentId: segment.sourceSegmentId,
      sourceAnchor: segment.sourceAnchor,
      sequence: segment.sequence,
      pageNumber: segment.pageNumber,
      segmentType: segment.segmentType,
      sectionLabel: segment.sectionLabel,
    })),
  );
});

test('segmentation.service preserves structural ordering, section labels, and replayable offsets', async () => {
  const sourceDocument = await createSourceDocument({
    content: [
      '# Duty of Care',
      '',
      'The defendant owed a duty of care and failed to inspect the equipment.',
      '',
      'The defendant did not maintain a safe system of work.',
    ].join('\n'),
  });

  const result = await segmentationService.segmentSourceDocument({ sourceDocument });
  const sourceSegments = await SourceSegment.find({ sourceDocumentId: sourceDocument.sourceDocumentId })
    .sort({ sequence: 1 })
    .lean()
    .exec();

  assert.equal(result.ok, true);
  assert.equal(result.segmentCount, 3);
  assert.deepEqual(sourceSegments.map((segment) => segment.sequence), [1, 2, 3]);
  assert.deepEqual(sourceSegments.map((segment) => segment.pageNumber), [1, 1, 1]);
  assert.deepEqual(sourceSegments.map((segment) => segment.segmentType), [
    'section_heading',
    'paragraph',
    'paragraph',
  ]);
  assert.deepEqual(sourceSegments.map((segment) => segment.sectionLabel), [
    'Duty of Care',
    'Duty of Care',
    'Duty of Care',
  ]);

  sourceSegments.forEach((segment) => {
    assert.equal(
      sourceDocument.content.slice(segment.charStart, segment.charEnd),
      segment.text,
    );
  });
});

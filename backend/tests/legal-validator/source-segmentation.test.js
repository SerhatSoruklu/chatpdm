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
  assert.deepEqual(result.sourceAnchors, sourceSegments.map((segment) => segment.sourceAnchor));
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
  assert.deepEqual(sourceSegments.map((segment) => segment.sourceContentHash), [
    sourceDocument.contentHash,
    sourceDocument.contentHash,
    sourceDocument.contentHash,
  ]);
  assert.deepEqual(sourceSegments.map((segment) => segment.sourceDocumentId), [
    sourceDocument.sourceDocumentId,
    sourceDocument.sourceDocumentId,
    sourceDocument.sourceDocumentId,
  ]);
  assert.match(sourceSegments[0].sourceSegmentId, /^source-document-test-1:[a-f0-9]{12}:p1:s1$/);
  assert.match(sourceSegments[0].sourceAnchor, /^document-test-1@[a-f0-9]{12}#p1\.s1$/);
  assert.match(sourceSegments[1].sourceSegmentId, /^source-document-test-1:[a-f0-9]{12}:p1:s2$/);
  assert.match(sourceSegments[1].sourceAnchor, /^document-test-1@[a-f0-9]{12}#p1\.s2$/);
  assert.match(sourceSegments[2].sourceSegmentId, /^source-document-test-1:[a-f0-9]{12}:p1:s3$/);
  assert.match(sourceSegments[2].sourceAnchor, /^document-test-1@[a-f0-9]{12}#p1\.s3$/);

  sourceSegments.forEach((segment) => {
    assert.ok(Number.isInteger(segment.charStart));
    assert.ok(Number.isInteger(segment.charEnd));
    assert.ok(segment.charEnd > segment.charStart);
    assert.equal(segment.sourceContentHash, sourceDocument.contentHash);
    assert.equal(segment.segmentationVersion, 'structural-v1');
    assert.equal(
      sourceDocument.content.slice(segment.charStart, segment.charEnd),
      segment.text,
    );
  });
});

test('segmentation.service rejects unsupported sourceDocument segmentation versions', async () => {
  const sourceDocument = await createSourceDocument({
    segmentationVersion: 'legacy-v0',
    content: [
      '# Duty of Care',
      '',
      'The defendant owed a duty of care.',
    ].join('\n'),
  });

  await assert.rejects(
    segmentationService.segmentSourceDocument({ sourceDocument }),
    /supports only segmentationVersion=structural-v1/,
  );
});

test('source-segment.model rejects malformed offsets and anchor state', async () => {
  const sourceDocument = await createSourceDocument({
    content: [
      '# Duty of Care',
      '',
      'The defendant owed a duty of care.',
    ].join('\n'),
  });

  const invalidSegment = new SourceSegment({
    sourceSegmentId: `${sourceDocument.sourceDocumentId}:${sourceDocument.contentHash.slice(0, 12)}:p1:s1`,
    sourceDocumentId: sourceDocument.sourceDocumentId,
    matterId: sourceDocument.matterId,
    documentId: sourceDocument.documentId,
    sourceContentHash: sourceDocument.contentHash,
    segmentationVersion: 'structural-v1',
    sequence: 1,
    pageNumber: 1,
    segmentType: 'paragraph',
    sourceAnchor: `${sourceDocument.documentId}@${sourceDocument.contentHash.slice(0, 12)}#p1.s1`,
    sectionLabel: 'Duty of Care',
    charStart: 12,
    charEnd: 12,
    text: 'The defendant owed a duty of care.',
  });

  await assert.rejects(
    invalidSegment.save(),
    /charEnd|sourceAnchor|sourceSegmentId/,
  );
});

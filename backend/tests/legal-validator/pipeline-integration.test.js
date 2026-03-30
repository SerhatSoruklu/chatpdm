'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { connectMongo, disconnectMongo } = require('../../src/config/mongoose');
const DoctrineArtifact = require('../../src/modules/legal-validator/doctrine/doctrine-artifact.model');
const ArgumentUnit = require('../../src/modules/legal-validator/arguments/argument-unit.model');
const AuthorityNode = require('../../src/modules/legal-validator/authority/authority-node.model');
const SourceDocument = require('../../src/modules/legal-validator/sources/source-document.model');
const SourceSegment = require('../../src/modules/legal-validator/sources/source-segment.model');
const Mapping = require('../../src/modules/legal-validator/mapping/mapping.model');
const ValidationRun = require('../../src/modules/legal-validator/validation/validation-run.model');
const doctrineLoaderService = require('../../src/modules/legal-validator/doctrine/doctrine-loader.service');
const admissibilityService = require('../../src/modules/legal-validator/arguments/admissibility.service');
const authorityRegistryService = require('../../src/modules/legal-validator/authority/authority-registry.service');
const segmentationService = require('../../src/modules/legal-validator/sources/segmentation.service');
const resolverService = require('../../src/modules/legal-validator/mapping/resolver.service');
const validationKernelService = require('../../src/modules/legal-validator/validation/validation-kernel.service');
const traceService = require('../../src/modules/legal-validator/validation/trace.service');

let mongoServer;

async function createDoctrineArtifact() {
  const artifact = new DoctrineArtifact({
    artifactId: 'artifact-integration-1',
    packageId: 'uk-negligence',
    version: '1.0.0',
    hash: 'd'.repeat(64),
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
      authorityIds: ['authority-duty-1'],
      mappingRuleIds: ['resolver-rule-duty-of-care'],
      validationRuleIds: ['validation-rule-duty-applies'],
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
  });

  await artifact.save();
  return artifact;
}

async function createSourceDocument() {
  const sourceDocument = new SourceDocument({
    sourceDocumentId: 'source-document-integration-1',
    matterId: 'matter-integration-1',
    documentId: 'document-integration-1',
    contentFormat: 'markdown',
    content: [
      '# Duty of Care',
      '',
      'The defendant owed a duty of care and failed to inspect the equipment.',
      '',
      'The defendant did not maintain a safe system of work.',
    ].join('\n'),
  });

  await sourceDocument.save();
  return sourceDocument;
}

async function createArgumentUnit({ sourceSegments }) {
  const paragraphSegments = sourceSegments.filter((segment) => segment.segmentType === 'paragraph');
  const primarySegment = paragraphSegments[0];
  const unit = new ArgumentUnit({
    argumentUnitId: 'argument-unit-integration-1',
    matterId: 'matter-integration-1',
    documentId: 'document-integration-1',
    sourceSegmentIds: paragraphSegments.map((segment) => segment.sourceSegmentId),
    unitType: 'application_step',
    text: primarySegment.text,
    normalizedText: primarySegment.text.toLowerCase(),
    speakerRole: 'claimant',
    positionSide: 'claimant',
    sequence: 1,
    extractionMethod: 'manual',
    reviewState: 'accepted',
    admissibility: 'admissible',
    unresolvedReason: null,
  });

  await unit.save();
  return unit;
}

async function createAuthorityNode(doctrineArtifactId) {
  const authorityNode = new AuthorityNode({
    authorityId: 'authority-duty-1',
    doctrineArtifactId,
    authorityType: 'statute_section',
    sourceClass: 'statute',
    institution: 'UK Parliament',
    citation: 'Health and Safety at Work Act 1974 s.2',
    jurisdiction: 'UK',
    text: 'It shall be the duty of every employer to ensure safety at work.',
    effectiveDate: new Date('2020-01-01T00:00:00Z'),
    endDate: null,
    precedentialWeight: 'binding',
    status: 'active',
    attribution: {
      interpretationRegimeId: 'uk-textual-v1',
      sourcePath: 'statute/health-and-safety-at-work/section-2',
    },
  });

  await authorityNode.save();
  return authorityNode;
}

async function createRecognizedAuthorityContext() {
  const artifact = await createDoctrineArtifact();
  const sourceDocument = await createSourceDocument();
  const segmentationResult = await segmentationService.segmentSourceDocument({
    sourceDocument,
  });
  const sourceSegments = await SourceSegment.find({ sourceDocumentId: sourceDocument.sourceDocumentId })
    .sort({ sequence: 1 })
    .lean()
    .exec();
  const unit = await createArgumentUnit({ sourceSegments });
  const authorityNode = await createAuthorityNode(artifact.artifactId);

  const admissibilityResult = await admissibilityService.evaluateArgumentUnits({
    argumentUnits: [unit],
  });

  const doctrineLoadResult = await doctrineLoaderService.loadDoctrineArtifact({
    artifactId: artifact.artifactId,
  });

  const authorityLookupResult = await authorityRegistryService.resolveAuthority({
    doctrineLoadResult,
    admissibilityResult,
    authorityInput: {
      authorityId: authorityNode.authorityId,
      evaluationDate: '2020-06-01T00:00:00Z',
      requiredInterpretationRegimeId: 'uk-textual-v1',
    },
  });

  return {
    artifact,
    sourceDocument,
    segmentationResult,
    sourceSegments,
    unit,
    authorityNode,
    admissibilityResult,
    doctrineLoadResult,
    authorityLookupResult,
  };
}

function getParagraphSourceSegments(sourceSegments) {
  return sourceSegments.filter((segment) => segment.segmentType === 'paragraph');
}

function getGeneratedSourceAnchors(unit, sourceSegments) {
  return sourceSegments
    .filter((segment) => unit.sourceSegmentIds.includes(segment.sourceSegmentId))
    .map((segment) => segment.sourceAnchor);
}

function buildGeneratedTraceInput({
  validationRunId,
  sourceAnchors,
  interpretationUsed = false,
  interpretationRegimeId = null,
}) {
  return {
    validationRunId,
    resolverVersion: 'resolver-v1',
    inputHash: '9'.repeat(64),
    sourceAnchors,
    interpretationUsed,
    interpretationRegimeId,
    manualOverrideUsed: false,
    overrideIds: [],
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

test('legal-validator pipeline persists a replay-safe ValidationRun on the valid path', async () => {
  const {
    artifact,
    sourceDocument,
    segmentationResult,
    sourceSegments,
    unit,
    admissibilityResult,
    doctrineLoadResult,
    authorityLookupResult,
  } = await createRecognizedAuthorityContext();

  const resolverResult = await resolverService.resolve({
    doctrineLoadResult,
    admissibilityResult,
    authorityLookupResult,
    resolverDecision: {
      status: 'success',
      mappingId: 'mapping-integration-1',
      mappingType: 'combined',
      matchBasis: 'exact_structural_rule',
      conceptId: 'duty_of_care',
      authorityId: 'authority-duty-1',
      resolverRuleId: 'resolver-rule-duty-of-care',
    },
  });

  const validationKernelResult = await validationKernelService.evaluate({
    doctrineLoadResult,
    resolverResult,
    validationDecision: {
      status: 'valid',
      validationRuleIds: ['validation-rule-duty-applies'],
    },
  });

  const traceResult = await traceService.finalize({
    doctrineLoadResult,
    resolverResult,
    validationKernelResult,
    traceInput: buildGeneratedTraceInput({
      validationRunId: 'validation-run-integration-1',
      sourceAnchors: sourceSegments
        .filter((segment) => unit.sourceSegmentIds.includes(segment.sourceSegmentId))
        .map((segment) => segment.sourceAnchor),
      interpretationUsed: true,
      interpretationRegimeId: 'uk-textual-v1',
    }),
  });

  assert.equal(admissibilityResult.ok, true);
  assert.equal(doctrineLoadResult.ok, true);
  assert.equal(authorityLookupResult.ok, true);
  assert.equal(resolverResult.ok, true);
  assert.equal(validationKernelResult.ok, true);
  assert.equal(traceResult.ok, true);
  assert.equal(segmentationResult.ok, true);
  assert.equal(sourceDocument.documentId, unit.documentId);
  assert.deepEqual(
    unit.sourceSegmentIds,
    getParagraphSourceSegments(sourceSegments).map((segment) => segment.sourceSegmentId),
  );
  assert.equal(traceResult.terminal, false);
  assert.equal(traceResult.result, 'valid');
  assert.equal(traceResult.validationRunWritten, true);
  assert.equal(traceResult.doctrineArtifactId, artifact.artifactId);
  assert.equal(traceResult.doctrineHash, artifact.hash);
  assert.equal(traceResult.mappingId, 'mapping-integration-1');
  assert.equal(traceResult.validationRunId, 'validation-run-integration-1');
  assert.deepEqual(traceResult.persistedTraceSummary, {
    sourceAnchors: getGeneratedSourceAnchors(unit, sourceSegments),
    interpretationRegimeId: 'uk-textual-v1',
    mappingRuleIds: ['resolver-rule-duty-of-care'],
    validationRuleIds: ['validation-rule-duty-applies'],
    overrideIds: [],
  });

  const persistedMapping = await Mapping.findOne({ mappingId: 'mapping-integration-1' }).lean().exec();
  const persistedRun = await ValidationRun.findOne({ validationRunId: 'validation-run-integration-1' }).lean().exec();

  assert.ok(persistedMapping);
  assert.equal(persistedMapping.status, 'success');
  assert.equal(persistedMapping.matchBasis, 'exact_structural_rule');
  assert.equal(persistedMapping.mappingType, 'combined');
  assert.equal(persistedMapping.conceptId, 'duty_of_care');
  assert.equal(persistedMapping.authorityId, 'authority-duty-1');

  assert.ok(persistedRun);
  assert.equal(persistedRun.matterId, unit.matterId);
  assert.equal(persistedRun.doctrineArtifactId, artifact.artifactId);
  assert.equal(persistedRun.doctrineHash, artifact.hash);
  assert.equal(persistedRun.resolverVersion, 'resolver-v1');
  assert.equal(persistedRun.inputHash, '9'.repeat(64));
  assert.equal(persistedRun.result, 'valid');
  assert.deepEqual(persistedRun.failureCodes, []);
  assert.deepEqual(persistedRun.trace.sourceAnchors, getGeneratedSourceAnchors(unit, sourceSegments));
  assert.equal(persistedRun.trace.interpretationUsed, true);
  assert.equal(persistedRun.trace.interpretationRegimeId, 'uk-textual-v1');
  assert.equal(persistedRun.trace.manualOverrideUsed, false);
  assert.deepEqual(persistedRun.trace.mappingRuleIds, ['resolver-rule-duty-of-care']);
  assert.deepEqual(persistedRun.trace.validationRuleIds, ['validation-rule-duty-applies']);
  assert.deepEqual(persistedRun.trace.overrideIds, []);
  assert.deepEqual(persistedRun.trace.loadedManifest.conceptIds, ['duty_of_care']);
  assert.deepEqual(persistedRun.trace.loadedManifest.authorityIds, ['authority-duty-1']);
  assert.equal(await SourceDocument.countDocuments({}), 1);
  assert.equal(await SourceSegment.countDocuments({}), 3);
  assert.equal(await ValidationRun.countDocuments({}), 1);
});

test('legal-validator pipeline persists ValidationRun on an invalid kernel result', async () => {
  const {
    artifact,
    sourceDocument,
    segmentationResult,
    sourceSegments,
    unit,
    admissibilityResult,
    doctrineLoadResult,
    authorityLookupResult,
  } = await createRecognizedAuthorityContext();

  const resolverResult = await resolverService.resolve({
    doctrineLoadResult,
    admissibilityResult,
    authorityLookupResult,
    resolverDecision: {
      status: 'success',
      mappingId: 'mapping-integration-invalid-1',
      mappingType: 'combined',
      matchBasis: 'exact_structural_rule',
      conceptId: 'duty_of_care',
      authorityId: 'authority-duty-1',
      resolverRuleId: 'resolver-rule-duty-of-care',
    },
  });

  const validationKernelResult = await validationKernelService.evaluate({
    doctrineLoadResult,
    resolverResult,
    authorityLookupResult,
    validationDecision: {
      status: 'source_override',
      reason: 'The claim attempts to override the controlling source.',
    },
  });

  const traceResult = await traceService.finalize({
    doctrineLoadResult,
    resolverResult,
    validationKernelResult,
    traceInput: buildGeneratedTraceInput({
      validationRunId: 'validation-run-integration-invalid-1',
      sourceAnchors: getGeneratedSourceAnchors(unit, sourceSegments),
    }),
  });

  assert.equal(admissibilityResult.ok, true);
  assert.equal(doctrineLoadResult.ok, true);
  assert.equal(authorityLookupResult.ok, true);
  assert.equal(segmentationResult.ok, true);
  assert.equal(sourceDocument.documentId, unit.documentId);
  assert.deepEqual(
    unit.sourceSegmentIds,
    getParagraphSourceSegments(sourceSegments).map((segment) => segment.sourceSegmentId),
  );
  assert.deepEqual(
    getGeneratedSourceAnchors(unit, sourceSegments),
    getParagraphSourceSegments(sourceSegments).map((segment) => segment.sourceAnchor),
  );
  assert.equal(resolverResult.ok, true);
  assert.equal(validationKernelResult.ok, false);
  assert.equal(validationKernelResult.terminal, true);
  assert.equal(validationKernelResult.result, 'invalid');
  assert.equal(validationKernelResult.failureCode, 'SOURCE_OVERRIDE_ATTEMPT');
  assert.equal(validationKernelResult.argumentUnitId, unit.argumentUnitId);
  assert.equal(validationKernelResult.doctrineArtifactId, artifact.artifactId);
  assert.equal(validationKernelResult.mappingId, 'mapping-integration-invalid-1');
  assert.equal(traceResult.ok, true);
  assert.equal(traceResult.terminal, false);
  assert.equal(traceResult.result, 'invalid');
  assert.deepEqual(traceResult.failureCodes, ['SOURCE_OVERRIDE_ATTEMPT']);
  assert.equal(traceResult.validationRunWritten, true);

  const persistedMapping = await Mapping.findOne({ mappingId: 'mapping-integration-invalid-1' }).lean().exec();
  const persistedRun = await ValidationRun.findOne({ validationRunId: 'validation-run-integration-invalid-1' }).lean().exec();

  assert.ok(persistedMapping);
  assert.equal(persistedMapping.status, 'success');
  assert.ok(persistedRun);
  assert.equal(persistedRun.result, 'invalid');
  assert.deepEqual(persistedRun.failureCodes, ['SOURCE_OVERRIDE_ATTEMPT']);
  assert.deepEqual(persistedRun.trace.sourceAnchors, getGeneratedSourceAnchors(unit, sourceSegments));
  assert.deepEqual(persistedRun.trace.mappingRuleIds, ['resolver-rule-duty-of-care']);
  assert.deepEqual(persistedRun.trace.validationRuleIds, []);
  assert.equal(await SourceDocument.countDocuments({}), 1);
  assert.equal(await SourceSegment.countDocuments({}), 3);
  assert.equal(await Mapping.countDocuments({}), 1);
  assert.equal(await ValidationRun.countDocuments({}), 1);
});

test('legal-validator pipeline persists ValidationRun on an unresolved resolver result without persisting Mapping', async () => {
  const {
    artifact,
    sourceDocument,
    segmentationResult,
    sourceSegments,
    unit,
    admissibilityResult,
    doctrineLoadResult,
    authorityLookupResult,
  } = await createRecognizedAuthorityContext();

  const resolverResult = await resolverService.resolve({
    doctrineLoadResult,
    admissibilityResult,
    authorityLookupResult,
    resolverDecision: {
      status: 'ambiguous',
      reason: 'Two live authority-grounded readings remain available.',
    },
  });

  const traceResult = await traceService.finalize({
    doctrineLoadResult,
    resolverResult,
    traceInput: buildGeneratedTraceInput({
      validationRunId: 'validation-run-integration-unresolved-1',
      sourceAnchors: getGeneratedSourceAnchors(unit, sourceSegments),
    }),
  });

  assert.equal(admissibilityResult.ok, true);
  assert.equal(doctrineLoadResult.ok, true);
  assert.equal(authorityLookupResult.ok, true);
  assert.equal(segmentationResult.ok, true);
  assert.equal(sourceDocument.documentId, unit.documentId);
  assert.deepEqual(
    unit.sourceSegmentIds,
    getParagraphSourceSegments(sourceSegments).map((segment) => segment.sourceSegmentId),
  );
  assert.deepEqual(
    getGeneratedSourceAnchors(unit, sourceSegments),
    getParagraphSourceSegments(sourceSegments).map((segment) => segment.sourceAnchor),
  );
  assert.equal(resolverResult.ok, false);
  assert.equal(resolverResult.terminal, true);
  assert.equal(resolverResult.result, 'unresolved');
  assert.equal(resolverResult.failureCode, 'AMBIGUOUS_CONCEPT_MAPPING');
  assert.equal(resolverResult.argumentUnitId, unit.argumentUnitId);
  assert.equal(resolverResult.doctrineArtifactId, artifact.artifactId);
  assert.equal(resolverResult.mappingWritten, false);
  assert.equal(traceResult.ok, true);
  assert.equal(traceResult.terminal, false);
  assert.equal(traceResult.result, 'unresolved');
  assert.deepEqual(traceResult.failureCodes, ['AMBIGUOUS_CONCEPT_MAPPING']);
  assert.equal(traceResult.validationRunWritten, true);
  assert.equal(traceResult.mappingId, null);
  const persistedRun = await ValidationRun.findOne({ validationRunId: 'validation-run-integration-unresolved-1' }).lean().exec();
  assert.ok(persistedRun);
  assert.equal(persistedRun.result, 'unresolved');
  assert.deepEqual(persistedRun.failureCodes, ['AMBIGUOUS_CONCEPT_MAPPING']);
  assert.deepEqual(persistedRun.trace.sourceAnchors, getGeneratedSourceAnchors(unit, sourceSegments));
  assert.deepEqual(persistedRun.trace.mappingRuleIds, []);
  assert.deepEqual(persistedRun.trace.validationRuleIds, []);
  assert.equal(await SourceDocument.countDocuments({}), 1);
  assert.equal(await SourceSegment.countDocuments({}), 3);
  assert.equal(await Mapping.countDocuments({}), 0);
  assert.equal(await ValidationRun.countDocuments({}), 1);
});

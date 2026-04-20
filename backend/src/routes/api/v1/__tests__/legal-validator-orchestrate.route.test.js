'use strict';

const http = require('node:http');
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { connectMongo, disconnectMongo } = require('../../../../config/mongoose');
const app = require('../../../../app');
const DoctrineArtifact = require('../../../../modules/legal-validator/doctrine/doctrine-artifact.model');
const SourceDocument = require('../../../../modules/legal-validator/sources/source-document.model');
const SourceSegment = require('../../../../modules/legal-validator/sources/source-segment.model');
const ArgumentUnit = require('../../../../modules/legal-validator/arguments/argument-unit.model');
const AuthorityNode = require('../../../../modules/legal-validator/authority/authority-node.model');
const OverrideRecord = require('../../../../modules/legal-validator/overrides/override-record.model');
const Matter = require('../../../../modules/legal-validator/matter/matter.model');
const Mapping = require('../../../../modules/legal-validator/mapping/mapping.model');
const ValidationRun = require('../../../../modules/legal-validator/validation/validation-run.model');
const segmentationService = require('../../../../modules/legal-validator/sources/segmentation.service');
const { CONCEPT_SET_VERSION } = require('../../../../modules/concepts/constants');

let mongoServer;

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();

      if (!address || typeof address !== 'object') {
        reject(new Error('Expected the backend server to bind to a port.'));
        return;
      }

      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`,
      });
    });

    server.once('error', reject);
  });
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);

  return {
    status: response.status,
    body: await response.json(),
  };
}

async function createDoctrineArtifact(overrides = {}) {
  const manifestOverrides = overrides.manifest || {};
  const artifact = new DoctrineArtifact({
    artifactId: overrides.artifactId || 'artifact-orchestrator-1',
    packageId: 'uk-negligence',
    version: overrides.version || '1.0.0',
    hash: overrides.hash || 'a'.repeat(64),
    storageKey: overrides.storageKey || 'doctrine/uk-negligence/1.0.0.json',
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
      ...manifestOverrides,
    },
    governance: {
      status: 'approved',
      approvedBy: 'reviewer-1',
      approvedAt: new Date('2026-03-30T10:00:00Z'),
      ...(overrides.governance || {}),
    },
    replay: {
      isRetained: true,
      retainedAt: new Date('2026-03-30T10:00:00Z'),
      ...(overrides.replay || {}),
    },
    createdBy: overrides.createdBy || 'author-1',
  });

  await artifact.save();
  return artifact;
}

async function createSourceDocument(matterId) {
  const sourceDocument = new SourceDocument({
    sourceDocumentId: 'source-document-orchestrator-1',
    matterId,
    documentId: 'document-orchestrator-1',
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

async function createOverrideRecord({ matterId, argumentUnitId, mappingId, reviewedBy = 'reviewer-1', reviewedAt = new Date('2026-03-30T12:00:00Z'), reviewStatus = 'approved' } = {}) {
  const overrideRecord = new OverrideRecord({
    overrideId: 'override-orchestrator-1',
    matterId,
    argumentUnitId,
    mappingId,
    overrideType: 'mapping_override',
    reason: 'Manual mapping approved by governance review.',
    createdBy: 'reviewer-1',
    reviewStatus,
    reviewedBy,
    reviewedAt,
  });

  await overrideRecord.save();
  return overrideRecord;
}

function buildMatterInput() {
  return {
    matterId: 'matter-orchestrator-1',
    title: 'Orchestrator intake matter',
    jurisdiction: 'UK',
    practiceArea: 'negligence',
    status: 'active',
    createdBy: 'intake-user',
  };
}

async function createMatterViaIntake(baseUrl) {
  const matterInput = buildMatterInput();
  const response = await fetchJson(`${baseUrl}/api/v1/legal-validator/intake`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      input: {
        matter: matterInput,
      },
    }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.matter, matterInput);

  return response.body.matter;
}

function buildTraceInput({
  validationRunId,
  sourceAnchors,
  interpretationUsed = true,
  interpretationRegimeId = 'uk-textual-v1',
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

function deriveArgumentUnitId(sourceDocument, sourceSegments) {
  const fingerprint = sourceDocument.contentHash.slice(0, 12);
  const primaryParagraphSegment = sourceSegments.find((segment) => segment.segmentType === 'paragraph');
  const primarySequence = primaryParagraphSegment?.sequence || sourceSegments[0]?.sequence || 1;

  return `argument-unit:${sourceDocument.documentId}:${fingerprint}:s${primarySequence}`;
}

async function buildHappyPathSeed(baseUrl, { artifactOverrides = {} } = {}) {
  const matter = await createMatterViaIntake(baseUrl);
  const artifact = await createDoctrineArtifact(artifactOverrides);
  const sourceDocument = await createSourceDocument(matter.matterId);
  await segmentationService.segmentSourceDocument({ sourceDocument });
  const sourceSegments = await SourceSegment.find({ sourceDocumentId: sourceDocument.sourceDocumentId })
    .sort({ sequence: 1 })
    .lean()
    .exec();
  const authorityNode = await createAuthorityNode(artifact.artifactId);
  const bindResponse = await fetchJson(`${baseUrl}/api/v1/legal-validator/intake`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      input: {
        matter,
        sourceDocumentIds: [sourceDocument.sourceDocumentId],
      },
    }),
  });
  assert.equal(bindResponse.status, 200);
  assert.equal(bindResponse.body.matterMode, 'bound');
  assert.deepEqual(bindResponse.body.sourceDocumentIds, [sourceDocument.sourceDocumentId]);

  return {
    matter,
    artifact,
    sourceDocument,
    sourceSegments,
    authorityNode,
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

test('legal-validator orchestrator route advertises the runtime contract', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const { status, body } = await fetchJson(`${baseUrl}/api/v1/legal-validator/orchestrate`);

    assert.equal(status, 200);
    assert.deepEqual(body, {
      resource: 'legal-validator-orchestrator',
      status: 'active',
      contractVersion: 'orchestrator-v1',
      phaseOrder: ['Pre-A', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
      boundary: {
        product: 'legal-argument-validator',
        scope: 'bounded-legal-validation',
      },
      requestShape: {
        topLevel: ['input'],
        boundaryFields: ['product', 'scope', 'matterId', 'jurisdiction', 'practiceArea'],
        requiredOrchestratorFields: [
          'sourceDocumentId',
          'doctrineArtifactId',
          'traceInput',
        ],
        optionalOrchestratorFields: [
          'authorityInput',
          'resolverDecision',
          'validationDecision',
        ],
        traceInputFields: [
          'validationRunId',
          'resolverVersion',
          'inputHash',
        ],
      },
      allowedOutcomes: ['valid', 'invalid', 'unresolved'],
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('legal-validator orchestrator executes the full A-through-H runtime path', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const {
      matter,
      artifact,
      sourceDocument,
      sourceSegments,
      authorityNode,
    } = await buildHappyPathSeed(baseUrl);

    const sourceAnchors = sourceSegments
      .filter((segment) => segment.segmentType === 'paragraph')
      .map((segment) => segment.sourceAnchor);

    const { status, body } = await fetchJson(`${baseUrl}/api/v1/legal-validator/orchestrate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        input: {
          product: 'legal-argument-validator',
          scope: 'bounded-legal-validation',
          matterId: matter.matterId,
          jurisdiction: 'UK',
          practiceArea: 'negligence',
          sourceDocumentId: sourceDocument.sourceDocumentId,
          doctrineArtifactId: artifact.artifactId,
          authorityInput: {
            authorityId: authorityNode.authorityId,
            evaluationDate: '2020-06-01T00:00:00Z',
            requiredInterpretationRegimeId: 'uk-textual-v1',
          },
          resolverDecision: {
            status: 'success',
            mappingId: 'mapping-orchestrator-1',
            mappingType: 'combined',
            matchBasis: 'exact_structural_rule',
            conceptId: 'duty_of_care',
            authorityId: authorityNode.authorityId,
            resolverRuleId: 'resolver-rule-duty-of-care',
          },
          traceInput: buildTraceInput({
            validationRunId: 'validation-run-orchestrator-1',
            sourceAnchors,
          }),
        },
      }),
    });

    assert.equal(status, 200);
    assert.equal(body.resource, 'legal-validator-orchestrator');
    assert.equal(body.status, 'completed');
    assert.equal(body.contractVersion, 'orchestrator-v1');
    assert.deepEqual(body.phaseOrder, ['Pre-A', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    assert.equal(body.final.result, 'valid');
    assert.deepEqual(body.final.failureCodes, []);
    assert.equal(body.final.validationRunWritten, true);
    assert.equal(body.final.validationRunId, 'validation-run-orchestrator-1');
    assert.equal(body.final.mappingId, 'mapping-orchestrator-1');
    assert.equal(body.final.doctrineArtifactId, artifact.artifactId);
    assert.equal(body.final.doctrineHash, artifact.hash);
    assert.equal(body.final.stoppedPhase, 'H');
    assert.equal(body.final.persistedTraceSummary.sourceAnchors.length, 2);
    assert.equal(body.phases.length, 9);
    assert.equal(body.phases[0].phase, 'Pre-A');
    assert.equal(body.phases[0].status, 'completed');
    assert.equal(body.phases[1].phase, 'A');
    assert.equal(body.phases[1].status, 'completed');
    assert.equal(body.phases[1].output.matterId, matter.matterId);
    assert.equal(body.phases[1].output.matterStatus, 'active');
    assert.equal(body.phases[2].phase, 'B');
    assert.equal(body.phases[2].status, 'completed');
    assert.equal(body.phases[3].phase, 'C');
    assert.equal(body.phases[3].status, 'completed');
    assert.equal(body.phases[3].output.extractedArgumentUnitIds.length, 1);
    assert.equal(body.phases[3].output.extractionMethod, 'machine_assisted');
    assert.equal(body.phases[4].phase, 'D');
    assert.equal(body.phases[4].status, 'completed');
    assert.equal(body.phases[4].output.conceptSetVersion, CONCEPT_SET_VERSION);
    assert.deepEqual(body.phases[4].output.coreConceptsReferenced, ['authority']);
    assert.deepEqual(body.phases[4].output.resolvedCoreConceptIds, ['authority']);
    assert.deepEqual(body.phases[4].output.packageConceptsDeclared, ['duty_of_care']);
    assert.equal(body.phases[5].phase, 'E');
    assert.equal(body.phases[5].status, 'completed');
    assert.equal(body.phases[5].output.authorityId, authorityNode.authorityId);
    assert.equal(body.phases[5].output.citation, authorityNode.citation);
    assert.equal(body.phases[5].output.sourceClass, authorityNode.sourceClass);
    assert.equal(body.phases[5].output.jurisdiction, authorityNode.jurisdiction);
    assert.equal(body.phases[5].output.interpretationRegimeId, 'uk-textual-v1');
    assert.equal(body.phases[5].output.citationScope.doctrineJurisdiction, 'UK');
    assert.deepEqual(body.phases[5].output.citationScope.doctrineSourceClasses, ['statute', 'case_law']);
    assert.equal(body.phases[5].output.citationScope.authorityJurisdiction, 'UK');
    assert.equal(body.phases[6].phase, 'F');
    assert.equal(body.phases[6].status, 'completed');
    assert.equal(body.phases[7].phase, 'G');
    assert.equal(body.phases[7].status, 'completed');
    assert.deepEqual(body.phases[7].output.validationRuleIds, ['validation-rule-duty-applies']);
    assert.equal(body.phases[8].phase, 'H');
    assert.equal(body.phases[8].status, 'completed');

    const persistedMapping = await Mapping.findOne({ mappingId: 'mapping-orchestrator-1' }).lean().exec();
    const persistedRun = await ValidationRun.findOne({ validationRunId: 'validation-run-orchestrator-1' }).lean().exec();
    const persistedMatter = await Matter.findOne({ matterId: matter.matterId }).lean().exec();
    const persistedUnits = await ArgumentUnit.find({ matterId: matter.matterId, documentId: sourceDocument.documentId }).lean().exec();

    assert.ok(persistedMapping);
    assert.equal(persistedMapping.status, 'success');
    assert.equal(persistedMapping.matchBasis, 'exact_structural_rule');
    assert.equal(persistedMapping.mappingType, 'combined');
    assert.equal(persistedMapping.conceptId, 'duty_of_care');
    assert.equal(persistedMapping.authorityId, authorityNode.authorityId);

    assert.ok(persistedRun);
    assert.equal(persistedRun.result, 'valid');
    assert.deepEqual(persistedRun.failureCodes, []);
    assert.equal(persistedRun.resolverVersion, 'resolver-v1');
    assert.equal(persistedRun.inputHash, '9'.repeat(64));
    assert.deepEqual(persistedRun.trace.sourceAnchors, sourceAnchors);
    assert.equal(persistedRun.trace.interpretationUsed, true);
    assert.equal(persistedRun.trace.interpretationRegimeId, 'uk-textual-v1');
    assert.deepEqual(persistedRun.trace.mappingRuleIds, ['resolver-rule-duty-of-care']);
    assert.deepEqual(persistedRun.trace.validationRuleIds, ['validation-rule-duty-applies']);
    assert.ok(persistedMatter);
    assert.equal(persistedMatter.title, matter.title);
    assert.equal(persistedMatter.status, 'active');
    assert.equal(persistedUnits.length, 1);
    assert.equal(persistedUnits[0].extractionMethod, 'machine_assisted');
    assert.equal(persistedUnits[0].reviewState, 'auto_accepted');
    assert.equal(persistedUnits[0].admissibility, 'admissible');
    assert.equal(persistedUnits[0].sourceSegmentIds.length, 2);
    assert.equal(await SourceDocument.countDocuments({}), 1);
    assert.equal(await SourceSegment.countDocuments({}), 3);
    assert.equal(await ArgumentUnit.countDocuments({}), 1);
    assert.equal(await Mapping.countDocuments({}), 1);
    assert.equal(await ValidationRun.countDocuments({}), 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('legal-validator orchestrator executes the governed manual_override runtime path', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const {
      matter,
      artifact,
      sourceDocument,
      sourceSegments,
      authorityNode,
    } = await buildHappyPathSeed(baseUrl);
    const argumentUnitId = deriveArgumentUnitId(sourceDocument, sourceSegments);

    await createOverrideRecord({
      matterId: matter.matterId,
      argumentUnitId,
      mappingId: 'mapping-orchestrator-manual-override-1',
    });

    const sourceAnchors = sourceSegments
      .filter((segment) => segment.segmentType === 'paragraph')
      .map((segment) => segment.sourceAnchor);

    const { status, body } = await fetchJson(`${baseUrl}/api/v1/legal-validator/orchestrate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        input: {
          product: 'legal-argument-validator',
          scope: 'bounded-legal-validation',
          matterId: matter.matterId,
          jurisdiction: 'UK',
          practiceArea: 'negligence',
          sourceDocumentId: sourceDocument.sourceDocumentId,
          doctrineArtifactId: artifact.artifactId,
          authorityInput: {
            authorityId: authorityNode.authorityId,
            evaluationDate: '2020-06-01T00:00:00Z',
            requiredInterpretationRegimeId: 'uk-textual-v1',
          },
          resolverDecision: {
            status: 'success',
            mappingId: 'mapping-orchestrator-manual-override-1',
            mappingType: 'concept',
            matchBasis: 'manual_override',
            conceptId: 'authority',
            overrideId: 'override-orchestrator-1',
            resolverRuleId: 'resolver-rule-manual-override',
          },
          traceInput: buildTraceInput({
            validationRunId: 'validation-run-orchestrator-manual-override-1',
            sourceAnchors,
            manualOverrideUsed: true,
            overrideIds: ['override-orchestrator-1'],
          }),
        },
      }),
    });

    assert.equal(status, 200);
    assert.equal(body.status, 'completed');
    assert.equal(body.final.result, 'valid');
    assert.equal(body.phases[6].phase, 'F');
    assert.equal(body.phases[6].status, 'completed');
    assert.equal(body.phases[6].output.matchBasis, 'manual_override');
    assert.equal(body.phases[6].output.overrideId, 'override-orchestrator-1');
    assert.equal(body.phases[6].output.manualOverrideReason, 'Manual mapping approved by governance review.');

    const persistedMapping = await Mapping.findOne({ mappingId: 'mapping-orchestrator-manual-override-1' }).lean().exec();

    assert.ok(persistedMapping);
    assert.equal(persistedMapping.matchBasis, 'manual_override');
    assert.equal(persistedMapping.overrideId, 'override-orchestrator-1');
    assert.equal(persistedMapping.manualOverrideReason, 'Manual mapping approved by governance review.');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('legal-validator orchestrator refuses manual_override mapping when the OverrideRecord is not approved', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const {
      matter,
      artifact,
      sourceDocument,
      sourceSegments,
      authorityNode,
    } = await buildHappyPathSeed(baseUrl);
    const argumentUnitId = deriveArgumentUnitId(sourceDocument, sourceSegments);

    await createOverrideRecord({
      matterId: matter.matterId,
      argumentUnitId,
      mappingId: 'mapping-orchestrator-manual-override-rejected',
      reviewStatus: 'pending',
      reviewedBy: null,
      reviewedAt: null,
    });

    const sourceAnchors = sourceSegments
      .filter((segment) => segment.segmentType === 'paragraph')
      .map((segment) => segment.sourceAnchor);

    const { status, body } = await fetchJson(`${baseUrl}/api/v1/legal-validator/orchestrate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        input: {
          product: 'legal-argument-validator',
          scope: 'bounded-legal-validation',
          matterId: matter.matterId,
          jurisdiction: 'UK',
          practiceArea: 'negligence',
          sourceDocumentId: sourceDocument.sourceDocumentId,
          doctrineArtifactId: artifact.artifactId,
          authorityInput: {
            authorityId: authorityNode.authorityId,
            evaluationDate: '2020-06-01T00:00:00Z',
            requiredInterpretationRegimeId: 'uk-textual-v1',
          },
          resolverDecision: {
            status: 'success',
            mappingId: 'mapping-orchestrator-manual-override-rejected',
            mappingType: 'concept',
            matchBasis: 'manual_override',
            conceptId: 'authority',
            overrideId: 'override-orchestrator-1',
            resolverRuleId: 'resolver-rule-manual-override',
          },
          traceInput: buildTraceInput({
            validationRunId: 'validation-run-orchestrator-manual-override-rejected',
            sourceAnchors,
            manualOverrideUsed: true,
            overrideIds: ['override-orchestrator-1'],
          }),
        },
      }),
    });

    assert.equal(status, 200);
    assert.equal(body.status, 'completed');
    assert.equal(body.final.stoppedPhase, 'H');
    assert.equal(body.final.result, 'invalid');
    assert.equal(body.final.failureCode, 'UNAPPROVED_OVERRIDE_RECORD');
    assert.equal(body.phases[6].phase, 'F');
    assert.equal(body.phases[6].status, 'terminated');
    assert.equal(body.phases[6].failureCode, 'UNAPPROVED_OVERRIDE_RECORD');
    assert.equal(body.phases[7].phase, 'G');
    assert.equal(body.phases[7].status, 'skipped');
    assert.equal(body.phases[8].phase, 'H');
    assert.equal(body.phases[8].status, 'completed');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('legal-validator orchestrator surfaces authority scope violations through the runtime API path', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const {
      matter,
      artifact,
      sourceDocument,
      sourceSegments,
      authorityNode,
    } = await buildHappyPathSeed(baseUrl);

    const sourceAnchors = sourceSegments
      .filter((segment) => segment.segmentType === 'paragraph')
      .map((segment) => segment.sourceAnchor);

    const { status, body } = await fetchJson(`${baseUrl}/api/v1/legal-validator/orchestrate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        input: {
          product: 'legal-argument-validator',
          scope: 'bounded-legal-validation',
          matterId: matter.matterId,
          jurisdiction: 'UK',
          practiceArea: 'negligence',
          sourceDocumentId: sourceDocument.sourceDocumentId,
          doctrineArtifactId: artifact.artifactId,
          authorityInput: {
            authorityId: authorityNode.authorityId,
            evaluationDate: '2020-06-01T00:00:00Z',
            expectedJurisdiction: 'US',
            requiredInterpretationRegimeId: 'uk-textual-v1',
          },
          resolverDecision: {
            status: 'success',
            mappingId: 'mapping-orchestrator-authority-failure',
            mappingType: 'combined',
            matchBasis: 'exact_structural_rule',
            conceptId: 'duty_of_care',
            authorityId: authorityNode.authorityId,
            resolverRuleId: 'resolver-rule-duty-of-care',
          },
          traceInput: buildTraceInput({
            validationRunId: 'validation-run-orchestrator-authority-failure',
            sourceAnchors,
          }),
        },
      }),
    });

    assert.equal(status, 200);
    assert.equal(body.status, 'terminal');
    assert.equal(body.final.stoppedPhase, 'E');
    assert.equal(body.final.failureCode, 'AUTHORITY_SCOPE_VIOLATION');
    assert.equal(body.final.result, 'invalid');
    assert.equal(body.phases[5].phase, 'E');
    assert.equal(body.phases[5].status, 'terminated');
    assert.equal(body.phases[5].failureCode, 'AUTHORITY_SCOPE_VIOLATION');
    assert.equal(body.phases[5].output.authorityId, authorityNode.authorityId);
    assert.equal(body.phases[5].output.citation, authorityNode.citation);
    assert.equal(body.phases[5].output.jurisdiction, 'UK');
    assert.equal(body.phases[5].output.citationScope.expectedJurisdiction, 'US');
    assert.equal(body.phases[5].output.citationScope.authorityJurisdiction, 'UK');
    assert.equal(body.phases[5].output.citationScope.doctrineJurisdiction, 'UK');
    assert.equal(body.phases[6].phase, 'F');
    assert.equal(body.phases[6].status, 'skipped');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('legal-validator orchestrator preserves terminal phase state through trace completion', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const {
      matter,
      artifact,
      sourceDocument,
      sourceSegments,
      authorityNode,
    } = await buildHappyPathSeed(baseUrl, {
      artifactOverrides: {
        manifest: {
          validationRuleIds: ['validation-rule-duty-applies', 'validation-rule-duty-applies'],
        },
      },
    });

    const sourceAnchors = sourceSegments
      .filter((segment) => segment.segmentType === 'paragraph')
      .map((segment) => segment.sourceAnchor);

    const { status, body } = await fetchJson(`${baseUrl}/api/v1/legal-validator/orchestrate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        input: {
          product: 'legal-argument-validator',
          scope: 'bounded-legal-validation',
          matterId: matter.matterId,
          jurisdiction: 'UK',
          practiceArea: 'negligence',
          sourceDocumentId: sourceDocument.sourceDocumentId,
          doctrineArtifactId: artifact.artifactId,
          authorityInput: {
            authorityId: authorityNode.authorityId,
            evaluationDate: '2020-06-01T00:00:00Z',
            requiredInterpretationRegimeId: 'uk-textual-v1',
          },
          resolverDecision: {
            status: 'success',
            mappingId: 'mapping-orchestrator-invalid-1',
            mappingType: 'combined',
            matchBasis: 'exact_structural_rule',
            conceptId: 'duty_of_care',
            authorityId: authorityNode.authorityId,
            resolverRuleId: 'resolver-rule-duty-of-care',
          },
          traceInput: buildTraceInput({
            validationRunId: 'validation-run-orchestrator-invalid-1',
            sourceAnchors,
          }),
        },
      }),
    });

    assert.equal(status, 200);
    assert.equal(body.status, 'completed');
    assert.equal(body.final.result, 'invalid');
    assert.deepEqual(body.final.failureCodes, ['UNAUTHORIZED_DECISION_PATH']);
    assert.equal(body.final.validationRunWritten, true);
    assert.equal(body.final.validationRunId, 'validation-run-orchestrator-invalid-1');
    assert.equal(body.final.mappingId, 'mapping-orchestrator-invalid-1');
    assert.equal(body.phases[6].phase, 'F');
    assert.equal(body.phases[6].status, 'completed');
    assert.equal(body.phases[7].phase, 'G');
    assert.equal(body.phases[7].status, 'terminated');
    assert.equal(body.phases[7].failureCode, 'UNAUTHORIZED_DECISION_PATH');
    assert.equal(body.phases[8].phase, 'H');
    assert.equal(body.phases[8].status, 'completed');

    const persistedMapping = await Mapping.findOne({ mappingId: 'mapping-orchestrator-invalid-1' }).lean().exec();
    const persistedRun = await ValidationRun.findOne({ validationRunId: 'validation-run-orchestrator-invalid-1' }).lean().exec();
    const persistedUnits = await ArgumentUnit.find({ matterId: matter.matterId, documentId: sourceDocument.documentId }).lean().exec();

    assert.ok(persistedMapping);
    assert.equal(persistedMapping.status, 'success');
    assert.ok(persistedRun);
    assert.equal(persistedRun.result, 'invalid');
    assert.deepEqual(persistedRun.failureCodes, ['UNAUTHORIZED_DECISION_PATH']);
    assert.deepEqual(persistedRun.trace.sourceAnchors, sourceAnchors);
    assert.equal(persistedUnits.length, 1);
    assert.equal(persistedUnits[0].extractionMethod, 'machine_assisted');
    assert.equal(await Mapping.countDocuments({}), 1);
    assert.equal(await ValidationRun.countDocuments({}), 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('legal-validator replay route re-executes a retained ValidationRun and reports a matching comparison', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const {
      matter,
      artifact,
      sourceDocument,
      sourceSegments,
      authorityNode,
    } = await buildHappyPathSeed(baseUrl);

    const sourceAnchors = sourceSegments
      .filter((segment) => segment.segmentType === 'paragraph')
      .map((segment) => segment.sourceAnchor);

    const orchestrationResponse = await fetchJson(`${baseUrl}/api/v1/legal-validator/orchestrate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        input: {
          product: 'legal-argument-validator',
          scope: 'bounded-legal-validation',
          matterId: matter.matterId,
          jurisdiction: 'UK',
          practiceArea: 'negligence',
          sourceDocumentId: sourceDocument.sourceDocumentId,
          doctrineArtifactId: artifact.artifactId,
          authorityInput: {
            authorityId: authorityNode.authorityId,
            evaluationDate: '2020-06-01T00:00:00Z',
            requiredInterpretationRegimeId: 'uk-textual-v1',
          },
          resolverDecision: {
            status: 'success',
            mappingId: 'mapping-orchestrator-replay-1',
            mappingType: 'combined',
            matchBasis: 'exact_structural_rule',
            conceptId: 'duty_of_care',
            authorityId: authorityNode.authorityId,
            resolverRuleId: 'resolver-rule-duty-of-care',
          },
          traceInput: buildTraceInput({
            validationRunId: 'validation-run-orchestrator-replay-1',
            sourceAnchors,
          }),
        },
      }),
    });

    assert.equal(orchestrationResponse.status, 200);
    assert.equal(orchestrationResponse.body.status, 'completed');
    assert.equal(orchestrationResponse.body.final.validationRunWritten, true);

    const replayResponse = await fetchJson(`${baseUrl}/api/v1/legal-validator/replay`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        input: {
          validationRunId: 'validation-run-orchestrator-replay-1',
        },
      }),
    });

    assert.equal(replayResponse.status, 200);
    assert.equal(replayResponse.body.resource, 'legal-validator-replay');
    assert.equal(replayResponse.body.status, 'completed');
    assert.equal(replayResponse.body.contractVersion, 'replay-v1');
    assert.equal(replayResponse.body.final.result, 'valid');
    assert.deepEqual(replayResponse.body.final.failureCodes, []);
    assert.equal(replayResponse.body.final.originalValidationRunId, 'validation-run-orchestrator-replay-1');
    assert.equal(replayResponse.body.final.replayComparison.ok, true);
    assert.deepEqual(replayResponse.body.final.replayComparison.mismatches, []);
    assert.deepEqual(replayResponse.body.final.replayedTraceSummary.sourceAnchors, sourceAnchors);
    assert.deepEqual(replayResponse.body.final.replayedTraceSummary.validationRuleIds, ['validation-rule-duty-applies']);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

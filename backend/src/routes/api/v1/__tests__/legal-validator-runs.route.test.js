'use strict';

const http = require('node:http');
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { connectMongo, disconnectMongo } = require('../../../../config/mongoose');
const app = require('../../../../app');
const Matter = require('../../../../modules/legal-validator/matter/matter.model');
const DoctrineArtifact = require('../../../../modules/legal-validator/doctrine/doctrine-artifact.model');
const SourceDocument = require('../../../../modules/legal-validator/sources/source-document.model');
const SourceSegment = require('../../../../modules/legal-validator/sources/source-segment.model');
const AuthorityNode = require('../../../../modules/legal-validator/authority/authority-node.model');

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
    headers: response.headers,
    body: await response.json(),
  };
}

async function createSeededRun(baseUrl, overrides = {}) {
  const validationDecision = overrides.validationDecision || {
    status: 'valid',
    validationRuleIds: ['validation-rule-duty-applies'],
  };

  const matter = await new Matter({
    matterId: overrides.matterId || 'matter-inspect-1',
    title: overrides.title || 'Analyst inspection matter',
    jurisdiction: 'UK',
    practiceArea: 'negligence',
    status: 'active',
    createdBy: 'analyst-workbench',
  }).save();

  const sourceDocument = await new SourceDocument({
    sourceDocumentId: overrides.sourceDocumentId || 'source-document-inspect-1',
    matterId: matter.matterId,
    documentId: 'document-inspect-1',
    contentFormat: 'markdown',
    content: [
      '# Duty of care',
      '',
      'The defendant owed a duty of care and failed to inspect the equipment.',
      '',
      'The defendant did not maintain a safe system of work.',
    ].join('\n'),
  }).save();

  const doctrineArtifact = await new DoctrineArtifact({
    artifactId: overrides.artifactId || 'artifact-inspect-1',
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
      authorityIds: ['authority-inspect-1'],
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
  }).save();

  const authorityNode = await new AuthorityNode({
    authorityId: overrides.authorityId || 'authority-inspect-1',
    doctrineArtifactId: doctrineArtifact.artifactId,
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
  }).save();

  const orchestrateResponse = await fetchJson(`${baseUrl}/api/v1/legal-validator/orchestrate`, {
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
        doctrineArtifactId: doctrineArtifact.artifactId,
        authorityInput: {
          authorityId: authorityNode.authorityId,
          evaluationDate: '2020-06-01T00:00:00Z',
          requiredInterpretationRegimeId: 'uk-textual-v1',
        },
        resolverDecision: {
          status: overrides.resolverDecision?.status || 'success',
          mappingId: overrides.resolverDecision?.mappingId || 'mapping-inspect-1',
          mappingType: 'combined',
          matchBasis: 'exact_structural_rule',
          conceptId: 'duty_of_care',
          authorityId: authorityNode.authorityId,
          resolverRuleId: 'resolver-rule-duty-of-care',
          ...overrides.resolverDecision,
        },
        validationDecision,
        traceInput: {
          validationRunId: overrides.validationRunId || 'validation-run-inspect-1',
          resolverVersion: 'resolver-v1',
          inputHash: '9'.repeat(64),
          sourceAnchors: [],
          interpretationUsed: true,
          interpretationRegimeId: 'uk-textual-v1',
          manualOverrideUsed: false,
          overrideIds: [],
        },
      },
    }),
  });

  assert.equal(orchestrateResponse.status, 200);
  assert.equal(orchestrateResponse.body.final.validationRunId, overrides.validationRunId || 'validation-run-inspect-1');

  return {
    matter,
    sourceDocument,
    doctrineArtifact,
    authorityNode,
    validationRunId: orchestrateResponse.body.final.validationRunId,
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

test('legal-validator runs route advertises the inspection surface', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const { status, headers, body } = await fetchJson(`${baseUrl}/api/v1/legal-validator/runs`);

    assert.equal(status, 200);
    assert.equal(headers.get('cache-control'), 'no-store, private, max-age=0');
    assert.deepEqual(body, {
      resource: 'legal-validator-runs',
      status: 'active',
      contractVersion: 'run-inspect-v1',
      boundary: {
        product: 'legal-argument-validator',
        scope: 'bounded-legal-validation',
      },
      allowedOperations: ['inspect-validation-run', 'report-validation-run', 'export-validation-run'],
      operationalControls: {
        singleTenant: true,
        authzRequired: false,
        cachePolicy: 'no-store',
        retainedArtifacts: ['Matter', 'SourceDocument', 'SourceSegment', 'ArgumentUnit', 'DoctrineArtifact', 'AuthorityNode', 'Mapping', 'OverrideRecord', 'ValidationRun'],
      },
      requestShape: {
        pathParameters: ['validationRunId'],
      },
      allowedOutcomes: ['valid', 'invalid', 'unresolved'],
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('legal-validator runs route returns persisted runtime truth for a validation run', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const seed = await createSeededRun(baseUrl);
    const sourceSegments = await SourceSegment.find({ sourceDocumentId: seed.sourceDocument.sourceDocumentId })
      .sort({ sequence: 1 })
      .lean()
      .exec();
    const { status, body } = await fetchJson(`${baseUrl}/api/v1/legal-validator/runs/${seed.validationRunId}`);

    assert.equal(status, 200);
    assert.equal(body.resource, 'legal-validator-run');
    assert.equal(body.status, 'completed');
    assert.equal(body.contractVersion, 'run-inspect-v1');
    assert.equal(body.request.validationRunId, seed.validationRunId);
    assert.equal(body.inspectionReady, true);
    assert.deepEqual(body.integrityWarnings, []);
    assert.equal(body.validationRun.validationRunId, seed.validationRunId);
    assert.equal(body.validationRun.result, 'valid');
    assert.equal(body.matter.matterId, seed.matter.matterId);
    assert.equal(body.sourceDocument.sourceDocumentId, seed.sourceDocument.sourceDocumentId);
    assert.equal(body.sourceDocuments.length, 1);
    assert.equal(body.sourceSegments.length, sourceSegments.length);
    assert.equal(body.sourceSegments[0].sourceAnchor, sourceSegments[0].sourceAnchor);
    assert.equal(body.argumentUnits.length, 1);
    assert.equal(body.doctrineArtifact.artifactId, seed.doctrineArtifact.artifactId);
    assert.equal(body.authorityNode.authorityId, seed.authorityNode.authorityId);
    assert.equal(body.mapping.mappingId, 'mapping-inspect-1');
    assert.equal(body.overrideRecords.length, 0);
    assert.equal(body.audit.singleTenant, true);
    assert.equal(body.audit.authzRequired, false);
    assert.equal(body.audit.cachePolicy, 'no-store');
    assert.equal(body.counts.sourceSegments, 3);
    assert.equal(body.counts.argumentUnits, 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('legal-validator run report packages the persisted runtime truth and replay comparison', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const seed = await createSeededRun(baseUrl);
    const response = await fetch(`${baseUrl}/api/v1/legal-validator/runs/${seed.validationRunId}/report`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store, private, max-age=0');
    assert.equal(body.resource, 'legal-validator-run-report');
    assert.equal(body.status, 'completed');
    assert.equal(body.contractVersion, 'run-report-v1');
    assert.equal(body.request.validationRunId, seed.validationRunId);
    assert.equal(body.reportReady, true);
    assert.deepEqual(body.integrityWarnings, []);
    assert.equal(body.report.audit.singleTenant, true);
    assert.equal(body.report.audit.authzRequired, false);
    assert.equal(body.report.audit.cachePolicy, 'no-store');
    assert.equal(body.report.validationRun.validationRunId, seed.validationRunId);
    assert.equal(body.report.validationRun.result, 'valid');
    assert.deepEqual(body.report.validationRun.failureCodes, []);
    assert.equal(body.report.matter.matterId, seed.matter.matterId);
    assert.equal(body.report.sourceDocument.sourceDocumentId, seed.sourceDocument.sourceDocumentId);
    assert.equal(body.report.sourceSegments[0].sourceAnchor, (await SourceSegment.findOne({
      sourceDocumentId: seed.sourceDocument.sourceDocumentId,
      sequence: 1,
    }).lean().exec()).sourceAnchor);
    assert.equal(body.report.argumentUnits.length, 1);
    assert.equal(body.report.counts.sourceSegments, 3);
    assert.equal(body.report.doctrineArtifact.manifest.coreConceptsReferenced[0], 'authority');
    assert.equal(body.report.doctrineArtifact.manifest.validationRuleIds.length, 1);
    assert.equal(body.report.authorityNode.authorityId, seed.authorityNode.authorityId);
    assert.equal(body.report.mapping.mappingId, 'mapping-inspect-1');
    assert.equal(body.report.overrideRecords.length, 0);
    assert.equal(body.report.replay.status, 'completed');
    assert.equal(body.report.replay.result, 'valid');
    assert.equal(body.report.replay.failureCode, null);
    assert.equal(body.report.replay.replayComparison.ok, true);
    assert.deepEqual(body.report.replay.replayComparison.mismatches, []);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('legal-validator run export returns the same structural report with an attachment disposition', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const seed = await createSeededRun(baseUrl, {
      validationRunId: 'validation-run-inspect-export-1',
    });
    const response = await fetch(`${baseUrl}/api/v1/legal-validator/runs/${seed.validationRunId}/export`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store, private, max-age=0');
    assert.equal(response.headers.get('content-disposition'), 'attachment; filename="legal-validator-run-validation-run-inspect-export-1.json"');
    assert.equal(body.resource, 'legal-validator-run-export');
    assert.equal(body.reportReady, true);
    assert.deepEqual(body.integrityWarnings, []);
    assert.equal(body.report.audit.singleTenant, true);
    assert.equal(body.report.audit.authzRequired, false);
    assert.equal(body.report.audit.cachePolicy, 'no-store');
    assert.equal(body.report.validationRun.result, 'valid');
    assert.deepEqual(body.report.validationRun.failureCodes, []);
    assert.equal(body.report.replay.status, 'completed');
    assert.equal(body.report.replay.result, 'valid');
    assert.deepEqual(body.report.replay.failureCodes, []);
    assert.equal(body.report.replay.replayComparison.ok, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

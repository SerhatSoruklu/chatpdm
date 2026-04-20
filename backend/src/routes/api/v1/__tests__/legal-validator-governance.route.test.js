'use strict';

const http = require('node:http');
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { connectMongo, disconnectMongo } = require('../../../../config/mongoose');
const app = require('../../../../app');
const DoctrineArtifact = require('../../../../modules/legal-validator/doctrine/doctrine-artifact.model');
const ArgumentUnit = require('../../../../modules/legal-validator/arguments/argument-unit.model');
const Mapping = require('../../../../modules/legal-validator/mapping/mapping.model');
const OverrideRecord = require('../../../../modules/legal-validator/overrides/override-record.model');
const ValidationRun = require('../../../../modules/legal-validator/validation/validation-run.model');
const { loadDoctrineArtifact } = require('../../../../modules/legal-validator/doctrine/doctrine-loader.service');

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

async function createDoctrineArtifact(overrides = {}) {
  const artifact = new DoctrineArtifact({
    artifactId: overrides.artifactId || 'artifact-governance-1',
    packageId: 'uk-negligence',
    version: '1.0.0',
    hash: overrides.hash || 'a'.repeat(64),
    storageKey: 'doctrine/uk-negligence/1.0.0.json',
    manifest: {
      packageId: 'uk-negligence',
      jurisdiction: 'UK',
      practiceArea: 'negligence',
      sourceClasses: ['statute', 'case_law'],
      interpretationRegime: {
        regimeId: overrides.interpretationRegimeId || 'uk-textual-v1',
        name: overrides.interpretationRegimeName || 'UK Textual v1',
        hierarchy: ['text', 'definitions', 'whole_text'],
      },
      coreConceptsReferenced: ['authority'],
      packageConceptsDeclared: ['duty_of_care'],
      authorityIds: ['authority-governance-1'],
      mappingRuleIds: ['resolver-rule-duty-of-care'],
      validationRuleIds: ['validation-rule-duty-applies'],
      ...(overrides.manifest || {}),
    },
    governance: {
      status: overrides.status || 'draft',
      reviewedBy: overrides.reviewedBy ?? null,
      reviewedAt: overrides.reviewedAt ?? null,
      approvedBy: overrides.approvedBy ?? null,
      approvedAt: overrides.approvedAt ?? null,
      lockedAt: overrides.lockedAt ?? null,
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

async function createArgumentUnit(overrides = {}) {
  const argumentUnit = new ArgumentUnit({
    argumentUnitId: overrides.argumentUnitId || 'argument-unit-governance-1',
    matterId: overrides.matterId || 'matter-governance-1',
    documentId: overrides.documentId || 'document-governance-1',
    sourceSegmentIds: overrides.sourceSegmentIds || ['source-segment-governance-1'],
    unitType: overrides.unitType || 'factual_assertion',
    text: overrides.text || 'The defendant failed to inspect the equipment.',
    normalizedText: overrides.normalizedText || 'the defendant failed to inspect the equipment.',
    speakerRole: overrides.speakerRole || 'unknown',
    positionSide: overrides.positionSide || 'neutral',
    sequence: overrides.sequence || 1,
    extractionMethod: overrides.extractionMethod || 'manual',
    reviewState: overrides.reviewState || 'accepted',
    admissibility: overrides.admissibility || 'admissible',
    unresolvedReason: overrides.unresolvedReason || null,
  });

  await argumentUnit.save();
  return argumentUnit;
}

async function createMapping(argumentUnitId, doctrineArtifactId, overrides = {}) {
  const mapping = new Mapping({
    mappingId: overrides.mappingId || 'mapping-governance-1',
    matterId: overrides.matterId || 'matter-governance-1',
    argumentUnitId,
    doctrineArtifactId,
    conceptId: overrides.conceptId || 'authority',
    authorityId: overrides.authorityId || null,
    overrideId: overrides.overrideId || null,
    manualOverrideReason: overrides.manualOverrideReason || null,
    synonymTerm: overrides.synonymTerm || null,
    mappingType: overrides.mappingType || 'combined',
    status: overrides.status || 'success',
    matchBasis: overrides.matchBasis || 'exact_structural_rule',
    resolverRuleId: overrides.resolverRuleId || 'resolver-rule-duty-of-care',
    failureCode: overrides.failureCode || null,
    failureReason: overrides.failureReason || null,
  });

  await mapping.save();
  return mapping;
}

async function createOverrideRecord({ matterId, argumentUnitId, mappingId, reviewStatus = 'pending' } = {}) {
  const overrideRecord = new OverrideRecord({
    overrideId: 'override-governance-1',
    matterId,
    argumentUnitId,
    mappingId,
    overrideType: 'mapping_override',
    reason: 'Manual mapping requires governance review.',
    createdBy: 'reviewer-1',
    reviewStatus,
    reviewedBy: reviewStatus === 'pending' ? null : 'reviewer-1',
    reviewedAt: reviewStatus === 'pending' ? null : new Date('2026-03-30T12:00:00Z'),
  });

  await overrideRecord.save();
  return overrideRecord;
}

async function createValidationRun({
  validationRunId = 'validation-run-governance-1',
  doctrineArtifactId,
  doctrineHash,
  interpretationRegimeId = 'uk-textual-v1',
  mappingId = 'mapping-governance-1',
  overrideId = 'override-governance-1',
} = {}) {
  const validationRun = new ValidationRun({
    validationRunId,
    matterId: 'matter-governance-1',
    doctrineArtifactId,
    doctrineHash,
    resolverVersion: 'resolver-v1',
    inputHash: '9'.repeat(64),
    result: 'valid',
    failureCodes: [],
    trace: {
      sourceAnchors: ['source-anchor-governance-1'],
      interpretationUsed: true,
      interpretationRegimeId,
      manualOverrideUsed: true,
      mappingRuleIds: ['resolver-rule-duty-of-care'],
      validationRuleIds: ['validation-rule-duty-applies'],
      overrideIds: [overrideId],
      loadedManifest: {
        conceptIds: ['authority'],
        authorityIds: ['authority-governance-1'],
      },
      replayContext: {
        sourceDocumentId: 'source-document-governance-1',
        sourceSegmentIds: ['source-segment-governance-1'],
        argumentUnitIds: ['argument-unit-governance-1'],
        authorityId: 'authority-governance-1',
        mappingId,
        overrideId,
        doctrineArtifactId,
        doctrineHash,
        matterId: 'matter-governance-1',
      },
    },
  });

  await validationRun.save();
  return validationRun;
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

test('legal-validator governance route advertises explicit promotion controls', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const { status, headers, body } = await fetchJson(`${baseUrl}/api/v1/legal-validator/governance`);

    assert.equal(status, 200);
    assert.equal(headers.get('cache-control'), 'no-store, private, max-age=0');
    assert.equal(body.operationalControls.singleTenant, true);
    assert.equal(body.operationalControls.authzRequired, false);
    assert.equal(body.operationalControls.cachePolicy, 'no-store');
    assert.deepEqual(body, {
      resource: 'legal-validator-governance',
      status: 'active',
      contractVersion: 'doctrine-governance-v1',
      boundary: {
        product: 'legal-argument-validator',
        scope: 'bounded-legal-validation',
      },
      allowedOperations: ['inspect-doctrine-governance', 'promote-doctrine-artifact'],
      operationalControls: {
        singleTenant: true,
        authzRequired: false,
        cachePolicy: 'no-store',
        retainedArtifacts: ['DoctrineArtifact', 'ValidationRun', 'Mapping', 'OverrideRecord'],
      },
      requestShape: {
        pathParameters: ['artifactId'],
        queryParameters: ['validationRunId'],
        topLevel: ['input'],
        promotionInputFields: ['targetStatus', 'reviewedBy', 'approvedBy'],
      },
      allowedOutcomes: ['valid', 'invalid', 'unresolved'],
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('legal-validator governance promotion requires explicit review and approval steps', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const artifact = await createDoctrineArtifact();

    const directApprovalAttempt = await fetchJson(`${baseUrl}/api/v1/legal-validator/governance/${artifact.artifactId}/promote`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        input: {
          targetStatus: 'approved',
          approvedBy: 'approver-1',
        },
      }),
    });

    assert.equal(directApprovalAttempt.status, 422);
    assert.equal(directApprovalAttempt.body.error.code, 'UNGOVERNED_DOCTRINE_CHANGE');

    const reviewed = await fetchJson(`${baseUrl}/api/v1/legal-validator/governance/${artifact.artifactId}/promote`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        input: {
          targetStatus: 'reviewed',
          reviewedBy: 'reviewer-1',
        },
      }),
    });

    assert.equal(reviewed.status, 200);
    assert.equal(reviewed.body.promotion.fromStatus, 'draft');
    assert.equal(reviewed.body.promotion.toStatus, 'reviewed');
    assert.equal(reviewed.body.governance.governanceStatus, 'reviewed');
    assert.equal(reviewed.body.governance.runtimeEligible, false);

    const reviewedLoad = await loadDoctrineArtifact({ artifactId: artifact.artifactId });
    assert.equal(reviewedLoad.terminal, true);
    assert.equal(reviewedLoad.failureCode, 'DOCTRINE_NOT_RECOGNIZED');

    const approved = await fetchJson(`${baseUrl}/api/v1/legal-validator/governance/${artifact.artifactId}/promote`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        input: {
          targetStatus: 'approved',
          approvedBy: 'approver-1',
        },
      }),
    });

    assert.equal(approved.status, 200);
    assert.equal(approved.body.promotion.fromStatus, 'reviewed');
    assert.equal(approved.body.promotion.toStatus, 'approved');
    assert.equal(approved.body.governance.governanceStatus, 'approved');
    assert.equal(approved.body.governance.runtimeEligible, true);

    const approvedLoad = await loadDoctrineArtifact({ artifactId: artifact.artifactId });
    assert.equal(approvedLoad.ok, true);
    assert.equal(approvedLoad.runtimeEligible, true);

    const locked = await fetchJson(`${baseUrl}/api/v1/legal-validator/governance/${artifact.artifactId}/promote`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        input: {
          targetStatus: 'locked',
        },
      }),
    });

    assert.equal(locked.status, 200);
    assert.equal(locked.body.promotion.fromStatus, 'approved');
    assert.equal(locked.body.promotion.toStatus, 'locked');
    assert.equal(locked.body.governance.governanceStatus, 'locked');
    assert.equal(locked.body.governance.runtimeEligible, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('legal-validator governance inspection exposes drift, mapping, and override blockers', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const artifact = await createDoctrineArtifact({
      status: 'approved',
      approvedBy: 'approver-1',
      approvedAt: new Date('2026-03-30T10:00:00Z'),
    });
    const argumentUnit = await createArgumentUnit();
    const mapping = await createMapping(argumentUnit.argumentUnitId, artifact.artifactId);
    await createOverrideRecord({
      matterId: argumentUnit.matterId,
      argumentUnitId: argumentUnit.argumentUnitId,
      mappingId: mapping.mappingId,
      reviewStatus: 'pending',
    });
    const validationRun = await createValidationRun({
      doctrineArtifactId: artifact.artifactId,
      doctrineHash: 'b'.repeat(64),
      interpretationRegimeId: 'uk-textual-v2',
      mappingId: mapping.mappingId,
      overrideId: 'override-governance-1',
    });

    const { status, body } = await fetchJson(`${baseUrl}/api/v1/legal-validator/governance/${artifact.artifactId}?validationRunId=${validationRun.validationRunId}`);

    assert.equal(status, 200);
    assert.equal(body.promotionReady, false);
    assert.equal(body.governance.governanceStatus, 'approved');
    assert.equal(body.governance.runtimeEligible, true);
    assert.equal(body.reviewDiff.currentDoctrineHash, artifact.hash);
    assert.equal(body.reviewDiff.recordedDoctrineHash, 'b'.repeat(64));
    assert.equal(body.reviewDiff.currentInterpretationRegimeId, 'uk-textual-v1');
    assert.equal(body.reviewDiff.recordedInterpretationRegimeId, 'uk-textual-v2');
    assert.equal(body.audit.singleTenant, true);
    assert.equal(body.audit.authzRequired, false);
    assert.equal(body.audit.cachePolicy, 'no-store');
    assert.equal(body.mapping.mappingId, mapping.mappingId);
    assert.equal(body.overrideRecords.length, 1);
    assert.equal(body.overrideRecords[0].reviewStatus, 'pending');
    assert.ok(body.promotionBlockers.some((blocker) => blocker.failureCode === 'UNGOVERNED_DOCTRINE_CHANGE'));
    assert.ok(body.promotionBlockers.some((blocker) => blocker.failureCode === 'INTERPRETATION_REGIME_CHANGE_UNGOVERNED'));
    assert.ok(body.promotionBlockers.some((blocker) => blocker.failureCode === 'UNAPPROVED_OVERRIDE_RECORD'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

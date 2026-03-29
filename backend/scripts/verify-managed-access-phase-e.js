'use strict';

// INTEGRITY LAW:
// This module is governed by docs/INTERGRITY_RUNTIME_LAWS.md
// Violations of canonical truth, refusal boundary, or hashing determinism are forbidden.

process.env.NODE_ENV = 'test';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const MANAGED_ACCESS_ASSURANCE_ANCHOR_DIRECTORY = fs.mkdtempSync(
  path.join(os.tmpdir(), 'chatpdm-managed-access-anchor-'),
);
process.env.MANAGED_ACCESS_ASSURANCE_ANCHOR_DIRECTORY = MANAGED_ACCESS_ASSURANCE_ANCHOR_DIRECTORY;
const MANAGED_ACCESS_ASSURANCE_CHECKPOINT_DIRECTORY = fs.mkdtempSync(
  path.join(os.tmpdir(), 'chatpdm-managed-access-checkpoint-'),
);
process.env.MANAGED_ACCESS_ASSURANCE_CHECKPOINT_DIRECTORY = MANAGED_ACCESS_ASSURANCE_CHECKPOINT_DIRECTORY;
const {
  privateKey: managedAccessCheckpointPrivateKey,
  publicKey: managedAccessCheckpointPublicKey,
} = crypto.generateKeyPairSync('ed25519');
const MANAGED_ACCESS_ASSURANCE_CONFIG_MODULE_PATH = require.resolve(
  '../src/modules/managed-access/config/managed-access-assurance.config',
);
const MANAGED_ACCESS_ASSURANCE_CHECKPOINT_SIGNING_KEY_ID = 'managed-access-test-key';
process.env.MANAGED_ACCESS_ASSURANCE_CHECKPOINT_SIGNING_KEY_ID =
  MANAGED_ACCESS_ASSURANCE_CHECKPOINT_SIGNING_KEY_ID;
process.env.MANAGED_ACCESS_ASSURANCE_CHECKPOINT_SIGNING_PRIVATE_KEY_PEM =
  managedAccessCheckpointPrivateKey.export({
    type: 'pkcs8',
    format: 'pem',
  });
process.env.MANAGED_ACCESS_ASSURANCE_CHECKPOINT_PUBLIC_KEYS_JSON = JSON.stringify({
  [MANAGED_ACCESS_ASSURANCE_CHECKPOINT_SIGNING_KEY_ID]: managedAccessCheckpointPublicKey.export({
    type: 'spki',
    format: 'pem',
  }),
});

const { connectMongo, disconnectMongo } = require('../src/config/mongoose');
const {
  PHASE_E_REVIEW_STATUSES,
} = require('../src/modules/managed-access/phase-e.constants');
const {
  MANAGED_ACCESS_ASSURANCE_ANCHOR_SNAPSHOT_SCHEMA_VERSION,
  MANAGED_ACCESS_ASSURANCE_CANONICALIZATION_VERSION,
  MANAGED_ACCESS_ASSURANCE_CHECKPOINT_PAYLOAD_SCHEMA_VERSION,
  MANAGED_ACCESS_ASSURANCE_CHECKPOINT_SIGNATURE_ALGORITHM,
  MANAGED_ACCESS_ASSURANCE_CHECKPOINT_SIGNATURE_SCHEMA_VERSION,
  MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
} = require('../src/modules/managed-access/config/managed-access-assurance.config');
const {
  PROVISIONING_EVIDENCE_CANONICAL_ENVELOPE_KEYS,
  buildCanonicalProvisioningEvidenceEnvelope,
  canonicalizeEvent,
} = require('../src/modules/managed-access/provisioning-evidence-canonicalization');
const ProvisioningEvidenceChainHead = require('../src/modules/managed-access/provisioning-evidence-chain-head.model');
const {
  PROVISIONING_EVIDENCE_HASH_PAYLOAD_KEYS,
  appendProvisioningEvidenceEvent,
  buildProvisioningEvidenceCanonicalEnvelope,
  buildProvisioningEvidenceHashPayload,
  computeProvisioningEvidenceEventHash,
  repairProvisioningEvidenceChainHead,
} = require('../src/modules/managed-access/provisioning-evidence-chain.service');
const {
  PROVISIONING_EVIDENCE_ANCHOR_SNAPSHOT_TYPE,
  inspectProvisioningEvidenceAnchorSnapshot,
  readLatestProvisioningEvidenceAnchorSnapshot,
  rebuildProvisioningEvidenceAnchorSnapshot,
} = require('../src/modules/managed-access/provisioning-evidence-anchor.service');
const {
  PROVISIONING_EVIDENCE_CHECKPOINT_TYPE,
  buildProvisioningEvidenceCheckpointPayload,
  buildProvisioningEvidenceCheckpointPath,
  inspectProvisioningEvidenceSignedCheckpoint,
  readLatestProvisioningEvidenceSignedCheckpoint,
  rebuildProvisioningEvidenceSignedCheckpoint,
  signProvisioningEvidenceCheckpointPayload,
  writeProvisioningEvidenceSignedCheckpointFile,
} = require('../src/modules/managed-access/provisioning-evidence-checkpoint.service');
const {
  PROVISIONING_EVIDENCE_BUNDLE_METADATA_SOURCE,
  PROVISIONING_EVIDENCE_BUNDLE_SCHEMA_VERSION,
  PROVISIONING_EVIDENCE_BUNDLE_TYPE,
  buildProvisioningEvidenceBundle,
  inspectProvisioningEvidenceBundle,
} = require('../src/modules/managed-access/provisioning-evidence-bundle.service');
const {
  verifyProvisioningEvidenceChain,
} = require('../src/modules/managed-access/provisioning-evidence-chain-verifier');
const DeploymentAssignment = require('../src/modules/managed-access/deployment-assignment.model');
const InstitutionWorkspace = require('../src/modules/managed-access/institution-workspace.model');
const ManagedAccessRequest = require('../src/modules/managed-access/managed-access.model');
const ProvisioningEvidenceEvent = require('../src/modules/managed-access/provisioning-evidence-event.model');
const ProvisioningJob = require('../src/modules/managed-access/provisioning-job.model');
const TrustReviewDecision = require('../src/modules/managed-access/trust-review-decision.model');

const CANONICALIZATION_FIXTURE_DIRECTORY = path.join(
  __dirname,
  'fixtures',
  'managed-access-assurance',
  'canonicalization',
);

const CANONICALIZATION_FIXTURE_FILES = Object.freeze([
  'valid-envelope-v1.json',
  'null-vs-omitted.json',
  'unicode-normalization.json',
  'object-key-order.json',
  'objectid-normalization.json',
  'forbidden-undefined.json',
  'unsupported-type.json',
  'hash-version-mismatch.json',
]);

async function expectValidationFailure(factory, messagePattern, label) {
  await assert.rejects(
    async () => {
      const document = factory();
      await document.validate();
    },
    (error) => {
      const nestedMessages = error && error.errors
        ? Object.values(error.errors).map((entry) => entry.message)
        : [];
      const combinedMessage = [error.message, ...nestedMessages].join(' | ');

      assert.match(
        combinedMessage,
        messagePattern,
        `${label} should fail with the expected message.`,
      );
      return true;
    },
  );

  process.stdout.write(`PASS ${label}\n`);
}

async function expectChainError(action, expectedCode, label) {
  await assert.rejects(
    action,
    (error) => {
      assert.equal(
        error && error.code,
        expectedCode,
        `${label} should fail with ${expectedCode}.`,
      );
      return true;
    },
  );

  process.stdout.write(`PASS ${label}\n`);
}

function runCanonicalizationFixtures() {
  assert.equal(
    MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
    1,
    'Managed access assurance hashVersion must remain locked to 1.',
  );
  assert.deepEqual(
    PROVISIONING_EVIDENCE_CANONICAL_ENVELOPE_KEYS,
    [
      'hashVersion',
      'requestId',
      'sequence',
      'eventType',
      'actorIdentity',
      'recordedAt',
      'payload',
      'previousHash',
    ],
    'Provisioning evidence canonical envelope keys must remain locked.',
  );

  for (const fileName of CANONICALIZATION_FIXTURE_FILES) {
    const fixture = readCanonicalizationFixture(fileName);
    const canonicalResults = new Map();

    for (const fixtureCase of fixture.cases) {
      const label = `managed_access_phase_e_canonicalization_${path.basename(fileName, '.json')}_${fixtureCase.label}`;
      const hydratedInput = hydrateFixtureValue(fixtureCase.input);

      if (fixtureCase.expectedErrorCode) {
        assert.throws(
          () => canonicalizeEvent(hydratedInput),
          (error) => {
            assert.equal(
              error && error.code,
              fixtureCase.expectedErrorCode,
              `${label} should fail with ${fixtureCase.expectedErrorCode}.`,
            );
            assert.match(
              error.message,
              new RegExp(fixtureCase.expectedErrorPattern, 'i'),
              `${label} should fail with the expected message.`,
            );
            return true;
          },
        );

        process.stdout.write(`PASS ${label}\n`);
        continue;
      }

      const envelope = buildCanonicalProvisioningEvidenceEnvelope(hydratedInput);
      const canonical = canonicalizeEvent(hydratedInput);

      assert.deepEqual(
        envelope,
        fixtureCase.expectedEnvelope,
        `${label} should normalize to the expected canonical envelope.`,
      );
      assert.deepEqual(
        Object.keys(envelope),
        PROVISIONING_EVIDENCE_CANONICAL_ENVELOPE_KEYS,
        `${label} should preserve the locked canonical envelope key order.`,
      );
      assert.equal(
        canonical,
        fixtureCase.expectedCanonical,
        `${label} should serialize to the expected canonical string.`,
      );
      assert.equal(
        canonicalizeEvent(hydratedInput),
        fixtureCase.expectedCanonical,
        `${label} should remain byte-identical on repeated canonicalization.`,
      );

      canonicalResults.set(fixtureCase.label, canonical);
      process.stdout.write(`PASS ${label}\n`);
    }

    for (const [leftLabel, rightLabel] of fixture.assertEqual || []) {
      assert.equal(
        canonicalResults.get(leftLabel),
        canonicalResults.get(rightLabel),
        `${fileName} should produce equal canonical output for ${leftLabel} and ${rightLabel}.`,
      );
    }

    for (const [leftLabel, rightLabel] of fixture.assertDistinct || []) {
      assert.notEqual(
        canonicalResults.get(leftLabel),
        canonicalResults.get(rightLabel),
        `${fileName} should preserve distinct canonical output for ${leftLabel} and ${rightLabel}.`,
      );
    }

    process.stdout.write(
      `PASS managed_access_phase_e_canonicalization_fixture_${path.basename(fileName, '.json')}\n`,
    );
  }

  process.stdout.write('PASS managed_access_phase_e_canonicalization_contract\n');
}

function buildManagedAccessRequestPayload(overrides = {}) {
  return {
    verificationMethod: 'dns_txt',
    institutionName: 'Northbridge Health',
    companyDomain: 'northbridgehealth.org',
    industry: 'healthcare',
    deploymentPreference: 'hosted_by_chatpdm',
    workEmail: 'risk@northbridgehealth.org',
    status: 'under_trust_review',
    verificationState: 'verified',
    trustLevel: 'stronger_organization_proof',
    verificationTokenHash: null,
    verificationTokenExpiresAt: null,
    verifiedAt: new Date('2026-03-28T10:00:00.000Z'),
    challengeType: 'dns_txt',
    challengeIssuedAt: new Date('2026-03-28T09:30:00.000Z'),
    challengeExpiresAt: null,
    challengeLastCheckedAt: new Date('2026-03-28T10:00:00.000Z'),
    challengeFailureReason: null,
    dnsTxtRecordName: '_chatpdm-managed-access.northbridgehealth.org',
    dnsTxtRecordValue: 'chatpdm-verify=123',
    websiteFileName: null,
    websiteFilePath: null,
    websiteFileContent: null,
    websiteFileUrl: null,
    ...overrides,
  };
}

async function createVerifierScenarioChain(suffix, options = {}) {
  const eventCount = Number.isInteger(options.eventCount) && options.eventCount > 0
    ? options.eventCount
    : 2;
  const baseTime = options.baseTime instanceof Date
    ? options.baseTime
    : new Date('2026-03-28T13:00:00.000Z');

  const managedAccessRequest = await ManagedAccessRequest.create(
    buildManagedAccessRequestPayload({
      institutionName: `Verifier ${suffix}`,
      companyDomain: `verifier-${suffix}.org`,
      workEmail: `ops+${suffix}@verifier-${suffix}.org`,
      dnsTxtRecordName: `_chatpdm-managed-access.verifier-${suffix}.org`,
    }),
  );

  const trustReviewDecision = await TrustReviewDecision.create({
    requestId: managedAccessRequest._id,
    reviewStatus: 'decision_recorded',
    decisionOutcome: 'approved',
    reviewerIdentity: 'operator@chatpdm.com',
    decisionTimestamp: new Date(baseTime.getTime()),
    internalNotes: `Verifier scenario ${suffix}.`,
    sectorPackageRecommendation: null,
    riskFlags: [],
    trustTier: 'standard',
    reviewReminderAt: null,
  });

  const events = [];

  for (let index = 0; index < eventCount; index += 1) {
    const event = await appendProvisioningEvidenceEvent({
      requestId: managedAccessRequest._id,
      actorIdentity: 'operator@chatpdm.com',
      reviewDecisionId: trustReviewDecision._id,
      eventType: 'review_decision_recorded',
      reviewerIdentity: 'operator@chatpdm.com',
      decisionTimestamp: trustReviewDecision.decisionTimestamp,
      decisionOutcome: trustReviewDecision.decisionOutcome,
      context: 'phase_e_provisioning_protocol',
    }, {
      now: new Date(baseTime.getTime() + ((index + 1) * 60 * 1000)),
    });

    events.push(event);
  }

  return {
    managedAccessRequest,
    trustReviewDecision,
    events,
  };
}

function buildExpectedAnchorSnapshot({
  requestId,
  sequence,
  chainHeadHash,
  createdAt,
}) {
  return {
    snapshotSchemaVersion: MANAGED_ACCESS_ASSURANCE_ANCHOR_SNAPSHOT_SCHEMA_VERSION,
    snapshotType: PROVISIONING_EVIDENCE_ANCHOR_SNAPSHOT_TYPE,
    requestId,
    snapshotSequence: sequence,
    chainHeadSequence: sequence,
    chainHeadHash,
    lastAnchoredEventHash: chainHeadHash,
    hashVersion: MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
    canonicalizationVersion: MANAGED_ACCESS_ASSURANCE_CANONICALIZATION_VERSION,
    createdAt,
  };
}

function buildExpectedSignedCheckpoint({
  requestId,
  sequence,
  chainHeadHash,
}) {
  const payload = {
    checkpointPayloadSchemaVersion: MANAGED_ACCESS_ASSURANCE_CHECKPOINT_PAYLOAD_SCHEMA_VERSION,
    checkpointType: PROVISIONING_EVIDENCE_CHECKPOINT_TYPE,
    requestId,
    chainHeadSequence: sequence,
    chainHeadHash,
    hashVersion: MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
    canonicalizationVersion: MANAGED_ACCESS_ASSURANCE_CANONICALIZATION_VERSION,
  };
  const signingResult = signProvisioningEvidenceCheckpointPayload(payload);
  assert.equal(signingResult.ok, true);

  return {
    payload,
    signature: signingResult.signature,
  };
}

function buildExpectedProvisioningEvidenceBundle({
  requestId,
  sequence,
  chainHeadHash,
}) {
  const checkpoint = buildExpectedSignedCheckpoint({
    requestId,
    sequence,
    chainHeadHash,
  });

  return {
    bundleSchemaVersion: PROVISIONING_EVIDENCE_BUNDLE_SCHEMA_VERSION,
    bundleType: PROVISIONING_EVIDENCE_BUNDLE_TYPE,
    payload: checkpoint.payload,
    checkpoint,
    metadata: {
      source: PROVISIONING_EVIDENCE_BUNDLE_METADATA_SOURCE,
      exportedAt: null,
    },
  };
}

function loadManagedAccessAssuranceConfigWithCheckpointPublicKeysJson(publicKeysJson) {
  const previousPublicKeysJson = process.env.MANAGED_ACCESS_ASSURANCE_CHECKPOINT_PUBLIC_KEYS_JSON;
  let loadedConfig;

  delete require.cache[MANAGED_ACCESS_ASSURANCE_CONFIG_MODULE_PATH];

  if (publicKeysJson === undefined) {
    delete process.env.MANAGED_ACCESS_ASSURANCE_CHECKPOINT_PUBLIC_KEYS_JSON;
  } else {
    process.env.MANAGED_ACCESS_ASSURANCE_CHECKPOINT_PUBLIC_KEYS_JSON = publicKeysJson;
  }

  try {
    loadedConfig = require('../src/modules/managed-access/config/managed-access-assurance.config');
  } finally {
    delete require.cache[MANAGED_ACCESS_ASSURANCE_CONFIG_MODULE_PATH];

    if (previousPublicKeysJson === undefined) {
      delete process.env.MANAGED_ACCESS_ASSURANCE_CHECKPOINT_PUBLIC_KEYS_JSON;
    } else {
      process.env.MANAGED_ACCESS_ASSURANCE_CHECKPOINT_PUBLIC_KEYS_JSON = previousPublicKeysJson;
    }
  }

  return loadedConfig;
}

async function assertIndexNames(model, expectedNames) {
  await model.init();
  const actualIndexNames = new Set((await model.collection.indexes()).map((index) => index.name));

  for (const expectedName of expectedNames) {
    assert(actualIndexNames.has(expectedName), `${model.modelName} is missing index ${expectedName}.`);
  }
}

function readCanonicalizationFixture(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(CANONICALIZATION_FIXTURE_DIRECTORY, fileName), 'utf8'),
  );
}

function hydrateFixtureValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => hydrateFixtureValue(entry));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const keys = Object.keys(value);

  if (keys.length === 1 && keys[0] === '$date') {
    return new Date(value.$date);
  }

  if (keys.length === 1 && keys[0] === '$objectId') {
    return new mongoose.Types.ObjectId(value.$objectId);
  }

  if (keys.length === 1 && keys[0] === '$undefined') {
    return undefined;
  }

  if (keys.length === 1 && keys[0] === '$unsupported') {
    return buildUnsupportedFixtureValue(value.$unsupported);
  }

  return keys.reduce((hydratedValue, key) => {
    hydratedValue[key] = hydrateFixtureValue(value[key]);
    return hydratedValue;
  }, {});
}

function buildUnsupportedFixtureValue(type) {
  switch (type) {
    case 'symbol':
      return Symbol('managed-access-assurance');
    case 'map':
      return new Map([['key', 'value']]);
    case 'set':
      return new Set(['value']);
    case 'bigint':
      return BigInt(1);
    case 'buffer':
      return Buffer.from('managed-access-assurance', 'utf8');
    case 'regexp':
      return /managed-access-assurance/;
    case 'class-instance':
      return new CanonicalizationFixtureBox('managed-access-assurance');
    default:
      throw new TypeError(`Unsupported fixture builder type "${type}".`);
  }
}

function isPlainObject(value) {
  return value !== null
    && typeof value === 'object'
    && Object.getPrototypeOf(value) === Object.prototype;
}

class CanonicalizationFixtureBox {
  constructor(value) {
    this.value = value;
  }
}

async function main() {
  runCanonicalizationFixtures();

  const mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  await connectMongo(process.env.MONGODB_URI);

  try {
    await assertIndexNames(TrustReviewDecision, [
      'requestId_1',
      'trust_review_decision_status_updated_at',
      'trust_review_decision_status_tier_updated_at',
      'trust_review_decision_outcome_timestamp',
      'trust_review_decision_tier_updated_at',
    ]);
    await assertIndexNames(DeploymentAssignment, [
      'requestId_1',
      'deployment_assignment_tenant_key_assigned_at',
      'deployment_assignment_status_assigned_at',
      'deployment_assignment_mode_assigned_at',
      'deployment_assignment_sector_track_assigned_at',
      'deployment_assignment_tenant_subdomain_unique',
      'deployment_assignment_pm2_app_name_unique',
    ]);
    await assertIndexNames(ProvisioningJob, [
      'provisioning_job_request_queued_at',
      'provisioning_job_assignment_queued_at',
      'provisioning_job_status_queued_at',
    ]);
    await assertIndexNames(InstitutionWorkspace, [
      'requestId_1',
      'deploymentAssignmentId_1',
      'tenantSubdomain_1',
      'institution_workspace_status_updated_at',
      'institution_workspace_pilot_status_updated_at',
      'institution_workspace_trust_level_activation',
      'institution_workspace_company_domain_updated_at',
    ]);
    await assertIndexNames(ProvisioningEvidenceChainHead, [
      'provisioning_evidence_chain_head_request_unique',
    ]);
    await assertIndexNames(ProvisioningEvidenceEvent, [
      'provisioning_evidence_event_request_recorded_at',
      'provisioning_evidence_event_job_recorded_at',
      'provisioning_evidence_event_type_recorded_at',
      'provisioning_evidence_event_request_sequence_unique',
      'provisioning_evidence_event_request_sequence_desc',
      'provisioning_evidence_event_hash_unique',
    ]);
    process.stdout.write('PASS managed_access_phase_e_indexes_present\n');

    assert.deepEqual(
      ProvisioningEvidenceChainHead.PROVISIONING_EVIDENCE_CHAIN_HEAD_SOURCE_OF_TRUTH_FIELDS,
      [
        'requestId',
        'hashVersion',
        'lastSequence',
        'lastEventHash',
        'lastRecordedAt',
        'inFlightAppendToken',
        'inFlightSequence',
        'inFlightPreviousHash',
        'inFlightRecordedAt',
        'inFlightExpiresAt',
      ],
      'Chain head source-of-truth fields must remain locked.',
    );
    assert.deepEqual(
      ProvisioningEvidenceChainHead.PROVISIONING_EVIDENCE_CHAIN_HEAD_CACHED_ASSURANCE_FIELDS,
      [
        'lastVerifiedSequence',
        'lastVerifiedAt',
        'lastVerificationStatus',
        'lastVerificationReason',
        'lastAnchoredSequence',
        'lastAnchoredAt',
        'lastAnchorStatus',
        'lastAnchorPath',
        'lastSignedSequence',
        'lastSignedAt',
        'lastCheckpointKeyId',
        'lastCheckpointSignature',
      ],
      'Chain head cached assurance fields must remain locked.',
    );
    process.stdout.write('PASS managed_access_phase_e_chain_head_field_groups_locked\n');
    assert.deepEqual(
      PROVISIONING_EVIDENCE_HASH_PAYLOAD_KEYS,
      [
        'reviewDecisionId',
        'deploymentAssignmentId',
        'provisioningJobId',
        'institutionWorkspaceId',
        'reviewerIdentity',
        'decisionTimestamp',
        'decisionOutcome',
        'deploymentMode',
        'tenantSubdomain',
        'pm2AppName',
        'nginxBinding',
        'packageVersion',
        'healthCheckResult',
        'activationTimestamp',
        'provisioningEvidenceHash',
        'context',
      ],
      'Provisioning evidence hash payload keys must remain locked.',
    );
    process.stdout.write('PASS managed_access_phase_e_hash_payload_keys_locked\n');

    const managedAccessRequest = await ManagedAccessRequest.create(buildManagedAccessRequestPayload());

    const trustReviewDecision = await TrustReviewDecision.create({
      requestId: managedAccessRequest._id,
      reviewStatus: 'decision_recorded',
      decisionOutcome: 'approved',
      reviewerIdentity: 'operator@chatpdm.com',
      decisionTimestamp: new Date('2026-03-28T11:00:00.000Z'),
      internalNotes: 'Institution approved for hosted pilot review.',
      sectorPackageRecommendation: 'healthcare_candidate',
      riskFlags: ['pilot_scope_review'],
      trustTier: 'standard',
      reviewReminderAt: new Date('2026-06-28T11:00:00.000Z'),
    });

    assert.equal(trustReviewDecision.reviewStatus, 'decision_recorded');
    assert.equal(trustReviewDecision.decisionOutcome, 'approved');
    process.stdout.write('PASS managed_access_phase_e_trust_review_decision_persists\n');

    const deploymentAssignment = await DeploymentAssignment.create({
      requestId: managedAccessRequest._id,
      reviewDecisionId: trustReviewDecision._id,
      assignmentStatus: 'assigned',
      deploymentMode: 'shared_hosted_kernel',
      tenantKey: 'northbridgehealth',
      tenantSubdomain: 'northbridgehealth.chatpdm.com',
      requestedSubdomain: null,
      subdomainSource: 'derived_from_company_domain',
      collisionSuffix: 0,
      packageVersion: 'core-2026.03',
      sectorTrack: 'healthcare',
      region: 'uk_primary',
      runtimeIsolationLevel: 'shared_process',
      pm2AppName: 'chatpdm-shared-hosted-kernel',
      nginxBinding: 'northbridgehealth.chatpdm.com -> shared-hosted-kernel',
      assignedByIdentity: 'operator@chatpdm.com',
      assignedAt: new Date('2026-03-28T11:10:00.000Z'),
      assignmentNotes: 'Shared kernel is sufficient for the initial pilot.',
    });

    assert.equal(deploymentAssignment.deploymentMode, 'shared_hosted_kernel');
    process.stdout.write('PASS managed_access_phase_e_deployment_assignment_persists\n');

    const provisioningJob = await ProvisioningJob.create({
      requestId: managedAccessRequest._id,
      deploymentAssignmentId: deploymentAssignment._id,
      retryOfJobId: null,
      jobType: 'hosted_runtime_provisioning',
      jobStatus: 'succeeded',
      triggeredByIdentity: 'operator@chatpdm.com',
      attemptNumber: 1,
      queuedAt: new Date('2026-03-28T11:15:00.000Z'),
      startedAt: new Date('2026-03-28T11:16:00.000Z'),
      completedAt: new Date('2026-03-28T11:18:00.000Z'),
      failureCode: null,
      failureMessage: null,
      healthCheckResult: 'passing',
    });

    assert.equal(provisioningJob.jobStatus, 'succeeded');
    process.stdout.write('PASS managed_access_phase_e_provisioning_job_persists\n');

    const institutionWorkspace = await InstitutionWorkspace.create({
      requestId: managedAccessRequest._id,
      deploymentAssignmentId: deploymentAssignment._id,
      workspaceStatus: 'active',
      organizationName: managedAccessRequest.institutionName,
      companyDomain: managedAccessRequest.companyDomain,
      tenantSubdomain: deploymentAssignment.tenantSubdomain,
      deploymentMode: deploymentAssignment.deploymentMode,
      packageVersion: deploymentAssignment.packageVersion,
      verificationMethod: managedAccessRequest.verificationMethod,
      trustLevel: managedAccessRequest.trustLevel,
      workEmailVerifiedAt: null,
      strongerProofVerifiedAt: managedAccessRequest.verifiedAt,
      supportContactEmail: 'hello@chatpdm.com',
      replayExportAccess: false,
      pilotStatus: 'active',
      upgradePath: 'shared_hosted_kernel',
      activationTimestamp: new Date('2026-03-28T11:20:00.000Z'),
    });

    assert.equal(institutionWorkspace.workspaceStatus, 'active');
    process.stdout.write('PASS managed_access_phase_e_workspace_persists\n');

    const firstProvisioningEvidenceEventCandidate = {
      requestId: managedAccessRequest._id,
      actorIdentity: 'operator@chatpdm.com',
      reviewDecisionId: trustReviewDecision._id,
      deploymentAssignmentId: deploymentAssignment._id,
      provisioningJobId: provisioningJob._id,
      institutionWorkspaceId: institutionWorkspace._id,
      eventType: 'workspace_activation_recorded',
      reviewerIdentity: 'operator@chatpdm.com',
      decisionTimestamp: trustReviewDecision.decisionTimestamp,
      decisionOutcome: trustReviewDecision.decisionOutcome,
      deploymentMode: deploymentAssignment.deploymentMode,
      tenantSubdomain: deploymentAssignment.tenantSubdomain,
      pm2AppName: deploymentAssignment.pm2AppName,
      nginxBinding: deploymentAssignment.nginxBinding,
      packageVersion: deploymentAssignment.packageVersion,
      healthCheckResult: 'passing',
      activationTimestamp: institutionWorkspace.activationTimestamp,
      provisioningEvidenceHash: 'a'.repeat(64),
      context: 'phase_e_provisioning_protocol',
    };

    const provisioningEvidenceEvent = await appendProvisioningEvidenceEvent(firstProvisioningEvidenceEventCandidate, {
      now: new Date('2026-03-28T11:21:00.000Z'),
    });

    const firstExpectedEnvelope = buildProvisioningEvidenceCanonicalEnvelope(
      firstProvisioningEvidenceEventCandidate,
      {
        hashVersion: MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
        requestId: managedAccessRequest._id,
        sequence: 1,
        recordedAt: new Date('2026-03-28T11:21:00.000Z'),
        previousHash: null,
      },
    );
    const firstExpectedHash = computeProvisioningEvidenceEventHash(firstExpectedEnvelope);
    const firstMaterializedPayload = buildProvisioningEvidenceHashPayload(
      firstProvisioningEvidenceEventCandidate,
    );

    assert.equal(provisioningEvidenceEvent.eventType, 'workspace_activation_recorded');
    assert.equal(provisioningEvidenceEvent.sequence, 1);
    assert.equal(provisioningEvidenceEvent.hashVersion, MANAGED_ACCESS_ASSURANCE_HASH_VERSION);
    assert.equal(provisioningEvidenceEvent.actorIdentity, 'operator@chatpdm.com');
    assert.equal(provisioningEvidenceEvent.previousHash, null);
    assert.match(provisioningEvidenceEvent.eventHash, /^[a-f0-9]{64}$/);
    assert.equal(provisioningEvidenceEvent.eventHash, firstExpectedHash);
    assert.deepEqual(
      Object.keys(firstMaterializedPayload),
      PROVISIONING_EVIDENCE_HASH_PAYLOAD_KEYS,
    );
    assert.equal(
      provisioningEvidenceEvent.recordedAt.toISOString(),
      '2026-03-28T11:21:00.000Z',
    );
    process.stdout.write('PASS managed_access_phase_e_evidence_event_persists\n');

    const provisioningEvidenceChainHead = await ProvisioningEvidenceChainHead.findOne({
      requestId: managedAccessRequest._id,
    }).lean();

    assert.equal(provisioningEvidenceChainHead.hashVersion, MANAGED_ACCESS_ASSURANCE_HASH_VERSION);
    assert.equal(provisioningEvidenceChainHead.lastSequence, 1);
    assert.equal(provisioningEvidenceChainHead.lastEventHash, provisioningEvidenceEvent.eventHash);
    assert.equal(
      provisioningEvidenceChainHead.lastRecordedAt.toISOString(),
      '2026-03-28T11:21:00.000Z',
    );
    assert.equal(provisioningEvidenceChainHead.inFlightAppendToken, null);
    assert.equal(provisioningEvidenceChainHead.inFlightSequence, null);
    assert.equal(provisioningEvidenceChainHead.inFlightPreviousHash, null);
    assert.equal(provisioningEvidenceChainHead.inFlightRecordedAt, null);
    assert.equal(provisioningEvidenceChainHead.inFlightExpiresAt, null);
    assert.equal(provisioningEvidenceChainHead.lastVerifiedSequence, null);
    assert.equal(provisioningEvidenceChainHead.lastVerificationStatus, null);
    process.stdout.write('PASS managed_access_phase_e_chain_head_finalizes_append\n');

    const secondProvisioningEvidenceEventCandidate = {
      requestId: managedAccessRequest._id,
      actorIdentity: 'operator@chatpdm.com',
      reviewDecisionId: trustReviewDecision._id,
      eventType: 'review_decision_recorded',
      reviewerIdentity: 'operator@chatpdm.com',
      decisionTimestamp: trustReviewDecision.decisionTimestamp,
      decisionOutcome: trustReviewDecision.decisionOutcome,
      context: 'phase_e_provisioning_protocol',
    };

    const secondProvisioningEvidenceEvent = await appendProvisioningEvidenceEvent(
      secondProvisioningEvidenceEventCandidate,
      {
      now: new Date('2026-03-28T11:22:00.000Z'),
      },
    );

    const secondExpectedEnvelope = buildProvisioningEvidenceCanonicalEnvelope(
      secondProvisioningEvidenceEventCandidate,
      {
        hashVersion: MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
        requestId: managedAccessRequest._id,
        sequence: 2,
        recordedAt: new Date('2026-03-28T11:22:00.000Z'),
        previousHash: provisioningEvidenceEvent.eventHash,
      },
    );
    const secondExpectedHash = computeProvisioningEvidenceEventHash(secondExpectedEnvelope);
    const secondMaterializedPayload = buildProvisioningEvidenceHashPayload(
      secondProvisioningEvidenceEventCandidate,
    );

    assert.equal(secondProvisioningEvidenceEvent.sequence, 2);
    assert.equal(secondProvisioningEvidenceEvent.previousHash, provisioningEvidenceEvent.eventHash);
    assert.match(secondProvisioningEvidenceEvent.eventHash, /^[a-f0-9]{64}$/);
    assert.equal(secondProvisioningEvidenceEvent.eventHash, secondExpectedHash);
    assert.equal(
      secondProvisioningEvidenceEvent.recordedAt.toISOString(),
      '2026-03-28T11:22:00.000Z',
    );
    assert.deepEqual(
      Object.keys(secondMaterializedPayload),
      PROVISIONING_EVIDENCE_HASH_PAYLOAD_KEYS,
    );
    assert.equal(secondMaterializedPayload.deploymentAssignmentId, null);
    assert.equal(secondMaterializedPayload.provisioningJobId, null);
    assert.equal(secondMaterializedPayload.institutionWorkspaceId, null);
    assert.equal(secondMaterializedPayload.deploymentMode, null);
    assert.equal(secondMaterializedPayload.tenantSubdomain, null);
    assert.equal(secondMaterializedPayload.pm2AppName, null);
    assert.equal(secondMaterializedPayload.nginxBinding, null);
    assert.equal(secondMaterializedPayload.packageVersion, null);
    assert.equal(secondMaterializedPayload.healthCheckResult, null);
    assert.equal(secondMaterializedPayload.activationTimestamp, null);
    assert.equal(secondMaterializedPayload.provisioningEvidenceHash, null);
    process.stdout.write('PASS managed_access_phase_e_sequence_assignment_monotonic\n');

    const repeatedHash = computeProvisioningEvidenceEventHash(secondExpectedEnvelope);
    assert.equal(repeatedHash, secondExpectedHash);
    process.stdout.write('PASS managed_access_phase_e_hash_deterministic_for_same_envelope\n');

    const finalizedChainHeadAfterSecondEvent = await ProvisioningEvidenceChainHead.findOne({
      requestId: managedAccessRequest._id,
    }).lean();
    assert.equal(finalizedChainHeadAfterSecondEvent.lastEventHash, secondProvisioningEvidenceEvent.eventHash);
    process.stdout.write('PASS managed_access_phase_e_chain_head_tracks_last_event_hash\n');

    const validVerificationResult = await verifyProvisioningEvidenceChain(managedAccessRequest._id);
    assert.deepEqual(
      validVerificationResult,
      {
        requestId: managedAccessRequest._id.toHexString(),
        hashVersion: MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
        status: 'valid',
        verifiedThroughSequence: 2,
        chainHeadSequence: 2,
        chainHeadHash: secondProvisioningEvidenceEvent.eventHash,
        brokenAtSequence: null,
        expectedHash: null,
        actualHash: null,
        reason: 'chain_valid',
      },
    );
    process.stdout.write('PASS managed_access_phase_e_verifier_valid_chain\n');

    const expectedAnchorSnapshotPath = path.join(
      MANAGED_ACCESS_ASSURANCE_ANCHOR_DIRECTORY,
      managedAccessRequest._id.toHexString(),
      'sequence-2.anchor.json',
    );
    const expectedAnchorSnapshot = buildExpectedAnchorSnapshot({
      requestId: managedAccessRequest._id.toHexString(),
      sequence: 2,
      chainHeadHash: secondProvisioningEvidenceEvent.eventHash,
      createdAt: secondProvisioningEvidenceEvent.recordedAt.toISOString(),
    });
    const anchorSnapshotWriteResult = await rebuildProvisioningEvidenceAnchorSnapshot(
      managedAccessRequest._id,
    );
    assert.deepEqual(
      anchorSnapshotWriteResult,
      {
        status: 'written',
        reason: 'snapshot_written',
        requestId: managedAccessRequest._id.toHexString(),
        snapshotPath: expectedAnchorSnapshotPath,
        snapshot: expectedAnchorSnapshot,
        verificationResult: validVerificationResult,
      },
    );
    assert.equal(fs.existsSync(expectedAnchorSnapshotPath), true);
    process.stdout.write('PASS managed_access_phase_e_anchor_snapshot_creation\n');

    const anchorSnapshotReadResult = await readLatestProvisioningEvidenceAnchorSnapshot(
      managedAccessRequest._id,
    );
    assert.deepEqual(
      anchorSnapshotReadResult,
      {
        status: 'valid',
        reason: 'snapshot_readable',
        requestId: managedAccessRequest._id.toHexString(),
        snapshotPath: expectedAnchorSnapshotPath,
        snapshot: expectedAnchorSnapshot,
      },
    );

    const anchorSnapshotInspectionResult = await inspectProvisioningEvidenceAnchorSnapshot(
      managedAccessRequest._id,
    );
    assert.deepEqual(
      anchorSnapshotInspectionResult,
      {
        status: 'valid',
        reason: 'snapshot_matches_replay',
        requestId: managedAccessRequest._id.toHexString(),
        snapshotPath: expectedAnchorSnapshotPath,
        snapshot: expectedAnchorSnapshot,
        verificationResult: validVerificationResult,
      },
    );
    process.stdout.write('PASS managed_access_phase_e_anchor_snapshot_read_success\n');

    const expectedCheckpointPath = path.join(
      MANAGED_ACCESS_ASSURANCE_CHECKPOINT_DIRECTORY,
      managedAccessRequest._id.toHexString(),
      'sequence-2.checkpoint.json',
    );
    const expectedSignedCheckpoint = buildExpectedSignedCheckpoint({
      requestId: managedAccessRequest._id.toHexString(),
      sequence: 2,
      chainHeadHash: secondProvisioningEvidenceEvent.eventHash,
    });
    const checkpointWriteResult = await rebuildProvisioningEvidenceSignedCheckpoint(
      managedAccessRequest._id,
    );
    assert.deepEqual(
      checkpointWriteResult,
      {
        status: 'written',
        reason: 'checkpoint_written',
        requestId: managedAccessRequest._id.toHexString(),
        checkpointPath: expectedCheckpointPath,
        checkpoint: expectedSignedCheckpoint,
        verificationResult: validVerificationResult,
      },
    );
    assert.equal(fs.existsSync(expectedCheckpointPath), true);
    process.stdout.write('PASS managed_access_phase_e_signed_checkpoint_creation\n');

    const checkpointReadResult = await readLatestProvisioningEvidenceSignedCheckpoint(
      managedAccessRequest._id,
    );
    assert.deepEqual(
      checkpointReadResult,
      {
        status: 'valid',
        reason: 'checkpoint_readable',
        requestId: managedAccessRequest._id.toHexString(),
        checkpointPath: expectedCheckpointPath,
        checkpoint: expectedSignedCheckpoint,
      },
    );
    const checkpointInspectionResult = await inspectProvisioningEvidenceSignedCheckpoint(
      managedAccessRequest._id,
    );
    assert.deepEqual(
      checkpointInspectionResult,
      {
        status: 'valid',
        reason: 'checkpoint_valid',
        requestId: managedAccessRequest._id.toHexString(),
        checkpointPath: expectedCheckpointPath,
        checkpoint: expectedSignedCheckpoint,
        verificationResult: validVerificationResult,
      },
    );
    process.stdout.write('PASS managed_access_phase_e_signed_checkpoint_valid_signature\n');

    const expectedBundle = buildExpectedProvisioningEvidenceBundle({
      requestId: managedAccessRequest._id.toHexString(),
      sequence: 2,
      chainHeadHash: secondProvisioningEvidenceEvent.eventHash,
    });
    const bundleBuildResult = await buildProvisioningEvidenceBundle(managedAccessRequest._id);
    assert.deepEqual(
      bundleBuildResult,
      {
        status: 'valid',
        reason: 'bundle_created',
        requestId: managedAccessRequest._id.toHexString(),
        bundle: expectedBundle,
        verificationResult: validVerificationResult,
        checkpointPath: expectedCheckpointPath,
        checkpoint: expectedSignedCheckpoint,
      },
    );
    process.stdout.write('PASS managed_access_phase_e_bundle_creation\n');

    const bundleInspectionResult = await inspectProvisioningEvidenceBundle(
      managedAccessRequest._id,
      expectedBundle,
    );
    assert.deepEqual(
      bundleInspectionResult,
      {
        status: 'valid',
        reason: 'bundle_valid',
        requestId: managedAccessRequest._id.toHexString(),
        bundle: expectedBundle,
        verificationResult: validVerificationResult,
      },
    );
    process.stdout.write('PASS managed_access_phase_e_bundle_valid\n');

    await assert.rejects(
      async () => ProvisioningEvidenceEvent.create({
        requestId: managedAccessRequest._id,
        sequence: 99,
        hashVersion: MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
        actorIdentity: 'operator@chatpdm.com',
        previousHash: 'b'.repeat(64),
        eventHash: 'c'.repeat(64),
        reviewDecisionId: trustReviewDecision._id,
        eventType: 'review_decision_recorded',
        reviewerIdentity: 'operator@chatpdm.com',
        decisionTimestamp: trustReviewDecision.decisionTimestamp,
        decisionOutcome: trustReviewDecision.decisionOutcome,
        recordedAt: new Date('2026-03-28T11:23:00.000Z'),
        context: 'phase_e_provisioning_protocol',
      }),
      /must be appended through the provisioning evidence chain service/i,
    );
    process.stdout.write('PASS managed_access_phase_e_direct_event_creation_blocked\n');

    await expectChainError(
      async () => appendProvisioningEvidenceEvent({
        requestId: managedAccessRequest._id,
        actorIdentity: 'operator@chatpdm.com',
        eventType: 'review_decision_recorded',
        reviewerIdentity: 'operator@chatpdm.com',
        decisionTimestamp: trustReviewDecision.decisionTimestamp,
        decisionOutcome: trustReviewDecision.decisionOutcome,
        recordedAt: new Date('2026-03-28T11:24:00.000Z'),
        context: 'phase_e_provisioning_protocol',
      }),
      'invalid_append_candidate',
      'managed_access_phase_e_append_rejects_caller_owned_recorded_at',
    );

    await expectChainError(
      async () => appendProvisioningEvidenceEvent({
        requestId: managedAccessRequest._id,
        actorIdentity: 'operator@chatpdm.com',
        previousHash: 'd'.repeat(64),
        eventType: 'review_decision_recorded',
        reviewerIdentity: 'operator@chatpdm.com',
        decisionTimestamp: trustReviewDecision.decisionTimestamp,
        decisionOutcome: trustReviewDecision.decisionOutcome,
        context: 'phase_e_provisioning_protocol',
      }),
      'invalid_append_candidate',
      'managed_access_phase_e_append_rejects_caller_owned_previous_hash',
    );

    await expectChainError(
      async () => appendProvisioningEvidenceEvent({
        requestId: managedAccessRequest._id,
        actorIdentity: 'operator@chatpdm.com',
        eventHash: 'e'.repeat(64),
        eventType: 'review_decision_recorded',
        reviewerIdentity: 'operator@chatpdm.com',
        decisionTimestamp: trustReviewDecision.decisionTimestamp,
        decisionOutcome: trustReviewDecision.decisionOutcome,
        context: 'phase_e_provisioning_protocol',
      }),
      'invalid_append_candidate',
      'managed_access_phase_e_append_rejects_caller_owned_event_hash',
    );

    const tamperedManagedAccessRequest = await ManagedAccessRequest.create(
      buildManagedAccessRequestPayload({
        institutionName: 'Tampered Hash Org',
        companyDomain: 'tamperedhash.org',
        workEmail: 'ops@tamperedhash.org',
        dnsTxtRecordName: '_chatpdm-managed-access.tamperedhash.org',
      }),
    );

    const tamperedTrustReviewDecision = await TrustReviewDecision.create({
      requestId: tamperedManagedAccessRequest._id,
      reviewStatus: 'decision_recorded',
      decisionOutcome: 'approved',
      reviewerIdentity: 'operator@chatpdm.com',
      decisionTimestamp: new Date('2026-03-28T11:40:00.000Z'),
      internalNotes: 'Tampered previousHash scenario.',
      sectorPackageRecommendation: null,
      riskFlags: [],
      trustTier: 'standard',
      reviewReminderAt: null,
    });

    await appendProvisioningEvidenceEvent({
      requestId: tamperedManagedAccessRequest._id,
      actorIdentity: 'operator@chatpdm.com',
      reviewDecisionId: tamperedTrustReviewDecision._id,
      eventType: 'review_decision_recorded',
      reviewerIdentity: 'operator@chatpdm.com',
      decisionTimestamp: tamperedTrustReviewDecision.decisionTimestamp,
      decisionOutcome: tamperedTrustReviewDecision.decisionOutcome,
      context: 'phase_e_provisioning_protocol',
    }, {
      now: new Date('2026-03-28T11:40:30.000Z'),
    });

    await ProvisioningEvidenceChainHead.updateOne(
      { requestId: tamperedManagedAccessRequest._id },
      {
        $set: {
          lastEventHash: 'f'.repeat(64),
        },
      },
    );

    await expectChainError(
      async () => appendProvisioningEvidenceEvent({
        requestId: tamperedManagedAccessRequest._id,
        actorIdentity: 'operator@chatpdm.com',
        reviewDecisionId: tamperedTrustReviewDecision._id,
        eventType: 'review_decision_recorded',
        reviewerIdentity: 'operator@chatpdm.com',
        decisionTimestamp: tamperedTrustReviewDecision.decisionTimestamp,
        decisionOutcome: tamperedTrustReviewDecision.decisionOutcome,
        context: 'phase_e_provisioning_protocol',
      }, {
        now: new Date('2026-03-28T11:41:00.000Z'),
      }),
      'previous_hash_mismatch',
      'managed_access_phase_e_tampered_previous_hash_is_rejected',
    );

    const tamperedChainHead = await ProvisioningEvidenceChainHead.findOne({
      requestId: tamperedManagedAccessRequest._id,
    }).lean();
    assert.equal(tamperedChainHead.inFlightPreviousHash, 'f'.repeat(64));
    process.stdout.write('PASS managed_access_phase_e_previous_hash_mismatch_surfaces_explicitly\n');

    const tamperedRepairResult = await repairProvisioningEvidenceChainHead(
      tamperedManagedAccessRequest._id,
      { now: new Date('2026-03-28T11:50:00.000Z') },
    );
    assert.equal(tamperedRepairResult.status, 'cleared_stale_reservation');

    const staleReservationToken = new mongoose.Types.ObjectId().toHexString();
    await ProvisioningEvidenceChainHead.updateOne(
      { requestId: managedAccessRequest._id },
      {
        $set: {
          inFlightAppendToken: staleReservationToken,
          inFlightSequence: 3,
          inFlightPreviousHash: null,
          inFlightRecordedAt: new Date('2026-03-28T11:23:00.000Z'),
          inFlightExpiresAt: new Date('2026-03-28T11:23:30.000Z'),
        },
      },
    );

    await expectChainError(
      async () => appendProvisioningEvidenceEvent({
        requestId: managedAccessRequest._id,
        actorIdentity: 'operator@chatpdm.com',
        eventType: 'review_decision_recorded',
        reviewerIdentity: 'operator@chatpdm.com',
        decisionTimestamp: trustReviewDecision.decisionTimestamp,
        decisionOutcome: trustReviewDecision.decisionOutcome,
        context: 'phase_e_provisioning_protocol',
      }, {
        now: new Date('2026-03-28T11:30:00.000Z'),
      }),
      'stale_inflight_append',
      'managed_access_phase_e_append_does_not_auto_clear_stale_reservation',
    );

    const staleReservationHead = await ProvisioningEvidenceChainHead.findOne({
      requestId: managedAccessRequest._id,
    }).lean();
    assert.equal(staleReservationHead.inFlightAppendToken, staleReservationToken);
    assert.equal(staleReservationHead.inFlightSequence, 3);
    process.stdout.write('PASS managed_access_phase_e_stale_reservation_remains_visible\n');

    const repairResult = await repairProvisioningEvidenceChainHead(
      managedAccessRequest._id,
      { now: new Date('2026-03-28T11:31:00.000Z') },
    );
    assert.equal(repairResult.status, 'cleared_stale_reservation');

    const repairedHead = await ProvisioningEvidenceChainHead.findOne({
      requestId: managedAccessRequest._id,
    }).lean();
    assert.equal(repairedHead.inFlightAppendToken, null);
    assert.equal(repairedHead.lastSequence, 2);
    process.stdout.write('PASS managed_access_phase_e_stale_reservation_repair_clears_without_auto_heal\n');

    const zeroEventRequest = await ManagedAccessRequest.create(
      buildManagedAccessRequestPayload({
        institutionName: 'Verifier Zero Event',
        companyDomain: 'verifier-zero-event.org',
        workEmail: 'ops+zero@verifier-zero-event.org',
        dnsTxtRecordName: '_chatpdm-managed-access.verifier-zero-event.org',
      }),
    );
    const zeroEventVerificationResult = await verifyProvisioningEvidenceChain(zeroEventRequest._id);
    assert.deepEqual(
      zeroEventVerificationResult,
      {
        requestId: zeroEventRequest._id.toHexString(),
        hashVersion: MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
        status: 'valid',
        verifiedThroughSequence: 0,
        chainHeadSequence: 0,
        chainHeadHash: null,
        brokenAtSequence: null,
        expectedHash: null,
        actualHash: null,
        reason: 'no_events',
      },
    );
    process.stdout.write('PASS managed_access_phase_e_verifier_zero_event_state_is_explicit\n');

    const missingSnapshotScenario = await createVerifierScenarioChain(
      'snapshot-missing',
      {
        eventCount: 2,
        baseTime: new Date('2026-03-28T13:30:00.000Z'),
      },
    );
    const missingSnapshotVerificationResult = await verifyProvisioningEvidenceChain(
      missingSnapshotScenario.managedAccessRequest._id,
    );
    const missingSnapshotInspectionResult = await inspectProvisioningEvidenceAnchorSnapshot(
      missingSnapshotScenario.managedAccessRequest._id,
    );
    assert.deepEqual(
      missingSnapshotInspectionResult,
      {
        status: 'missing',
        reason: 'snapshot_missing',
        requestId: missingSnapshotScenario.managedAccessRequest._id.toHexString(),
        snapshotPath: null,
        snapshot: null,
        verificationResult: missingSnapshotVerificationResult,
      },
    );
    process.stdout.write('PASS managed_access_phase_e_anchor_snapshot_missing_is_nonfatal\n');

    const missingCheckpointScenario = await createVerifierScenarioChain(
      'checkpoint-missing',
      {
        eventCount: 2,
        baseTime: new Date('2026-03-28T13:35:00.000Z'),
      },
    );
    const missingCheckpointVerificationResult = await verifyProvisioningEvidenceChain(
      missingCheckpointScenario.managedAccessRequest._id,
    );
    const missingCheckpointInspectionResult = await inspectProvisioningEvidenceSignedCheckpoint(
      missingCheckpointScenario.managedAccessRequest._id,
    );
    assert.deepEqual(
      missingCheckpointInspectionResult,
      {
        status: 'missing',
        reason: 'checkpoint_missing',
        requestId: missingCheckpointScenario.managedAccessRequest._id.toHexString(),
        checkpointPath: null,
        checkpoint: null,
        verificationResult: missingCheckpointVerificationResult,
      },
    );
    process.stdout.write('PASS managed_access_phase_e_signed_checkpoint_missing_is_nonfatal\n');

    const missingCheckpointBundleResult = await buildProvisioningEvidenceBundle(
      missingCheckpointScenario.managedAccessRequest._id,
    );
    assert.deepEqual(
      missingCheckpointBundleResult,
      {
        status: 'missing',
        reason: 'bundle_checkpoint_missing',
        requestId: missingCheckpointScenario.managedAccessRequest._id.toHexString(),
        bundle: null,
        verificationResult: missingCheckpointVerificationResult,
        checkpointPath: null,
        checkpoint: null,
      },
    );
    process.stdout.write('PASS managed_access_phase_e_bundle_missing_checkpoint\n');

    const malformedSnapshotScenario = await createVerifierScenarioChain(
      'snapshot-malformed',
      {
        eventCount: 2,
        baseTime: new Date('2026-03-28T13:40:00.000Z'),
      },
    );
    const malformedSnapshotWriteResult = await rebuildProvisioningEvidenceAnchorSnapshot(
      malformedSnapshotScenario.managedAccessRequest._id,
    );
    fs.writeFileSync(malformedSnapshotWriteResult.snapshotPath, '{"broken":', 'utf8');
    const malformedSnapshotReadResult = await readLatestProvisioningEvidenceAnchorSnapshot(
      malformedSnapshotScenario.managedAccessRequest._id,
    );
    assert.deepEqual(
      malformedSnapshotReadResult,
      {
        status: 'invalid',
        reason: 'snapshot_malformed',
        requestId: malformedSnapshotScenario.managedAccessRequest._id.toHexString(),
        snapshotPath: malformedSnapshotWriteResult.snapshotPath,
        snapshot: null,
      },
    );
    const malformedSnapshotVerificationResult = await verifyProvisioningEvidenceChain(
      malformedSnapshotScenario.managedAccessRequest._id,
    );
    const malformedSnapshotInspectionResult = await inspectProvisioningEvidenceAnchorSnapshot(
      malformedSnapshotScenario.managedAccessRequest._id,
    );
    assert.deepEqual(
      malformedSnapshotInspectionResult,
      {
        status: 'invalid',
        reason: 'snapshot_malformed',
        requestId: malformedSnapshotScenario.managedAccessRequest._id.toHexString(),
        snapshotPath: malformedSnapshotWriteResult.snapshotPath,
        snapshot: null,
        verificationResult: malformedSnapshotVerificationResult,
      },
    );
    process.stdout.write('PASS managed_access_phase_e_anchor_snapshot_malformed_is_rejected\n');

    assert.deepEqual(
      await verifyProvisioningEvidenceChain(malformedSnapshotScenario.managedAccessRequest._id),
      malformedSnapshotVerificationResult,
    );
    process.stdout.write('PASS managed_access_phase_e_anchor_snapshot_corruption_does_not_override_replay\n');

    const malformedCheckpointScenario = await createVerifierScenarioChain(
      'checkpoint-malformed',
      {
        eventCount: 2,
        baseTime: new Date('2026-03-28T13:45:00.000Z'),
      },
    );
    const malformedCheckpointWriteResult = await rebuildProvisioningEvidenceSignedCheckpoint(
      malformedCheckpointScenario.managedAccessRequest._id,
    );
    fs.writeFileSync(malformedCheckpointWriteResult.checkpointPath, '{"broken":', 'utf8');
    const malformedCheckpointReadResult = await readLatestProvisioningEvidenceSignedCheckpoint(
      malformedCheckpointScenario.managedAccessRequest._id,
    );
    assert.deepEqual(
      malformedCheckpointReadResult,
      {
        status: 'invalid',
        reason: 'checkpoint_malformed',
        requestId: malformedCheckpointScenario.managedAccessRequest._id.toHexString(),
        checkpointPath: malformedCheckpointWriteResult.checkpointPath,
        checkpoint: null,
      },
    );
    const malformedCheckpointVerificationResult = await verifyProvisioningEvidenceChain(
      malformedCheckpointScenario.managedAccessRequest._id,
    );
    const malformedCheckpointInspectionResult = await inspectProvisioningEvidenceSignedCheckpoint(
      malformedCheckpointScenario.managedAccessRequest._id,
    );
    assert.deepEqual(
      malformedCheckpointInspectionResult,
      {
        status: 'invalid',
        reason: 'checkpoint_malformed',
        requestId: malformedCheckpointScenario.managedAccessRequest._id.toHexString(),
        checkpointPath: malformedCheckpointWriteResult.checkpointPath,
        checkpoint: null,
        verificationResult: malformedCheckpointVerificationResult,
      },
    );
    process.stdout.write('PASS managed_access_phase_e_signed_checkpoint_malformed_is_rejected\n');

    const malformedBundleInspectionResult = await inspectProvisioningEvidenceBundle(
      malformedCheckpointScenario.managedAccessRequest._id,
      null,
    );
    assert.deepEqual(
      malformedBundleInspectionResult,
      {
        status: 'invalid',
        reason: 'bundle_malformed',
        requestId: malformedCheckpointScenario.managedAccessRequest._id.toHexString(),
        bundle: null,
        verificationResult: malformedCheckpointVerificationResult,
      },
    );
    process.stdout.write('PASS managed_access_phase_e_bundle_malformed\n');

    const staleSnapshotScenario = await createVerifierScenarioChain(
      'snapshot-replay-mismatch',
      {
        eventCount: 2,
        baseTime: new Date('2026-03-28T13:50:00.000Z'),
      },
    );
    const staleSnapshotWriteResult = await rebuildProvisioningEvidenceAnchorSnapshot(
      staleSnapshotScenario.managedAccessRequest._id,
    );
    const staleSnapshotPath = staleSnapshotWriteResult.snapshotPath;
    const staleSnapshotExpected = staleSnapshotWriteResult.snapshot;
    const staleSnapshotThirdEvent = await appendProvisioningEvidenceEvent({
      requestId: staleSnapshotScenario.managedAccessRequest._id,
      actorIdentity: 'operator@chatpdm.com',
      reviewDecisionId: staleSnapshotScenario.trustReviewDecision._id,
      eventType: 'review_decision_recorded',
      reviewerIdentity: 'operator@chatpdm.com',
      decisionTimestamp: staleSnapshotScenario.trustReviewDecision.decisionTimestamp,
      decisionOutcome: staleSnapshotScenario.trustReviewDecision.decisionOutcome,
      context: 'phase_e_provisioning_protocol',
    }, {
      now: new Date('2026-03-28T13:53:00.000Z'),
    });
    const staleSnapshotVerificationResult = await verifyProvisioningEvidenceChain(
      staleSnapshotScenario.managedAccessRequest._id,
    );
    const staleSnapshotInspectionResult = await inspectProvisioningEvidenceAnchorSnapshot(
      staleSnapshotScenario.managedAccessRequest._id,
    );
    assert.deepEqual(
      staleSnapshotInspectionResult,
      {
        status: 'stale',
        reason: 'snapshot_replay_mismatch',
        requestId: staleSnapshotScenario.managedAccessRequest._id.toHexString(),
        snapshotPath: staleSnapshotPath,
        snapshot: staleSnapshotExpected,
        verificationResult: staleSnapshotVerificationResult,
      },
    );
    process.stdout.write('PASS managed_access_phase_e_anchor_snapshot_replay_mismatch_falls_back_to_replay\n');

    const rebuiltStaleSnapshot = buildExpectedAnchorSnapshot({
      requestId: staleSnapshotScenario.managedAccessRequest._id.toHexString(),
      sequence: 3,
      chainHeadHash: staleSnapshotThirdEvent.eventHash,
      createdAt: staleSnapshotThirdEvent.recordedAt.toISOString(),
    });
    const rebuiltStaleSnapshotPath = path.join(
      MANAGED_ACCESS_ASSURANCE_ANCHOR_DIRECTORY,
      staleSnapshotScenario.managedAccessRequest._id.toHexString(),
      'sequence-3.anchor.json',
    );
    const staleSnapshotRebuildResult = await rebuildProvisioningEvidenceAnchorSnapshot(
      staleSnapshotScenario.managedAccessRequest._id,
    );
    assert.deepEqual(
      staleSnapshotRebuildResult,
      {
        status: 'written',
        reason: 'snapshot_written',
        requestId: staleSnapshotScenario.managedAccessRequest._id.toHexString(),
        snapshotPath: rebuiltStaleSnapshotPath,
        snapshot: rebuiltStaleSnapshot,
        verificationResult: staleSnapshotVerificationResult,
      },
    );
    assert.equal(fs.existsSync(staleSnapshotPath), false);
    const rebuiltStaleSnapshotInspectionResult = await inspectProvisioningEvidenceAnchorSnapshot(
      staleSnapshotScenario.managedAccessRequest._id,
    );
    assert.deepEqual(
      rebuiltStaleSnapshotInspectionResult,
      {
        status: 'valid',
        reason: 'snapshot_matches_replay',
        requestId: staleSnapshotScenario.managedAccessRequest._id.toHexString(),
        snapshotPath: rebuiltStaleSnapshotPath,
        snapshot: rebuiltStaleSnapshot,
        verificationResult: staleSnapshotVerificationResult,
      },
    );
    process.stdout.write('PASS managed_access_phase_e_anchor_snapshot_rebuild_restores_current_head\n');

    const tamperedCheckpointPayloadScenario = await createVerifierScenarioChain(
      'checkpoint-payload-mismatch',
      {
        eventCount: 2,
        baseTime: new Date('2026-03-28T13:55:00.000Z'),
      },
    );
    const tamperedCheckpointPayloadVerificationResult = await verifyProvisioningEvidenceChain(
      tamperedCheckpointPayloadScenario.managedAccessRequest._id,
    );
    const tamperedCheckpointPayload = buildProvisioningEvidenceCheckpointPayload({
      requestId: tamperedCheckpointPayloadScenario.managedAccessRequest._id.toHexString(),
      verificationResult: tamperedCheckpointPayloadVerificationResult,
    });
    tamperedCheckpointPayload.chainHeadHash = 'a'.repeat(64);
    const tamperedCheckpointPayloadEnvelope = {
      payload: tamperedCheckpointPayload,
      signature: signProvisioningEvidenceCheckpointPayload(tamperedCheckpointPayload).signature,
    };
    const tamperedCheckpointPayloadPath = buildProvisioningEvidenceCheckpointPath(
      tamperedCheckpointPayloadScenario.managedAccessRequest._id,
      tamperedCheckpointPayload.chainHeadSequence,
    );
    await writeProvisioningEvidenceSignedCheckpointFile(
      tamperedCheckpointPayloadPath,
      tamperedCheckpointPayloadEnvelope,
    );
    const tamperedCheckpointPayloadInspectionResult = await inspectProvisioningEvidenceSignedCheckpoint(
      tamperedCheckpointPayloadScenario.managedAccessRequest._id,
    );
    assert.deepEqual(
      tamperedCheckpointPayloadInspectionResult,
      {
        status: 'invalid',
        reason: 'checkpoint_payload_mismatch',
        requestId: tamperedCheckpointPayloadScenario.managedAccessRequest._id.toHexString(),
        checkpointPath: tamperedCheckpointPayloadPath,
        checkpoint: tamperedCheckpointPayloadEnvelope,
        verificationResult: tamperedCheckpointPayloadVerificationResult,
      },
    );
    process.stdout.write('PASS managed_access_phase_e_signed_checkpoint_tampered_payload_detected\n');

    const bundlePayloadMismatchScenario = await createVerifierScenarioChain(
      'bundle-payload-mismatch',
      {
        eventCount: 2,
        baseTime: new Date('2026-03-28T14:02:00.000Z'),
      },
    );
    await rebuildProvisioningEvidenceSignedCheckpoint(bundlePayloadMismatchScenario.managedAccessRequest._id);
    const bundlePayloadMismatchReplayResult = await verifyProvisioningEvidenceChain(
      bundlePayloadMismatchScenario.managedAccessRequest._id,
    );
    const bundlePayloadBuildResult = await buildProvisioningEvidenceBundle(
      bundlePayloadMismatchScenario.managedAccessRequest._id,
    );
    assert.equal(bundlePayloadBuildResult.status, 'valid');
    const tamperedBundlePayload = JSON.parse(JSON.stringify(bundlePayloadBuildResult.bundle));
    tamperedBundlePayload.payload.chainHeadHash = '0'.repeat(64);
    const bundlePayloadMismatchInspectionResult = await inspectProvisioningEvidenceBundle(
      bundlePayloadMismatchScenario.managedAccessRequest._id,
      tamperedBundlePayload,
    );
    assert.deepEqual(
      bundlePayloadMismatchInspectionResult,
      {
        status: 'invalid',
        reason: 'bundle_payload_mismatch',
        requestId: bundlePayloadMismatchScenario.managedAccessRequest._id.toHexString(),
        bundle: tamperedBundlePayload,
        verificationResult: bundlePayloadMismatchReplayResult,
      },
    );
    process.stdout.write('PASS managed_access_phase_e_bundle_payload_mismatch\n');

    const tamperedCheckpointSignatureScenario = await createVerifierScenarioChain(
      'checkpoint-signature-invalid',
      {
        eventCount: 2,
        baseTime: new Date('2026-03-28T14:05:00.000Z'),
      },
    );
    const tamperedCheckpointSignatureWriteResult = await rebuildProvisioningEvidenceSignedCheckpoint(
      tamperedCheckpointSignatureScenario.managedAccessRequest._id,
    );
    const tamperedCheckpointSignature = JSON.parse(
      JSON.stringify(tamperedCheckpointSignatureWriteResult.checkpoint),
    );
    tamperedCheckpointSignature.signature.signature = `${
      tamperedCheckpointSignature.signature.signature.startsWith('A') ? 'B' : 'A'
    }${tamperedCheckpointSignature.signature.signature.slice(1)}`;
    await writeProvisioningEvidenceSignedCheckpointFile(
      tamperedCheckpointSignatureWriteResult.checkpointPath,
      tamperedCheckpointSignature,
    );
    const tamperedCheckpointSignatureVerificationResult = await verifyProvisioningEvidenceChain(
      tamperedCheckpointSignatureScenario.managedAccessRequest._id,
    );
    const tamperedCheckpointSignatureInspectionResult = await inspectProvisioningEvidenceSignedCheckpoint(
      tamperedCheckpointSignatureScenario.managedAccessRequest._id,
    );
    assert.deepEqual(
      tamperedCheckpointSignatureInspectionResult,
      {
        status: 'invalid',
        reason: 'checkpoint_signature_invalid',
        requestId: tamperedCheckpointSignatureScenario.managedAccessRequest._id.toHexString(),
        checkpointPath: tamperedCheckpointSignatureWriteResult.checkpointPath,
        checkpoint: tamperedCheckpointSignature,
        verificationResult: tamperedCheckpointSignatureVerificationResult,
      },
    );
    process.stdout.write('PASS managed_access_phase_e_signed_checkpoint_tampered_signature_detected\n');

    const bundleSignatureInvalidScenario = await createVerifierScenarioChain(
      'bundle-signature-invalid',
      {
        eventCount: 2,
        baseTime: new Date('2026-03-28T14:07:00.000Z'),
      },
    );
    await rebuildProvisioningEvidenceSignedCheckpoint(bundleSignatureInvalidScenario.managedAccessRequest._id);
    const bundleSignatureInvalidReplayResult = await verifyProvisioningEvidenceChain(
      bundleSignatureInvalidScenario.managedAccessRequest._id,
    );
    const bundleSignatureBuildResult = await buildProvisioningEvidenceBundle(
      bundleSignatureInvalidScenario.managedAccessRequest._id,
    );
    assert.equal(bundleSignatureBuildResult.status, 'valid');
    const tamperedBundleSignature = JSON.parse(JSON.stringify(bundleSignatureBuildResult.bundle));
    tamperedBundleSignature.checkpoint.signature.signature = `${
      tamperedBundleSignature.checkpoint.signature.signature.startsWith('A') ? 'B' : 'A'
    }${tamperedBundleSignature.checkpoint.signature.signature.slice(1)}`;
    const bundleSignatureInvalidInspectionResult = await inspectProvisioningEvidenceBundle(
      bundleSignatureInvalidScenario.managedAccessRequest._id,
      tamperedBundleSignature,
    );
    assert.deepEqual(
      bundleSignatureInvalidInspectionResult,
      {
        status: 'invalid',
        reason: 'bundle_signature_invalid',
        requestId: bundleSignatureInvalidScenario.managedAccessRequest._id.toHexString(),
        bundle: tamperedBundleSignature,
        verificationResult: bundleSignatureInvalidReplayResult,
        checkpointReason: 'checkpoint_signature_invalid',
      },
    );
    process.stdout.write('PASS managed_access_phase_e_bundle_signature_invalid\n');

    const unknownCheckpointKeyScenario = await createVerifierScenarioChain(
      'checkpoint-key-unknown',
      {
        eventCount: 2,
        baseTime: new Date('2026-03-28T14:15:00.000Z'),
      },
    );
    const unknownCheckpointKeyVerificationResult = await verifyProvisioningEvidenceChain(
      unknownCheckpointKeyScenario.managedAccessRequest._id,
    );
    const unknownCheckpointKeyPayload = buildProvisioningEvidenceCheckpointPayload({
      requestId: unknownCheckpointKeyScenario.managedAccessRequest._id.toHexString(),
      verificationResult: unknownCheckpointKeyVerificationResult,
    });
    const unknownCheckpointKeyEnvelope = {
      payload: unknownCheckpointKeyPayload,
      signature: signProvisioningEvidenceCheckpointPayload(unknownCheckpointKeyPayload, {
        keyId: 'managed-access-unknown-key',
        privateKeyPem: process.env.MANAGED_ACCESS_ASSURANCE_CHECKPOINT_SIGNING_PRIVATE_KEY_PEM,
      }).signature,
    };
    const unknownCheckpointKeyPath = buildProvisioningEvidenceCheckpointPath(
      unknownCheckpointKeyScenario.managedAccessRequest._id,
      unknownCheckpointKeyPayload.chainHeadSequence,
    );
    await writeProvisioningEvidenceSignedCheckpointFile(
      unknownCheckpointKeyPath,
      unknownCheckpointKeyEnvelope,
    );
    const unknownCheckpointKeyInspectionResult = await inspectProvisioningEvidenceSignedCheckpoint(
      unknownCheckpointKeyScenario.managedAccessRequest._id,
    );
    assert.deepEqual(
      unknownCheckpointKeyInspectionResult,
      {
        status: 'invalid',
        reason: 'checkpoint_key_unknown',
        requestId: unknownCheckpointKeyScenario.managedAccessRequest._id.toHexString(),
        checkpointPath: unknownCheckpointKeyPath,
        checkpoint: unknownCheckpointKeyEnvelope,
        verificationResult: unknownCheckpointKeyVerificationResult,
      },
    );
    process.stdout.write('PASS managed_access_phase_e_signed_checkpoint_unknown_key_is_rejected\n');

    const invalidSigningKeyScenario = await createVerifierScenarioChain(
      'checkpoint-signing-key-invalid',
      {
        eventCount: 2,
        baseTime: new Date('2026-03-28T14:25:00.000Z'),
      },
    );
    const invalidSigningKeyVerificationResult = await verifyProvisioningEvidenceChain(
      invalidSigningKeyScenario.managedAccessRequest._id,
    );
    const invalidSigningKeyWriteResult = await rebuildProvisioningEvidenceSignedCheckpoint(
      invalidSigningKeyScenario.managedAccessRequest._id,
      {
        keyId: MANAGED_ACCESS_ASSURANCE_CHECKPOINT_SIGNING_KEY_ID,
        privateKeyPem: 'bad-pem',
      },
    );
    assert.deepEqual(
      invalidSigningKeyWriteResult,
      {
        status: 'skipped',
        reason: 'checkpoint_signing_key_invalid',
        requestId: invalidSigningKeyScenario.managedAccessRequest._id.toHexString(),
        checkpointPath: null,
        checkpoint: null,
        verificationResult: invalidSigningKeyVerificationResult,
      },
    );
    assert.deepEqual(
      await verifyProvisioningEvidenceChain(invalidSigningKeyScenario.managedAccessRequest._id),
      invalidSigningKeyVerificationResult,
    );
    process.stdout.write('PASS managed_access_phase_e_signed_checkpoint_invalid_signing_key_is_contained\n');

    const invalidVerificationKeyScenario = await createVerifierScenarioChain(
      'checkpoint-verification-key-invalid',
      {
        eventCount: 2,
        baseTime: new Date('2026-03-28T14:35:00.000Z'),
      },
    );
    const invalidVerificationKeyWriteResult = await rebuildProvisioningEvidenceSignedCheckpoint(
      invalidVerificationKeyScenario.managedAccessRequest._id,
    );
    const invalidVerificationKeyReplayResult = await verifyProvisioningEvidenceChain(
      invalidVerificationKeyScenario.managedAccessRequest._id,
    );
    const invalidVerificationKeyInspectionResult = await inspectProvisioningEvidenceSignedCheckpoint(
      invalidVerificationKeyScenario.managedAccessRequest._id,
      {
        publicKeys: {
          [MANAGED_ACCESS_ASSURANCE_CHECKPOINT_SIGNING_KEY_ID]: 'bad-pem',
        },
        publicKeysStatus: 'valid',
      },
    );
    assert.deepEqual(
      invalidVerificationKeyInspectionResult,
      {
        status: 'invalid',
        reason: 'checkpoint_verification_key_invalid',
        requestId: invalidVerificationKeyScenario.managedAccessRequest._id.toHexString(),
        checkpointPath: invalidVerificationKeyWriteResult.checkpointPath,
        checkpoint: invalidVerificationKeyWriteResult.checkpoint,
        verificationResult: invalidVerificationKeyReplayResult,
      },
    );
    assert.deepEqual(
      await verifyProvisioningEvidenceChain(invalidVerificationKeyScenario.managedAccessRequest._id),
      invalidVerificationKeyReplayResult,
    );
    process.stdout.write('PASS managed_access_phase_e_signed_checkpoint_invalid_verification_key_is_contained\n');

    const invalidKeyRegistryScenario = await createVerifierScenarioChain(
      'checkpoint-key-registry-invalid',
      {
        eventCount: 2,
        baseTime: new Date('2026-03-28T14:45:00.000Z'),
      },
    );
    const invalidKeyRegistryWriteResult = await rebuildProvisioningEvidenceSignedCheckpoint(
      invalidKeyRegistryScenario.managedAccessRequest._id,
    );
    const invalidKeyRegistryReplayResult = await verifyProvisioningEvidenceChain(
      invalidKeyRegistryScenario.managedAccessRequest._id,
    );
    const invalidKeyRegistryInspectionResult = await inspectProvisioningEvidenceSignedCheckpoint(
      invalidKeyRegistryScenario.managedAccessRequest._id,
      {
        publicKeysStatus: 'invalid',
        publicKeysReason: 'checkpoint_key_registry_config_invalid',
      },
    );
    assert.deepEqual(
      invalidKeyRegistryInspectionResult,
      {
        status: 'invalid',
        reason: 'checkpoint_key_registry_config_invalid',
        requestId: invalidKeyRegistryScenario.managedAccessRequest._id.toHexString(),
        checkpointPath: invalidKeyRegistryWriteResult.checkpointPath,
        checkpoint: invalidKeyRegistryWriteResult.checkpoint,
        verificationResult: invalidKeyRegistryReplayResult,
      },
    );
    assert.deepEqual(
      await verifyProvisioningEvidenceChain(invalidKeyRegistryScenario.managedAccessRequest._id),
      invalidKeyRegistryReplayResult,
    );
    process.stdout.write('PASS managed_access_phase_e_signed_checkpoint_invalid_key_registry_is_contained\n');

    const invalidKeyRegistryConfigLoad = loadManagedAccessAssuranceConfigWithCheckpointPublicKeysJson(
      '{bad',
    );
    assert.equal(
      invalidKeyRegistryConfigLoad.MANAGED_ACCESS_ASSURANCE_CHECKPOINT_PUBLIC_KEYS_STATUS,
      'invalid',
    );
    assert.equal(
      invalidKeyRegistryConfigLoad.MANAGED_ACCESS_ASSURANCE_CHECKPOINT_PUBLIC_KEYS_REASON,
      'checkpoint_key_registry_config_invalid',
    );
    assert.deepEqual(
      invalidKeyRegistryConfigLoad.MANAGED_ACCESS_ASSURANCE_CHECKPOINT_PUBLIC_KEYS,
      {},
    );
    process.stdout.write('PASS managed_access_phase_e_signed_checkpoint_invalid_key_registry_config_load_is_contained\n');

    assert.deepEqual(
      await verifyProvisioningEvidenceChain(tamperedCheckpointSignatureScenario.managedAccessRequest._id),
      tamperedCheckpointSignatureVerificationResult,
    );
    assert.deepEqual(
      await verifyProvisioningEvidenceChain(missingCheckpointScenario.managedAccessRequest._id),
      missingCheckpointVerificationResult,
    );
    assert.deepEqual(
      await verifyProvisioningEvidenceChain(bundlePayloadMismatchScenario.managedAccessRequest._id),
      bundlePayloadMismatchReplayResult,
    );
    assert.deepEqual(
      await verifyProvisioningEvidenceChain(bundleSignatureInvalidScenario.managedAccessRequest._id),
      bundleSignatureInvalidReplayResult,
    );
    process.stdout.write('PASS managed_access_phase_e_signed_checkpoint_failure_does_not_override_replay\n');
    process.stdout.write('PASS managed_access_phase_e_bundle_does_not_override_replay\n');

    const sequenceGapScenario = await createVerifierScenarioChain(
      'sequence-gap',
      {
        eventCount: 3,
        baseTime: new Date('2026-03-28T14:00:00.000Z'),
      },
    );
    await ProvisioningEvidenceEvent.collection.deleteOne({
      _id: sequenceGapScenario.events[1]._id,
    });
    const sequenceGapVerificationResult = await verifyProvisioningEvidenceChain(
      sequenceGapScenario.managedAccessRequest._id,
    );
    assert.deepEqual(
      sequenceGapVerificationResult,
      {
        requestId: sequenceGapScenario.managedAccessRequest._id.toHexString(),
        hashVersion: MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
        status: 'invalid',
        verifiedThroughSequence: 1,
        chainHeadSequence: 3,
        chainHeadHash: sequenceGapScenario.events[2].eventHash,
        brokenAtSequence: 3,
        expectedHash: null,
        actualHash: sequenceGapScenario.events[2].eventHash,
        reason: 'sequence_gap',
      },
    );
    process.stdout.write('PASS managed_access_phase_e_verifier_sequence_gap_fails\n');

    const previousHashScenario = await createVerifierScenarioChain(
      'previous-hash-mismatch',
      {
        eventCount: 2,
        baseTime: new Date('2026-03-28T14:10:00.000Z'),
      },
    );
    const tamperedPreviousHash = 'c'.repeat(64);
    await ProvisioningEvidenceEvent.collection.updateOne(
      { _id: previousHashScenario.events[1]._id },
      {
        $set: {
          previousHash: tamperedPreviousHash,
        },
      },
    );
    const previousHashVerificationResult = await verifyProvisioningEvidenceChain(
      previousHashScenario.managedAccessRequest._id,
    );
    assert.deepEqual(
      previousHashVerificationResult,
      {
        requestId: previousHashScenario.managedAccessRequest._id.toHexString(),
        hashVersion: MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
        status: 'invalid',
        verifiedThroughSequence: 1,
        chainHeadSequence: 2,
        chainHeadHash: previousHashScenario.events[1].eventHash,
        brokenAtSequence: 2,
        expectedHash: previousHashScenario.events[0].eventHash,
        actualHash: tamperedPreviousHash,
        reason: 'previous_hash_mismatch',
      },
    );
    process.stdout.write('PASS managed_access_phase_e_verifier_previous_hash_mismatch_fails\n');

    const eventHashScenario = await createVerifierScenarioChain(
      'event-hash-mismatch',
      {
        eventCount: 2,
        baseTime: new Date('2026-03-28T14:20:00.000Z'),
      },
    );
    const tamperedEventHash = 'd'.repeat(64);
    await ProvisioningEvidenceEvent.collection.updateOne(
      { _id: eventHashScenario.events[1]._id },
      {
        $set: {
          eventHash: tamperedEventHash,
        },
      },
    );
    const eventHashVerificationResult = await verifyProvisioningEvidenceChain(
      eventHashScenario.managedAccessRequest._id,
    );
    assert.deepEqual(
      eventHashVerificationResult,
      {
        requestId: eventHashScenario.managedAccessRequest._id.toHexString(),
        hashVersion: MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
        status: 'invalid',
        verifiedThroughSequence: 1,
        chainHeadSequence: 2,
        chainHeadHash: eventHashScenario.events[1].eventHash,
        brokenAtSequence: 2,
        expectedHash: eventHashScenario.events[1].eventHash,
        actualHash: tamperedEventHash,
        reason: 'event_hash_mismatch',
      },
    );
    process.stdout.write('PASS managed_access_phase_e_verifier_event_hash_mismatch_fails\n');

    const chainHeadSequenceScenario = await createVerifierScenarioChain(
      'chain-head-sequence-mismatch',
      {
        eventCount: 2,
        baseTime: new Date('2026-03-28T14:30:00.000Z'),
      },
    );
    await ProvisioningEvidenceChainHead.updateOne(
      { requestId: chainHeadSequenceScenario.managedAccessRequest._id },
      {
        $set: {
          lastSequence: 9,
        },
      },
    );
    const chainHeadSequenceVerificationResult = await verifyProvisioningEvidenceChain(
      chainHeadSequenceScenario.managedAccessRequest._id,
    );
    assert.deepEqual(
      chainHeadSequenceVerificationResult,
      {
        requestId: chainHeadSequenceScenario.managedAccessRequest._id.toHexString(),
        hashVersion: MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
        status: 'invalid',
        verifiedThroughSequence: 2,
        chainHeadSequence: 9,
        chainHeadHash: chainHeadSequenceScenario.events[1].eventHash,
        brokenAtSequence: null,
        expectedHash: null,
        actualHash: null,
        reason: 'chain_head_sequence_mismatch',
      },
    );
    process.stdout.write('PASS managed_access_phase_e_verifier_chain_head_sequence_mismatch_fails\n');

    const chainHeadHashScenario = await createVerifierScenarioChain(
      'chain-head-hash-mismatch',
      {
        eventCount: 2,
        baseTime: new Date('2026-03-28T14:40:00.000Z'),
      },
    );
    const tamperedChainHeadHash = 'e'.repeat(64);
    await ProvisioningEvidenceChainHead.updateOne(
      { requestId: chainHeadHashScenario.managedAccessRequest._id },
      {
        $set: {
          lastEventHash: tamperedChainHeadHash,
        },
      },
    );
    const chainHeadHashVerificationResult = await verifyProvisioningEvidenceChain(
      chainHeadHashScenario.managedAccessRequest._id,
    );
    assert.deepEqual(
      chainHeadHashVerificationResult,
      {
        requestId: chainHeadHashScenario.managedAccessRequest._id.toHexString(),
        hashVersion: MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
        status: 'invalid',
        verifiedThroughSequence: 2,
        chainHeadSequence: 2,
        chainHeadHash: tamperedChainHeadHash,
        brokenAtSequence: null,
        expectedHash: chainHeadHashScenario.events[1].eventHash,
        actualHash: tamperedChainHeadHash,
        reason: 'chain_head_hash_mismatch',
      },
    );
    process.stdout.write('PASS managed_access_phase_e_verifier_chain_head_hash_mismatch_fails\n');

    await expectValidationFailure(
      () => new TrustReviewDecision({
        requestId: new mongoose.Types.ObjectId(),
        reviewStatus: PHASE_E_REVIEW_STATUSES[2],
        decisionOutcome: 'approved',
        reviewerIdentity: null,
        decisionTimestamp: new Date('2026-03-28T12:00:00.000Z'),
        internalNotes: '',
        sectorPackageRecommendation: null,
        riskFlags: [],
        trustTier: 'standard',
        reviewReminderAt: null,
      }),
      /decisionOutcome, reviewerIdentity, and decisionTimestamp are required|reviewerIdentity must be a (?:non-empty string|reasonable email-style value)/i,
      'managed_access_phase_e_trust_review_validation_rejects_missing_reviewer',
    );

    await expectValidationFailure(
      () => new DeploymentAssignment({
        requestId: new mongoose.Types.ObjectId(),
        reviewDecisionId: null,
        assignmentStatus: 'assigned',
        deploymentMode: 'shared_hosted_kernel',
        tenantKey: 'northbridgehealth',
        tenantSubdomain: 'northbridgehealth.chatpdm.com',
        requestedSubdomain: 'manual.chatpdm.com',
        subdomainSource: 'derived_from_company_domain',
        collisionSuffix: 0,
        packageVersion: 'core-2026.03',
        sectorTrack: null,
        region: 'uk_primary',
        runtimeIsolationLevel: 'shared_process',
        pm2AppName: null,
        nginxBinding: null,
        assignedByIdentity: 'operator@chatpdm.com',
        assignedAt: new Date('2026-03-28T12:10:00.000Z'),
        assignmentNotes: '',
      }),
      /requestedSubdomain must be omitted/i,
      'managed_access_phase_e_assignment_validation_rejects_non_manual_override',
    );

    await expectValidationFailure(
      () => new InstitutionWorkspace({
        requestId: new mongoose.Types.ObjectId(),
        deploymentAssignmentId: new mongoose.Types.ObjectId(),
        workspaceStatus: 'active',
        organizationName: 'Northbridge Health',
        companyDomain: 'northbridgehealth.org',
        tenantSubdomain: 'northbridgehealth.chatpdm.com',
        deploymentMode: 'shared_hosted_kernel',
        packageVersion: 'core-2026.03',
        verificationMethod: 'dns_txt',
        trustLevel: 'elevated',
        workEmailVerifiedAt: null,
        strongerProofVerifiedAt: new Date('2026-03-28T10:00:00.000Z'),
        supportContactEmail: 'hello@chatpdm.com',
        replayExportAccess: false,
        pilotStatus: 'active',
        upgradePath: 'shared_hosted_kernel',
        activationTimestamp: new Date('2026-03-28T12:20:00.000Z'),
      }),
      /trustLevel is invalid/i,
      'managed_access_phase_e_workspace_validation_rejects_unknown_trust_level',
    );

    await expectValidationFailure(
      () => new ProvisioningEvidenceEvent({
        requestId: new mongoose.Types.ObjectId(),
        sequence: 1,
        hashVersion: MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
        actorIdentity: 'operator@chatpdm.com',
        previousHash: null,
        eventHash: 'd'.repeat(64),
        reviewDecisionId: null,
        deploymentAssignmentId: new mongoose.Types.ObjectId(),
        provisioningJobId: null,
        institutionWorkspaceId: new mongoose.Types.ObjectId(),
        eventType: 'workspace_activation_recorded',
        reviewerIdentity: null,
        decisionTimestamp: null,
        decisionOutcome: null,
        deploymentMode: 'shared_hosted_kernel',
        tenantSubdomain: 'northbridgehealth.chatpdm.com',
        pm2AppName: null,
        nginxBinding: null,
        packageVersion: 'core-2026.03',
        healthCheckResult: 'passing',
        activationTimestamp: new Date('2026-03-28T12:30:00.000Z'),
        provisioningEvidenceHash: null,
        recordedAt: new Date('2026-03-28T12:31:00.000Z'),
        context: 'phase_e_provisioning_protocol',
      }),
      /provisioningEvidenceHash must be present/i,
      'managed_access_phase_e_evidence_validation_requires_hash_on_activation',
    );

    await assert.rejects(
      async () => ProvisioningEvidenceEvent.updateOne(
        { _id: provisioningEvidenceEvent._id },
        { $set: { context: 'mutated_context' } },
      ),
      /append-only/i,
    );
    await assert.rejects(
      async () => {
        provisioningEvidenceEvent.context = 'mutated_context';
        await provisioningEvidenceEvent.save();
      },
      /append-only/i,
    );
    await assert.rejects(
      async () => provisioningEvidenceEvent.deleteOne(),
      /append-only/i,
    );
    process.stdout.write('PASS managed_access_phase_e_evidence_is_append_only\n');
  } finally {
    await disconnectMongo();
    await mongoServer.stop();
    fs.rmSync(MANAGED_ACCESS_ASSURANCE_ANCHOR_DIRECTORY, { recursive: true, force: true });
    fs.rmSync(MANAGED_ACCESS_ASSURANCE_CHECKPOINT_DIRECTORY, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});

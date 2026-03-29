'use strict';

const mongoose = require('mongoose');
const {
  MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
} = require('./config/managed-access-assurance.config');
const {
  PHASE_E_DECISION_OUTCOMES,
  PHASE_E_DEPLOYMENT_MODES,
  PHASE_E_EVIDENCE_EVENT_TYPES,
  PHASE_E_HEALTH_CHECK_RESULTS,
} = require('./phase-e.constants');
const {
  assertPersistableProvisioningEvidenceEventRecord,
} = require('./phase-e.validation');

function applyAppendOnlyGuard(schema) {
  const blockedOperations = [
    'updateOne',
    'updateMany',
    'deleteOne',
    'deleteMany',
    'findOneAndUpdate',
    'findOneAndDelete',
    'findOneAndRemove',
    'replaceOne',
    'findOneAndReplace',
  ];

  for (const operationName of blockedOperations) {
    schema.pre(operationName, function rejectAppendOnlyMutation() {
      throw new Error('Provisioning evidence events are append-only and cannot be mutated.');
    });
  }

  schema.pre('insertMany', function rejectDirectInsertMany() {
    throw new Error(
      'Provisioning evidence events must be appended through the provisioning evidence chain service.',
    );
  });

  schema.pre('deleteOne', { document: true, query: false }, function rejectAppendOnlyDocumentDelete() {
    throw new Error('Provisioning evidence events are append-only and cannot be mutated.');
  });

  schema.pre('save', function rejectAppendOnlyDocumentOverwrite() {
    if (!this.isNew) {
      throw new Error('Provisioning evidence events are append-only and cannot be mutated.');
    }

    if (this.$locals.provisioningEvidenceAppendAuthorized !== true) {
      throw new Error(
        'Provisioning evidence events must be appended through the provisioning evidence chain service.',
      );
    }
  });
}

function buildValidationSnapshot(document) {
  return {
    requestId: document.requestId,
    sequence: document.sequence,
    hashVersion: document.hashVersion,
    actorIdentity: document.actorIdentity,
    previousHash: document.previousHash,
    eventHash: document.eventHash,
    reviewDecisionId: document.reviewDecisionId,
    deploymentAssignmentId: document.deploymentAssignmentId,
    provisioningJobId: document.provisioningJobId,
    institutionWorkspaceId: document.institutionWorkspaceId,
    eventType: document.eventType,
    reviewerIdentity: document.reviewerIdentity,
    decisionTimestamp: document.decisionTimestamp,
    decisionOutcome: document.decisionOutcome,
    deploymentMode: document.deploymentMode,
    tenantSubdomain: document.tenantSubdomain,
    pm2AppName: document.pm2AppName,
    nginxBinding: document.nginxBinding,
    packageVersion: document.packageVersion,
    healthCheckResult: document.healthCheckResult,
    activationTimestamp: document.activationTimestamp,
    provisioningEvidenceHash: document.provisioningEvidenceHash,
    recordedAt: document.recordedAt,
    context: document.context,
  };
}

const provisioningEvidenceEventSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'ChatPdmManagedAccessRequest',
    },
    sequence: {
      type: Number,
      required: true,
    },
    hashVersion: {
      type: Number,
      required: true,
      default: MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
    },
    actorIdentity: {
      type: String,
      required: true,
      trim: true,
    },
    previousHash: {
      type: String,
      default: null,
      trim: true,
    },
    eventHash: {
      type: String,
      default: null,
      trim: true,
    },
    reviewDecisionId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: 'ChatPdmTrustReviewDecision',
    },
    deploymentAssignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: 'ChatPdmDeploymentAssignment',
    },
    provisioningJobId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: 'ChatPdmProvisioningJob',
    },
    institutionWorkspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: 'ChatPdmInstitutionWorkspace',
    },
    eventType: {
      type: String,
      required: true,
      enum: PHASE_E_EVIDENCE_EVENT_TYPES,
      trim: true,
    },
    reviewerIdentity: {
      type: String,
      default: null,
      trim: true,
    },
    decisionTimestamp: {
      type: Date,
      default: null,
    },
    decisionOutcome: {
      type: String,
      default: null,
      enum: [...PHASE_E_DECISION_OUTCOMES, null],
      trim: true,
    },
    deploymentMode: {
      type: String,
      default: null,
      enum: [...PHASE_E_DEPLOYMENT_MODES, null],
      trim: true,
    },
    tenantSubdomain: {
      type: String,
      default: null,
      trim: true,
    },
    pm2AppName: {
      type: String,
      default: null,
      trim: true,
    },
    nginxBinding: {
      type: String,
      default: null,
      trim: true,
    },
    packageVersion: {
      type: String,
      default: null,
      trim: true,
    },
    healthCheckResult: {
      type: String,
      default: null,
      enum: [...PHASE_E_HEALTH_CHECK_RESULTS, null],
      trim: true,
    },
    activationTimestamp: {
      type: Date,
      default: null,
    },
    provisioningEvidenceHash: {
      type: String,
      default: null,
      trim: true,
    },
    recordedAt: {
      type: Date,
      required: true,
    },
    context: {
      type: String,
      required: true,
      trim: true,
      default: 'phase_e_provisioning_protocol',
    },
  },
  {
    strict: 'throw',
    versionKey: false,
  },
);

applyAppendOnlyGuard(provisioningEvidenceEventSchema);

provisioningEvidenceEventSchema.pre('validate', function validateProvisioningEvidenceEvent() {
  assertPersistableProvisioningEvidenceEventRecord(buildValidationSnapshot(this));
});

provisioningEvidenceEventSchema.index(
  { requestId: 1, recordedAt: 1, _id: 1 },
  {
    name: 'provisioning_evidence_event_request_recorded_at',
  },
);

provisioningEvidenceEventSchema.index(
  { provisioningJobId: 1, recordedAt: 1, _id: 1 },
  {
    name: 'provisioning_evidence_event_job_recorded_at',
    partialFilterExpression: {
      provisioningJobId: { $type: 'objectId' },
    },
  },
);

provisioningEvidenceEventSchema.index(
  { eventType: 1, recordedAt: 1, _id: 1 },
  {
    name: 'provisioning_evidence_event_type_recorded_at',
  },
);

provisioningEvidenceEventSchema.index(
  { requestId: 1, sequence: 1 },
  {
    name: 'provisioning_evidence_event_request_sequence_unique',
    unique: true,
  },
);

provisioningEvidenceEventSchema.index(
  { requestId: 1, sequence: -1, _id: 1 },
  {
    name: 'provisioning_evidence_event_request_sequence_desc',
  },
);

provisioningEvidenceEventSchema.index(
  { provisioningEvidenceHash: 1 },
  {
    name: 'provisioning_evidence_event_hash_unique',
    unique: true,
    partialFilterExpression: {
      provisioningEvidenceHash: { $type: 'string' },
    },
  },
);

module.exports = mongoose.models.ChatPdmProvisioningEvidenceEvent
  || mongoose.model('ChatPdmProvisioningEvidenceEvent', provisioningEvidenceEventSchema);

'use strict';

const mongoose = require('mongoose');
const {
  PHASE_E_HEALTH_CHECK_RESULTS,
  PHASE_E_PROVISIONING_JOB_STATUSES,
  PHASE_E_PROVISIONING_JOB_TYPES,
} = require('./phase-e.constants');
const {
  assertPersistableProvisioningJobRecord,
} = require('./phase-e.validation');

function buildValidationSnapshot(document) {
  return {
    requestId: document.requestId,
    deploymentAssignmentId: document.deploymentAssignmentId,
    retryOfJobId: document.retryOfJobId,
    jobType: document.jobType,
    jobStatus: document.jobStatus,
    triggeredByIdentity: document.triggeredByIdentity,
    attemptNumber: document.attemptNumber,
    queuedAt: document.queuedAt,
    startedAt: document.startedAt,
    completedAt: document.completedAt,
    failureCode: document.failureCode,
    failureMessage: document.failureMessage,
    healthCheckResult: document.healthCheckResult,
  };
}

const provisioningJobSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'ChatPdmManagedAccessRequest',
    },
    deploymentAssignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'ChatPdmDeploymentAssignment',
    },
    retryOfJobId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: 'ChatPdmProvisioningJob',
    },
    jobType: {
      type: String,
      required: true,
      enum: PHASE_E_PROVISIONING_JOB_TYPES,
      trim: true,
      default: 'hosted_runtime_provisioning',
    },
    jobStatus: {
      type: String,
      required: true,
      enum: PHASE_E_PROVISIONING_JOB_STATUSES,
      trim: true,
      default: 'queued',
    },
    triggeredByIdentity: {
      type: String,
      required: true,
      trim: true,
    },
    attemptNumber: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    queuedAt: {
      type: Date,
      required: true,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    failureCode: {
      type: String,
      default: null,
      trim: true,
    },
    failureMessage: {
      type: String,
      default: null,
      trim: true,
    },
    healthCheckResult: {
      type: String,
      required: true,
      enum: PHASE_E_HEALTH_CHECK_RESULTS,
      trim: true,
      default: 'not_run',
    },
  },
  {
    strict: 'throw',
    timestamps: true,
    versionKey: false,
  },
);

provisioningJobSchema.pre('validate', function validateProvisioningJob() {
  assertPersistableProvisioningJobRecord(buildValidationSnapshot(this));
});

provisioningJobSchema.index(
  { requestId: 1, queuedAt: -1, _id: 1 },
  {
    name: 'provisioning_job_request_queued_at',
  },
);

provisioningJobSchema.index(
  { deploymentAssignmentId: 1, queuedAt: -1, _id: 1 },
  {
    name: 'provisioning_job_assignment_queued_at',
  },
);

provisioningJobSchema.index(
  { jobStatus: 1, queuedAt: 1, _id: 1 },
  {
    name: 'provisioning_job_status_queued_at',
  },
);

module.exports = mongoose.models.ChatPdmProvisioningJob
  || mongoose.model('ChatPdmProvisioningJob', provisioningJobSchema);

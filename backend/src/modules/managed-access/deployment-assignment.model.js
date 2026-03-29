'use strict';

const mongoose = require('mongoose');
const {
  PHASE_E_ASSIGNMENT_STATUSES,
  PHASE_E_DEPLOYMENT_MODES,
  PHASE_E_RUNTIME_ISOLATION_LEVELS,
  PHASE_E_SUBDOMAIN_SOURCES,
} = require('./phase-e.constants');
const {
  assertPersistableDeploymentAssignmentRecord,
} = require('./phase-e.validation');

function buildValidationSnapshot(document) {
  return {
    requestId: document.requestId,
    reviewDecisionId: document.reviewDecisionId,
    assignmentStatus: document.assignmentStatus,
    deploymentMode: document.deploymentMode,
    tenantKey: document.tenantKey,
    tenantSubdomain: document.tenantSubdomain,
    requestedSubdomain: document.requestedSubdomain,
    subdomainSource: document.subdomainSource,
    collisionSuffix: document.collisionSuffix,
    packageVersion: document.packageVersion,
    sectorTrack: document.sectorTrack,
    region: document.region,
    runtimeIsolationLevel: document.runtimeIsolationLevel,
    pm2AppName: document.pm2AppName,
    nginxBinding: document.nginxBinding,
    assignedByIdentity: document.assignedByIdentity,
    assignedAt: document.assignedAt,
    assignmentNotes: document.assignmentNotes,
  };
}

const deploymentAssignmentSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      ref: 'ChatPdmManagedAccessRequest',
    },
    reviewDecisionId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: 'ChatPdmTrustReviewDecision',
    },
    assignmentStatus: {
      type: String,
      required: true,
      enum: PHASE_E_ASSIGNMENT_STATUSES,
      trim: true,
      default: 'draft',
    },
    deploymentMode: {
      type: String,
      required: true,
      enum: PHASE_E_DEPLOYMENT_MODES,
      trim: true,
      default: 'shared_hosted_kernel',
    },
    tenantKey: {
      type: String,
      required: true,
      trim: true,
    },
    tenantSubdomain: {
      type: String,
      required: true,
      trim: true,
    },
    requestedSubdomain: {
      type: String,
      default: null,
      trim: true,
    },
    subdomainSource: {
      type: String,
      required: true,
      enum: PHASE_E_SUBDOMAIN_SOURCES,
      trim: true,
    },
    collisionSuffix: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    packageVersion: {
      type: String,
      required: true,
      trim: true,
    },
    sectorTrack: {
      type: String,
      default: null,
      trim: true,
    },
    region: {
      type: String,
      required: true,
      trim: true,
    },
    runtimeIsolationLevel: {
      type: String,
      required: true,
      enum: PHASE_E_RUNTIME_ISOLATION_LEVELS,
      trim: true,
      default: 'shared_process',
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
    assignedByIdentity: {
      type: String,
      required: true,
      trim: true,
    },
    assignedAt: {
      type: Date,
      required: true,
    },
    assignmentNotes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    strict: 'throw',
    timestamps: true,
    versionKey: false,
  },
);

deploymentAssignmentSchema.pre('validate', function validateDeploymentAssignment() {
  assertPersistableDeploymentAssignmentRecord(buildValidationSnapshot(this));
});

deploymentAssignmentSchema.index(
  { tenantKey: 1, assignedAt: -1, _id: 1 },
  {
    name: 'deployment_assignment_tenant_key_assigned_at',
  },
);

deploymentAssignmentSchema.index(
  { assignmentStatus: 1, assignedAt: -1, _id: 1 },
  {
    name: 'deployment_assignment_status_assigned_at',
  },
);

deploymentAssignmentSchema.index(
  { deploymentMode: 1, assignedAt: -1, _id: 1 },
  {
    name: 'deployment_assignment_mode_assigned_at',
  },
);

deploymentAssignmentSchema.index(
  { sectorTrack: 1, assignedAt: -1, _id: 1 },
  {
    name: 'deployment_assignment_sector_track_assigned_at',
    partialFilterExpression: {
      sectorTrack: { $type: 'string' },
    },
  },
);

deploymentAssignmentSchema.index(
  { tenantSubdomain: 1 },
  {
    name: 'deployment_assignment_tenant_subdomain_unique',
    unique: true,
  },
);

deploymentAssignmentSchema.index(
  { pm2AppName: 1 },
  {
    name: 'deployment_assignment_pm2_app_name_unique',
    unique: true,
    partialFilterExpression: {
      pm2AppName: { $type: 'string' },
    },
  },
);

module.exports = mongoose.models.ChatPdmDeploymentAssignment
  || mongoose.model('ChatPdmDeploymentAssignment', deploymentAssignmentSchema);

'use strict';

const mongoose = require('mongoose');
const {
  MANAGED_ACCESS_TRUST_LEVELS,
  MANAGED_ACCESS_VERIFICATION_METHODS,
} = require('./constants');
const {
  PHASE_E_DEPLOYMENT_MODES,
  PHASE_E_PILOT_STATUSES,
  PHASE_E_UPGRADE_PATHS,
  PHASE_E_WORKSPACE_STATUSES,
} = require('./phase-e.constants');
const {
  assertPersistableInstitutionWorkspaceRecord,
} = require('./phase-e.validation');

function buildValidationSnapshot(document) {
  return {
    requestId: document.requestId,
    deploymentAssignmentId: document.deploymentAssignmentId,
    workspaceStatus: document.workspaceStatus,
    organizationName: document.organizationName,
    companyDomain: document.companyDomain,
    tenantSubdomain: document.tenantSubdomain,
    deploymentMode: document.deploymentMode,
    packageVersion: document.packageVersion,
    verificationMethod: document.verificationMethod,
    trustLevel: document.trustLevel,
    workEmailVerifiedAt: document.workEmailVerifiedAt,
    strongerProofVerifiedAt: document.strongerProofVerifiedAt,
    supportContactEmail: document.supportContactEmail,
    replayExportAccess: document.replayExportAccess,
    pilotStatus: document.pilotStatus,
    upgradePath: document.upgradePath,
    activationTimestamp: document.activationTimestamp,
  };
}

const institutionWorkspaceSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      ref: 'ChatPdmManagedAccessRequest',
    },
    deploymentAssignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      ref: 'ChatPdmDeploymentAssignment',
    },
    workspaceStatus: {
      type: String,
      required: true,
      enum: PHASE_E_WORKSPACE_STATUSES,
      trim: true,
      default: 'pending_activation',
    },
    organizationName: {
      type: String,
      required: true,
      trim: true,
    },
    companyDomain: {
      type: String,
      required: true,
      trim: true,
    },
    tenantSubdomain: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    deploymentMode: {
      type: String,
      required: true,
      enum: PHASE_E_DEPLOYMENT_MODES,
      trim: true,
    },
    packageVersion: {
      type: String,
      required: true,
      trim: true,
    },
    verificationMethod: {
      type: String,
      required: true,
      enum: MANAGED_ACCESS_VERIFICATION_METHODS,
      trim: true,
    },
    trustLevel: {
      type: String,
      required: true,
      enum: MANAGED_ACCESS_TRUST_LEVELS,
      trim: true,
    },
    workEmailVerifiedAt: {
      type: Date,
      default: null,
    },
    strongerProofVerifiedAt: {
      type: Date,
      default: null,
    },
    supportContactEmail: {
      type: String,
      required: true,
      trim: true,
    },
    replayExportAccess: {
      type: Boolean,
      required: true,
      default: false,
    },
    pilotStatus: {
      type: String,
      required: true,
      enum: PHASE_E_PILOT_STATUSES,
      trim: true,
      default: 'pending',
    },
    upgradePath: {
      type: String,
      required: true,
      enum: PHASE_E_UPGRADE_PATHS,
      trim: true,
      default: 'shared_hosted_kernel',
    },
    activationTimestamp: {
      type: Date,
      default: null,
    },
  },
  {
    strict: 'throw',
    timestamps: true,
    versionKey: false,
  },
);

institutionWorkspaceSchema.pre('validate', function validateInstitutionWorkspace() {
  assertPersistableInstitutionWorkspaceRecord(buildValidationSnapshot(this));
});

institutionWorkspaceSchema.index(
  { workspaceStatus: 1, updatedAt: -1, _id: 1 },
  {
    name: 'institution_workspace_status_updated_at',
  },
);

institutionWorkspaceSchema.index(
  { pilotStatus: 1, updatedAt: -1, _id: 1 },
  {
    name: 'institution_workspace_pilot_status_updated_at',
  },
);

institutionWorkspaceSchema.index(
  { trustLevel: 1, activationTimestamp: -1, _id: 1 },
  {
    name: 'institution_workspace_trust_level_activation',
  },
);

institutionWorkspaceSchema.index(
  { companyDomain: 1, updatedAt: -1, _id: 1 },
  {
    name: 'institution_workspace_company_domain_updated_at',
  },
);

module.exports = mongoose.models.ChatPdmInstitutionWorkspace
  || mongoose.model('ChatPdmInstitutionWorkspace', institutionWorkspaceSchema);

'use strict';

const mongoose = require('mongoose');
const {
  MANAGED_ACCESS_DEPLOYMENT_PREFERENCES,
  MANAGED_ACCESS_INDUSTRIES,
  MANAGED_ACCESS_STATUSES,
  MANAGED_ACCESS_TRUST_LEVELS,
  MANAGED_ACCESS_VERIFICATION_METHODS,
  MANAGED_ACCESS_VERIFICATION_STATES,
} = require('./constants');

const managedAccessSchema = new mongoose.Schema(
  {
    verificationMethod: {
      type: String,
      required: true,
      enum: MANAGED_ACCESS_VERIFICATION_METHODS,
      trim: true,
    },
    institutionName: {
      type: String,
      required: true,
      trim: true,
    },
    companyDomain: {
      type: String,
      required: true,
      trim: true,
    },
    industry: {
      type: String,
      required: true,
      enum: MANAGED_ACCESS_INDUSTRIES,
      trim: true,
    },
    deploymentPreference: {
      type: String,
      required: true,
      enum: MANAGED_ACCESS_DEPLOYMENT_PREFERENCES,
      trim: true,
    },
    workEmail: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(MANAGED_ACCESS_STATUSES),
      trim: true,
    },
    verificationState: {
      type: String,
      required: true,
      enum: MANAGED_ACCESS_VERIFICATION_STATES,
      trim: true,
    },
    trustLevel: {
      type: String,
      required: true,
      enum: MANAGED_ACCESS_TRUST_LEVELS,
      trim: true,
    },
    verificationTokenHash: {
      type: String,
      default: null,
      trim: true,
    },
    verificationTokenExpiresAt: {
      type: Date,
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    challengeType: {
      type: String,
      enum: ['dns_txt', 'website_file', null],
      default: null,
      trim: true,
    },
    challengeIssuedAt: {
      type: Date,
      default: null,
    },
    challengeExpiresAt: {
      type: Date,
      default: null,
    },
    challengeLastCheckedAt: {
      type: Date,
      default: null,
    },
    challengeFailureReason: {
      type: String,
      default: null,
      trim: true,
    },
    dnsTxtRecordName: {
      type: String,
      default: null,
      trim: true,
    },
    dnsTxtRecordValue: {
      type: String,
      default: null,
      trim: true,
    },
    websiteFileName: {
      type: String,
      default: null,
      trim: true,
    },
    websiteFilePath: {
      type: String,
      default: null,
      trim: true,
    },
    websiteFileContent: {
      type: String,
      default: null,
      trim: true,
    },
    websiteFileUrl: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    strict: 'throw',
    timestamps: true,
    versionKey: false,
  },
);

managedAccessSchema.index(
  { verificationTokenHash: 1 },
  {
    name: 'managed_access_verification_token_hash',
    partialFilterExpression: {
      verificationTokenHash: { $type: 'string' },
    },
  },
);

managedAccessSchema.index(
  { workEmail: 1, createdAt: -1 },
  {
    name: 'managed_access_work_email_created_at',
  },
);

managedAccessSchema.index(
  { status: 1, verificationMethod: 1, challengeExpiresAt: 1 },
  {
    name: 'managed_access_status_method_challenge_expiry',
  },
);

managedAccessSchema.index(
  { status: 1, trustLevel: 1, industry: 1, verificationMethod: 1, createdAt: -1, _id: 1 },
  {
    name: 'managed_access_review_queue_projection',
  },
);

module.exports = mongoose.models.ChatPdmManagedAccessRequest
  || mongoose.model('ChatPdmManagedAccessRequest', managedAccessSchema);

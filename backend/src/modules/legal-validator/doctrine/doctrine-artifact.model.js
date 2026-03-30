'use strict';

const mongoose = require('mongoose');
const legalValidatorSchemas = require('../shared/legal-validator.schemas');

const interpretationRegimeSchema = new mongoose.Schema(
  {
    regimeId: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    hierarchy: {
      type: [String],
      default: [],
    },
  },
  {
    _id: false,
    strict: 'throw',
  },
);

const doctrineManifestSchema = new mongoose.Schema(
  {
    packageId: {
      type: String,
      required: true,
      trim: true,
    },
    jurisdiction: {
      type: String,
      required: true,
      trim: true,
    },
    practiceArea: {
      type: String,
      required: true,
      trim: true,
    },
    sourceClasses: {
      type: [String],
      default: [],
    },
    interpretationRegime: {
      type: interpretationRegimeSchema,
      required: true,
    },
    coreConceptsReferenced: {
      type: [String],
      default: [],
    },
    packageConceptsDeclared: {
      type: [String],
      default: [],
    },
    authorityIds: {
      type: [String],
      default: [],
    },
    mappingRuleIds: {
      type: [String],
      default: [],
    },
    validationRuleIds: {
      type: [String],
      default: [],
    },
  },
  {
    _id: false,
    strict: 'throw',
  },
);

const doctrineGovernanceSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: legalValidatorSchemas.doctrineGovernanceStatuses,
      required: true,
      index: true,
    },
    reviewedBy: {
      type: String,
      default: null,
      trim: true,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    approvedBy: {
      type: String,
      default: null,
      trim: true,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    lockedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
    strict: 'throw',
  },
);

const doctrineReplaySchema = new mongoose.Schema(
  {
    isRetained: {
      type: Boolean,
      required: true,
      default: true,
    },
    retainedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
    strict: 'throw',
  },
);

const doctrineArtifactSchema = new mongoose.Schema(
  {
    artifactId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    packageId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    version: {
      type: String,
      required: true,
      trim: true,
    },
    hash: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    storageKey: {
      type: String,
      required: true,
      trim: true,
    },
    manifest: {
      type: doctrineManifestSchema,
      required: true,
    },
    governance: {
      type: doctrineGovernanceSchema,
      required: true,
    },
    replay: {
      type: doctrineReplaySchema,
      required: true,
      default: () => ({}),
    },
    createdBy: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    collection: 'doctrineArtifacts',
    strict: 'throw',
    timestamps: true,
    versionKey: false,
  },
);

doctrineArtifactSchema.index({ packageId: 1, version: 1 }, { unique: true });

doctrineArtifactSchema.methods.isRuntimeEligibleForValidation = function isRuntimeEligibleForValidation() {
  return legalValidatorSchemas.isRuntimeEligibleDoctrineStatus(this.governance?.status);
};

doctrineArtifactSchema.methods.assertRuntimeEligibleForValidation = function assertRuntimeEligibleForValidation() {
  if (!this.isRuntimeEligibleForValidation()) {
    throw new Error('Only approved or locked doctrine artifacts may be used for validation.');
  }
};

doctrineArtifactSchema.statics.isRuntimeEligibleStatus = function isRuntimeEligibleStatus(status) {
  return legalValidatorSchemas.isRuntimeEligibleDoctrineStatus(status);
};

doctrineArtifactSchema.pre('validate', function validateDoctrineArtifact() {
  const manifestValidation = legalValidatorSchemas.validateDoctrineManifest(this.manifest);

  if (!manifestValidation.ok) {
    this.invalidate('manifest', manifestValidation.message);
  }

  const governanceValidation = legalValidatorSchemas.validateDoctrineGovernance(this.governance);

  if (!governanceValidation.ok) {
    this.invalidate('governance', governanceValidation.message);
  }
});

module.exports = mongoose.models.ChatPdmLegalValidatorDoctrineArtifact
  || mongoose.model('ChatPdmLegalValidatorDoctrineArtifact', doctrineArtifactSchema);

'use strict';

const mongoose = require('mongoose');
const legalValidatorSchemas = require('../shared/legal-validator.schemas');

const validationTraceManifestSchema = new mongoose.Schema(
  {
    conceptIds: {
      type: [String],
      default: [],
    },
    authorityIds: {
      type: [String],
      default: [],
    },
  },
  {
    _id: false,
    strict: 'throw',
  },
);

const validationTraceReplayContextSchema = new mongoose.Schema(
  {
    sourceDocumentId: {
      type: String,
      default: null,
      trim: true,
    },
    sourceSegmentIds: {
      type: [String],
      default: [],
    },
    argumentUnitIds: {
      type: [String],
      default: [],
    },
    authorityInput: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    resolverDecision: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    validationDecision: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    authorityId: {
      type: String,
      default: null,
      trim: true,
    },
    authorityCitation: {
      type: String,
      default: null,
      trim: true,
    },
    mappingId: {
      type: String,
      default: null,
      trim: true,
    },
    mappingType: {
      type: String,
      default: null,
      trim: true,
    },
    matchBasis: {
      type: String,
      default: null,
      trim: true,
    },
    conceptId: {
      type: String,
      default: null,
      trim: true,
    },
    overrideId: {
      type: String,
      default: null,
      trim: true,
    },
    synonymTerm: {
      type: String,
      default: null,
      trim: true,
    },
    manualOverrideReason: {
      type: String,
      default: null,
      trim: true,
    },
    doctrineArtifactId: {
      type: String,
      default: null,
      trim: true,
    },
    doctrineHash: {
      type: String,
      default: null,
      trim: true,
    },
    matterId: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    _id: false,
    strict: 'throw',
  },
);

const validationTraceSchema = new mongoose.Schema(
  {
    sourceAnchors: {
      type: [String],
      default: [],
      required: true,
    },
    interpretationUsed: {
      type: Boolean,
      required: true,
      default: false,
    },
    interpretationRegimeId: {
      type: String,
      default: null,
      trim: true,
    },
    manualOverrideUsed: {
      type: Boolean,
      required: true,
      default: false,
    },
    mappingRuleIds: {
      type: [String],
      default: [],
      required: true,
    },
    validationRuleIds: {
      type: [String],
      default: [],
      required: true,
    },
    loadedManifest: {
      type: validationTraceManifestSchema,
      required: true,
      default: () => ({}),
    },
    replayContext: {
      type: validationTraceReplayContextSchema,
      required: true,
      default: () => ({}),
    },
    overrideIds: {
      type: [String],
      default: [],
    },
    notes: {
      type: [String],
      default: [],
    },
  },
  {
    _id: false,
    strict: 'throw',
  },
);

const validationRunSchema = new mongoose.Schema(
  {
    validationRunId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    matterId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    doctrineArtifactId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    doctrineHash: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    resolverVersion: {
      type: String,
      required: true,
      trim: true,
    },
    inputHash: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    result: {
      type: String,
      enum: legalValidatorSchemas.validationResults,
      required: true,
      index: true,
    },
    failureCodes: {
      type: [String],
      default: [],
      index: true,
    },
    trace: {
      type: validationTraceSchema,
      required: true,
      default: () => ({}),
    },
  },
  {
    collection: 'validationRuns',
    strict: 'throw',
    timestamps: true,
    versionKey: false,
  },
);

validationRunSchema.pre('validate', function validateValidationRun() {
  // Successful runs must carry enough trace context for replay and explanation.
  const traceValidation = legalValidatorSchemas.validateValidationRunTrace(this);

  if (!traceValidation.ok) {
    this.invalidate('trace', traceValidation.message);
  }
});

module.exports = mongoose.models.ChatPdmLegalValidatorValidationRun
  || mongoose.model('ChatPdmLegalValidatorValidationRun', validationRunSchema);

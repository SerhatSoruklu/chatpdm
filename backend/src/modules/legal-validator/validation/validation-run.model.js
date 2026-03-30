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

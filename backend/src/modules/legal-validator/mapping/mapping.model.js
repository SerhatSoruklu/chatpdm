'use strict';

const mongoose = require('mongoose');
const legalValidatorSchemas = require('../shared/legal-validator.schemas');
const ArgumentUnit = require('../arguments/argument-unit.model');

const mappingSchema = new mongoose.Schema(
  {
    mappingId: {
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
    argumentUnitId: {
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
    conceptId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    authorityId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    overrideId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    mappingType: {
      type: String,
      enum: ['concept', 'authority', 'combined'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: legalValidatorSchemas.mappingStatuses,
      required: true,
      index: true,
    },
    matchBasis: {
      type: String,
      default: null,
      trim: true,
      validate: {
        validator(value) {
          return value == null || legalValidatorSchemas.mappingMatchBases.includes(value);
        },
        message: 'Mapping matchBasis is invalid.',
      },
    },
    resolverRuleId: {
      type: String,
      default: null,
      trim: true,
    },
    failureCode: {
      type: String,
      default: null,
      index: true,
      trim: true,
    },
    failureReason: {
      type: String,
      default: null,
    },
  },
  {
    collection: 'mappings',
    strict: 'throw',
    timestamps: true,
    versionKey: false,
  },
);

mappingSchema.index({ matterId: 1, argumentUnitId: 1, mappingType: 1 }, { unique: true });

mappingSchema.pre('validate', async function validateMapping() {
  const stateValidation = legalValidatorSchemas.validateMappingState(this);

  if (!stateValidation.ok) {
    this.invalidate('status', stateValidation.message);
  }

  // Successful mappings are the deterministic success path and cannot rest on blocked input state.
  if (this.status === 'success') {
    const argumentUnit = await ArgumentUnit.findOne({ argumentUnitId: this.argumentUnitId })
      .select('argumentUnitId reviewState admissibility')
      .lean()
      .exec();

    const blocker = ArgumentUnit.getDeterministicSuccessPathBlocker(argumentUnit);

    if (blocker) {
      this.invalidate('argumentUnitId', blocker);
    }
  }
});

module.exports = mongoose.models.ChatPdmLegalValidatorMapping
  || mongoose.model('ChatPdmLegalValidatorMapping', mappingSchema);

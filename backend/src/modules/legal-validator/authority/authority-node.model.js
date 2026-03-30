'use strict';

const mongoose = require('mongoose');
const legalValidatorSchemas = require('../shared/legal-validator.schemas');

const authorityAttributionSchema = new mongoose.Schema(
  {
    interpretationRegimeId: {
      type: String,
      required: true,
      trim: true,
    },
    sourcePath: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
    strict: 'throw',
  },
);

const authorityNodeSchema = new mongoose.Schema(
  {
    authorityId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    doctrineArtifactId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    authorityType: {
      type: String,
      enum: [
        'statute_section',
        'regulation_clause',
        'contract_clause',
        'case_holding',
        'policy_clause',
      ],
      required: true,
      index: true,
    },
    sourceClass: {
      type: String,
      required: true,
      trim: true,
    },
    institution: {
      type: String,
      required: true,
      trim: true,
    },
    citation: {
      type: String,
      required: true,
      trim: true,
    },
    jurisdiction: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    text: {
      type: String,
      required: true,
    },
    effectiveDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      default: null,
      index: true,
    },
    precedentialWeight: {
      type: String,
      enum: ['binding', 'persuasive', 'informational', 'not_applicable'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'superseded', 'inactive'],
      required: true,
      index: true,
    },
    attribution: {
      type: authorityAttributionSchema,
      required: true,
    },
  },
  {
    collection: 'authorityNodes',
    strict: 'throw',
    timestamps: true,
    versionKey: false,
  },
);

authorityNodeSchema.index({ doctrineArtifactId: 1, citation: 1 }, { unique: true });

authorityNodeSchema.methods.usesDeclaredInterpretationRegime = function usesDeclaredInterpretationRegime(doctrineArtifact) {
  return legalValidatorSchemas.matchesDoctrineInterpretationRegimeId(
    doctrineArtifact?.manifest,
    this.attribution?.interpretationRegimeId,
  );
};

authorityNodeSchema.pre('validate', function validateAuthorityNode() {
  const attributionValidation = legalValidatorSchemas.validateAuthorityAttribution(this.attribution);

  if (!attributionValidation.ok) {
    this.invalidate('attribution', attributionValidation.message);
  }
});

module.exports = mongoose.models.ChatPdmLegalValidatorAuthorityNode
  || mongoose.model('ChatPdmLegalValidatorAuthorityNode', authorityNodeSchema);

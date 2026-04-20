'use strict';

const mongoose = require('mongoose');
const legalValidatorSchemas = require('../shared/legal-validator.schemas');
const ArgumentUnit = require('../arguments/argument-unit.model');
const OverrideRecord = require('../overrides/override-record.model');
const { loadConceptSet } = require('../../concepts/concept-loader');
const { deriveRoutingText, normalizeQuery } = require('../../concepts/normalizer');

let cachedSynonymIndex = null;

function pushCandidate(map, key, concept) {
  if (!map.has(key)) {
    map.set(key, []);
  }

  map.get(key).push(concept);
}

function loadSynonymIndex() {
  if (cachedSynonymIndex) {
    return cachedSynonymIndex;
  }

  const liveConcepts = loadConceptSet();
  const liveConceptsById = new Map(liveConcepts.map((concept) => [concept.conceptId, concept]));
  const governedSynonyms = new Map();

  for (const concept of liveConcepts) {
    const seen = new Set();

    for (const synonym of [...concept.aliases, ...concept.normalizedAliases]) {
      const synonymKey = deriveRoutingText(normalizeQuery(synonym));

      if (seen.has(synonymKey)) {
        continue;
      }

      seen.add(synonymKey);
      pushCandidate(governedSynonyms, synonymKey, concept);
    }
  }

  cachedSynonymIndex = Object.freeze({
    liveConceptsById,
    governedSynonyms,
  });

  return cachedSynonymIndex;
}

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
    manualOverrideReason: {
      type: String,
      default: null,
      trim: true,
    },
    synonymTerm: {
      type: String,
      default: null,
      trim: true,
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

    if (this.matchBasis === 'exact_synonym') {
      if (!legalValidatorSchemas.isNonEmptyTrimmedString(this.synonymTerm)) {
        this.invalidate('synonymTerm', 'Exact synonym mappings require synonymTerm.');
      } else {
        const synonymIndex = loadSynonymIndex();
        const concept = synonymIndex.liveConceptsById.get(this.conceptId);

        if (!concept) {
          this.invalidate('synonymTerm', `Exact synonym mappings require a live conceptId, received ${this.conceptId}.`);
        } else {
        const synonymKey = deriveRoutingText(normalizeQuery(this.synonymTerm));
        const candidates = synonymIndex.governedSynonyms.get(synonymKey) || [];

        if (candidates.length === 0) {
          this.invalidate('synonymTerm', `Synonym "${this.synonymTerm}" is not governed by the active concept registry.`);
        } else if (candidates.length > 1) {
          this.invalidate('synonymTerm', `Synonym "${this.synonymTerm}" is shared by multiple live concepts.`);
        } else if (candidates[0].conceptId !== this.conceptId) {
          this.invalidate('synonymTerm', `Synonym "${this.synonymTerm}" is governed by conceptId=${candidates[0].conceptId}, not conceptId=${this.conceptId}.`);
        }
        }
      }
    }

    if (this.matchBasis === 'manual_override') {
      const overrideCheck = await OverrideRecord.findApprovedMappingOverride(this.overrideId, {
        matterId: this.matterId,
        argumentUnitId: this.argumentUnitId,
        mappingId: this.mappingId,
      });

      if (overrideCheck.blocker) {
        this.invalidate('overrideId', overrideCheck.blocker.reason);
      }
    }
  }
});

module.exports = mongoose.models.ChatPdmLegalValidatorMapping
  || mongoose.model('ChatPdmLegalValidatorMapping', mappingSchema);

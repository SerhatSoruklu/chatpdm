'use strict';

const Matter = require('./matter.model');
const SourceDocument = require('../sources/source-document.model');
const {
  validateMatterInput,
} = require('../shared/legal-validator-runtime.contract');

const SERVICE_NAME = 'matter-intake.service';
const OWNED_FAILURE_CODES = new Set([
  'MATTER_CONTRACT_VIOLATION',
  'SOURCE_DOCUMENT_LINKAGE_VIOLATION',
]);

function buildTerminalResult({ failureCode, reason, extras = {} }) {
  if (!OWNED_FAILURE_CODES.has(failureCode)) {
    throw new Error(`${SERVICE_NAME} cannot emit unowned failure code ${failureCode}.`);
  }

  return {
    ok: false,
    terminal: true,
    result: 'invalid',
    failureCode,
    reason,
    service: SERVICE_NAME,
    ...extras,
  };
}

function compareMatterValues(existingMatter, normalizedMatter) {
  const fields = ['matterId', 'title', 'jurisdiction', 'practiceArea', 'status', 'createdBy'];

  for (const field of fields) {
    if (existingMatter[field] !== normalizedMatter[field]) {
      return `Matter ${normalizedMatter.matterId} already exists with a different ${field}.`;
    }
  }

  return null;
}

async function loadLinkedSourceDocuments(matterId, sourceDocumentIds = []) {
  const query = {
    matterId,
  };

  if (sourceDocumentIds.length > 0) {
    query.sourceDocumentId = { $in: sourceDocumentIds };
  }

  const documents = await SourceDocument.find(query)
    .sort({ documentId: 1 })
    .lean()
    .exec();

  const linkedIds = documents.map((document) => document.sourceDocumentId);

  if (sourceDocumentIds.length > 0) {
    const missingIds = sourceDocumentIds.filter((sourceDocumentId) => !linkedIds.includes(sourceDocumentId));

    if (missingIds.length > 0) {
      return buildTerminalResult({
        failureCode: 'SOURCE_DOCUMENT_LINKAGE_VIOLATION',
        reason: `Matter ${matterId} is not linked to sourceDocumentId(s): ${missingIds.join(', ')}.`,
        extras: {
          matterId,
        },
      });
    }
  }

  return {
    ok: true,
    terminal: false,
    sourceDocuments: documents,
    sourceDocumentIds: linkedIds,
  };
}

async function upsertMatterForIntake({ matter, sourceDocumentIds = [] } = {}) {
  const validation = validateMatterInput(matter);

  if (validation.kind !== 'ok') {
    return buildTerminalResult({
      failureCode: 'MATTER_CONTRACT_VIOLATION',
      reason: validation.message,
    });
  }

  if (validation.matter.status === 'closed') {
    return buildTerminalResult({
      failureCode: 'MATTER_CONTRACT_VIOLATION',
      reason: `Matter ${validation.matter.matterId} is closed and cannot be bound for validator intake.`,
    });
  }

  const existingMatter = await Matter.findOne({ matterId: validation.matter.matterId }).exec();

  if (existingMatter) {
    const comparisonError = compareMatterValues(existingMatter, validation.matter);

    if (comparisonError) {
      return buildTerminalResult({
        failureCode: 'MATTER_CONTRACT_VIOLATION',
        reason: comparisonError,
        extras: {
          matterId: existingMatter.matterId,
        },
      });
    }
  }

  const matterRecord = existingMatter || new Matter(validation.matter);

  if (!existingMatter) {
    await matterRecord.save();
  }

  const linkageResult = await loadLinkedSourceDocuments(matterRecord.matterId, sourceDocumentIds);

  if (linkageResult.terminal) {
    return linkageResult;
  }

  return {
    ok: true,
    terminal: false,
    service: SERVICE_NAME,
    matterMode: existingMatter ? 'bound' : 'created',
    matter: matterRecord.toObject({ virtuals: true }),
    sourceDocumentIds: linkageResult.sourceDocumentIds,
    sourceDocumentCount: linkageResult.sourceDocumentIds.length,
  };
}

module.exports = {
  SERVICE_NAME,
  OWNED_FAILURE_CODES,
  upsertMatterForIntake,
  buildTerminalResult,
};

'use strict';

const SourceDocument = require('../sources/source-document.model');
const SourceSegment = require('../sources/source-segment.model');
const ArgumentUnit = require('./argument-unit.model');

const SERVICE_NAME = 'argument-extraction.service';
const EXTRACTION_CONTRACT_VERSION = 'argument-extraction-v1';
const EXTRACTION_METHOD = 'machine_assisted';
const DEFAULT_REVIEW_STATE = 'auto_accepted';
const DEFAULT_ADMISSIBILITY = 'admissible';
const SOURCE_ANCHOR_PATTERN = /^.+@[a-f0-9]{12}#p\d+\.s\d+$/;
const SOURCE_SEGMENT_ID_PATTERN = /^.+:[a-f0-9]{12}:p\d+:s\d+$/;
const OWNED_FAILURE_CODES = new Set([
  'SOURCE_DOCUMENT_NOT_FOUND',
  'SOURCE_SEGMENTS_NOT_FOUND',
  'NO_ARGUMENT_CANDIDATES',
  'MALFORMED_ARGUMENT_EXTRACTION_CANDIDATE',
  'ARGUMENT_EXTRACTION_CONFLICT',
  'ARGUMENT_EXTRACTION_RUNTIME_FAILURE',
]);

function buildTerminalResult({ failureCode, reason, result = 'invalid', extras = {} }) {
  if (!OWNED_FAILURE_CODES.has(failureCode)) {
    throw new Error(`${SERVICE_NAME} cannot emit unowned failure code ${failureCode}.`);
  }

  return {
    ok: false,
    terminal: true,
    result,
    failureCode,
    reason,
    service: SERVICE_NAME,
    ...extras,
  };
}

function normalizeWhitespace(text) {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function isNonEmptyTrimmedString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function inferUnitType(text, sectionLabel = null) {
  const haystack = `${sectionLabel || ''}\n${text}`.toLowerCase();

  if (/\b(issue|issues)\b/.test(haystack)) {
    return 'issue_statement';
  }

  if (/\b(conclusion|therefore|thus|consequently)\b/.test(haystack)) {
    return 'conclusion';
  }

  if (/\b(exception|unless|however|but)\b/.test(haystack)) {
    return 'exception_claim';
  }

  if (/\b(rebuttal|rebut|counter)\b/.test(haystack)) {
    return 'rebuttal';
  }

  if (/\b(rule|statute|case law|authority|law)\b/.test(haystack)) {
    return 'legal_rule';
  }

  if (/\b(fact|factual|facts)\b/.test(haystack)) {
    return 'factual_assertion';
  }

  return 'application_step';
}

function inferSpeakerRole(text, sectionLabel = null) {
  const haystack = `${sectionLabel || ''}\n${text}`.toLowerCase();

  if (/\bclaimant\b/.test(haystack)) {
    return 'claimant';
  }

  if (/\bdefendant\b/.test(haystack)) {
    return 'defendant';
  }

  if (/\bcourt\b/.test(haystack)) {
    return 'court';
  }

  return 'unknown';
}

function inferPositionSide(speakerRole) {
  if (speakerRole === 'claimant' || speakerRole === 'defendant') {
    return speakerRole;
  }

  return 'neutral';
}

function buildArgumentUnitId(sourceDocument, sourceSegments) {
  const fingerprint = sourceDocument.contentHash.slice(0, 12);
  const primarySequence = sourceSegments[0]?.sequence || 1;

  return `argument-unit:${sourceDocument.documentId}:${fingerprint}:s${primarySequence}`;
}

function buildExtractionText(sourceSegments) {
  return sourceSegments
    .map((segment) => normalizeWhitespace(segment.text))
    .filter((text) => text.length > 0)
    .join('\n\n');
}

function validateExtractionSegments(sourceDocument, sourceSegments) {
  if (!Array.isArray(sourceSegments) || sourceSegments.length === 0) {
    return {
      failureCode: 'SOURCE_SEGMENTS_NOT_FOUND',
      reason: `No SourceSegment records were available for SourceDocument ${sourceDocument.sourceDocumentId}.`,
    };
  }

  const documentMismatch = sourceSegments.find((segment) =>
    segment.sourceDocumentId !== sourceDocument.sourceDocumentId
    || segment.matterId !== sourceDocument.matterId
    || segment.documentId !== sourceDocument.documentId);

  if (documentMismatch) {
    return {
      failureCode: 'MALFORMED_ARGUMENT_EXTRACTION_CANDIDATE',
      reason: `SourceSegment ${documentMismatch.sourceSegmentId} does not match SourceDocument ${sourceDocument.sourceDocumentId}.`,
    };
  }

  return null;
}

function validateSourceSegmentArtifacts(sourceDocument, sourceSegments) {
  const seenSourceSegmentIds = new Set();
  const seenSourceAnchors = new Set();

  for (const [index, segment] of sourceSegments.entries()) {
    const expectedSequence = index + 1;

    if (segment.sequence !== expectedSequence) {
      return {
        failureCode: 'MALFORMED_ARGUMENT_EXTRACTION_CANDIDATE',
        reason: `SourceSegment ordering for SourceDocument ${sourceDocument.sourceDocumentId} is not contiguous.`,
      };
    }

    if (!isPositiveInteger(segment.pageNumber)) {
      return {
        failureCode: 'MALFORMED_ARGUMENT_EXTRACTION_CANDIDATE',
        reason: `SourceSegment ${segment.sourceSegmentId || expectedSequence} has an invalid pageNumber.`,
      };
    }

    if (!isPositiveInteger(segment.sequence)) {
      return {
        failureCode: 'MALFORMED_ARGUMENT_EXTRACTION_CANDIDATE',
        reason: `SourceSegment ${segment.sourceSegmentId || expectedSequence} has an invalid sequence.`,
      };
    }

    if (!Number.isInteger(segment.charStart) || !Number.isInteger(segment.charEnd) || segment.charStart < 0 || segment.charEnd <= segment.charStart) {
      return {
        failureCode: 'MALFORMED_ARGUMENT_EXTRACTION_CANDIDATE',
        reason: `SourceSegment ${segment.sourceSegmentId || expectedSequence} has invalid character offsets.`,
      };
    }

    if (segment.charEnd > sourceDocument.content.length) {
      return {
        failureCode: 'MALFORMED_ARGUMENT_EXTRACTION_CANDIDATE',
        reason: `SourceSegment ${segment.sourceSegmentId || expectedSequence} exceeds the source document content length.`,
      };
    }

    if (!isNonEmptyTrimmedString(segment.sourceSegmentId)) {
      return {
        failureCode: 'MALFORMED_ARGUMENT_EXTRACTION_CANDIDATE',
        reason: `SourceSegment ${expectedSequence} is missing a sourceSegmentId.`,
      };
    }

    if (!SOURCE_SEGMENT_ID_PATTERN.test(segment.sourceSegmentId)) {
      return {
        failureCode: 'MALFORMED_ARGUMENT_EXTRACTION_CANDIDATE',
        reason: `SourceSegment ${segment.sourceSegmentId} has an invalid sourceSegmentId format.`,
      };
    }

    if (!isNonEmptyTrimmedString(segment.sourceAnchor)) {
      return {
        failureCode: 'MALFORMED_ARGUMENT_EXTRACTION_CANDIDATE',
        reason: `SourceSegment ${segment.sourceSegmentId} is missing a sourceAnchor.`,
      };
    }

    if (!SOURCE_ANCHOR_PATTERN.test(segment.sourceAnchor)) {
      return {
        failureCode: 'MALFORMED_ARGUMENT_EXTRACTION_CANDIDATE',
        reason: `SourceSegment ${segment.sourceSegmentId || expectedSequence} has an invalid sourceAnchor format.`,
      };
    }

    if (segment.sourceContentHash !== sourceDocument.contentHash) {
      return {
        failureCode: 'MALFORMED_ARGUMENT_EXTRACTION_CANDIDATE',
        reason: `SourceSegment ${segment.sourceSegmentId || expectedSequence} is not bound to the active SourceDocument content hash.`,
      };
    }

    if (segment.segmentationVersion !== sourceDocument.segmentationVersion) {
      return {
        failureCode: 'MALFORMED_ARGUMENT_EXTRACTION_CANDIDATE',
        reason: `SourceSegment ${segment.sourceSegmentId || expectedSequence} is not bound to the active SourceDocument segmentation version.`,
      };
    }

    if (segment.text !== sourceDocument.content.slice(segment.charStart, segment.charEnd)) {
      return {
        failureCode: 'MALFORMED_ARGUMENT_EXTRACTION_CANDIDATE',
        reason: `SourceSegment ${segment.sourceSegmentId || expectedSequence} text does not match its source slice.`,
      };
    }

    if (segment.segmentType !== 'section_heading' && segment.segmentType !== 'paragraph') {
      return {
        failureCode: 'MALFORMED_ARGUMENT_EXTRACTION_CANDIDATE',
        reason: `SourceSegment ${segment.sourceSegmentId || expectedSequence} has an invalid segmentType.`,
      };
    }

    if (segment.sectionLabel != null && !isNonEmptyTrimmedString(segment.sectionLabel)) {
      return {
        failureCode: 'MALFORMED_ARGUMENT_EXTRACTION_CANDIDATE',
        reason: `SourceSegment ${segment.sourceSegmentId || expectedSequence} has an invalid sectionLabel.`,
      };
    }

    if (seenSourceSegmentIds.has(segment.sourceSegmentId)) {
      return {
        failureCode: 'MALFORMED_ARGUMENT_EXTRACTION_CANDIDATE',
        reason: `SourceSegment ${segment.sourceSegmentId} is duplicated within the extraction input.`,
      };
    }

    if (seenSourceAnchors.has(segment.sourceAnchor)) {
      return {
        failureCode: 'MALFORMED_ARGUMENT_EXTRACTION_CANDIDATE',
        reason: `SourceSegment ${segment.sourceSegmentId || expectedSequence} reuses a sourceAnchor.`,
      };
    }

    seenSourceSegmentIds.add(segment.sourceSegmentId);
    seenSourceAnchors.add(segment.sourceAnchor);
  }

  return null;
}

async function loadSourceDocument({ sourceDocument = null, sourceDocumentId = null, matterId = null, documentId = null } = {}) {
  if (sourceDocument) {
    return sourceDocument;
  }

  if (sourceDocumentId) {
    return SourceDocument.findOne({ sourceDocumentId }).exec();
  }

  if (matterId && documentId) {
    return SourceDocument.findOne({ matterId, documentId }).exec();
  }

  throw new Error(`${SERVICE_NAME} requires sourceDocument, sourceDocumentId, or matterId + documentId.`);
}

async function loadSourceSegments(sourceDocumentId, sourceSegments = null) {
  if (Array.isArray(sourceSegments)) {
    return [...sourceSegments].sort((left, right) => (left.sequence || 0) - (right.sequence || 0));
  }

  return SourceSegment.find({ sourceDocumentId })
    .sort({ sequence: 1 })
    .exec();
}

async function persistExtractedArgumentUnit(candidate) {
  try {
    return await ArgumentUnit.findOneAndReplace({
      matterId: candidate.matterId,
      documentId: candidate.documentId,
      sequence: candidate.sequence,
    }, candidate, {
      upsert: true,
      returnDocument: 'after',
      runValidators: true,
      setDefaultsOnInsert: true,
    }).exec();
  } catch (error) {
    if (error && error.name === 'ValidationError') {
      return buildTerminalResult({
        failureCode: 'MALFORMED_ARGUMENT_EXTRACTION_CANDIDATE',
        reason: error.message,
      });
    }

    throw error;
  }
}

async function extractArgumentUnitsFromSourceDocument(input = {}) {
  try {
    const sourceDocument = await loadSourceDocument(input);

    if (!sourceDocument) {
      return buildTerminalResult({
        failureCode: 'SOURCE_DOCUMENT_NOT_FOUND',
        reason: 'Argument extraction requires a persisted SourceDocument.',
      });
    }

    const sourceSegments = await loadSourceSegments(sourceDocument.sourceDocumentId, input.sourceSegments || null);
    const validationError = validateExtractionSegments(sourceDocument, sourceSegments);

    if (validationError) {
      return buildTerminalResult({
        failureCode: validationError.failureCode,
        reason: validationError.reason,
        result: validationError.failureCode === 'SOURCE_SEGMENTS_NOT_FOUND' ? 'unresolved' : 'invalid',
      });
    }

    const artifactValidationError = validateSourceSegmentArtifacts(sourceDocument, sourceSegments);

    if (artifactValidationError) {
      return buildTerminalResult({
        failureCode: artifactValidationError.failureCode,
        reason: artifactValidationError.reason,
      });
    }

    const paragraphSegments = sourceSegments.filter((segment) => segment.segmentType === 'paragraph');

    if (paragraphSegments.length === 0) {
      return buildTerminalResult({
        failureCode: 'NO_ARGUMENT_CANDIDATES',
        reason: `SourceDocument ${sourceDocument.sourceDocumentId} did not contain any extractable paragraph segments.`,
        result: 'unresolved',
        extras: {
          sourceDocumentId: sourceDocument.sourceDocumentId,
          matterId: sourceDocument.matterId,
          documentId: sourceDocument.documentId,
          sourceAnchors: [],
        },
      });
    }

    const extractedText = buildExtractionText(paragraphSegments);

    if (extractedText.length === 0) {
      return buildTerminalResult({
        failureCode: 'MALFORMED_ARGUMENT_EXTRACTION_CANDIDATE',
        reason: `SourceDocument ${sourceDocument.sourceDocumentId} produced an empty extraction candidate.`,
      });
    }

    const speakerRole = inferSpeakerRole(extractedText, paragraphSegments[0]?.sectionLabel || null);
    const candidate = {
      argumentUnitId: buildArgumentUnitId(sourceDocument, paragraphSegments),
      matterId: sourceDocument.matterId,
      documentId: sourceDocument.documentId,
      sourceSegmentIds: paragraphSegments.map((segment) => segment.sourceSegmentId),
      unitType: inferUnitType(extractedText, paragraphSegments[0]?.sectionLabel || null),
      text: extractedText,
      normalizedText: normalizeWhitespace(extractedText).toLowerCase(),
      speakerRole,
      positionSide: inferPositionSide(speakerRole),
      sequence: paragraphSegments[0].sequence,
      extractionMethod: EXTRACTION_METHOD,
      reviewState: DEFAULT_REVIEW_STATE,
      admissibility: DEFAULT_ADMISSIBILITY,
      unresolvedReason: null,
    };

    let extractedUnit = candidate;

    if (input.persist !== false) {
      const persistedUnit = await persistExtractedArgumentUnit(candidate);

      if (persistedUnit && persistedUnit.terminal) {
        return persistedUnit;
      }

      if (!persistedUnit || typeof persistedUnit.toObject !== 'function') {
        return buildTerminalResult({
          failureCode: 'ARGUMENT_EXTRACTION_CONFLICT',
          reason: `Argument extraction for SourceDocument ${sourceDocument.sourceDocumentId} did not persist a valid ArgumentUnit.`,
        });
      }

      extractedUnit = persistedUnit.toObject({ virtuals: true });
    }

    return {
      ok: true,
      terminal: false,
      service: SERVICE_NAME,
      extractionVersion: EXTRACTION_CONTRACT_VERSION,
      extractionMethod: EXTRACTION_METHOD,
      sourceDocumentId: sourceDocument.sourceDocumentId,
      matterId: sourceDocument.matterId,
      documentId: sourceDocument.documentId,
      sourceSegmentIds: candidate.sourceSegmentIds,
      sourceAnchors: paragraphSegments.map((segment) => segment.sourceAnchor),
      extractedArgumentUnitIds: [extractedUnit.argumentUnitId],
      extractedArgumentUnits: [extractedUnit],
      extractedCount: 1,
    };
  } catch (error) {
    if (error && error.terminal) {
      return error;
    }

    return buildTerminalResult({
      failureCode: 'ARGUMENT_EXTRACTION_RUNTIME_FAILURE',
      reason: error.message,
    });
  }
}

module.exports = {
  SERVICE_NAME,
  EXTRACTION_CONTRACT_VERSION,
  EXTRACTION_METHOD,
  OWNED_FAILURE_CODES,
  extractArgumentUnitsFromSourceDocument,
  buildTerminalResult,
  normalizeWhitespace,
  inferUnitType,
  inferSpeakerRole,
  inferPositionSide,
};

'use strict';

const SourceDocument = require('./source-document.model');
const SourceSegment = require('./source-segment.model');

const SERVICE_NAME = 'segmentation.service';
const SEGMENTATION_VERSION = 'structural-v1';
const ALLOWED_SEGMENT_TYPES = new Set(['section_heading', 'paragraph']);
const SOURCE_ANCHOR_PATTERN = /^.+@[a-f0-9]{12}#p\d+\.s\d+$/;
const SOURCE_SEGMENT_ID_PATTERN = /^.+:[a-f0-9]{12}:p\d+:s\d+$/;

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function isNonEmptyTrimmedString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function assertSupportedSegmentationVersion(sourceDocument) {
  if (sourceDocument.segmentationVersion !== SEGMENTATION_VERSION) {
    throw new Error(
      `${SERVICE_NAME} supports only segmentationVersion=${SEGMENTATION_VERSION} in this wave.`,
    );
  }
}

function isSectionHeading(blockText) {
  if (blockText.includes('\n')) {
    return false;
  }

  return /^#{1,6}\s+\S/.test(blockText)
    || /^(section|chapter|part)\b[:\s-]+\S/i.test(blockText)
    || /^\d+(\.\d+)*[.)]?\s+\S/.test(blockText);
}

function extractSectionLabel(blockText) {
  if (/^#{1,6}\s+\S/.test(blockText)) {
    return blockText.replace(/^#{1,6}\s+/, '').trim();
  }

  return blockText.trim();
}

function buildSourceSegmentId(sourceDocument, pageNumber, sequence) {
  const contentFingerprint = sourceDocument.contentHash.slice(0, 12);

  return `${sourceDocument.sourceDocumentId}:${contentFingerprint}:p${pageNumber}:s${sequence}`;
}

function buildSourceAnchor(sourceDocument, pageNumber, sequence) {
  const contentFingerprint = sourceDocument.contentHash.slice(0, 12);

  // The hash prefix binds anchors to the exact replayable source content for this wave.
  return `${sourceDocument.documentId}@${contentFingerprint}#p${pageNumber}.s${sequence}`;
}

function extractBlocks(sourceDocument) {
  const pages = sourceDocument.content.split('\f');
  const blocks = [];
  let pageStartOffset = 0;
  let sequence = 0;

  pages.forEach((pageContent, pageIndex) => {
    const blockRegex = /\S[\s\S]*?(?=\n\s*\n|$)/g;
    let match;
    let activeSectionLabel = null;

    while ((match = blockRegex.exec(pageContent)) !== null) {
      const rawBlock = match[0];
      const blockText = rawBlock.trim();

      if (!blockText) {
        continue;
      }

      const leadingWhitespace = rawBlock.match(/^\s*/)?.[0].length || 0;
      const trailingWhitespace = rawBlock.match(/\s*$/)?.[0].length || 0;
      const pageNumber = pageIndex + 1;
      const charStart = pageStartOffset + match.index + leadingWhitespace;
      const charEnd = pageStartOffset + match.index + rawBlock.length - trailingWhitespace;
      const heading = isSectionHeading(blockText);

      if (heading) {
        activeSectionLabel = extractSectionLabel(blockText);
      }

      sequence += 1;
      blocks.push({
        sequence,
        pageNumber,
        segmentType: heading ? 'section_heading' : 'paragraph',
        sectionLabel: heading ? activeSectionLabel : activeSectionLabel || null,
        charStart,
        charEnd,
        text: blockText,
      });
    }

    pageStartOffset += pageContent.length + 1;
  });

  return blocks;
}

function buildSegments(sourceDocument) {
  const blocks = extractBlocks(sourceDocument);

  if (blocks.length === 0) {
    throw new Error(`${SERVICE_NAME} requires at least one structural segment.`);
  }

  return blocks.map((block) => ({
    sourceSegmentId: buildSourceSegmentId(sourceDocument, block.pageNumber, block.sequence),
    sourceDocumentId: sourceDocument.sourceDocumentId,
    matterId: sourceDocument.matterId,
    documentId: sourceDocument.documentId,
    sourceContentHash: sourceDocument.contentHash,
    segmentationVersion: sourceDocument.segmentationVersion,
    sequence: block.sequence,
    pageNumber: block.pageNumber,
    segmentType: block.segmentType,
    sourceAnchor: buildSourceAnchor(sourceDocument, block.pageNumber, block.sequence),
    sectionLabel: block.sectionLabel,
    charStart: block.charStart,
    charEnd: block.charEnd,
    text: block.text,
  }));
}

function validateGeneratedSegments(sourceDocument, segments) {
  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error(`${SERVICE_NAME} requires at least one validated segment.`);
  }

  const seenSourceSegmentIds = new Set();
  const seenSourceAnchors = new Set();

  segments.forEach((segment, index) => {
    const expectedSequence = index + 1;
    const expectedSourceSegmentId = buildSourceSegmentId(sourceDocument, segment.pageNumber, segment.sequence);
    const expectedSourceAnchor = buildSourceAnchor(sourceDocument, segment.pageNumber, segment.sequence);
    const segmentSlice = sourceDocument.content.slice(segment.charStart, segment.charEnd);

    if (segment.sequence !== expectedSequence) {
      throw new Error(`${SERVICE_NAME} requires contiguous segment sequence values starting at 1.`);
    }

    if (segment.sourceDocumentId !== sourceDocument.sourceDocumentId) {
      throw new Error(`${SERVICE_NAME} generated a segment for the wrong sourceDocumentId.`);
    }

    if (segment.matterId !== sourceDocument.matterId) {
      throw new Error(`${SERVICE_NAME} generated a segment for the wrong matterId.`);
    }

    if (segment.documentId !== sourceDocument.documentId) {
      throw new Error(`${SERVICE_NAME} generated a segment for the wrong documentId.`);
    }

    if (segment.sourceContentHash !== sourceDocument.contentHash) {
      throw new Error(`${SERVICE_NAME} generated a segment with a mismatched sourceContentHash.`);
    }

    if (segment.segmentationVersion !== sourceDocument.segmentationVersion) {
      throw new Error(`${SERVICE_NAME} generated a segment with a mismatched segmentationVersion.`);
    }

    if (!isPositiveInteger(segment.pageNumber)) {
      throw new Error(`${SERVICE_NAME} generated a segment with an invalid pageNumber.`);
    }

    if (!ALLOWED_SEGMENT_TYPES.has(segment.segmentType)) {
      throw new Error(`${SERVICE_NAME} generated a segment with an invalid segmentType.`);
    }

    if (!Number.isInteger(segment.charStart) || !Number.isInteger(segment.charEnd) || segment.charStart < 0 || segment.charEnd <= segment.charStart) {
      throw new Error(`${SERVICE_NAME} generated a segment with invalid char offsets.`);
    }

    if (segment.charEnd > sourceDocument.content.length) {
      throw new Error(`${SERVICE_NAME} generated a segment that exceeds the source document content length.`);
    }

    if (segmentSlice !== segment.text) {
      throw new Error(`${SERVICE_NAME} generated a segment whose text does not match the source document content slice.`);
    }

    if (!isNonEmptyTrimmedString(segment.sourceSegmentId) || !SOURCE_SEGMENT_ID_PATTERN.test(segment.sourceSegmentId)) {
      throw new Error(`${SERVICE_NAME} generated a segment with an invalid sourceSegmentId.`);
    }

    if (!isNonEmptyTrimmedString(segment.sourceAnchor) || !SOURCE_ANCHOR_PATTERN.test(segment.sourceAnchor)) {
      throw new Error(`${SERVICE_NAME} generated a segment with an invalid sourceAnchor.`);
    }

    if (segment.sourceSegmentId !== expectedSourceSegmentId) {
      throw new Error(`${SERVICE_NAME} generated a non-deterministic sourceSegmentId.`);
    }

    if (segment.sourceAnchor !== expectedSourceAnchor) {
      throw new Error(`${SERVICE_NAME} generated a non-deterministic sourceAnchor.`);
    }

    if (segment.sectionLabel != null && !isNonEmptyTrimmedString(segment.sectionLabel)) {
      throw new Error(`${SERVICE_NAME} generated a segment with an invalid sectionLabel.`);
    }

    if (seenSourceSegmentIds.has(segment.sourceSegmentId)) {
      throw new Error(`${SERVICE_NAME} generated duplicate sourceSegmentId values.`);
    }

    if (seenSourceAnchors.has(segment.sourceAnchor)) {
      throw new Error(`${SERVICE_NAME} generated duplicate sourceAnchor values.`);
    }

    seenSourceSegmentIds.add(segment.sourceSegmentId);
    seenSourceAnchors.add(segment.sourceAnchor);
  });
}

function canonicalizeSegment(segment) {
  return {
    sourceSegmentId: segment.sourceSegmentId,
    sourceDocumentId: segment.sourceDocumentId,
    matterId: segment.matterId,
    documentId: segment.documentId,
    sourceContentHash: segment.sourceContentHash,
    segmentationVersion: segment.segmentationVersion,
    sequence: segment.sequence,
    pageNumber: segment.pageNumber,
    segmentType: segment.segmentType,
    sourceAnchor: segment.sourceAnchor,
    sectionLabel: segment.sectionLabel,
    charStart: segment.charStart,
    charEnd: segment.charEnd,
    text: segment.text,
  };
}

function assertPersistedSegmentsMatch(sourceDocument, generatedSegments, persistedSegments) {
  if (!Array.isArray(persistedSegments) || persistedSegments.length !== generatedSegments.length) {
    throw new Error(`${SERVICE_NAME} could not verify persisted SourceSegment records.`);
  }

  const generatedSnapshots = generatedSegments.map(canonicalizeSegment);
  const persistedSnapshots = persistedSegments.map(canonicalizeSegment);

  if (JSON.stringify(generatedSnapshots) !== JSON.stringify(persistedSnapshots)) {
    throw new Error(`${SERVICE_NAME} persisted SourceSegment records do not match the generated segment artifacts.`);
  }

  persistedSegments.forEach((segment, index) => {
    const expectedSequence = index + 1;

    if (segment.sourceDocumentId !== sourceDocument.sourceDocumentId || segment.sequence !== expectedSequence) {
      throw new Error(`${SERVICE_NAME} persisted SourceSegment ordering is not trustworthy.`);
    }
  });
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

async function segmentSourceDocument(input = {}) {
  const sourceDocument = await loadSourceDocument(input);

  if (!sourceDocument) {
    throw new Error(`${SERVICE_NAME} requires a persisted SourceDocument.`);
  }

  assertSupportedSegmentationVersion(sourceDocument);

  const segments = buildSegments(sourceDocument);
  validateGeneratedSegments(sourceDocument, segments);

  if (input.persist !== false) {
    await SourceSegment.deleteMany({ sourceDocumentId: sourceDocument.sourceDocumentId });
    await SourceSegment.insertMany(segments, { ordered: true });
  }

  const persistedSegments = input.persist === false
    ? segments.map((segment) => ({ ...segment }))
    : await SourceSegment.find({ sourceDocumentId: sourceDocument.sourceDocumentId })
      .sort({ sequence: 1 })
      .lean()
      .exec();

  assertPersistedSegmentsMatch(sourceDocument, segments, persistedSegments);

  return {
    ok: true,
    terminal: false,
    service: SERVICE_NAME,
    sourceDocumentId: sourceDocument.sourceDocumentId,
    matterId: sourceDocument.matterId,
    documentId: sourceDocument.documentId,
    contentHash: sourceDocument.contentHash,
    segmentationVersion: sourceDocument.segmentationVersion,
    segmentCount: segments.length,
    sourceAnchors: segments.map((segment) => segment.sourceAnchor),
    sourceSegments: segments,
  };
}

module.exports = {
  SERVICE_NAME,
  SEGMENTATION_VERSION,
  segmentSourceDocument,
};

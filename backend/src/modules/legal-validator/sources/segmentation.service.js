'use strict';

const SourceDocument = require('./source-document.model');
const SourceSegment = require('./source-segment.model');

const SERVICE_NAME = 'segmentation.service';
const SEGMENTATION_VERSION = 'structural-v1';

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

  await SourceSegment.deleteMany({ sourceDocumentId: sourceDocument.sourceDocumentId });
  await SourceSegment.insertMany(segments, { ordered: true });

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

'use strict';

const { Router } = require('express');

const legalValidatorSchemas = require('../../../modules/legal-validator/shared/legal-validator.schemas');
const {
  LEGAL_VALIDATOR_PRODUCT,
  LEGAL_VALIDATOR_SCOPE,
} = require('../../../modules/legal-validator/shared/legal-validator-runtime.contract');
const Matter = require('../../../modules/legal-validator/matter/matter.model');
const SourceDocument = require('../../../modules/legal-validator/sources/source-document.model');
const SourceSegment = require('../../../modules/legal-validator/sources/source-segment.model');
const ArgumentUnit = require('../../../modules/legal-validator/arguments/argument-unit.model');
const DoctrineArtifact = require('../../../modules/legal-validator/doctrine/doctrine-artifact.model');
const AuthorityNode = require('../../../modules/legal-validator/authority/authority-node.model');
const Mapping = require('../../../modules/legal-validator/mapping/mapping.model');
const OverrideRecord = require('../../../modules/legal-validator/overrides/override-record.model');
const ValidationRun = require('../../../modules/legal-validator/validation/validation-run.model');
const {
  replayValidationRun,
} = require('../../../modules/legal-validator/validation/trace.service');

const router = Router();
const SERVICE_NAME = 'legal-validator-runs.route';
const INSPECT_CONTRACT_VERSION = 'run-inspect-v1';
const REPORT_CONTRACT_VERSION = 'run-report-v1';
const EXPORT_CONTRACT_VERSION = 'run-export-v1';

function writeError(res, statusCode, code, message) {
  res.status(statusCode).json({
    error: {
      code,
      message,
    },
  });
}

function setNoStoreHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, private, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

function serializeMatter(matter) {
  if (!matter) {
    return null;
  }

  return {
    matterId: matter.matterId,
    title: matter.title,
    jurisdiction: matter.jurisdiction,
    practiceArea: matter.practiceArea,
    status: matter.status,
    createdBy: matter.createdBy,
    sourceDocumentIds: Array.isArray(matter.sourceDocumentIds) ? matter.sourceDocumentIds : [],
    sourceDocumentCount: matter.sourceDocumentCount ?? 0,
    createdAt: matter.createdAt || null,
    updatedAt: matter.updatedAt || null,
  };
}

function serializeSourceDocument(sourceDocument) {
  if (!sourceDocument) {
    return null;
  }

  return {
    sourceDocumentId: sourceDocument.sourceDocumentId,
    matterId: sourceDocument.matterId,
    documentId: sourceDocument.documentId,
    contentFormat: sourceDocument.contentFormat,
    content: sourceDocument.content,
    contentHash: sourceDocument.contentHash,
    segmentationVersion: sourceDocument.segmentationVersion,
    createdAt: sourceDocument.createdAt || null,
    updatedAt: sourceDocument.updatedAt || null,
  };
}

function serializeSourceSegment(sourceSegment) {
  return {
    sourceSegmentId: sourceSegment.sourceSegmentId,
    sourceDocumentId: sourceSegment.sourceDocumentId,
    matterId: sourceSegment.matterId,
    documentId: sourceSegment.documentId,
    sourceContentHash: sourceSegment.sourceContentHash,
    segmentationVersion: sourceSegment.segmentationVersion,
    sequence: sourceSegment.sequence,
    pageNumber: sourceSegment.pageNumber,
    segmentType: sourceSegment.segmentType,
    sourceAnchor: sourceSegment.sourceAnchor,
    sectionLabel: sourceSegment.sectionLabel ?? null,
    charStart: sourceSegment.charStart,
    charEnd: sourceSegment.charEnd,
    text: sourceSegment.text,
    createdAt: sourceSegment.createdAt || null,
    updatedAt: sourceSegment.updatedAt || null,
  };
}

function serializeArgumentUnit(argumentUnit) {
  return {
    argumentUnitId: argumentUnit.argumentUnitId,
    matterId: argumentUnit.matterId,
    documentId: argumentUnit.documentId,
    sourceSegmentIds: Array.isArray(argumentUnit.sourceSegmentIds) ? argumentUnit.sourceSegmentIds : [],
    unitType: argumentUnit.unitType,
    text: argumentUnit.text,
    normalizedText: argumentUnit.normalizedText,
    speakerRole: argumentUnit.speakerRole,
    positionSide: argumentUnit.positionSide,
    sequence: argumentUnit.sequence,
    extractionMethod: argumentUnit.extractionMethod,
    reviewState: argumentUnit.reviewState,
    admissibility: argumentUnit.admissibility,
    unresolvedReason: argumentUnit.unresolvedReason ?? null,
    createdAt: argumentUnit.createdAt || null,
    updatedAt: argumentUnit.updatedAt || null,
  };
}

function serializeDoctrineArtifact(doctrineArtifact) {
  if (!doctrineArtifact) {
    return null;
  }

  return {
    artifactId: doctrineArtifact.artifactId,
    packageId: doctrineArtifact.packageId,
    version: doctrineArtifact.version,
    hash: doctrineArtifact.hash,
    storageKey: doctrineArtifact.storageKey,
    manifest: doctrineArtifact.manifest,
    governance: doctrineArtifact.governance,
    replay: doctrineArtifact.replay,
    createdBy: doctrineArtifact.createdBy,
    createdAt: doctrineArtifact.createdAt || null,
    updatedAt: doctrineArtifact.updatedAt || null,
  };
}

function serializeAuthorityNode(authorityNode) {
  if (!authorityNode) {
    return null;
  }

  return {
    authorityId: authorityNode.authorityId,
    doctrineArtifactId: authorityNode.doctrineArtifactId,
    authorityType: authorityNode.authorityType,
    sourceClass: authorityNode.sourceClass,
    institution: authorityNode.institution,
    citation: authorityNode.citation,
    jurisdiction: authorityNode.jurisdiction,
    text: authorityNode.text,
    effectiveDate: authorityNode.effectiveDate,
    endDate: authorityNode.endDate ?? null,
    precedentialWeight: authorityNode.precedentialWeight,
    status: authorityNode.status,
    attribution: authorityNode.attribution,
    createdAt: authorityNode.createdAt || null,
    updatedAt: authorityNode.updatedAt || null,
  };
}

function serializeMapping(mapping) {
  if (!mapping) {
    return null;
  }

  return {
    mappingId: mapping.mappingId,
    matterId: mapping.matterId,
    argumentUnitId: mapping.argumentUnitId,
    doctrineArtifactId: mapping.doctrineArtifactId,
    conceptId: mapping.conceptId ?? null,
    authorityId: mapping.authorityId ?? null,
    overrideId: mapping.overrideId ?? null,
    manualOverrideReason: mapping.manualOverrideReason ?? null,
    synonymTerm: mapping.synonymTerm ?? null,
    mappingType: mapping.mappingType,
    status: mapping.status,
    matchBasis: mapping.matchBasis ?? null,
    resolverRuleId: mapping.resolverRuleId ?? null,
    failureCode: mapping.failureCode ?? null,
    failureReason: mapping.failureReason ?? null,
    createdAt: mapping.createdAt || null,
    updatedAt: mapping.updatedAt || null,
  };
}

function serializeOverrideRecord(overrideRecord) {
  return {
    overrideId: overrideRecord.overrideId,
    matterId: overrideRecord.matterId,
    argumentUnitId: overrideRecord.argumentUnitId,
    mappingId: overrideRecord.mappingId,
    overrideType: overrideRecord.overrideType,
    reason: overrideRecord.reason,
    createdBy: overrideRecord.createdBy,
    reviewStatus: overrideRecord.reviewStatus,
    reviewedBy: overrideRecord.reviewedBy ?? null,
    reviewedAt: overrideRecord.reviewedAt ?? null,
    createdAt: overrideRecord.createdAt || null,
    updatedAt: overrideRecord.updatedAt || null,
  };
}

function serializeValidationRun(validationRun) {
  return {
    validationRunId: validationRun.validationRunId,
    matterId: validationRun.matterId,
    doctrineArtifactId: validationRun.doctrineArtifactId,
    doctrineHash: validationRun.doctrineHash,
    resolverVersion: validationRun.resolverVersion,
    inputHash: validationRun.inputHash,
    result: validationRun.result,
    failureCodes: Array.isArray(validationRun.failureCodes) ? validationRun.failureCodes : [],
    trace: validationRun.trace,
    createdAt: validationRun.createdAt || null,
    updatedAt: validationRun.updatedAt || null,
  };
}

async function loadValidationRunInspection(validationRunId) {
  const validationRun = await ValidationRun.findOne({ validationRunId }).lean().exec();

  if (!validationRun) {
    return null;
  }

  const replayContext = validationRun.trace?.replayContext || {};
  const sourceDocumentId = legalValidatorSchemas.isNonEmptyTrimmedString(replayContext.sourceDocumentId)
    ? replayContext.sourceDocumentId
    : null;
  const sourceDocument = sourceDocumentId
    ? await SourceDocument.findOne({ sourceDocumentId }).lean().exec()
    : null;
  const sourceSegments = sourceDocument
    ? await SourceSegment.find({ sourceDocumentId: sourceDocument.sourceDocumentId })
      .sort({ sequence: 1 })
      .lean()
      .exec()
    : [];
  const matter = await Matter.findOne({ matterId: validationRun.matterId }).lean().exec();
  const doctrineArtifact = await DoctrineArtifact.findOne({ artifactId: validationRun.doctrineArtifactId }).lean().exec();
  const authorityNode = legalValidatorSchemas.isNonEmptyTrimmedString(replayContext.authorityId)
    ? await AuthorityNode.findOne({ authorityId: replayContext.authorityId }).lean().exec()
    : null;
  const mapping = legalValidatorSchemas.isNonEmptyTrimmedString(replayContext.mappingId)
    ? await Mapping.findOne({ mappingId: replayContext.mappingId }).lean().exec()
    : null;
  const overrideIds = Array.from(new Set([
    ...(Array.isArray(validationRun.trace?.overrideIds) ? validationRun.trace.overrideIds : []),
    legalValidatorSchemas.isNonEmptyTrimmedString(replayContext.overrideId) ? replayContext.overrideId : null,
  ].filter(Boolean)));
  const overrideRecords = overrideIds.length > 0
    ? await OverrideRecord.find({ overrideId: { $in: overrideIds } })
      .sort({ createdAt: 1 })
      .lean()
      .exec()
    : [];
  const argumentUnits = Array.isArray(replayContext.argumentUnitIds) && replayContext.argumentUnitIds.length > 0
    ? await ArgumentUnit.find({ argumentUnitId: { $in: replayContext.argumentUnitIds } })
      .sort({ sequence: 1 })
      .lean()
      .exec()
    : await ArgumentUnit.find({
      matterId: validationRun.matterId,
      documentId: sourceDocument?.documentId || null,
    })
      .sort({ sequence: 1 })
      .lean()
      .exec();

  const integrityWarnings = [];

  if (!matter) {
    integrityWarnings.push(`Matter ${validationRun.matterId} is missing from the inspection surface.`);
  }

  if (!sourceDocument) {
    integrityWarnings.push(`SourceDocument ${sourceDocumentId || 'unknown'} is missing from the inspection surface.`);
  }

  if (!doctrineArtifact) {
    integrityWarnings.push(`DoctrineArtifact ${validationRun.doctrineArtifactId} is missing from the inspection surface.`);
  }

  if (replayContext.authorityId && !authorityNode) {
    integrityWarnings.push(`AuthorityNode ${replayContext.authorityId} is missing from the inspection surface.`);
  }

  if (replayContext.mappingId && !mapping) {
    integrityWarnings.push(`Mapping ${replayContext.mappingId} is missing from the inspection surface.`);
  }

  if (overrideIds.length > 0 && overrideRecords.length !== overrideIds.length) {
    integrityWarnings.push('One or more override records could not be loaded from the inspection surface.');
  }

  return {
    resource: 'legal-validator-run',
    status: 'completed',
    contractVersion: INSPECT_CONTRACT_VERSION,
    boundary: {
      product: LEGAL_VALIDATOR_PRODUCT,
      scope: LEGAL_VALIDATOR_SCOPE,
    },
    request: {
      validationRunId,
    },
    inspectionReady: integrityWarnings.length === 0,
    integrityWarnings,
    validationRun: serializeValidationRun(validationRun),
    matter: serializeMatter(matter),
    sourceDocument: serializeSourceDocument(sourceDocument),
    sourceDocuments: sourceDocument ? [serializeSourceDocument(sourceDocument)] : [],
    sourceSegments: sourceSegments.map(serializeSourceSegment),
    argumentUnits: argumentUnits.map(serializeArgumentUnit),
    doctrineArtifact: serializeDoctrineArtifact(doctrineArtifact),
    authorityNode: serializeAuthorityNode(authorityNode),
    mapping: serializeMapping(mapping),
    overrideRecords: overrideRecords.map(serializeOverrideRecord),
    audit: {
      singleTenant: true,
      authzRequired: false,
      cachePolicy: 'no-store',
      traceability: {
        validationRun: true,
        matter: Boolean(matter),
        sourceDocument: Boolean(sourceDocument),
        sourceSegments: sourceSegments.length,
        argumentUnits: argumentUnits.length,
        doctrineArtifact: Boolean(doctrineArtifact),
        authorityNode: Boolean(authorityNode),
        mapping: Boolean(mapping),
        overrideRecords: overrideRecords.length,
      },
    },
    counts: {
      sourceDocuments: sourceDocument ? 1 : 0,
      sourceSegments: sourceSegments.length,
      argumentUnits: argumentUnits.length,
      overrideRecords: overrideRecords.length,
    },
  };
}

router.use((_req, res, next) => {
  setNoStoreHeaders(res);
  next();
});

function serializeReplayOutcome(replayResult, validationRunId) {
  if (!replayResult) {
    return {
      status: 'terminal',
      result: 'invalid',
      failureCode: 'TRACE_INCOMPLETE',
      failureCodes: ['TRACE_INCOMPLETE'],
      reason: 'The replay executor did not return a replay outcome.',
      replayComparison: null,
      replayedTraceSummary: null,
      originalValidationRunId: validationRunId,
    };
  }

  if (replayResult.terminal) {
    return {
      status: 'terminal',
      result: replayResult.result,
      failureCode: replayResult.failureCode,
      failureCodes: replayResult.failureCode ? [replayResult.failureCode] : [],
      reason: replayResult.reason || null,
      replayComparison: replayResult.replayComparison || null,
      replayedTraceSummary: replayResult.replayedTraceSummary || null,
      originalValidationRunId: replayResult.originalValidationRun?.validationRunId || validationRunId,
    };
  }

  return {
    status: 'completed',
    result: replayResult.replayedResult,
    failureCode: null,
    failureCodes: Array.isArray(replayResult.replayedFailureCodes) ? replayResult.replayedFailureCodes : [],
    reason: null,
    replayComparison: replayResult.replayComparison || null,
    replayedTraceSummary: replayResult.replayedTraceSummary || null,
    originalValidationRunId: replayResult.originalValidationRun?.validationRunId || validationRunId,
  };
}

async function loadValidationRunReport(validationRunId, reportKind = 'report') {
  const inspection = await loadValidationRunInspection(validationRunId);

  if (!inspection) {
    return null;
  }

  let replayOutcome = null;

  try {
    replayOutcome = await replayValidationRun({ validationRunId });
  } catch (error) {
    replayOutcome = {
      terminal: true,
      result: 'invalid',
      failureCode: 'TRACE_INCOMPLETE',
      reason: error.message,
      replayComparison: null,
      replayedTraceSummary: null,
      originalValidationRun: {
        validationRunId,
      },
    };
  }

  const contractVersion = reportKind === 'export' ? EXPORT_CONTRACT_VERSION : REPORT_CONTRACT_VERSION;
  const resource = reportKind === 'export' ? 'legal-validator-run-export' : 'legal-validator-run-report';
  const doctrineManifest = inspection.doctrineArtifact?.manifest || {};
  const admissibility = inspection.argumentUnits.map((argumentUnit) => ({
    argumentUnitId: argumentUnit.argumentUnitId,
    reviewState: argumentUnit.reviewState,
    admissibility: argumentUnit.admissibility,
    unresolvedReason: argumentUnit.unresolvedReason,
  }));

  return {
    resource,
    status: 'completed',
    contractVersion,
    boundary: {
      product: LEGAL_VALIDATOR_PRODUCT,
      scope: LEGAL_VALIDATOR_SCOPE,
    },
    request: {
      validationRunId,
    },
    reportReady: inspection.inspectionReady,
    integrityWarnings: inspection.integrityWarnings,
    report: {
      ...inspection,
      resource: 'legal-validator-run',
      reportKind,
      validationRunId: inspection.validationRun.validationRunId,
      sourceAnchors: Array.isArray(inspection.validationRun.trace?.sourceAnchors)
        ? inspection.validationRun.trace.sourceAnchors
        : [],
      admissibility,
      doctrineManifest: {
        conceptIds: Array.isArray(doctrineManifest.coreConceptsReferenced)
          ? doctrineManifest.coreConceptsReferenced
          : [],
        authorityIds: Array.isArray(doctrineManifest.authorityIds)
          ? doctrineManifest.authorityIds
          : [],
        sourceClasses: Array.isArray(doctrineManifest.sourceClasses)
          ? doctrineManifest.sourceClasses
          : [],
        jurisdiction: doctrineManifest.jurisdiction || null,
        practiceArea: doctrineManifest.practiceArea || null,
        interpretationRegimeId: doctrineManifest.interpretationRegime?.regimeId || null,
      },
      replay: serializeReplayOutcome(replayOutcome, validationRunId),
    },
  };
}

router.get('/', (_req, res) => {
  res.json({
    resource: 'legal-validator-runs',
    status: 'active',
    contractVersion: INSPECT_CONTRACT_VERSION,
    boundary: {
      product: LEGAL_VALIDATOR_PRODUCT,
      scope: LEGAL_VALIDATOR_SCOPE,
    },
    allowedOperations: ['inspect-validation-run', 'report-validation-run', 'export-validation-run'],
    operationalControls: {
      singleTenant: true,
      authzRequired: false,
      cachePolicy: 'no-store',
      retainedArtifacts: ['Matter', 'SourceDocument', 'SourceSegment', 'ArgumentUnit', 'DoctrineArtifact', 'AuthorityNode', 'Mapping', 'OverrideRecord', 'ValidationRun'],
    },
    requestShape: {
      pathParameters: ['validationRunId'],
    },
    allowedOutcomes: ['valid', 'invalid', 'unresolved'],
  });
});

router.get('/:validationRunId', async (req, res) => {
  const { validationRunId } = req.params;

  if (!legalValidatorSchemas.isNonEmptyTrimmedString(validationRunId)) {
    writeError(res, 400, 'invalid_legal_validator_input', 'Validation run inspection requires a validationRunId.');
    return;
  }

  try {
    const inspection = await loadValidationRunInspection(validationRunId);

    if (!inspection) {
      writeError(res, 404, 'validation_run_not_found', `ValidationRun ${validationRunId} was not found.`);
      return;
    }

    res.json(inspection);
  } catch (error) {
    process.stderr.write(`[chatpdm-backend] ${SERVICE_NAME} failed: ${error.stack || error.message}\n`);
    writeError(res, 500, 'legal_validator_run_inspection_failed', 'The legal-validator run inspection surface could not be loaded.');
  }
});

router.get('/:validationRunId/report', async (req, res) => {
  const { validationRunId } = req.params;

  if (!legalValidatorSchemas.isNonEmptyTrimmedString(validationRunId)) {
    writeError(res, 400, 'invalid_legal_validator_input', 'Validation run reporting requires a validationRunId.');
    return;
  }

  try {
    const report = await loadValidationRunReport(validationRunId, 'report');

    if (!report) {
      writeError(res, 404, 'validation_run_not_found', `ValidationRun ${validationRunId} was not found.`);
      return;
    }

    res.json(report);
  } catch (error) {
    process.stderr.write(`[chatpdm-backend] ${SERVICE_NAME} report failed: ${error.stack || error.message}\n`);
    writeError(res, 500, 'legal_validator_run_report_failed', 'The legal-validator run report could not be loaded.');
  }
});

router.get('/:validationRunId/export', async (req, res) => {
  const { validationRunId } = req.params;

  if (!legalValidatorSchemas.isNonEmptyTrimmedString(validationRunId)) {
    writeError(res, 400, 'invalid_legal_validator_input', 'Validation run export requires a validationRunId.');
    return;
  }

  try {
    const report = await loadValidationRunReport(validationRunId, 'export');

    if (!report) {
      writeError(res, 404, 'validation_run_not_found', `ValidationRun ${validationRunId} was not found.`);
      return;
    }

    res.setHeader('Content-Disposition', `attachment; filename="legal-validator-run-${validationRunId}.json"`);
    res.json(report);
  } catch (error) {
    process.stderr.write(`[chatpdm-backend] ${SERVICE_NAME} export failed: ${error.stack || error.message}\n`);
    writeError(res, 500, 'legal_validator_run_export_failed', 'The legal-validator run export could not be loaded.');
  }
});

module.exports = router;

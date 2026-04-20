'use strict';

const DoctrineArtifact = require('../doctrine/doctrine-artifact.model');
const Mapping = require('../mapping/mapping.model');
const OverrideRecord = require('../overrides/override-record.model');
const ValidationRun = require('../validation/validation-run.model');
const conceptRegistryService = require('../doctrine/concept-registry.service');
const legalValidatorSchemas = require('../shared/legal-validator.schemas');

const SERVICE_NAME = 'doctrine-governance.service';
const OWNED_FAILURE_CODES = new Set([
  'UNGOVERNED_DOCTRINE_CHANGE',
  'INTERPRETATION_REGIME_CHANGE_UNGOVERNED',
]);

function buildTerminalResult(failureCode, reason, extras = {}) {
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

function serializeValidationRun(validationRun) {
  if (!validationRun) {
    return null;
  }

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
  if (!overrideRecord) {
    return null;
  }

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

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry) => typeof entry === 'string' && entry.trim().length > 0);
}

function buildPromotionBlocker(failureCode, reason) {
  return {
    failureCode,
    reason,
  };
}

function buildInspectionSummary({ doctrineArtifact, validationRun, conceptBindings, mapping, overrideRecords }) {
  const promotionBlockers = [];
  const governanceStatus = doctrineArtifact.governance?.status || 'draft';
  const runtimeEligible = doctrineArtifact.isRuntimeEligibleForValidation();
  const currentInterpretationRegimeId = doctrineArtifact.manifest?.interpretationRegime?.regimeId || null;
  const recordedInterpretationRegimeId = validationRun?.trace?.loadedManifest?.interpretationRegimeId
    || validationRun?.trace?.interpretationRegimeId
    || null;

  if (!runtimeEligible) {
    promotionBlockers.push(buildPromotionBlocker(
      'UNGOVERNED_DOCTRINE_CHANGE',
      `Doctrine artifact ${doctrineArtifact.artifactId} is not runtime-eligible under governance.status=${governanceStatus}.`,
    ));
  }

  if (validationRun && validationRun.doctrineHash !== doctrineArtifact.hash) {
    promotionBlockers.push(buildPromotionBlocker(
      'UNGOVERNED_DOCTRINE_CHANGE',
      `ValidationRun ${validationRun.validationRunId} was recorded against doctrineHash=${validationRun.doctrineHash}, not current doctrineHash=${doctrineArtifact.hash}.`,
    ));
  }

  if (validationRun && recordedInterpretationRegimeId && currentInterpretationRegimeId && recordedInterpretationRegimeId !== currentInterpretationRegimeId) {
    promotionBlockers.push(buildPromotionBlocker(
      'INTERPRETATION_REGIME_CHANGE_UNGOVERNED',
      `ValidationRun ${validationRun.validationRunId} was recorded against interpretationRegimeId=${recordedInterpretationRegimeId}, not current interpretationRegimeId=${currentInterpretationRegimeId}.`,
    ));
  }

  if (validationRun && Array.isArray(validationRun.trace?.overrideIds) && validationRun.trace.overrideIds.length > 0) {
    const approvedOverrideIds = new Set(
      overrideRecords
        .filter((overrideRecord) => overrideRecord.reviewStatus === 'approved')
        .map((overrideRecord) => overrideRecord.overrideId),
    );

    for (const overrideId of validationRun.trace.overrideIds) {
      if (!approvedOverrideIds.has(overrideId)) {
        promotionBlockers.push(buildPromotionBlocker(
          'UNAPPROVED_OVERRIDE_RECORD',
          `OverrideRecord ${overrideId} is required by the recorded run but is not approved on the governance surface.`,
        ));
      }
    }
  }

  const promotionReady = promotionBlockers.length === 0
    && runtimeEligible
    && conceptBindings.ok === true;

  return {
    promotionReady,
    promotionBlockers,
    audit: {
      singleTenant: true,
      authzRequired: false,
      cachePolicy: 'no-store',
      retainedArtifacts: [
        'DoctrineArtifact',
        'ValidationRun',
        'Mapping',
        'OverrideRecord',
      ],
      traceability: [
        'validationRunId',
        'doctrineHash',
        'sourceAnchors',
        'overrideIds',
        'promotionBlockers',
      ],
    },
    governance: {
      governanceStatus,
      runtimeEligible,
      reviewedBy: doctrineArtifact.governance?.reviewedBy ?? null,
      reviewedAt: doctrineArtifact.governance?.reviewedAt ?? null,
      approvedBy: doctrineArtifact.governance?.approvedBy ?? null,
      approvedAt: doctrineArtifact.governance?.approvedAt ?? null,
      lockedAt: doctrineArtifact.governance?.lockedAt ?? null,
    },
    reviewDiff: {
      currentDoctrineHash: doctrineArtifact.hash,
      recordedDoctrineHash: validationRun?.doctrineHash || null,
      currentInterpretationRegimeId,
      recordedInterpretationRegimeId,
      currentCoreConceptIds: normalizeStringArray(doctrineArtifact.manifest?.coreConceptsReferenced),
      recordedCoreConceptIds: normalizeStringArray(validationRun?.trace?.loadedManifest?.conceptIds),
      currentAuthorityIds: normalizeStringArray(doctrineArtifact.manifest?.authorityIds),
      recordedAuthorityIds: normalizeStringArray(validationRun?.trace?.loadedManifest?.authorityIds),
      currentOverrideIds: normalizeStringArray(validationRun?.trace?.overrideIds),
    },
    doctrineArtifact: serializeDoctrineArtifact(doctrineArtifact),
    conceptBindings: conceptBindings.ok
      ? {
        conceptSetVersion: conceptBindings.conceptSetVersion,
        coreConceptsReferenced: conceptBindings.coreConceptsReferenced,
        packageConceptsDeclared: conceptBindings.packageConceptsDeclared,
        resolvedCoreConceptIds: conceptBindings.resolvedCoreConceptIds,
        liveConceptIds: conceptBindings.liveConceptIds,
      }
      : {
        failureCode: conceptBindings.failureCode,
        reason: conceptBindings.reason,
      },
    validationRun: serializeValidationRun(validationRun),
    mapping: serializeMapping(mapping),
    overrideRecords: overrideRecords.map(serializeOverrideRecord),
  };
}

async function inspectDoctrineGovernance({ artifactId, validationRunId = null }) {
  const doctrineArtifact = await DoctrineArtifact.findOne({ artifactId }).exec();

  if (!doctrineArtifact) {
    return null;
  }

  const validationRun = legalValidatorSchemas.isNonEmptyTrimmedString(validationRunId)
    ? await ValidationRun.findOne({ validationRunId }).lean().exec()
    : null;
  const conceptBindings = conceptRegistryService.resolveDoctrineConceptBindings(doctrineArtifact);
  const mappingId = validationRun?.trace?.replayContext?.mappingId || null;
  const mapping = legalValidatorSchemas.isNonEmptyTrimmedString(mappingId)
    ? await Mapping.findOne({ mappingId }).lean().exec()
    : null;
  const overrideIds = Array.from(new Set([
    ...(Array.isArray(validationRun?.trace?.overrideIds) ? validationRun.trace.overrideIds : []),
    legalValidatorSchemas.isNonEmptyTrimmedString(validationRun?.trace?.replayContext?.overrideId)
      ? validationRun.trace.replayContext.overrideId
      : null,
  ].filter(Boolean)));
  const overrideRecords = overrideIds.length > 0
    ? await OverrideRecord.find({ overrideId: { $in: overrideIds } })
      .sort({ createdAt: 1 })
      .lean()
      .exec()
    : [];

  const summary = buildInspectionSummary({
    doctrineArtifact,
    validationRun,
    conceptBindings,
    mapping,
    overrideRecords,
  });

  return {
    resource: 'legal-validator-governance',
    status: 'completed',
    contractVersion: 'doctrine-governance-v1',
    request: {
      artifactId,
      validationRunId: validationRunId || null,
    },
    ...summary,
  };
}

function validatePromotionRequest(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      kind: 'invalid',
      message: 'Legal Argument Validator governance promotion input must be a plain object.',
    };
  }

  const allowedKeys = new Set(['targetStatus', 'reviewedBy', 'approvedBy']);

  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      return {
        kind: 'invalid',
        message: `Legal Argument Validator governance promotion input contains unsupported field "${key}".`,
      };
    }
  }

  if (!legalValidatorSchemas.doctrineGovernanceStatuses.includes(input.targetStatus)) {
    return {
      kind: 'invalid',
      message: `Legal Argument Validator governance promotion input must declare targetStatus as one of ${legalValidatorSchemas.doctrineGovernanceStatuses.join(', ')}.`,
    };
  }

  if (input.targetStatus === 'reviewed' && !legalValidatorSchemas.isNonEmptyTrimmedString(input.reviewedBy)) {
    return {
      kind: 'invalid',
      message: 'Legal Argument Validator governance promotion to reviewed requires reviewedBy.',
    };
  }

  if (input.targetStatus === 'approved' && !legalValidatorSchemas.isNonEmptyTrimmedString(input.approvedBy)) {
    return {
      kind: 'invalid',
      message: 'Legal Argument Validator governance promotion to approved requires approvedBy.',
    };
  }

  return {
    kind: 'ok',
    input: {
      targetStatus: input.targetStatus,
      reviewedBy: legalValidatorSchemas.isNonEmptyTrimmedString(input.reviewedBy) ? input.reviewedBy.trim() : null,
      approvedBy: legalValidatorSchemas.isNonEmptyTrimmedString(input.approvedBy) ? input.approvedBy.trim() : null,
    },
  };
}

async function promoteDoctrineArtifact({ artifactId, targetStatus, reviewedBy = null, approvedBy = null }) {
  const doctrineArtifact = await DoctrineArtifact.findOne({ artifactId }).exec();

  if (!doctrineArtifact) {
    return null;
  }

  const currentStatus = doctrineArtifact.governance?.status || 'draft';
  const now = new Date();

  if (currentStatus === targetStatus) {
    return buildPromotionResponse(doctrineArtifact, null);
  }

  if (currentStatus === 'draft' && targetStatus !== 'reviewed') {
    return buildTerminalResult(
      'UNGOVERNED_DOCTRINE_CHANGE',
      `Doctrine artifact ${artifactId} cannot move directly from draft to ${targetStatus}.`,
      {
        artifactId,
        currentStatus,
        targetStatus,
      },
    );
  }

  if (currentStatus === 'reviewed' && targetStatus !== 'approved') {
    return buildTerminalResult(
      'UNGOVERNED_DOCTRINE_CHANGE',
      `Doctrine artifact ${artifactId} cannot move directly from reviewed to ${targetStatus}.`,
      {
        artifactId,
        currentStatus,
        targetStatus,
      },
    );
  }

  if (currentStatus === 'approved' && targetStatus !== 'locked') {
    return buildTerminalResult(
      'UNGOVERNED_DOCTRINE_CHANGE',
      `Doctrine artifact ${artifactId} cannot move directly from approved to ${targetStatus}.`,
      {
        artifactId,
        currentStatus,
        targetStatus,
      },
    );
  }

  if (currentStatus === 'locked' && targetStatus !== 'locked') {
    return buildTerminalResult(
      'UNGOVERNED_DOCTRINE_CHANGE',
      `Doctrine artifact ${artifactId} is locked and cannot move to ${targetStatus}.`,
      {
        artifactId,
        currentStatus,
        targetStatus,
      },
    );
  }

  if (targetStatus === 'reviewed') {
    doctrineArtifact.governance.status = 'reviewed';
    doctrineArtifact.governance.reviewedBy = reviewedBy;
    doctrineArtifact.governance.reviewedAt = now;
    doctrineArtifact.governance.approvedBy = null;
    doctrineArtifact.governance.approvedAt = null;
    doctrineArtifact.governance.lockedAt = null;
  } else if (targetStatus === 'approved') {
    doctrineArtifact.governance.status = 'approved';
    doctrineArtifact.governance.approvedBy = approvedBy;
    doctrineArtifact.governance.approvedAt = now;
    doctrineArtifact.governance.lockedAt = null;
  } else if (targetStatus === 'locked') {
    doctrineArtifact.governance.status = 'locked';
    doctrineArtifact.governance.lockedAt = now;
  }

  await doctrineArtifact.save();

  return buildPromotionResponse(doctrineArtifact, {
    fromStatus: currentStatus,
    toStatus: targetStatus,
    promotedAt: now.toISOString(),
  });
}

function buildPromotionResponse(doctrineArtifact, promotion = null) {
  return {
    resource: 'legal-validator-governance',
    status: 'completed',
    contractVersion: 'doctrine-governance-v1',
    request: {
      artifactId: doctrineArtifact.artifactId,
      validationRunId: null,
    },
    promotion,
    ...buildInspectionSummary({
      doctrineArtifact,
      validationRun: null,
      conceptBindings: {
        ok: true,
        conceptSetVersion: null,
        coreConceptsReferenced: normalizeStringArray(doctrineArtifact.manifest?.coreConceptsReferenced),
        packageConceptsDeclared: normalizeStringArray(doctrineArtifact.manifest?.packageConceptsDeclared),
        resolvedCoreConceptIds: [],
        liveConceptIds: [],
      },
      mapping: null,
      overrideRecords: [],
    }),
  };
}

module.exports = {
  SERVICE_NAME,
  OWNED_FAILURE_CODES,
  inspectDoctrineGovernance,
  promoteDoctrineArtifact,
  validatePromotionRequest,
  buildTerminalResult,
};

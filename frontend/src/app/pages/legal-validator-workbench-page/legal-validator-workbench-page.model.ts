export interface LegalValidatorWorkbenchDraft {
  matterId: string;
  matterTitle: string;
  matterJurisdiction: string;
  matterPracticeArea: string;
  matterStatus: string;
  matterCreatedBy: string;
  sourceDocumentId: string;
  doctrineArtifactId: string;
  validationRunId: string;
  authorityId: string;
  authorityCitation: string;
  authorityEvaluationDate: string;
  authorityExpectedJurisdiction: string;
  authorityExpectedSourceClass: string;
  authorityExpectedInstitution: string;
  authorityRequiredInterpretationRegimeId: string;
  resolverStatus: 'success' | 'ambiguous' | 'rule_not_defined' | 'raw_precedent';
  resolverMappingId: string;
  resolverMappingType: 'concept' | 'authority' | 'combined';
  resolverMatchBasis: 'exact_structural_rule' | 'exact_synonym' | 'manual_override';
  resolverConceptId: string;
  resolverAuthorityId: string;
  resolverRuleId: string;
  resolverOverrideId: string;
  resolverSynonymTerm: string;
  resolverManualOverrideReason: string;
  resolverReason: string;
  validationStatus: 'valid' | 'source_override' | 'factual_linkage_missing' | 'insufficient_doctrine' | 'authority_scope_violation';
  validationRuleIdsText: string;
  validationReason: string;
  traceResolverVersion: string;
  traceInputHash: string;
  traceSourceAnchorsText: string;
  traceInterpretationUsed: boolean;
  traceInterpretationRegimeId: string;
  traceManualOverrideUsed: boolean;
  traceOverrideIdsText: string;
}

export interface LegalValidatorFrontDoorContract {
  resource: string;
  status: string;
  contractVersion: string;
  boundary: {
    product: string;
    scope: string;
  };
  allowedOperations: readonly string[];
  allowedOutcomes: readonly string[];
  requiredInputShape: {
    topLevel: readonly string[];
    inputFields: readonly string[];
  };
}

export interface LegalValidatorIntakeContract {
  resource: string;
  status: string;
  contractVersion: string;
  boundary: {
    product: string;
    scope: string;
  };
  allowedOperations: readonly string[];
  requestShape: {
    topLevel: readonly string[];
    inputFields: readonly string[];
    matterFields: readonly string[];
    sourceDocumentIdsField: string;
  };
  allowedOutcomes: readonly string[];
}

export interface LegalValidatorOrchestrateContract {
  resource: string;
  status: string;
  contractVersion: string;
  phaseOrder: readonly string[];
  boundary: {
    product: string;
    scope: string;
  };
  requestShape: {
    topLevel: readonly string[];
    boundaryFields: readonly string[];
    requiredOrchestratorFields: readonly string[];
    optionalOrchestratorFields: readonly string[];
    traceInputFields: readonly string[];
  };
  allowedOutcomes: readonly string[];
}

export interface LegalValidatorReplayContract {
  resource: string;
  status: string;
  contractVersion: string;
  boundary: {
    product: string;
    scope: string;
  };
  allowedOperations: readonly string[];
  requestShape: {
    topLevel: readonly string[];
    inputFields: readonly string[];
  };
  allowedOutcomes: readonly string[];
}

export interface LegalValidatorRunsContract {
  resource: string;
  status: string;
  contractVersion: string;
  boundary: {
    product: string;
    scope: string;
  };
  allowedOperations: readonly string[];
  requestShape: {
    pathParameters: readonly string[];
  };
  allowedOutcomes: readonly string[];
}

export interface LegalValidatorContractSnapshot {
  frontDoor: LegalValidatorFrontDoorContract;
  intake: LegalValidatorIntakeContract;
  orchestrate: LegalValidatorOrchestrateContract;
  replay: LegalValidatorReplayContract;
  runs: LegalValidatorRunsContract;
}

export interface LegalValidatorIntakeRequest {
  input: {
    matter: {
      matterId: string;
      title: string;
      jurisdiction: string;
      practiceArea: string;
      status: string;
      createdBy: string;
    };
    sourceDocumentIds: string[];
  };
}

export interface LegalValidatorOrchestrateRequest {
  input: {
    product: 'legal-argument-validator';
    scope: 'bounded-legal-validation';
    matterId: string;
    jurisdiction: string;
    practiceArea: string;
    sourceDocumentId: string;
    doctrineArtifactId: string;
    authorityInput?: Record<string, string>;
    resolverDecision?: Record<string, unknown>;
    validationDecision?: Record<string, unknown>;
    traceInput: Record<string, unknown>;
  };
}

export interface LegalValidatorReplayRequest {
  input: {
    validationRunId: string;
  };
}

export interface LegalValidatorIntakeResponse {
  resource: string;
  status: string;
  contractVersion: string;
  boundary: {
    product: string;
    scope: string;
  };
  matterMode: string;
  matter: {
    matterId: string;
    title: string;
    jurisdiction: string;
    practiceArea: string;
    status: string;
    createdBy: string;
    sourceDocumentIds?: readonly string[];
    sourceDocumentCount?: number;
  };
  sourceDocumentIds: readonly string[];
  sourceDocumentCount: number;
}

export interface LegalValidatorOrchestratePhase {
  phase: string;
  label: string;
  status: string;
  service: string | null;
  result: string | null;
  failureCode: string | null;
  reason: string | null;
  output: Record<string, unknown> | null;
}

export interface LegalValidatorOrchestrateResponse {
  resource: string;
  status: 'terminal' | 'completed';
  contractVersion: string;
  phaseOrder: readonly string[];
  request: Record<string, unknown>;
  phases: readonly LegalValidatorOrchestratePhase[];
  final: {
    stoppedPhase: string;
    result: string;
    failureCodes: readonly string[];
    failureCode: string | null;
    reason: string | null;
    validationRunWritten: boolean;
    validationRunId: string | null;
    mappingId: string | null;
    doctrineArtifactId: string | null;
    doctrineHash: string | null;
    authorityId: string | null;
    persistedTraceSummary?: Record<string, unknown> | null;
  };
}

export interface LegalValidatorReplayResponse {
  resource: string;
  status: 'terminal' | 'completed';
  contractVersion: string;
  request: {
    validationRunId: string;
  };
  final: {
    result: string;
    failureCode: string | null;
    reason: string | null;
    failureCodes?: readonly string[];
    replayComparison: {
      ok: boolean;
      mismatches: readonly string[];
    } | null;
    replayedTraceSummary: Record<string, unknown> | null;
    originalValidationRunId: string;
  };
}

export interface LegalValidatorRunReportReplayOutcome {
  status: 'terminal' | 'completed' | 'unavailable';
  result: string | null;
  failureCode: string | null;
  failureCodes: readonly string[];
  reason: string | null;
  replayComparison: {
    ok: boolean;
    mismatches: readonly string[];
  } | null;
  replayedTraceSummary: Record<string, unknown> | null;
  originalValidationRunId: string | null;
}

export interface LegalValidatorRunReportResponse {
  resource: string;
  status: string;
  contractVersion: string;
  boundary: {
    product: string;
    scope: string;
  };
  request: {
    validationRunId: string;
  };
  reportReady: boolean;
  integrityWarnings: readonly string[];
  report: {
    resource: string;
    reportKind: 'report' | 'export';
    validationRunId: string;
    matter: Record<string, unknown> | null;
    sourceDocument: Record<string, unknown> | null;
    sourceDocuments: readonly Record<string, unknown>[];
    sourceSegments: readonly Record<string, unknown>[];
    sourceAnchors: readonly string[];
    argumentUnits: readonly Record<string, unknown>[];
    admissibility: readonly {
      argumentUnitId: string;
      reviewState: string;
      admissibility: string;
      unresolvedReason: string | null;
    }[];
    doctrineArtifact: Record<string, unknown> | null;
    doctrineManifest: Record<string, unknown> | null;
    authorityNode: Record<string, unknown> | null;
    mapping: Record<string, unknown> | null;
    overrideRecords: readonly Record<string, unknown>[];
    validationRun: {
      validationRunId: string;
      matterId: string;
      doctrineArtifactId: string;
      doctrineHash: string;
      resolverVersion: string;
      inputHash: string;
      result: string;
      failureCodes: readonly string[];
      trace: Record<string, unknown>;
      createdAt: string | null;
      updatedAt: string | null;
    };
    counts: {
      sourceDocuments: number;
      sourceSegments: number;
      argumentUnits: number;
      overrideRecords: number;
    };
    replay: LegalValidatorRunReportReplayOutcome;
  };
}

export type LegalValidatorRunExportResponse = LegalValidatorRunReportResponse;

export interface LegalValidatorRunInspectionResponse {
  resource: string;
  status: string;
  contractVersion: string;
  boundary: {
    product: string;
    scope: string;
  };
  request: {
    validationRunId: string;
  };
  inspectionReady: boolean;
  integrityWarnings: readonly string[];
  validationRun: {
    validationRunId: string;
    matterId: string;
    doctrineArtifactId: string;
    doctrineHash: string;
    resolverVersion: string;
    inputHash: string;
    result: string;
    failureCodes: readonly string[];
    trace: Record<string, unknown>;
    createdAt: string | null;
    updatedAt: string | null;
  };
  matter: {
    matterId: string;
    title: string;
    jurisdiction: string;
    practiceArea: string;
    status: string;
    createdBy: string;
    sourceDocumentIds: readonly string[];
    sourceDocumentCount: number;
    createdAt: string | null;
    updatedAt: string | null;
  } | null;
  sourceDocument: {
    sourceDocumentId: string;
    matterId: string;
    documentId: string;
    contentFormat: string;
    content: string;
    contentHash: string;
    segmentationVersion: string;
    createdAt: string | null;
    updatedAt: string | null;
  } | null;
  sourceDocuments: readonly {
    sourceDocumentId: string;
    matterId: string;
    documentId: string;
    contentFormat: string;
    content: string;
    contentHash: string;
    segmentationVersion: string;
    createdAt: string | null;
    updatedAt: string | null;
  }[];
  sourceSegments: readonly {
    sourceSegmentId: string;
    sourceDocumentId: string;
    matterId: string;
    documentId: string;
    sourceContentHash: string;
    segmentationVersion: string;
    sequence: number;
    pageNumber: number;
    segmentType: string;
    sourceAnchor: string;
    sectionLabel: string | null;
    charStart: number;
    charEnd: number;
    text: string;
    createdAt: string | null;
    updatedAt: string | null;
  }[];
  argumentUnits: readonly {
    argumentUnitId: string;
    matterId: string;
    documentId: string;
    sourceSegmentIds: readonly string[];
    unitType: string;
    text: string;
    normalizedText: string;
    speakerRole: string;
    positionSide: string;
    sequence: number;
    extractionMethod: string;
    reviewState: string;
    admissibility: string;
    unresolvedReason: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  }[];
  doctrineArtifact: {
    artifactId: string;
    packageId: string;
    version: string;
    hash: string;
    storageKey: string;
    manifest: Record<string, unknown>;
    governance: Record<string, unknown>;
    replay: Record<string, unknown>;
    createdBy: string;
    createdAt: string | null;
    updatedAt: string | null;
  } | null;
  authorityNode: {
    authorityId: string;
    doctrineArtifactId: string;
    authorityType: string;
    sourceClass: string;
    institution: string;
    citation: string;
    jurisdiction: string;
    text: string;
    effectiveDate: string;
    endDate: string | null;
    precedentialWeight: string;
    status: string;
    attribution: Record<string, unknown>;
    createdAt: string | null;
    updatedAt: string | null;
  } | null;
  mapping: {
    mappingId: string;
    matterId: string;
    argumentUnitId: string;
    doctrineArtifactId: string;
    conceptId: string | null;
    authorityId: string | null;
    overrideId: string | null;
    manualOverrideReason: string | null;
    synonymTerm: string | null;
    mappingType: string;
    status: string;
    matchBasis: string | null;
    resolverRuleId: string | null;
    failureCode: string | null;
    failureReason: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  } | null;
  overrideRecords: readonly {
    overrideId: string;
    matterId: string;
    argumentUnitId: string;
    mappingId: string;
    overrideType: string;
    reason: string;
    createdBy: string;
    reviewStatus: string;
    reviewedBy: string | null;
    reviewedAt: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  }[];
  counts: {
    sourceDocuments: number;
    sourceSegments: number;
    argumentUnits: number;
    overrideRecords: number;
  };
}

export function createBlankLegalValidatorWorkbenchDraft(): LegalValidatorWorkbenchDraft {
  return {
    matterId: '',
    matterTitle: '',
    matterJurisdiction: '',
    matterPracticeArea: '',
    matterStatus: 'active',
    matterCreatedBy: '',
    sourceDocumentId: '',
    doctrineArtifactId: '',
    validationRunId: '',
    authorityId: '',
    authorityCitation: '',
    authorityEvaluationDate: '',
    authorityExpectedJurisdiction: '',
    authorityExpectedSourceClass: '',
    authorityExpectedInstitution: '',
    authorityRequiredInterpretationRegimeId: '',
    resolverStatus: 'success',
    resolverMappingId: '',
    resolverMappingType: 'combined',
    resolverMatchBasis: 'exact_structural_rule',
    resolverConceptId: '',
    resolverAuthorityId: '',
    resolverRuleId: '',
    resolverOverrideId: '',
    resolverSynonymTerm: '',
    resolverManualOverrideReason: '',
    resolverReason: '',
    validationStatus: 'valid',
    validationRuleIdsText: '',
    validationReason: '',
    traceResolverVersion: 'resolver-v1',
    traceInputHash: '',
    traceSourceAnchorsText: '',
    traceInterpretationUsed: false,
    traceInterpretationRegimeId: '',
    traceManualOverrideUsed: false,
    traceOverrideIdsText: '',
  };
}

export function splitDelimitedText(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  );
}

export function buildIntakeRequest(draft: LegalValidatorWorkbenchDraft): LegalValidatorIntakeRequest {
  return {
    input: {
      matter: {
        matterId: draft.matterId.trim(),
        title: draft.matterTitle.trim(),
        jurisdiction: draft.matterJurisdiction.trim(),
        practiceArea: draft.matterPracticeArea.trim(),
        status: draft.matterStatus.trim() || 'active',
        createdBy: draft.matterCreatedBy.trim(),
      },
      sourceDocumentIds: splitDelimitedText(draft.sourceDocumentId),
    },
  };
}

export function buildOrchestrateRequest(draft: LegalValidatorWorkbenchDraft): LegalValidatorOrchestrateRequest {
  const authorityInput = buildAuthorityInput(draft);
  const resolverDecision = buildResolverDecision(draft);
  const validationDecision = buildValidationDecision(draft);

  return {
    input: {
      product: 'legal-argument-validator',
      scope: 'bounded-legal-validation',
      matterId: draft.matterId.trim(),
      jurisdiction: draft.matterJurisdiction.trim(),
      practiceArea: draft.matterPracticeArea.trim(),
      sourceDocumentId: draft.sourceDocumentId.trim(),
      doctrineArtifactId: draft.doctrineArtifactId.trim(),
      ...(authorityInput ? { authorityInput } : {}),
      resolverDecision,
      ...(validationDecision ? { validationDecision } : {}),
      traceInput: buildTraceInput(draft),
    },
  };
}

export function buildReplayRequest(draft: LegalValidatorWorkbenchDraft): LegalValidatorReplayRequest {
  return {
    input: {
      validationRunId: draft.validationRunId.trim(),
    },
  };
}

export function buildInspectionRequest(draft: LegalValidatorWorkbenchDraft): LegalValidatorReplayRequest {
  return buildReplayRequest(draft);
}

function buildAuthorityInput(draft: LegalValidatorWorkbenchDraft): Record<string, string> | null {
  const payload: Record<string, string> = {};

  appendIfPresent(payload, 'authorityId', draft.authorityId);
  appendIfPresent(payload, 'citation', draft.authorityCitation);
  appendIfPresent(payload, 'evaluationDate', draft.authorityEvaluationDate);
  appendIfPresent(payload, 'expectedJurisdiction', draft.authorityExpectedJurisdiction);
  appendIfPresent(payload, 'expectedSourceClass', draft.authorityExpectedSourceClass);
  appendIfPresent(payload, 'expectedInstitution', draft.authorityExpectedInstitution);
  appendIfPresent(payload, 'requiredInterpretationRegimeId', draft.authorityRequiredInterpretationRegimeId);

  return Object.keys(payload).length > 0 ? payload : null;
}

function buildResolverDecision(draft: LegalValidatorWorkbenchDraft): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    status: draft.resolverStatus,
  };

  if (draft.resolverStatus === 'success') {
    appendIfPresent(payload, 'mappingId', draft.resolverMappingId);
    appendIfPresent(payload, 'mappingType', draft.resolverMappingType);
    appendIfPresent(payload, 'matchBasis', draft.resolverMatchBasis);
    appendIfPresent(payload, 'conceptId', draft.resolverConceptId);
    appendIfPresent(payload, 'authorityId', draft.resolverAuthorityId);
    appendIfPresent(payload, 'resolverRuleId', draft.resolverRuleId);
    appendIfPresent(payload, 'overrideId', draft.resolverOverrideId);
    appendIfPresent(payload, 'synonymTerm', draft.resolverSynonymTerm);
    appendIfPresent(payload, 'manualOverrideReason', draft.resolverManualOverrideReason);
  } else {
    appendIfPresent(payload, 'reason', draft.resolverReason);
  }

  return payload;
}

function buildValidationDecision(draft: LegalValidatorWorkbenchDraft): Record<string, unknown> | null {
  if (draft.validationStatus === 'valid' && !draft.validationRuleIdsText.trim() && !draft.validationReason.trim()) {
    return null;
  }

  const payload: Record<string, unknown> = {
    status: draft.validationStatus,
  };

  const ruleIds = splitDelimitedText(draft.validationRuleIdsText);

  if (ruleIds.length > 0) {
    payload['validationRuleIds'] = ruleIds;
  }

  appendIfPresent(payload, 'reason', draft.validationReason);

  return Object.keys(payload).length > 1 ? payload : null;
}

function buildTraceInput(draft: LegalValidatorWorkbenchDraft): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    validationRunId: draft.validationRunId.trim(),
    resolverVersion: draft.traceResolverVersion.trim(),
    inputHash: draft.traceInputHash.trim(),
    sourceAnchors: splitDelimitedText(draft.traceSourceAnchorsText),
    interpretationUsed: draft.traceInterpretationUsed,
    manualOverrideUsed: draft.traceManualOverrideUsed,
  };

  appendIfPresent(payload, 'interpretationRegimeId', draft.traceInterpretationRegimeId);

  const overrideIds = splitDelimitedText(draft.traceOverrideIdsText);
  if (overrideIds.length > 0) {
    payload['overrideIds'] = overrideIds;
  }

  return payload;
}

function appendIfPresent(target: Record<string, string | unknown>, key: string, value: string | null | undefined): void {
  if (typeof value !== 'string') {
    return;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return;
  }

  target[key] = trimmed;
}

'use strict';

const SourceDocument = require('../sources/source-document.model');
const Matter = require('../matter/matter.model');
const segmentationService = require('../sources/segmentation.service');
const extractionService = require('../arguments/extraction.service');
const admissibilityService = require('../arguments/admissibility.service');
const doctrineLoaderService = require('../doctrine/doctrine-loader.service');
const authorityRegistryService = require('../authority/authority-registry.service');
const resolverService = require('../mapping/resolver.service');
const validationKernelService = require('../validation/validation-kernel.service');
const traceService = require('../validation/trace.service');
const {
  LEGAL_VALIDATOR_PRODUCT,
  LEGAL_VALIDATOR_SCOPE,
  LEGAL_VALIDATOR_ORCHESTRATOR_CONTRACT_VERSION,
} = require('../shared/legal-validator-runtime.contract');

const SERVICE_NAME = 'legal-validator-orchestrator.service';
const PHASE_ORDER = Object.freeze(['Pre-A', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
const EARLY_FAILURE_CODES = new Set([
  'MATTER_NOT_FOUND',
  'MATTER_CLOSED',
  'MATTER_SCOPE_MISMATCH',
  'SOURCE_DOCUMENT_NOT_FOUND',
  'SOURCE_DOCUMENT_SCOPE_MISMATCH',
  'SOURCE_DOCUMENT_UNAVAILABLE',
  'SOURCE_SEGMENTS_NOT_FOUND',
  'NO_ARGUMENT_CANDIDATES',
  'MALFORMED_ARGUMENT_EXTRACTION_CANDIDATE',
  'ARGUMENT_EXTRACTION_CONFLICT',
  'ARGUMENT_EXTRACTION_RUNTIME_FAILURE',
  'ORCHESTRATOR_RUNTIME_FAILURE',
]);

function buildPhase({ phase, label, status, service, result = null, failureCode = null, reason = null, output = null }) {
  return {
    phase,
    label,
    status,
    service,
    result,
    failureCode,
    reason,
    output,
  };
}

function buildSkippedPhase(phase, label, reason) {
  return buildPhase({
    phase,
    label,
    status: 'skipped',
    service: null,
    reason,
  });
}

function buildTerminalResponse({
  phases,
  stoppedPhase,
  result,
  failureCode,
  reason,
  request,
  validationRunWritten = false,
  validationRunId = null,
  mappingId = null,
  doctrineArtifactId = null,
  doctrineHash = null,
  authorityId = null,
}) {
  if (!EARLY_FAILURE_CODES.has(failureCode) && typeof failureCode !== 'string') {
    throw new Error(`${SERVICE_NAME} requires a stable failureCode string for terminal responses.`);
  }

  return {
    resource: 'legal-validator-orchestrator',
    status: 'terminal',
    contractVersion: LEGAL_VALIDATOR_ORCHESTRATOR_CONTRACT_VERSION,
    phaseOrder: PHASE_ORDER,
    request,
    phases,
    final: {
      stoppedPhase,
      result,
      failureCodes: failureCode ? [failureCode] : [],
      failureCode,
      reason,
      validationRunWritten,
      validationRunId,
      mappingId,
      doctrineArtifactId,
      doctrineHash,
      authorityId,
    },
  };
}

function buildCompletedResponse({
  phases,
  request,
  traceResult,
  doctrineLoadResult,
  resolverResult,
}) {
  return {
    resource: 'legal-validator-orchestrator',
    status: 'completed',
    contractVersion: LEGAL_VALIDATOR_ORCHESTRATOR_CONTRACT_VERSION,
    phaseOrder: PHASE_ORDER,
    request,
    phases,
    final: {
      stoppedPhase: 'H',
      result: traceResult.result,
      failureCodes: traceResult.failureCodes,
      failureCode: traceResult.failureCodes[0] || null,
      reason: null,
      validationRunWritten: traceResult.validationRunWritten,
      validationRunId: traceResult.validationRunId,
      mappingId: traceResult.mappingId || resolverResult.mappingId || null,
      doctrineArtifactId: traceResult.doctrineArtifactId || doctrineLoadResult.doctrineArtifactId,
      doctrineHash: traceResult.doctrineHash || doctrineLoadResult.doctrineHash,
      authorityId: resolverResult.authorityId || null,
      persistedTraceSummary: traceResult.persistedTraceSummary || null,
    },
  };
}

function createSkippedPhases(startIndex, reasonPrefix = 'Upstream phase terminated.') {
  return PHASE_ORDER.slice(startIndex).map((phase) => buildSkippedPhase(phase, phase, `${reasonPrefix} Phase ${phase} was not executed.`));
}

function validateRequestedScope(sourceDocument, request) {
  if (sourceDocument.matterId !== request.boundary.matterId) {
    return {
      failureCode: 'SOURCE_DOCUMENT_SCOPE_MISMATCH',
      reason: `SourceDocument ${sourceDocument.sourceDocumentId} belongs to matterId=${sourceDocument.matterId}, not matterId=${request.boundary.matterId}.`,
    };
  }

  return null;
}

function validateMatterScope(matter, request) {
  if (!matter) {
    return {
      failureCode: 'MATTER_NOT_FOUND',
      reason: `Matter ${request.boundary.matterId} was not found.`,
    };
  }

  if (matter.status === 'closed') {
    return {
      failureCode: 'MATTER_CLOSED',
      reason: `Matter ${matter.matterId} is closed and cannot enter validator runtime.`,
    };
  }

  if (matter.jurisdiction !== request.boundary.jurisdiction || matter.practiceArea !== request.boundary.practiceArea) {
    return {
      failureCode: 'MATTER_SCOPE_MISMATCH',
      reason: `Matter ${matter.matterId} does not match the requested jurisdiction and practice area scope.`,
    };
  }

  return null;
}

function normalizePhaseResult(result) {
  if (!result || typeof result !== 'object') {
    return null;
  }

  return result;
}

async function orchestrateLegalValidator(validatedRequest) {
  const phases = [];
  const request = {
    boundary: validatedRequest.boundary,
    sourceDocumentId: validatedRequest.orchestrator.sourceDocumentId,
    doctrineArtifactId: validatedRequest.orchestrator.doctrineArtifactId,
    traceInput: {
      validationRunId: validatedRequest.orchestrator.traceInput.validationRunId,
      resolverVersion: validatedRequest.orchestrator.traceInput.resolverVersion,
      inputHash: validatedRequest.orchestrator.traceInput.inputHash,
    },
  };

  phases.push(buildPhase({
    phase: 'Pre-A',
    label: 'Scope Lock',
    status: 'completed',
    service: 'scope-lock',
    result: 'valid',
    output: {
      product: LEGAL_VALIDATOR_PRODUCT,
      scope: LEGAL_VALIDATOR_SCOPE,
      matterId: validatedRequest.boundary.matterId,
      jurisdiction: validatedRequest.boundary.jurisdiction,
      practiceArea: validatedRequest.boundary.practiceArea,
    },
  }));

  let sourceDocument;
  let matter;
  let segmentationResult;
  let extractionResult;
  let admissibilityResult;
  let doctrineLoadResult;
  let authorityLookupResult;
  let resolverResult;
  let validationKernelResult = null;
  let traceResult;

  try {
    matter = await Matter.findOne({
      matterId: validatedRequest.boundary.matterId,
    }).exec();
  } catch (error) {
    phases.push(buildPhase({
      phase: 'A',
      label: 'Matter and Document Intake',
      status: 'terminated',
      service: 'matter.model',
      result: 'invalid',
      failureCode: 'ORCHESTRATOR_RUNTIME_FAILURE',
      reason: error.message,
    }));

    return buildTerminalResponse({
      phases: [...phases, ...createSkippedPhases(2, 'Phase A did not complete.')],
      stoppedPhase: 'A',
      result: 'invalid',
      failureCode: 'ORCHESTRATOR_RUNTIME_FAILURE',
      reason: error.message,
      request,
    });
  }

  const matterValidation = validateMatterScope(matter, validatedRequest);
  if (matterValidation) {
    phases.push(buildPhase({
      phase: 'A',
      label: 'Matter and Document Intake',
      status: 'terminated',
      service: 'matter.model',
      result: 'invalid',
      failureCode: matterValidation.failureCode,
      reason: matterValidation.reason,
      output: {
        matterId: validatedRequest.boundary.matterId,
      },
    }));

    return buildTerminalResponse({
      phases: [...phases, ...createSkippedPhases(2, 'Phase A did not complete.')],
      stoppedPhase: 'A',
      result: 'invalid',
      failureCode: matterValidation.failureCode,
      reason: matterValidation.reason,
      request,
    });
  }

  try {
    sourceDocument = await SourceDocument.findOne({
      sourceDocumentId: validatedRequest.orchestrator.sourceDocumentId,
    }).exec();
  } catch (error) {
    phases.push(buildPhase({
      phase: 'A',
      label: 'Matter and Document Intake',
      status: 'terminated',
      service: 'source-document.model',
      result: 'invalid',
      failureCode: 'ORCHESTRATOR_RUNTIME_FAILURE',
      reason: error.message,
    }));

    return buildTerminalResponse({
      phases: [...phases, ...createSkippedPhases(2, 'Phase A did not complete.')],
      stoppedPhase: 'A',
      result: 'invalid',
      failureCode: 'ORCHESTRATOR_RUNTIME_FAILURE',
      reason: error.message,
      request,
    });
  }

  if (!sourceDocument) {
    phases.push(buildPhase({
      phase: 'A',
      label: 'Matter and Document Intake',
      status: 'terminated',
      service: 'source-document.model',
      result: 'invalid',
      failureCode: 'SOURCE_DOCUMENT_NOT_FOUND',
      reason: `SourceDocument ${validatedRequest.orchestrator.sourceDocumentId} was not found.`,
    }));

    return buildTerminalResponse({
      phases: [...phases, ...createSkippedPhases(2, 'Phase A did not complete.')],
      stoppedPhase: 'A',
      result: 'invalid',
      failureCode: 'SOURCE_DOCUMENT_NOT_FOUND',
      reason: `SourceDocument ${validatedRequest.orchestrator.sourceDocumentId} was not found.`,
      request,
    });
  }

  const scopeMismatch = validateRequestedScope(sourceDocument, validatedRequest);
  if (scopeMismatch) {
    phases.push(buildPhase({
      phase: 'A',
      label: 'Matter and Document Intake',
      status: 'terminated',
      service: 'source-document.model',
      result: 'invalid',
      failureCode: scopeMismatch.failureCode,
      reason: scopeMismatch.reason,
      output: {
        sourceDocumentId: sourceDocument.sourceDocumentId,
        matterId: sourceDocument.matterId,
        documentId: sourceDocument.documentId,
      },
    }));

    return buildTerminalResponse({
      phases: [...phases, ...createSkippedPhases(2, 'Phase A did not complete.')],
      stoppedPhase: 'A',
      result: 'invalid',
      failureCode: scopeMismatch.failureCode,
      reason: scopeMismatch.reason,
      request,
      doctrineArtifactId: null,
      doctrineHash: null,
    });
  }

  try {
    segmentationResult = await segmentationService.segmentSourceDocument({
      sourceDocument,
    });
  } catch (error) {
    phases.push(buildPhase({
      phase: 'A',
      label: 'Matter and Document Intake',
      status: 'terminated',
      service: segmentationService.SERVICE_NAME,
      result: 'invalid',
      failureCode: 'SOURCE_DOCUMENT_UNAVAILABLE',
      reason: error.message,
    }));

    return buildTerminalResponse({
      phases: [...phases, ...createSkippedPhases(2, 'Phase A did not complete.')],
      stoppedPhase: 'A',
      result: 'invalid',
      failureCode: 'SOURCE_DOCUMENT_UNAVAILABLE',
      reason: error.message,
      request,
    });
  }

  phases.push(buildPhase({
    phase: 'A',
    label: 'Matter and Document Intake',
    status: 'completed',
    service: 'matter-and-document-intake',
    result: 'valid',
    output: {
      matterId: matter.matterId,
      matterStatus: matter.status,
      sourceDocumentId: segmentationResult.sourceDocumentId,
      sourceDocumentMatterId: segmentationResult.matterId,
      documentId: segmentationResult.documentId,
      contentHash: segmentationResult.contentHash,
      segmentationVersion: segmentationResult.segmentationVersion,
      segmentCount: segmentationResult.segmentCount,
    },
  }));

  phases.push(buildPhase({
    phase: 'B',
    label: 'Segmentation and Source Anchors',
    status: 'completed',
    service: segmentationService.SERVICE_NAME,
    result: 'valid',
    output: {
      segmentCount: segmentationResult.segmentCount,
      sourceAnchors: segmentationResult.sourceAnchors,
    },
  }));

  extractionResult = await extractionService.extractArgumentUnitsFromSourceDocument({
    sourceDocument,
    sourceSegments: segmentationResult.sourceSegments,
  });

  if (!extractionResult.ok) {
    phases.push(buildPhase({
      phase: 'C',
      label: 'Argument Extraction and Admissibility Gate',
      status: 'terminated',
      service: extractionService.SERVICE_NAME,
      result: extractionResult.result,
      failureCode: extractionResult.failureCode,
      reason: extractionResult.reason,
    }));

    return buildTerminalResponse({
      phases: [...phases, ...createSkippedPhases(4, 'Phase C did not complete.')],
      stoppedPhase: 'C',
      result: extractionResult.result,
      failureCode: extractionResult.failureCode,
      reason: extractionResult.reason,
      request,
      doctrineArtifactId: null,
      doctrineHash: null,
    });
  }

  admissibilityResult = await admissibilityService.evaluateArgumentUnits({
    argumentUnits: extractionResult.extractedArgumentUnits,
  });

  phases.push(buildPhase({
    phase: 'C',
    label: 'Argument Extraction and Admissibility Gate',
    status: admissibilityResult.ok ? 'completed' : 'terminated',
    service: admissibilityService.SERVICE_NAME,
    result: normalizePhaseResult(admissibilityResult).terminal ? admissibilityResult.result : 'valid',
    failureCode: admissibilityResult.ok ? null : admissibilityResult.failureCode,
    reason: admissibilityResult.ok ? null : admissibilityResult.reason,
    output: admissibilityResult.ok
      ? {
          extractionVersion: extractionResult.extractionVersion,
          extractionMethod: extractionResult.extractionMethod,
          extractedArgumentUnitIds: extractionResult.extractedArgumentUnitIds,
          eligibleArgumentUnitIds: admissibilityResult.eligibleArgumentUnits.map((argumentUnit) => argumentUnit.argumentUnitId),
          blockedArgumentUnitIds: [],
          admissibilitySummary: admissibilityResult.admissibilitySummary,
        }
      : {
          extractionVersion: extractionResult.extractionVersion,
          extractionMethod: extractionResult.extractionMethod,
          extractedArgumentUnitIds: extractionResult.extractedArgumentUnitIds,
          blockedArgumentUnitIds: admissibilityResult.blockedArgumentUnits.map((argumentUnit) => argumentUnit.argumentUnitId),
        },
  }));

  if (!admissibilityResult.ok) {
    return buildTerminalResponse({
      phases: [...phases, ...createSkippedPhases(4, 'Phase C terminated before doctrine loading.')],
      stoppedPhase: 'C',
      result: admissibilityResult.result,
      failureCode: admissibilityResult.failureCode,
      reason: admissibilityResult.reason,
      request,
      validationRunWritten: false,
    });
  }

  doctrineLoadResult = await doctrineLoaderService.loadDoctrineArtifact({
    artifactId: validatedRequest.orchestrator.doctrineArtifactId,
  });

  phases.push(buildPhase({
    phase: 'D',
    label: 'Concept Registry and Doctrine Loader',
    status: doctrineLoadResult.ok ? 'completed' : 'terminated',
    service: doctrineLoaderService.SERVICE_NAME,
    result: doctrineLoadResult.ok ? 'valid' : doctrineLoadResult.result,
    failureCode: doctrineLoadResult.ok ? null : doctrineLoadResult.failureCode,
    reason: doctrineLoadResult.ok ? null : doctrineLoadResult.reason,
    output: doctrineLoadResult.ok
      ? {
          doctrineArtifactId: doctrineLoadResult.doctrineArtifactId,
          doctrineHash: doctrineLoadResult.doctrineHash,
          packageId: doctrineLoadResult.packageId,
          version: doctrineLoadResult.version,
          interpretationRegimeId: doctrineLoadResult.interpretationRegime?.regimeId || null,
          conceptSetVersion: doctrineLoadResult.conceptSetVersion,
          coreConceptsReferenced: doctrineLoadResult.coreConceptsReferenced,
          resolvedCoreConceptIds: doctrineLoadResult.resolvedCoreConceptIds,
          packageConceptsDeclared: doctrineLoadResult.packageConceptsDeclared,
        }
      : {
          doctrineArtifactId: doctrineLoadResult.doctrineArtifactId || null,
          doctrineHash: doctrineLoadResult.doctrineHash || null,
        },
  }));

  if (!doctrineLoadResult.ok) {
    return buildTerminalResponse({
      phases: [...phases, ...createSkippedPhases(5, 'Phase D terminated before authority resolution.')],
      stoppedPhase: 'D',
      result: doctrineLoadResult.result,
      failureCode: doctrineLoadResult.failureCode,
      reason: doctrineLoadResult.reason,
      request,
      doctrineArtifactId: doctrineLoadResult.doctrineArtifactId || null,
      doctrineHash: doctrineLoadResult.doctrineHash || null,
    });
  }

  authorityLookupResult = await authorityRegistryService.resolveAuthority({
    doctrineLoadResult,
    admissibilityResult,
    authorityInput: validatedRequest.orchestrator.authorityInput || null,
  });

  phases.push(buildPhase({
    phase: 'E',
    label: 'Authority Registry and Citation Scope Law',
    status: authorityLookupResult.ok ? 'completed' : 'terminated',
    service: authorityRegistryService.SERVICE_NAME,
    result: authorityLookupResult.ok ? 'valid' : authorityLookupResult.result,
    failureCode: authorityLookupResult.ok ? null : authorityLookupResult.failureCode,
    reason: authorityLookupResult.ok ? null : authorityLookupResult.reason,
    output: authorityLookupResult.ok
      ? {
          authorityId: authorityLookupResult.authorityId,
          citation: authorityLookupResult.citation,
          authorityType: authorityLookupResult.authorityType,
          sourceClass: authorityLookupResult.sourceClass,
          jurisdiction: authorityLookupResult.jurisdiction,
          effectiveDate: authorityLookupResult.effectiveDate,
          endDate: authorityLookupResult.endDate,
          precedentialWeight: authorityLookupResult.precedentialWeight,
          interpretationRegimeId: authorityLookupResult.interpretationRegimeId,
          citationScope: authorityLookupResult.citationScope,
        }
      : {
          authorityId: authorityLookupResult.authorityId || null,
          citation: authorityLookupResult.citation || null,
          authorityType: authorityLookupResult.authorityType || null,
          sourceClass: authorityLookupResult.sourceClass || null,
          jurisdiction: authorityLookupResult.jurisdiction || null,
          effectiveDate: authorityLookupResult.effectiveDate || null,
          endDate: authorityLookupResult.endDate || null,
          precedentialWeight: authorityLookupResult.precedentialWeight || null,
          citationScope: authorityLookupResult.citationScope || null,
        },
  }));

  if (!authorityLookupResult.ok) {
    return buildTerminalResponse({
      phases: [...phases, ...createSkippedPhases(6, 'Phase E terminated before mapping.')],
      stoppedPhase: 'E',
      result: authorityLookupResult.result,
      failureCode: authorityLookupResult.failureCode,
      reason: authorityLookupResult.reason,
      request,
      doctrineArtifactId: doctrineLoadResult.doctrineArtifactId,
      doctrineHash: doctrineLoadResult.doctrineHash,
      authorityId: authorityLookupResult.authorityId || null,
    });
  }

  resolverResult = await resolverService.resolve({
    doctrineLoadResult,
    admissibilityResult,
    authorityLookupResult,
    resolverDecision: validatedRequest.orchestrator.resolverDecision || null,
  });

  phases.push(buildPhase({
    phase: 'F',
    label: 'Mapping Engine and Synonym Governance',
    status: resolverResult.ok ? 'completed' : 'terminated',
    service: resolverService.SERVICE_NAME,
    result: resolverResult.ok ? 'valid' : resolverResult.result,
    failureCode: resolverResult.ok ? null : resolverResult.failureCode,
    reason: resolverResult.ok ? null : resolverResult.reason,
    output: resolverResult.ok
      ? {
          mappingId: resolverResult.mappingId,
          mappingStatus: resolverResult.mappingStatus,
          mappingType: resolverResult.mappingType,
          matchBasis: resolverResult.matchBasis,
          conceptId: resolverResult.conceptId,
          authorityId: resolverResult.authorityId,
          overrideId: resolverResult.overrideId,
          manualOverrideReason: resolverResult.manualOverrideReason,
          synonymTerm: resolverResult.synonymTerm,
          resolverRuleId: resolverResult.resolverRuleId,
          mappingWritten: resolverResult.mappingWritten,
        }
      : {
          mappingWritten: false,
          mappingId: resolverResult.mappingId || null,
          matchBasis: resolverResult.matchBasis || null,
          conceptId: resolverResult.conceptId || null,
          authorityId: resolverResult.authorityId || null,
          overrideId: resolverResult.overrideId || null,
          synonymTerm: resolverResult.synonymTerm || null,
        },
  }));

  if (resolverResult.ok) {
    validationKernelResult = await validationKernelService.evaluate({
      doctrineLoadResult,
      resolverResult,
      authorityLookupResult,
    });

    phases.push(buildPhase({
      phase: 'G',
      label: 'Validation Kernel',
      status: validationKernelResult.ok ? 'completed' : 'terminated',
      service: validationKernelService.SERVICE_NAME,
      result: validationKernelResult.ok ? 'valid' : validationKernelResult.result,
      failureCode: validationKernelResult.ok ? null : validationKernelResult.failureCode,
      reason: validationKernelResult.ok ? null : validationKernelResult.reason,
      output: validationKernelResult.ok
        ? {
            validationOutcome: validationKernelResult.validationOutcome,
            validationRuleIds: validationKernelResult.validationRuleIds,
            validationWritten: validationKernelResult.validationWritten,
          }
        : {
            validationWritten: false,
          },
    }));
  } else {
    phases.push(buildSkippedPhase('G', 'Validation Kernel', 'Resolver terminated before validation kernel execution.'));
  }

  traceResult = await traceService.finalize({
    doctrineLoadResult,
    resolverResult,
    validationKernelResult,
    authorityLookupResult,
    extractionResult,
    authorityInput: validatedRequest.orchestrator.authorityInput || null,
    resolverDecision: validatedRequest.orchestrator.resolverDecision || null,
    validationDecision: validatedRequest.orchestrator.validationDecision || null,
    traceInput: {
      ...validatedRequest.orchestrator.traceInput,
      sourceAnchors: extractionResult.sourceAnchors,
    },
  });

  phases.push(buildPhase({
    phase: 'H',
    label: 'Failure Codes, Trace, and Replay Artifact Support',
    status: traceResult.ok ? 'completed' : 'terminated',
    service: traceService.SERVICE_NAME,
    result: traceResult.ok ? traceResult.result : traceResult.result,
    failureCode: traceResult.ok ? null : traceResult.failureCode,
    reason: traceResult.ok ? null : traceResult.reason,
    output: traceResult.ok
      ? {
          validationRunId: traceResult.validationRunId,
          validationRunWritten: traceResult.validationRunWritten,
          persistedTraceSummary: traceResult.persistedTraceSummary,
        }
      : {
          validationRunWritten: false,
        },
  }));

  if (!traceResult.ok) {
    return buildTerminalResponse({
      phases,
      stoppedPhase: 'H',
      result: traceResult.result,
      failureCode: traceResult.failureCode,
      reason: traceResult.reason,
      request,
      validationRunWritten: traceResult.validationRunWritten,
      validationRunId: traceResult.validationRunId || null,
      mappingId: resolverResult.mappingId || null,
      doctrineArtifactId: doctrineLoadResult.doctrineArtifactId,
      doctrineHash: doctrineLoadResult.doctrineHash,
      authorityId: authorityLookupResult.authorityId || null,
    });
  }

  return buildCompletedResponse({
    phases,
    request,
    traceResult,
    doctrineLoadResult,
    resolverResult,
  });
}

module.exports = {
  SERVICE_NAME,
  PHASE_ORDER,
  orchestrateLegalValidator,
};

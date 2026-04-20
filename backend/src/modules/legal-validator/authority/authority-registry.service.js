'use strict';

const AuthorityNode = require('./authority-node.model');

const SERVICE_NAME = 'authority-registry.service';
const OWNED_FAILURE_CODES = new Set([
  'NO_SOURCE_AUTHORITY',
  'AUTHORITY_NOT_IDENTIFIABLE',
  'UNRECOGNIZED_SOURCE_INSTITUTION',
  'AUTHORITY_SCOPE_VIOLATION',
  'SUPERSEDED_AUTHORITY',
]);

function normalizeStringArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.filter((value) => typeof value === 'string' && value.trim().length > 0);
}

function buildAuthorityContext({
  argumentUnitId,
  matterId,
  documentId,
  doctrineArtifactId,
  doctrineHash,
  authorityId = null,
  citation = null,
}) {
  return {
    argumentUnitId,
    matterId,
    documentId,
    doctrineArtifactId,
    doctrineHash,
    authorityId,
    citation,
    authorityResolved: false,
  };
}

function buildCitationScopeSnapshot({ doctrineLoadResult, normalizedAuthorityInput, authorityNode = null }) {
  const doctrineManifest = doctrineLoadResult?.manifest || {};

  return {
    doctrineArtifactId: doctrineLoadResult?.doctrineArtifactId || null,
    doctrineHash: doctrineLoadResult?.doctrineHash || null,
    doctrineJurisdiction: doctrineManifest.jurisdiction || null,
    doctrineSourceClasses: normalizeStringArray(doctrineManifest.sourceClasses),
    doctrineAuthorityIds: normalizeStringArray(doctrineManifest.authorityIds),
    requiredInterpretationRegimeId: normalizedAuthorityInput?.requiredInterpretationRegimeId
      || doctrineLoadResult?.interpretationRegime?.regimeId
      || null,
    expectedJurisdiction: normalizedAuthorityInput?.expectedJurisdiction || null,
    expectedSourceClass: normalizedAuthorityInput?.expectedSourceClass || null,
    expectedInstitution: normalizedAuthorityInput?.expectedInstitution || null,
    evaluationDate: normalizedAuthorityInput?.evaluationDate || null,
    requestedAuthorityId: normalizedAuthorityInput?.authorityId || null,
    requestedCitation: normalizedAuthorityInput?.citation || null,
    authorityId: authorityNode?.authorityId || null,
    authorityCitation: authorityNode?.citation || null,
    authorityType: authorityNode?.authorityType || null,
    authoritySourceClass: authorityNode?.sourceClass || null,
    authorityInstitution: authorityNode?.institution || null,
    authorityJurisdiction: authorityNode?.jurisdiction || null,
    authorityEffectiveDate: authorityNode?.effectiveDate || null,
    authorityEndDate: authorityNode?.endDate || null,
    precedentialWeight: authorityNode?.precedentialWeight || null,
  };
}

function buildAuthorityNodeSnapshot(authorityNode) {
  if (!authorityNode) {
    return {
      authorityId: null,
      citation: null,
      authorityType: null,
      sourceClass: null,
      institution: null,
      jurisdiction: null,
      effectiveDate: null,
      endDate: null,
      precedentialWeight: null,
      authorityResolved: false,
    };
  }

  return {
    authorityId: authorityNode.authorityId,
    citation: authorityNode.citation,
    authorityType: authorityNode.authorityType,
    sourceClass: authorityNode.sourceClass,
    institution: authorityNode.institution,
    jurisdiction: authorityNode.jurisdiction,
    effectiveDate: authorityNode.effectiveDate,
    endDate: authorityNode.endDate,
    precedentialWeight: authorityNode.precedentialWeight,
    authorityResolved: false,
  };
}

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

function buildContinueResult({ context, authorityNode, citationScope }) {
  return {
    ok: true,
    terminal: false,
    service: SERVICE_NAME,
    argumentUnitId: context.argumentUnitId,
    matterId: context.matterId,
    documentId: context.documentId,
    doctrineArtifactId: context.doctrineArtifactId,
    doctrineHash: context.doctrineHash,
    authorityId: authorityNode.authorityId,
    citation: authorityNode.citation,
    authorityType: authorityNode.authorityType,
    sourceClass: authorityNode.sourceClass,
    institution: authorityNode.institution,
    jurisdiction: authorityNode.jurisdiction,
    effectiveDate: authorityNode.effectiveDate,
    endDate: authorityNode.endDate,
    precedentialWeight: authorityNode.precedentialWeight,
    interpretationRegimeId: authorityNode.attribution?.interpretationRegimeId || null,
    citationScope,
    authorityResolved: true,
  };
}

function assertContinueInput(name, value) {
  if (!value || value.ok !== true || value.terminal !== false) {
    throw new Error(`${SERVICE_NAME} requires a continue outcome from ${name}.`);
  }
}

function getArgumentUnitContext(admissibilityResult) {
  const eligibleArgumentUnit = Array.isArray(admissibilityResult.eligibleArgumentUnits)
    ? admissibilityResult.eligibleArgumentUnits[0]
    : null;

  const argumentUnitId = admissibilityResult.argumentUnitId || eligibleArgumentUnit?.argumentUnitId || null;
  const matterId = admissibilityResult.matterId || eligibleArgumentUnit?.matterId || null;
  const documentId = admissibilityResult.documentId || eligibleArgumentUnit?.documentId || null;

  if (!argumentUnitId || !matterId || !documentId) {
    throw new Error(`${SERVICE_NAME} requires argumentUnitId, matterId, and documentId from admissibility.service.`);
  }

  return {
    argumentUnitId,
    matterId,
    documentId,
  };
}

function normalizeAuthorityInput({ authorityInput = null, authorityId = null, citation = null } = {}) {
  const normalizedInput = authorityInput && typeof authorityInput === 'object'
    ? authorityInput
    : {};

  const normalizedAuthorityId = typeof (normalizedInput.authorityId || authorityId) === 'string'
    && (normalizedInput.authorityId || authorityId).trim().length > 0
    ? (normalizedInput.authorityId || authorityId).trim()
    : null;

  const normalizedCitation = typeof (normalizedInput.citation || citation) === 'string'
    && (normalizedInput.citation || citation).trim().length > 0
    ? (normalizedInput.citation || citation).trim()
    : null;

  return {
    authorityId: normalizedAuthorityId,
    citation: normalizedCitation,
    evaluationDate: normalizedInput.evaluationDate || null,
    expectedJurisdiction: normalizedInput.expectedJurisdiction || null,
    expectedSourceClass: normalizedInput.expectedSourceClass || null,
    expectedInstitution: normalizedInput.expectedInstitution || null,
    requiredInterpretationRegimeId: normalizedInput.requiredInterpretationRegimeId || null,
  };
}

function parseEvaluationDate(evaluationDate) {
  if (!evaluationDate) {
    return null;
  }

  const parsedDate = evaluationDate instanceof Date ? evaluationDate : new Date(evaluationDate);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`${SERVICE_NAME} requires a valid evaluationDate when one is supplied.`);
  }

  return parsedDate;
}

async function loadAuthorityCandidate(normalizedAuthorityInput, context, citationScope) {
  if (!normalizedAuthorityInput.authorityId && !normalizedAuthorityInput.citation) {
    return buildTerminalResult({
      failureCode: 'NO_SOURCE_AUTHORITY',
      reason: 'Authority resolution requires a source-identifiable authority reference.',
      extras: {
        ...context,
        citationScope,
      },
    });
  }

  if (normalizedAuthorityInput.authorityId) {
    const authorityNode = await AuthorityNode.findOne({ authorityId: normalizedAuthorityInput.authorityId }).lean().exec();

    if (!authorityNode) {
      return buildTerminalResult({
        failureCode: 'AUTHORITY_NOT_IDENTIFIABLE',
        reason: `Authority ${normalizedAuthorityInput.authorityId} could not be resolved to a single AuthorityNode.`,
        extras: {
          ...context,
          citationScope,
        },
      });
    }

    if (normalizedAuthorityInput.citation && authorityNode.citation !== normalizedAuthorityInput.citation) {
      return buildTerminalResult({
        failureCode: 'AUTHORITY_NOT_IDENTIFIABLE',
        reason: `Authority ${normalizedAuthorityInput.authorityId} does not match the claimed citation.`,
        extras: {
          ...context,
          citationScope,
        },
      });
    }

    return {
      ok: true,
      terminal: false,
      authorityNode,
    };
  }

  const citationMatches = await AuthorityNode.find({ citation: normalizedAuthorityInput.citation }).lean().exec();

  if (citationMatches.length !== 1) {
    return buildTerminalResult({
      failureCode: 'AUTHORITY_NOT_IDENTIFIABLE',
      reason: `Citation ${normalizedAuthorityInput.citation} could not be resolved to a single AuthorityNode.`,
      extras: {
        ...context,
        citationScope,
      },
    });
  }

  return {
    ok: true,
    terminal: false,
    authorityNode: citationMatches[0],
  };
}

function validateAuthorityNode(authorityNode, doctrineLoadResult, normalizedAuthorityInput, context) {
  const doctrineManifest = doctrineLoadResult.manifest || {};
  const doctrineJurisdiction = normalizedAuthorityInput.expectedJurisdiction || doctrineManifest.jurisdiction || null;
  const requiredInterpretationRegimeId = normalizedAuthorityInput.requiredInterpretationRegimeId
    || doctrineLoadResult.interpretationRegime?.regimeId
    || null;
  const evaluationDate = parseEvaluationDate(normalizedAuthorityInput.evaluationDate);
  const authoritySnapshot = buildAuthorityNodeSnapshot(authorityNode);

  if (authorityNode.doctrineArtifactId !== doctrineLoadResult.doctrineArtifactId) {
    return buildTerminalResult({
      failureCode: 'AUTHORITY_SCOPE_VIOLATION',
      reason: `Authority ${authorityNode.authorityId} does not belong to the loaded doctrine artifact.`,
      extras: {
        ...context,
        ...authoritySnapshot,
      },
    });
  }

  if (
    Array.isArray(doctrineManifest.authorityIds)
    && doctrineManifest.authorityIds.length > 0
    && !doctrineManifest.authorityIds.includes(authorityNode.authorityId)
  ) {
    return buildTerminalResult({
      failureCode: 'AUTHORITY_SCOPE_VIOLATION',
      reason: `Authority ${authorityNode.authorityId} is outside the authority scope declared by the doctrine artifact.`,
      extras: {
        ...context,
        ...authoritySnapshot,
      },
    });
  }

  if (
    Array.isArray(doctrineManifest.sourceClasses)
    && doctrineManifest.sourceClasses.length > 0
    && !doctrineManifest.sourceClasses.includes(authorityNode.sourceClass)
  ) {
    return buildTerminalResult({
      failureCode: 'UNRECOGNIZED_SOURCE_INSTITUTION',
      reason: `Authority ${authorityNode.authorityId} uses sourceClass=${authorityNode.sourceClass}, which is not recognized by the doctrine artifact.`,
      extras: {
        ...context,
        ...authoritySnapshot,
      },
    });
  }

  if (normalizedAuthorityInput.expectedSourceClass && authorityNode.sourceClass !== normalizedAuthorityInput.expectedSourceClass) {
    return buildTerminalResult({
      failureCode: 'UNRECOGNIZED_SOURCE_INSTITUTION',
      reason: `Authority ${authorityNode.authorityId} does not match the required sourceClass.`,
      extras: {
        ...context,
        ...authoritySnapshot,
      },
    });
  }

  if (normalizedAuthorityInput.expectedInstitution && authorityNode.institution !== normalizedAuthorityInput.expectedInstitution) {
    return buildTerminalResult({
      failureCode: 'UNRECOGNIZED_SOURCE_INSTITUTION',
      reason: `Authority ${authorityNode.authorityId} does not match the required institution.`,
      extras: {
        ...context,
        ...authoritySnapshot,
      },
    });
  }

  if (doctrineJurisdiction && authorityNode.jurisdiction !== doctrineJurisdiction) {
    return buildTerminalResult({
      failureCode: 'AUTHORITY_SCOPE_VIOLATION',
      reason: `Authority ${authorityNode.authorityId} falls outside the required jurisdiction scope.`,
      extras: {
        ...context,
        ...authoritySnapshot,
      },
    });
  }

  if (
    requiredInterpretationRegimeId
    && authorityNode.attribution?.interpretationRegimeId !== requiredInterpretationRegimeId
  ) {
    return buildTerminalResult({
      failureCode: 'AUTHORITY_SCOPE_VIOLATION',
      reason: `Authority ${authorityNode.authorityId} does not use the interpretation regime required by the loaded doctrine.`,
      extras: {
        ...context,
        ...authoritySnapshot,
      },
    });
  }

  if (authorityNode.status !== 'active') {
    return buildTerminalResult({
      failureCode: 'SUPERSEDED_AUTHORITY',
      reason: `Authority ${authorityNode.authorityId} is not operative because its status is ${authorityNode.status}.`,
      extras: {
        ...context,
        ...authoritySnapshot,
      },
    });
  }

  if (evaluationDate && evaluationDate < new Date(authorityNode.effectiveDate)) {
    return buildTerminalResult({
      failureCode: 'SUPERSEDED_AUTHORITY',
      reason: `Authority ${authorityNode.authorityId} is not operative for the requested evaluation date.`,
      extras: {
        ...context,
        ...authoritySnapshot,
      },
    });
  }

  if (evaluationDate && authorityNode.endDate && evaluationDate > new Date(authorityNode.endDate)) {
    return buildTerminalResult({
      failureCode: 'SUPERSEDED_AUTHORITY',
      reason: `Authority ${authorityNode.authorityId} is no longer operative for the requested evaluation date.`,
      extras: {
        ...context,
        ...authoritySnapshot,
      },
    });
  }

  return {
    ok: true,
    terminal: false,
  };
}

async function resolveAuthority({
  doctrineLoadResult,
  admissibilityResult,
  authorityInput = null,
  authorityId = null,
  citation = null,
} = {}) {
  assertContinueInput('doctrine-loader.service', doctrineLoadResult);
  assertContinueInput('admissibility.service', admissibilityResult);

  const argumentUnitContext = getArgumentUnitContext(admissibilityResult);
  const normalizedAuthorityInput = normalizeAuthorityInput({
    authorityInput,
    authorityId,
    citation,
  });

  const context = buildAuthorityContext({
    ...argumentUnitContext,
    doctrineArtifactId: doctrineLoadResult.doctrineArtifactId,
    doctrineHash: doctrineLoadResult.doctrineHash,
    authorityId: normalizedAuthorityInput.authorityId,
    citation: normalizedAuthorityInput.citation,
  });
  const citationScope = buildCitationScopeSnapshot({
    doctrineLoadResult,
    normalizedAuthorityInput,
  });

  const authorityLookupResult = await loadAuthorityCandidate(normalizedAuthorityInput, context, citationScope);

  if (authorityLookupResult.terminal) {
    return authorityLookupResult;
  }

  const { authorityNode } = authorityLookupResult;
  const authorityNodeValidation = validateAuthorityNode(
    authorityNode,
    doctrineLoadResult,
    normalizedAuthorityInput,
    {
      ...context,
      citationScope: buildCitationScopeSnapshot({
        doctrineLoadResult,
        normalizedAuthorityInput,
        authorityNode,
      }),
      authorityId: authorityNode.authorityId,
      citation: authorityNode.citation,
    },
  );

  if (authorityNodeValidation.terminal) {
    return authorityNodeValidation;
  }

  return buildContinueResult({
    context,
    authorityNode,
    citationScope: buildCitationScopeSnapshot({
      doctrineLoadResult,
      normalizedAuthorityInput,
      authorityNode,
    }),
  });
}

module.exports = {
  SERVICE_NAME,
  OWNED_FAILURE_CODES,
  resolveAuthority,
  buildTerminalResult,
  buildContinueResult,
};

'use strict';

const { CONCEPT_SET_VERSION } = require('../../concepts/constants');
const { getConceptById, loadConceptSet } = require('../../concepts/concept-loader');
const { isLiveConceptId } = require('../../concepts/admission-state');

const SERVICE_NAME = 'concept-registry.service';
const OWNED_FAILURE_CODES = new Set([
  'CONCEPT_REGISTRY_UNAVAILABLE',
  'DOCTRINE_CONCEPT_REFERENCE_INVALID',
  'DOCTRINE_CORE_CONCEPT_UNREGISTERED',
  'DOCTRINE_PACKAGE_CONCEPT_COLLISION',
  'DOCTRINE_CONCEPT_REGISTRY_RUNTIME_FAILURE',
]);

let cachedConceptRegistry = null;

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

function normalizeConceptIds(values, fieldName) {
  if (values == null) {
    return {
      ok: true,
      value: [],
    };
  }

  if (!Array.isArray(values)) {
    return {
      ok: false,
      failureCode: 'DOCTRINE_CONCEPT_REFERENCE_INVALID',
      reason: `Doctrine manifest ${fieldName} must be an array of concept IDs.`,
    };
  }

  const normalizedValues = values.map((value) => {
    if (typeof value !== 'string' || value.trim() === '') {
      return null;
    }

    return value.trim();
  });

  if (normalizedValues.some((value) => value == null)) {
    return {
      ok: false,
      failureCode: 'DOCTRINE_CONCEPT_REFERENCE_INVALID',
      reason: `Doctrine manifest ${fieldName} must contain only non-empty concept IDs.`,
    };
  }

  if (new Set(normalizedValues).size !== normalizedValues.length) {
    return {
      ok: false,
      failureCode: 'DOCTRINE_CONCEPT_REFERENCE_INVALID',
      reason: `Doctrine manifest ${fieldName} must not contain duplicate concept IDs.`,
    };
  }

  return {
    ok: true,
    value: normalizedValues,
  };
}

function buildResolvedConceptSummary(concept) {
  return {
    conceptId: concept.conceptId,
    title: concept.title,
    domain: concept.domain,
    version: concept.version,
  };
}

function loadValidatorConceptRegistry() {
  if (cachedConceptRegistry) {
    return cachedConceptRegistry;
  }

  try {
    const liveConcepts = loadConceptSet();
    const liveConceptIds = liveConcepts.map((concept) => concept.conceptId);
    const liveConceptsById = new Map(liveConcepts.map((concept) => [concept.conceptId, concept]));

    cachedConceptRegistry = Object.freeze({
      ok: true,
      terminal: false,
      service: SERVICE_NAME,
      conceptSetVersion: CONCEPT_SET_VERSION,
      liveConceptIds: Object.freeze([...liveConceptIds]),
      liveConceptsById,
    });

    return cachedConceptRegistry;
  } catch (error) {
    return buildTerminalResult(
      'CONCEPT_REGISTRY_UNAVAILABLE',
      error.message,
    );
  }
}

function resolveDoctrineConceptBindings(doctrineArtifact) {
  try {
    const registryResult = loadValidatorConceptRegistry();

    if (!registryResult.ok) {
      return registryResult;
    }

    const coreConceptsResult = normalizeConceptIds(
      doctrineArtifact?.manifest?.coreConceptsReferenced,
      'coreConceptsReferenced',
    );

    if (!coreConceptsResult.ok) {
      return buildTerminalResult(
        coreConceptsResult.failureCode,
        coreConceptsResult.reason,
        {
          doctrineArtifactId: doctrineArtifact?.artifactId || null,
          doctrineHash: doctrineArtifact?.hash || null,
        },
      );
    }

    const packageConceptsResult = normalizeConceptIds(
      doctrineArtifact?.manifest?.packageConceptsDeclared,
      'packageConceptsDeclared',
    );

    if (!packageConceptsResult.ok) {
      return buildTerminalResult(
        packageConceptsResult.failureCode,
        packageConceptsResult.reason,
        {
          doctrineArtifactId: doctrineArtifact?.artifactId || null,
          doctrineHash: doctrineArtifact?.hash || null,
        },
      );
    }

    const resolvedCoreConcepts = [];

    for (const conceptId of coreConceptsResult.value) {
      if (!isLiveConceptId(conceptId) || !registryResult.liveConceptsById.has(conceptId)) {
        return buildTerminalResult(
          'DOCTRINE_CORE_CONCEPT_UNREGISTERED',
          `Doctrine artifact ${doctrineArtifact.artifactId} references core concept "${conceptId}" that is not live in the concept registry.`,
          {
            doctrineArtifactId: doctrineArtifact.artifactId,
            doctrineHash: doctrineArtifact.hash,
            conceptId,
          },
        );
      }

      resolvedCoreConcepts.push(buildResolvedConceptSummary(
        registryResult.liveConceptsById.get(conceptId),
      ));
    }

    for (const conceptId of packageConceptsResult.value) {
      const registeredConcept = getConceptById(conceptId);

      if (registeredConcept) {
        return buildTerminalResult(
          'DOCTRINE_PACKAGE_CONCEPT_COLLISION',
          `Doctrine artifact ${doctrineArtifact.artifactId} declares package concept "${conceptId}" that collides with a registered concept identity.`,
          {
            doctrineArtifactId: doctrineArtifact.artifactId,
            doctrineHash: doctrineArtifact.hash,
            conceptId,
          },
        );
      }
    }

    return {
      ok: true,
      terminal: false,
      service: SERVICE_NAME,
      conceptSetVersion: registryResult.conceptSetVersion,
      liveConceptIds: registryResult.liveConceptIds,
      coreConceptsReferenced: coreConceptsResult.value,
      packageConceptsDeclared: packageConceptsResult.value,
      resolvedCoreConcepts,
      resolvedCoreConceptIds: resolvedCoreConcepts.map((concept) => concept.conceptId),
    };
  } catch (error) {
    if (error && error.terminal) {
      return error;
    }

    return buildTerminalResult(
      'DOCTRINE_CONCEPT_REGISTRY_RUNTIME_FAILURE',
      error.message,
      {
        doctrineArtifactId: doctrineArtifact?.artifactId || null,
        doctrineHash: doctrineArtifact?.hash || null,
      },
    );
  }
}

module.exports = {
  SERVICE_NAME,
  OWNED_FAILURE_CODES,
  loadValidatorConceptRegistry,
  resolveDoctrineConceptBindings,
  buildTerminalResult,
  normalizeConceptIds,
};

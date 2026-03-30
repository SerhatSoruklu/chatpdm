'use strict';

const DoctrineArtifact = require('./doctrine-artifact.model');

const SERVICE_NAME = 'doctrine-loader.service';
const OWNED_FAILURE_CODES = new Set([
  'DOCTRINE_NOT_RECOGNIZED',
  'INTERPRETATION_RULE_UNSPECIFIED',
  'DOCTRINE_HASH_MISMATCH',
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

function buildContinueResult(doctrineArtifact) {
  return {
    ok: true,
    terminal: false,
    service: SERVICE_NAME,
    doctrineArtifact,
    doctrineArtifactId: doctrineArtifact.artifactId,
    doctrineHash: doctrineArtifact.hash,
    packageId: doctrineArtifact.packageId,
    version: doctrineArtifact.version,
    manifest: doctrineArtifact.manifest,
    interpretationRegime: doctrineArtifact.manifest.interpretationRegime,
    runtimeEligible: true,
  };
}

function hasDeclaredInterpretationRegime(doctrineArtifact) {
  return Boolean(
    doctrineArtifact?.manifest?.interpretationRegime?.regimeId
      && doctrineArtifact?.manifest?.interpretationRegime?.name,
  );
}

async function loadDoctrineArtifact({ artifactId = null, doctrineHash = null } = {}) {
  if (!artifactId && !doctrineHash) {
    return buildTerminalResult(
      'DOCTRINE_NOT_RECOGNIZED',
      'Doctrine loading requires artifactId or doctrineHash.',
    );
  }

  let doctrineArtifact = null;

  if (artifactId) {
    doctrineArtifact = await DoctrineArtifact.findOne({ artifactId }).exec();

    if (!doctrineArtifact) {
      return buildTerminalResult(
        'DOCTRINE_NOT_RECOGNIZED',
        `No doctrine artifact found for artifactId=${artifactId}.`,
      );
    }

    if (doctrineHash && doctrineArtifact.hash !== doctrineHash) {
      return buildTerminalResult(
        'DOCTRINE_HASH_MISMATCH',
        `Doctrine artifact ${artifactId} does not match the expected doctrineHash.`,
        {
          doctrineArtifactId: doctrineArtifact.artifactId,
          doctrineHash: doctrineArtifact.hash,
        },
      );
    }
  } else {
    doctrineArtifact = await DoctrineArtifact.findOne({ hash: doctrineHash }).exec();

    if (!doctrineArtifact) {
      return buildTerminalResult(
        'DOCTRINE_NOT_RECOGNIZED',
        `No doctrine artifact found for doctrineHash=${doctrineHash}.`,
      );
    }
  }

  if (!doctrineArtifact.isRuntimeEligibleForValidation()) {
    return buildTerminalResult(
      'DOCTRINE_NOT_RECOGNIZED',
      `Doctrine artifact ${doctrineArtifact.artifactId} is not runtime-eligible under governance.status=${doctrineArtifact.governance.status}.`,
      {
        doctrineArtifactId: doctrineArtifact.artifactId,
        doctrineHash: doctrineArtifact.hash,
      },
    );
  }

  if (!hasDeclaredInterpretationRegime(doctrineArtifact)) {
    return buildTerminalResult(
      'INTERPRETATION_RULE_UNSPECIFIED',
      `Doctrine artifact ${doctrineArtifact.artifactId} does not declare an interpretation regime.`,
      {
        doctrineArtifactId: doctrineArtifact.artifactId,
        doctrineHash: doctrineArtifact.hash,
      },
    );
  }

  return buildContinueResult(doctrineArtifact);
}

module.exports = {
  SERVICE_NAME,
  OWNED_FAILURE_CODES,
  loadDoctrineArtifact,
  buildTerminalResult,
};

'use strict';

const {
  ZEE_INTERNAL_ENGINE_COMPARATOR_POLICY,
  ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORT_POLICY,
  ZEE_INTERNAL_ENGINE_POLICY_MANIFEST,
  ZEE_INTERNAL_ENGINE_RESULT_TAXONOMY,
  ZEE_INTERNAL_ENGINE_RESULT_TAXONOMY_VERSION,
  ZEE_INTERNAL_ENGINE_TRACE_CONTRACT,
} = require('./constants');
const {
  createZeeArtifactMarker,
} = require('./artifact-markers');

const ZEE_REPLAY_MANIFEST_LAYER = 'Replay Manifest';
const ZEE_REPLAY_MANIFEST_VERSION = 'v1';

function buildReplayManifestBase(manifestType, artifactId) {
  return {
    ...createZeeArtifactMarker('replay_manifest'),
    artifactId,
    layer: ZEE_REPLAY_MANIFEST_LAYER,
    manifestType,
    manifestVersion: ZEE_REPLAY_MANIFEST_VERSION,
    ordering: Object.freeze({
      caseOrdering: 'case_id_utf8_nfc_bytewise',
      frameOrdering: 'frame_identity_utf8_nfc_bytewise',
      objectKeyOrdering: ZEE_INTERNAL_ENGINE_COMPARATOR_POLICY.ordering,
    }),
    serialization: Object.freeze({
      objectKeyOrdering: ZEE_INTERNAL_ENGINE_COMPARATOR_POLICY.ordering,
      textNormalization: 'nfc',
    }),
    policyVersion: ZEE_INTERNAL_ENGINE_POLICY_MANIFEST.version,
    resultTaxonomy: ZEE_INTERNAL_ENGINE_RESULT_TAXONOMY,
    resultTaxonomyVersion: ZEE_INTERNAL_ENGINE_RESULT_TAXONOMY_VERSION,
    schemaVersion: ZEE_INTERNAL_ENGINE_TRACE_CONTRACT.replayManifestSchemaVersion,
    supportPolicy: ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORT_POLICY,
    traceContract: ZEE_INTERNAL_ENGINE_TRACE_CONTRACT,
  };
}

function buildZeeReplayCaseManifest({
  artifactId,
  caseId,
  frameArtifactIds,
  frameCount,
  inputArtifactId,
}) {
  return Object.freeze({
    ...buildReplayManifestBase('case', artifactId),
    caseId,
    frameArtifactIds: Object.freeze([...frameArtifactIds]),
    frameCount,
    inputArtifactId,
  });
}

function buildZeeReplaySuiteManifest({
  artifactId,
  caseCount,
  caseIds,
  suiteId,
}) {
  return Object.freeze({
    ...buildReplayManifestBase('suite', artifactId),
    caseCount,
    caseIds: Object.freeze([...caseIds]),
    suiteId,
  });
}

module.exports = {
  ZEE_REPLAY_MANIFEST_LAYER,
  ZEE_REPLAY_MANIFEST_VERSION,
  buildZeeReplayCaseManifest,
  buildZeeReplaySuiteManifest,
};

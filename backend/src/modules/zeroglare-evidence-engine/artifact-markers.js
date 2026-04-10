'use strict';

const ZEE_ARTIFACT_TYPE = 'ZEE_EVIDENCE_TRACE';
const ZEE_ARTIFACT_CONTRACT_MARKER = 'ZEE_NON_CONSUMABLE_EVIDENCE_SURFACE';

function createZeeArtifactMarker(artifactKind) {
  return Object.freeze({
    type: ZEE_ARTIFACT_TYPE,
    artifactKind,
    contractMarker: ZEE_ARTIFACT_CONTRACT_MARKER,
  });
}

function hasZeeArtifactMarker(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && (
      value.type === ZEE_ARTIFACT_TYPE
      || value.artifactType === ZEE_ARTIFACT_TYPE
      || value.contractMarker === ZEE_ARTIFACT_CONTRACT_MARKER
    );
}

module.exports = {
  ZEE_ARTIFACT_CONTRACT_MARKER,
  ZEE_ARTIFACT_TYPE,
  createZeeArtifactMarker,
  hasZeeArtifactMarker,
};

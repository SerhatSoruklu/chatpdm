'use strict';

const { freezePlainObject } = require('../utils/freezePlainObject');
const { stableUniqueStrings } = require('../utils/stableUniqueStrings');
const { stableDeterministicStringify } = require('../utils/stableDeterministicStringify');
const { buildRegistryHashFromArtifacts } = require('../utils/buildRegistryHash');

function collectIds(entries, selector) {
  return stableUniqueStrings(entries.map(selector));
}

function collectEvidenceRecordIds(evidencePack) {
  return collectIds(evidencePack.records, (record) => record.id);
}

function changedFilePath(release, key) {
  return release.artifactPaths && typeof release.artifactPaths[key] === 'string' ? release.artifactPaths[key] : null;
}

function diffIds(beforeIds, afterIds) {
  const beforeSet = new Set(beforeIds);
  const afterSet = new Set(afterIds);
  const added = afterIds.filter((id) => !beforeSet.has(id));
  const removed = beforeIds.filter((id) => !afterSet.has(id));
  return {
    added: stableUniqueStrings(added),
    removed: stableUniqueStrings(removed),
  };
}

function artifactChanged(left, right) {
  return stableDeterministicStringify(left) !== stableDeterministicStringify(right);
}

/**
 * @param {{
 *   releaseFrom: {
 *     releaseId: string,
 *     domainId: string,
 *     entity: string,
 *     evidenceSetVersion: string,
 *     registryVersion: string,
 *     artifactPaths?: Record<string, string>,
 *     domainManifest: object,
 *     nodeRegistry: { entries: readonly { id: string }[] },
 *     threatRegistry: { entries: readonly { id: string }[] },
 *     causalCompatibilityRegistry: { entries: readonly { id: string }[] },
 *     falsifierRegistry: { entries: readonly { id: string }[] },
 *     evidencePack: { records: readonly { id: string }[] },
 *   },
 *   releaseTo: {
 *     releaseId: string,
 *     domainId: string,
 *     entity: string,
 *     evidenceSetVersion: string,
 *     registryVersion: string,
 *     artifactPaths?: Record<string, string>,
 *     domainManifest: object,
 *     nodeRegistry: { entries: readonly { id: string }[] },
 *     threatRegistry: { entries: readonly { id: string }[] },
 *     causalCompatibilityRegistry: { entries: readonly { id: string }[] },
 *     falsifierRegistry: { entries: readonly { id: string }[] },
 *     evidencePack: { records: readonly { id: string }[] },
 *   },
 * }} input
 * @returns {{
 *   releaseFrom: string,
 *   releaseTo: string,
 *   changedFiles: readonly string[],
 *   changedIds: {
 *     nodesAdded: readonly string[],
 *     nodesRemoved: readonly string[],
 *     threatsAdded: readonly string[],
 *     threatsRemoved: readonly string[],
 *     compatibilityAdded: readonly string[],
 *     compatibilityRemoved: readonly string[],
 *     falsifiersAdded: readonly string[],
 *     falsifiersRemoved: readonly string[],
 *     evidenceRecordsAdded: readonly string[],
 *     evidenceRecordsRemoved: readonly string[],
 *   },
 *   hashFrom: string,
 *   hashTo: string,
 * }}
 */
function buildArtifactDiffReport(input) {
  const nodes = diffIds(
    collectIds(input.releaseFrom.nodeRegistry.entries, (entry) => entry.id),
    collectIds(input.releaseTo.nodeRegistry.entries, (entry) => entry.id),
  );
  const threats = diffIds(
    collectIds(input.releaseFrom.threatRegistry.entries, (entry) => entry.id),
    collectIds(input.releaseTo.threatRegistry.entries, (entry) => entry.id),
  );
  const compatibility = diffIds(
    collectIds(input.releaseFrom.causalCompatibilityRegistry.entries, (entry) => entry.id),
    collectIds(input.releaseTo.causalCompatibilityRegistry.entries, (entry) => entry.id),
  );
  const falsifiers = diffIds(
    collectIds(input.releaseFrom.falsifierRegistry.entries, (entry) => entry.id),
    collectIds(input.releaseTo.falsifierRegistry.entries, (entry) => entry.id),
  );
  const evidenceRecords = diffIds(
    collectEvidenceRecordIds(input.releaseFrom.evidencePack),
    collectEvidenceRecordIds(input.releaseTo.evidencePack),
  );

  const changedFiles = [];
  [
    ['domainManifest', input.releaseFrom.domainManifest, input.releaseTo.domainManifest],
    ['nodeRegistry', input.releaseFrom.nodeRegistry, input.releaseTo.nodeRegistry],
    ['threatRegistry', input.releaseFrom.threatRegistry, input.releaseTo.threatRegistry],
    ['causalCompatibilityRegistry', input.releaseFrom.causalCompatibilityRegistry, input.releaseTo.causalCompatibilityRegistry],
    ['falsifierRegistry', input.releaseFrom.falsifierRegistry, input.releaseTo.falsifierRegistry],
    ['evidencePack', input.releaseFrom.evidencePack, input.releaseTo.evidencePack],
  ].forEach(([key, left, right]) => {
    if (artifactChanged(left, right)) {
      const fromPath = changedFilePath(input.releaseFrom, /** @type {string} */ (key));
      const toPath = changedFilePath(input.releaseTo, /** @type {string} */ (key));

      if (fromPath) {
        changedFiles.push(fromPath);
      }

      if (toPath) {
        changedFiles.push(toPath);
      }
    }
  });

  const hashFrom = buildRegistryHashFromArtifacts(input.releaseFrom).hash;
  const hashTo = buildRegistryHashFromArtifacts(input.releaseTo).hash;

  return freezePlainObject({
    releaseFrom: input.releaseFrom.releaseId,
    releaseTo: input.releaseTo.releaseId,
    changedFiles: stableUniqueStrings(changedFiles),
    changedIds: freezePlainObject({
      nodesAdded: nodes.added,
      nodesRemoved: nodes.removed,
      threatsAdded: threats.added,
      threatsRemoved: threats.removed,
      compatibilityAdded: compatibility.added,
      compatibilityRemoved: compatibility.removed,
      falsifiersAdded: falsifiers.added,
      falsifiersRemoved: falsifiers.removed,
      evidenceRecordsAdded: evidenceRecords.added,
      evidenceRecordsRemoved: evidenceRecords.removed,
    }),
    hashFrom,
    hashTo,
  });
}

module.exports = Object.freeze({
  buildArtifactDiffReport,
});

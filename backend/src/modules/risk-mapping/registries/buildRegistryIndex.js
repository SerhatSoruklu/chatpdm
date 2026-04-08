'use strict';

const { buildLookupMap } = require('../utils/buildLookupMap');

function validateReferenceSet(label, ids, lookup, errors) {
  ids.forEach((id) => {
    if (!Object.prototype.hasOwnProperty.call(lookup, id)) {
      errors.push(`Missing ${label} reference: ${id}`);
    }
  });
}

function collectAllReferences(registries, errors) {
  const supportedScopeSet = new Set(registries.domainManifest.supportedScopes);
  const allowedEntityTypeSet = new Set(registries.domainManifest.allowedEntityTypes);

  registries.nodeRegistry.entries.forEach((node) => {
    if (!supportedScopeSet.has(node.scope)) {
      errors.push(`Unsupported node scope for ${node.id}: ${node.scope}`);
    }

    if (!allowedEntityTypeSet.has(node.entityType)) {
      errors.push(`Unsupported node entityType for ${node.id}: ${node.entityType}`);
    }

    validateReferenceSet(
      `supportedThreatIds for node ${node.id}`,
      node.supportedThreatIds,
      registries.threatById,
      errors,
    );
  });

  registries.causalCompatibilityRegistry.entries.forEach((entry) => {
    if (!Object.prototype.hasOwnProperty.call(registries.threatById, entry.threatId)) {
      errors.push(`Missing threat reference in causal compatibility registry: ${entry.threatId}`);
    }

    if (!Object.prototype.hasOwnProperty.call(registries.nodeById, entry.targetNodeId)) {
      errors.push(`Missing target node reference in causal compatibility registry: ${entry.targetNodeId}`);
    } else {
      const targetNode = registries.nodeById[entry.targetNodeId];
      const threat = registries.threatById[entry.threatId];

      if (targetNode && threat && !threat.targetScopes.includes(targetNode.scope)) {
        errors.push(
          `Compatibility scope mismatch for ${entry.id}: threat ${entry.threatId} does not target node scope ${targetNode.scope}.`,
        );
      }
    }
  });

  registries.falsifierRegistry.entries.forEach((entry) => {
    validateReferenceSet(
      `applicableNodeIds for falsifier ${entry.id}`,
      entry.applicableNodeIds,
      registries.nodeById,
      errors,
    );
  });
}

function freezeIndexArray(entries) {
  return Object.freeze([...entries]);
}

/**
 * @param {{
 *   domainManifest: { domainId: string, version: string },
 *   nodeRegistry: { domainId: string, version: string, entries: readonly object[], byId: Readonly<Record<string, object>> },
 *   threatRegistry: { domainId: string, version: string, entries: readonly object[], byId: Readonly<Record<string, object>> },
 *   causalCompatibilityRegistry: { domainId: string, version: string, entries: readonly object[], byId: Readonly<Record<string, object>> },
 *   falsifierRegistry: { domainId: string, version: string, entries: readonly object[], byId: Readonly<Record<string, object>> },
 * }} registries
 * @returns {{
 *   domainId: string,
 *   version: string,
 *   domainManifest: object,
 *   nodeRegistry: object,
 *   threatRegistry: object,
 *   causalCompatibilityRegistry: object,
 *   falsifierRegistry: object,
 *   nodeById: Readonly<Record<string, object>>,
 *   threatById: Readonly<Record<string, object>>,
 *   causalCompatibilityById: Readonly<Record<string, object>>,
 *   falsifierById: Readonly<Record<string, object>>,
 * }}
 */
function buildRegistryIndex(registries) {
  const errors = [];

  if (!registries || typeof registries !== 'object' || Array.isArray(registries)) {
    throw new TypeError('buildRegistryIndex requires a registry bundle object.');
  }

  const domainId = registries.domainManifest.domainId;
  const version = registries.domainManifest.version;

  if (
    registries.nodeRegistry.domainId !== domainId ||
    registries.threatRegistry.domainId !== domainId ||
    registries.causalCompatibilityRegistry.domainId !== domainId ||
    registries.falsifierRegistry.domainId !== domainId
  ) {
    throw new Error(`Registry domain mismatch detected for domain ${domainId}.`);
  }

  if (
    registries.nodeRegistry.version !== version ||
    registries.threatRegistry.version !== version ||
    registries.causalCompatibilityRegistry.version !== version ||
    registries.falsifierRegistry.version !== version
  ) {
    throw new Error(`Registry version mismatch detected for domain ${domainId}.`);
  }

  const nodeById = buildLookupMap(registries.nodeRegistry.entries, (entry) => entry.id);
  const threatById = buildLookupMap(registries.threatRegistry.entries, (entry) => entry.id);
  const causalCompatibilityById = buildLookupMap(
    registries.causalCompatibilityRegistry.entries,
    (entry) => entry.id,
  );
  const falsifierById = buildLookupMap(registries.falsifierRegistry.entries, (entry) => entry.id);

  collectAllReferences(
    {
      domainManifest: registries.domainManifest,
      nodeRegistry: registries.nodeRegistry,
      threatRegistry: registries.threatRegistry,
      causalCompatibilityRegistry: registries.causalCompatibilityRegistry,
      falsifierRegistry: registries.falsifierRegistry,
      nodeById,
      threatById,
    },
    errors,
  );

  if (errors.length > 0) {
    throw new Error(`Invalid registry index for domain ${domainId}: ${errors.join(' | ')}`);
  }

  return Object.freeze({
    domainId,
    version,
    domainManifest: Object.freeze({ ...registries.domainManifest }),
    nodeRegistry: registries.nodeRegistry,
    threatRegistry: registries.threatRegistry,
    causalCompatibilityRegistry: registries.causalCompatibilityRegistry,
    falsifierRegistry: registries.falsifierRegistry,
    nodeById,
    threatById,
    causalCompatibilityById,
    falsifierById,
    nodeIds: freezeIndexArray(Object.keys(nodeById)),
    threatIds: freezeIndexArray(Object.keys(threatById)),
    causalCompatibilityIds: freezeIndexArray(Object.keys(causalCompatibilityById)),
    falsifierIds: freezeIndexArray(Object.keys(falsifierById)),
  });
}

module.exports = Object.freeze({
  buildRegistryIndex,
});

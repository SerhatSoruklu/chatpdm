'use strict';

const { stableSort } = require('../utils/stableSort');

function freezeFalsifier(entry) {
  return Object.freeze({
    id: entry.id,
    falsifierId: entry.falsifierId,
    targetNodeId: entry.targetNodeId,
    appliesToPathIds: Object.freeze([...entry.appliesToPathIds]),
  });
}

/**
 * @param {{
 *   supportedPaths: readonly { id: string, targetNodeId: string }[],
 *   registryIndex: {
 *     falsifierRegistry: { entries: readonly { id: string, applicableNodeIds: readonly string[] }[] },
 *   },
 * }} input
 * @returns {readonly { id: string, falsifierId: string, targetNodeId: string, appliesToPathIds: readonly string[] }[]}
 */
function buildFalsifierLedger(input) {
  const entriesByKey = new Map();

  for (const path of input.supportedPaths) {
    const falsifiers = input.registryIndex.falsifierRegistry.entries.filter((entry) =>
      entry.applicableNodeIds.includes(path.targetNodeId),
    );

    for (const falsifier of falsifiers) {
      const key = `${falsifier.id}@${path.targetNodeId}`;
      const existing = entriesByKey.get(key);

      if (existing) {
        existing.appliesToPathIds.push(path.id);
      } else {
        entriesByKey.set(key, {
          id: key,
          falsifierId: falsifier.id,
          targetNodeId: path.targetNodeId,
          appliesToPathIds: [path.id],
        });
      }
    }
  }

  return Object.freeze(
    stableSort([...entriesByKey.values()].map(freezeFalsifier), (left, right) => left.id.localeCompare(right.id)),
  );
}

module.exports = Object.freeze({
  buildFalsifierLedger,
});

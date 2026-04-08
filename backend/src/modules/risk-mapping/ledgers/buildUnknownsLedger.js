'use strict';

function freezeUnknown(entry) {
  return Object.freeze({
    id: entry.id,
    type: entry.type,
    summary: entry.summary,
    appliesToPathIds: Object.freeze([...entry.appliesToPathIds]),
  });
}

/**
 * @param {{ supportedPaths: readonly { id: string }[] }} input
 * @returns {readonly { id: string, type: string, summary: string, appliesToPathIds: readonly string[] }[]}
 */
function buildUnknownsLedger(input) {
  const pathIds = input.supportedPaths.map((path) => path.id);

  return Object.freeze([
    freezeUnknown({
      id: 'no_multi_hop_chain_support',
      type: 'no_multi_hop_chain_support',
      summary: 'No multi-hop chain support exists in this phase.',
      appliesToPathIds: pathIds,
    }),
    freezeUnknown({
      id: 'no_timeline_progression_support',
      type: 'no_timeline_progression_support',
      summary: 'No timeline progression support exists in this phase.',
      appliesToPathIds: pathIds,
    }),
    freezeUnknown({
      id: 'no_cross_scope_propagation_support',
      type: 'no_cross_scope_propagation_support',
      summary: 'No cross-scope propagation support exists in this phase.',
      appliesToPathIds: pathIds,
    }),
  ]);
}

module.exports = Object.freeze({
  buildUnknownsLedger,
});

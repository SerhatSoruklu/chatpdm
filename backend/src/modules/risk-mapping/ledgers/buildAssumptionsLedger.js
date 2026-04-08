'use strict';

function freezeAssumption(entry) {
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
function buildAssumptionsLedger(input) {
  const pathIds = input.supportedPaths.map((path) => path.id);

  return Object.freeze([
    freezeAssumption({
      id: 'local_structural_support_only',
      type: 'local_structural_support_only',
      summary: 'Direct authored support implies local structural support, not global collapse.',
      appliesToPathIds: pathIds,
    }),
    freezeAssumption({
      id: 'scope_isolated_without_cross_scope_propagation',
      type: 'scope_isolated_without_cross_scope_propagation',
      summary: 'Admitted scopes are treated independently unless a later phase links them.',
      appliesToPathIds: pathIds,
    }),
  ]);
}

module.exports = Object.freeze({
  buildAssumptionsLedger,
});

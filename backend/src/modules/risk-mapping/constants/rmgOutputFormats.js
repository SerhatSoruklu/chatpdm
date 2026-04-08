'use strict';

/**
 * Compact structural formats locked for RMG phase 5 output.
 * These are identifiers, not prose, and must remain stable.
 */
const OUTPUT_FORMATS = Object.freeze({
  supportedPath: 'threatId->targetNodeId',
  unsupportedBridge: 'type:descriptor',
  falsifier: 'falsifierId@targetNodeId',
  assumption: 'stable assumption id',
  unknown: 'stable unknown id',
});

function formatSupportedPath(threatId, targetNodeId) {
  return `${threatId}->${targetNodeId}`;
}

function formatUnsupportedBridge(type, descriptor) {
  return `${type}:${descriptor}`;
}

function formatFalsifier(falsifierId, targetNodeId) {
  return `${falsifierId}@${targetNodeId}`;
}

module.exports = Object.freeze({
  OUTPUT_FORMATS,
  formatSupportedPath,
  formatUnsupportedBridge,
  formatFalsifier,
});

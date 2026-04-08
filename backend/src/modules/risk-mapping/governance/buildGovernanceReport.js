'use strict';

const { freezePlainObject } = require('../utils/freezePlainObject');

/**
 * @param {{
 *   releaseId: string,
 *   domainId: string,
 *   entity: string,
 *   registryVersion: string,
 *   evidenceSetVersion: string,
 *   registryHash: string,
 *   validationPassed: boolean,
 *   replayPassed: boolean,
 *   compatibilityPassed: boolean,
 *   notes: string,
 * }} input
 * @returns {{
 *   releaseId: string,
 *   domainId: string,
 *   entity: string,
 *   registryVersion: string,
 *   evidenceSetVersion: string,
 *   registryHash: string,
 *   validationPassed: boolean,
 *   replayPassed: boolean,
 *   compatibilityPassed: boolean,
 *   notes: string,
 * }}
 */
function buildGovernanceReport(input) {
  return freezePlainObject({
    releaseId: input.releaseId,
    domainId: input.domainId,
    entity: input.entity,
    registryVersion: input.registryVersion,
    evidenceSetVersion: input.evidenceSetVersion,
    registryHash: input.registryHash,
    validationPassed: input.validationPassed,
    replayPassed: input.replayPassed,
    compatibilityPassed: input.compatibilityPassed,
    notes: input.notes,
  });
}

module.exports = Object.freeze({
  buildGovernanceReport,
});

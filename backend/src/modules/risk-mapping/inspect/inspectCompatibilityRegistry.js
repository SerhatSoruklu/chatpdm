'use strict';

const { ORGANIZATION_RISK } = require('../constants/rmgDomains');
const { loadCausalCompatibilityRegistry } = require('../registries/loadCausalCompatibilityRegistry');
const { freezePlainObject } = require('../utils/freezePlainObject');

/**
 * @param {string} [domainId]
 */
function inspectCompatibilityRegistry(domainId = ORGANIZATION_RISK) {
  const registry = loadCausalCompatibilityRegistry(domainId);
  return freezePlainObject({
    domainId: registry.domainId,
    version: registry.version,
    entries: registry.entries,
  });
}

module.exports = Object.freeze({
  inspectCompatibilityRegistry,
});

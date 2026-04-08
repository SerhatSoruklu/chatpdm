'use strict';

const { ORGANIZATION_RISK } = require('../constants/rmgDomains');
const { loadThreatRegistry } = require('../registries/loadThreatRegistry');
const { freezePlainObject } = require('../utils/freezePlainObject');

/**
 * @param {string} [domainId]
 */
function inspectThreatRegistry(domainId = ORGANIZATION_RISK) {
  const registry = loadThreatRegistry(domainId);
  return freezePlainObject({
    domainId: registry.domainId,
    version: registry.version,
    entries: registry.entries,
  });
}

module.exports = Object.freeze({
  inspectThreatRegistry,
});

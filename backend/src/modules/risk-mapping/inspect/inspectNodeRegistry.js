'use strict';

const { ORGANIZATION_RISK } = require('../constants/rmgDomains');
const { loadNodeRegistry } = require('../registries/loadNodeRegistry');
const { freezePlainObject } = require('../utils/freezePlainObject');

/**
 * @param {string} [domainId]
 */
function inspectNodeRegistry(domainId = ORGANIZATION_RISK) {
  const registry = loadNodeRegistry(domainId);
  return freezePlainObject({
    domainId: registry.domainId,
    version: registry.version,
    entries: registry.entries,
  });
}

module.exports = Object.freeze({
  inspectNodeRegistry,
});

'use strict';

const { ORGANIZATION_RISK } = require('../constants/rmgDomains');
const { loadFalsifierRegistry } = require('../registries/loadFalsifierRegistry');
const { freezePlainObject } = require('../utils/freezePlainObject');

/**
 * @param {string} [domainId]
 */
function inspectFalsifierRegistry(domainId = ORGANIZATION_RISK) {
  const registry = loadFalsifierRegistry(domainId);
  return freezePlainObject({
    domainId: registry.domainId,
    version: registry.version,
    entries: registry.entries,
  });
}

module.exports = Object.freeze({
  inspectFalsifierRegistry,
});

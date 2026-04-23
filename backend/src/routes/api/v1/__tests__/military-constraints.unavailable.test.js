'use strict';

const http = require('node:http');
const path = require('node:path');
const Module = require('node:module');
const test = require('node:test');
const assert = require('node:assert/strict');

const APP_PATH = require.resolve('../../../../app');
const MODULE_ROOT = path.resolve(__dirname, '../../../../modules/military-constraints');
const API_INDEX_PATH = require.resolve('../../../../routes/api/index.js');
const API_V1_INDEX_PATH = require.resolve('../../../../routes/api/v1/index.js');
const MILITARY_CONSTRAINTS_ROUTE_PATH = require.resolve('../../../../routes/api/v1/military-constraints.route.js');

function clearMilitaryConstraintsRequireCache() {
  Object.keys(require.cache).forEach((cacheKey) => {
    if (
      cacheKey === APP_PATH
      || cacheKey === API_INDEX_PATH
      || cacheKey === API_V1_INDEX_PATH
      || cacheKey === MILITARY_CONSTRAINTS_ROUTE_PATH
      || cacheKey.startsWith(`${MODULE_ROOT}${path.sep}`)
    ) {
      delete require.cache[cacheKey];
    }
  });
}

function startServer(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`,
      });
    });
  });
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  return {
    status: response.status,
    body: await response.json(),
  };
}

test('military constraints route returns 503 when support dependencies are unavailable', async () => {
  const originalLoad = Module._load;
  clearMilitaryConstraintsRequireCache();

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'ajv/dist/2020' || request === 'ajv-formats') {
      const error = new Error(`Cannot find module '${request}'`);
      error.code = 'MODULE_NOT_FOUND';
      throw error;
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  let server = null;

  try {
    const app = require(APP_PATH);
    const started = await startServer(app);
    server = started.server;

    const root = await fetchJson(`${started.baseUrl}/api/v1/military-constraints`);
    const packs = await fetchJson(`${started.baseUrl}/api/v1/military-constraints/packs`);
    const evaluate = await fetchJson(`${started.baseUrl}/api/v1/military-constraints/evaluate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        packId: 'mil-us-medical-protection-core-v0.1.0',
        facts: {},
      }),
    });

    for (const response of [root, packs, evaluate]) {
      assert.equal(response.status, 503);
      assert.equal(response.body.error.code, 'military_constraints_unavailable');
      assert.equal(response.body.error.message, 'The military constraints service is temporarily unavailable.');
    }
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }

    Module._load = originalLoad;
    clearMilitaryConstraintsRequireCache();
  }
});

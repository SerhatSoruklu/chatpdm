'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { createCorsMiddleware, normalizeOrigin } = require('../src/security/cors');

function createRequest(origin, method = 'GET') {
  return {
    method,
    get(name) {
      return String(name).toLowerCase() === 'origin' ? origin : undefined;
    },
  };
}

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    ended: false,
    varyNames: [],
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = value;
    },
    vary(name) {
      this.varyNames.push(name);
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    end() {
      this.ended = true;
    },
  };
}

test('createCorsMiddleware allows normalized trailing-slash origins', () => {
  const middleware = createCorsMiddleware(['https://chatpdm.com']);
  const req = createRequest('https://chatpdm.com///', 'OPTIONS');
  const res = createResponse();
  let nextCalls = 0;

  middleware(req, res, () => {
    nextCalls += 1;
  });

  assert.equal(res.headers['access-control-allow-origin'], 'https://chatpdm.com');
  assert.equal(res.headers['access-control-allow-credentials'], 'true');
  assert.equal(res.statusCode, 204);
  assert.equal(res.ended, true);
  assert.deepEqual(res.varyNames, ['Origin']);
  assert.equal(nextCalls, 0);
});

test('createCorsMiddleware ignores disallowed origins', () => {
  const middleware = createCorsMiddleware(['https://chatpdm.com']);
  const req = createRequest('https://evil.example', 'GET');
  const res = createResponse();
  let nextCalls = 0;

  middleware(req, res, () => {
    nextCalls += 1;
  });

  assert.deepEqual(res.headers, {});
  assert.equal(res.ended, false);
  assert.equal(res.statusCode, 200);
  assert.equal(nextCalls, 1);
});

test('normalizeOrigin strips trailing slashes without changing path content', () => {
  assert.equal(normalizeOrigin(undefined), '');
  assert.equal(normalizeOrigin(null), '');
  assert.equal(normalizeOrigin(''), '');
  assert.equal(normalizeOrigin('   '), '');
  assert.equal(normalizeOrigin('https://example.com/'), 'https://example.com');
  assert.equal(normalizeOrigin('https://example.com///'), 'https://example.com');
  assert.equal(normalizeOrigin(' https://example.com///  '), 'https://example.com');
  assert.equal(normalizeOrigin('https://example.com/path'), 'https://example.com/path');
  assert.equal(normalizeOrigin('////'), '');
  assert.equal(normalizeOrigin(`${'https://example.com'.padEnd(20, '/')}${'/'.repeat(5000)}`), 'https://example.com');
});

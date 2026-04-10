'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { createCorsMiddleware } = require('../../src/security/cors');

function createResponse() {
  return {
    headers: {},
    ended: false,
    statusCode: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
    vary(name) {
      this.headers.Vary = name;
    },
  };
}

test('cors origin normalization trims trailing slashes without regex drift', () => {
  const middleware = createCorsMiddleware(['https://example.com/']);
  const req = {
    get(headerName) {
      return headerName === 'origin' ? 'https://example.com///' : null;
    },
    method: 'GET',
  };
  const res = createResponse();
  let nextCalled = false;

  middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.headers['Access-Control-Allow-Origin'], 'https://example.com');
  assert.equal(res.headers['Access-Control-Allow-Credentials'], 'true');
  assert.equal(res.headers.Vary, 'Origin');
  assert.equal(res.ended, false);
});

test('cors preflight still returns a bounded 204 response for allowed origins', () => {
  const middleware = createCorsMiddleware(['https://example.com']);
  const req = {
    get(headerName) {
      return headerName === 'origin' ? 'https://example.com/' : null;
    },
    method: 'OPTIONS',
  };
  const res = createResponse();
  let nextCalled = false;

  middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 204);
  assert.equal(res.ended, true);
});

'use strict';

const http = require('node:http');
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { connectMongo, disconnectMongo } = require('../../../../config/mongoose');
const app = require('../../../../app');
const Matter = require('../../../../modules/legal-validator/matter/matter.model');
const SourceDocument = require('../../../../modules/legal-validator/sources/source-document.model');

let mongoServer;

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();

      if (!address || typeof address !== 'object') {
        reject(new Error('Expected the backend server to bind to a port.'));
        return;
      }

      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`,
      });
    });

    server.once('error', reject);
  });
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);

  return {
    status: response.status,
    body: await response.json(),
  };
}

function buildMatterInput(overrides = {}) {
  return {
    matterId: overrides.matterId || 'matter-intake-1',
    title: overrides.title || 'Clinical negligence matter',
    jurisdiction: overrides.jurisdiction || 'UK',
    practiceArea: overrides.practiceArea || 'negligence',
    status: overrides.status || 'active',
    createdBy: overrides.createdBy || 'validator-intake-user',
  };
}

async function createSourceDocument(matterId, overrides = {}) {
  const sourceDocument = new SourceDocument({
    sourceDocumentId: overrides.sourceDocumentId || 'source-document-intake-1',
    matterId,
    documentId: overrides.documentId || 'document-intake-1',
    contentFormat: 'markdown',
    content: [
      '# Intake Document',
      '',
      'The defendant failed to inspect the equipment.',
    ].join('\n'),
  });

  await sourceDocument.save();
  return sourceDocument;
}

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await connectMongo(mongoServer.getUri());
});

test.after(async () => {
  await disconnectMongo();

  if (mongoServer) {
    await mongoServer.stop();
  }
});

test.afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.db.dropDatabase();
  }
});

test('legal-validator intake route advertises a matter intake surface', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const { status, body } = await fetchJson(`${baseUrl}/api/v1/legal-validator/intake`);

    assert.equal(status, 200);
    assert.deepEqual(body, {
      resource: 'legal-validator-intake',
      status: 'active',
      contractVersion: 'matter-intake-v1',
      boundary: {
        product: 'legal-argument-validator',
        scope: 'bounded-legal-validation',
      },
      allowedOperations: ['create-or-bind-matter'],
      requestShape: {
        topLevel: ['input'],
        inputFields: ['matter', 'sourceDocumentIds'],
        matterFields: ['matterId', 'title', 'jurisdiction', 'practiceArea', 'status', 'createdBy'],
        sourceDocumentIdsField: 'optional unique array of sourceDocumentId strings',
      },
      allowedOutcomes: ['valid', 'invalid', 'unresolved'],
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('legal-validator intake route creates a Matter deterministically', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const matterInput = buildMatterInput();

    const { status, body } = await fetchJson(`${baseUrl}/api/v1/legal-validator/intake`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        input: {
          matter: matterInput,
        },
      }),
    });

    assert.equal(status, 200);
    assert.deepEqual(body, {
      resource: 'legal-validator-intake',
      status: 'active',
      contractVersion: 'matter-intake-v1',
      boundary: {
        product: 'legal-argument-validator',
        scope: 'bounded-legal-validation',
      },
      matterMode: 'created',
      matter: matterInput,
      sourceDocumentIds: [],
      sourceDocumentCount: 0,
    });

    const persistedMatter = await Matter.findOne({ matterId: matterInput.matterId }).lean().exec();
    assert.ok(persistedMatter);
    assert.equal(persistedMatter.title, matterInput.title);
    assert.equal(persistedMatter.status, matterInput.status);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('legal-validator intake route binds Matter to source documents deterministically', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const matterInput = buildMatterInput({
      matterId: 'matter-intake-2',
      title: 'Linked matter',
    });

    const createResponse = await fetchJson(`${baseUrl}/api/v1/legal-validator/intake`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        input: {
          matter: matterInput,
        },
      }),
    });

    assert.equal(createResponse.status, 200);

    const sourceDocument = await createSourceDocument(matterInput.matterId, {
      sourceDocumentId: 'source-document-intake-2',
      documentId: 'document-intake-2',
    });

    const bindResponse = await fetchJson(`${baseUrl}/api/v1/legal-validator/intake`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        input: {
          matter: matterInput,
          sourceDocumentIds: [sourceDocument.sourceDocumentId],
        },
      }),
    });

    assert.equal(bindResponse.status, 200);
    assert.deepEqual(bindResponse.body, {
      resource: 'legal-validator-intake',
      status: 'active',
      contractVersion: 'matter-intake-v1',
      boundary: {
        product: 'legal-argument-validator',
        scope: 'bounded-legal-validation',
      },
      matterMode: 'bound',
      matter: matterInput,
      sourceDocumentIds: [sourceDocument.sourceDocumentId],
      sourceDocumentCount: 1,
    });

    const persistedMatter = await Matter.findOne({ matterId: matterInput.matterId }).lean().exec();
    assert.ok(persistedMatter);
    assert.equal(persistedMatter.matterId, matterInput.matterId);

    const linkedDocuments = await SourceDocument.find({ matterId: matterInput.matterId }).lean().exec();
    assert.equal(linkedDocuments.length, 1);
    assert.equal(linkedDocuments[0].sourceDocumentId, sourceDocument.sourceDocumentId);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

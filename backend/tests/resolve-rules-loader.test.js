'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  loadResolveRules,
} = require('../src/modules/concepts/resolve-rules-loader');

const resolveRulesPath = path.resolve(__dirname, '../../data/concepts/resolve-rules.json');

function withMockedResolveRules(resolveRules, callback) {
  const originalReadFileSync = fs.readFileSync;

  fs.readFileSync = function mockedReadFileSync(filePath, encoding, ...rest) {
    if (typeof filePath === 'string' && path.resolve(filePath) === resolveRulesPath) {
      return JSON.stringify(resolveRules, null, 2);
    }

    return Reflect.apply(originalReadFileSync, fs, [filePath, encoding, ...rest]);
  };

  try {
    return callback();
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
}

test('resolve rule loader accepts distinct normalized queries in authored disambiguations and suggestions', () => {
  const rules = {
    authorDefinedDisambiguations: [
      {
        id: 'disambiguation-obligation',
        normalizedQuery: 'obligation',
        candidateConceptIds: ['duty', 'responsibility'],
      },
    ],
    authorDefinedSuggestions: [
      {
        id: 'suggestion-civic-duty',
        normalizedQuery: 'civic duty',
        suggestions: [
          {
            conceptId: 'duty',
            reason: 'broader_topic',
          },
        ],
      },
      {
        id: 'suggestion-legal-duty',
        normalizedQuery: 'legal duty',
        suggestions: [
          {
            conceptId: 'duty',
            reason: 'related_term',
          },
        ],
      },
    ],
  };

  const loadedRules = withMockedResolveRules(rules, () => loadResolveRules());

  assert.equal(loadedRules.authorDefinedDisambiguations.length, 1);
  assert.equal(loadedRules.authorDefinedSuggestions.length, 2);
  assert.equal(loadedRules.authorDefinedDisambiguations[0].normalizedQuery, 'obligation');
  assert.equal(loadedRules.authorDefinedSuggestions[0].normalizedQuery, 'civic duty');
  assert.equal(loadedRules.authorDefinedSuggestions[1].normalizedQuery, 'legal duty');
});

test('resolve rule loader rejects duplicate normalizedQuery values in authorDefinedDisambiguations', () => {
  const rules = {
    authorDefinedDisambiguations: [
      {
        id: 'disambiguation-primary',
        normalizedQuery: 'obligation',
        candidateConceptIds: ['duty', 'responsibility'],
      },
      {
        id: 'disambiguation-shadow',
        normalizedQuery: 'obligation',
        candidateConceptIds: ['authority', 'power'],
      },
    ],
    authorDefinedSuggestions: [
      {
        id: 'suggestion-civic-duty',
        normalizedQuery: 'civic duty',
        suggestions: [
          {
            conceptId: 'duty',
            reason: 'broader_topic',
          },
        ],
      },
    ],
  };

  assert.throws(
    () => withMockedResolveRules(rules, () => loadResolveRules()),
    (error) => {
      assert.match(
        error.message,
        /\[resolve-rules-loader\] Duplicate normalizedQuery "obligation" in authorDefinedDisambiguations\./,
      );
      assert.match(error.message, /First: authorDefinedDisambiguations\[0\] \(id: disambiguation-primary\)\./);
      assert.match(error.message, /Second: authorDefinedDisambiguations\[1\] \(id: disambiguation-shadow\)\./);
      return true;
    },
  );
});

test('resolve rule loader rejects duplicate normalizedQuery values in authorDefinedSuggestions', () => {
  const rules = {
    authorDefinedDisambiguations: [
      {
        id: 'disambiguation-obligation',
        normalizedQuery: 'obligation',
        candidateConceptIds: ['duty', 'responsibility'],
      },
    ],
    authorDefinedSuggestions: [
      {
        id: 'suggestion-civic-duty-primary',
        normalizedQuery: 'civic duty',
        suggestions: [
          {
            conceptId: 'duty',
            reason: 'broader_topic',
          },
        ],
      },
      {
        id: 'suggestion-civic-duty-shadow',
        normalizedQuery: 'civic duty',
        suggestions: [
          {
            conceptId: 'responsibility',
            reason: 'related_term',
          },
        ],
      },
    ],
  };

  assert.throws(
    () => withMockedResolveRules(rules, () => loadResolveRules()),
    (error) => {
      assert.match(
        error.message,
        /\[resolve-rules-loader\] Duplicate normalizedQuery "civic duty" in authorDefinedSuggestions\./,
      );
      assert.match(error.message, /First: authorDefinedSuggestions\[0\] \(id: suggestion-civic-duty-primary\)\./);
      assert.match(error.message, /Second: authorDefinedSuggestions\[1\] \(id: suggestion-civic-duty-shadow\)\./);
      return true;
    },
  );
});

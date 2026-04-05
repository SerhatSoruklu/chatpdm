'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

function readFrontendFile(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, '../../frontend/src', relativePath), 'utf8');
}

function extractTemplateCaseBlock(template, caseLabel) {
  const startMarker = `@case ('${caseLabel}') {`;
  const startIndex = template.indexOf(startMarker);

  if (startIndex === -1) {
    return '';
  }

  const nextCaseIndex = template.indexOf('@case (', startIndex + startMarker.length);
  return nextCaseIndex === -1
    ? template.slice(startIndex)
    : template.slice(startIndex, nextCaseIndex);
}

test('inspectable disclosure template keeps core_concept and registry_term sections exclusive', () => {
  const template = readFrontendFile('app/core/concepts/inspectable-item-disclosure/inspectable-item-disclosure.component.html');
  const coreBlock = extractTemplateCaseBlock(template, 'core_concept');
  const registryBlock = extractTemplateCaseBlock(template, 'registry_term');

  assert.match(coreBlock, /coreRows\(\)/);
  assert.doesNotMatch(coreBlock, /registryRows\(\)/);
  assert.match(registryBlock, /registryRows\(\)/);
  assert.doesNotMatch(registryBlock, /coreRows\(\)/);
});

test('vocabulary page renders the canonical registry boundary note surface', () => {
  const template = readFrontendFile('app/pages/vocabulary-page/vocabulary-page.component.html');

  assert.match(template, /entry\.whyRegistryOnly/);
  assert.doesNotMatch(template, /entry\.boundaryNote\s*\?\?/);
});

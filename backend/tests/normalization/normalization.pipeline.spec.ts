/// <reference path="../../src/vocabulary/commonjs-globals.d.ts" />

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeChatPdmInput,
  MAX_INPUT_BYTES,
} = require('../../src/normalization/normalization.pipeline.ts');

function reverseText(text) {
  return Array.from(text).reverse().join('');
}

function encodeBase64NTimes(text, times) {
  let current = text;

  for (let index = 0; index < times; index += 1) {
    current = Buffer.from(current, 'utf8').toString('base64');
  }

  return current;
}

test('unchanged plain text stays unchanged with an empty trace', () => {
  const result = normalizeChatPdmInput('plain text');

  assert.equal(result.status, 'unchanged');
  assert.equal(result.rawText, 'plain text');
  assert.equal(result.canonicalText, 'plain text');
  assert.equal(result.depthUsed, 0);
  assert.deepEqual(result.audit.steps, []);
});

test('valid base64 text normalizes to decoded text', () => {
  const result = normalizeChatPdmInput('SGVsbG8=');

  assert.equal(result.status, 'normalized');
  assert.equal(result.rawText, 'SGVsbG8=');
  assert.equal(result.canonicalText, 'Hello');
  assert.equal(result.depthUsed, 1);
  assert.equal(result.audit.steps.length, 1);
  assert.deepEqual(result.audit.steps[0], {
    stepIndex: 1,
    transform: 'base64_decode',
    attempted: true,
    applied: true,
    changed: true,
    inputBytes: 8,
    outputBytes: 5,
    inputPreview: 'SGVsbG8=',
    outputPreview: 'Hello',
    refusalCode: null,
  });
});

test('valid hex text normalizes to decoded text', () => {
  const result = normalizeChatPdmInput('48656C6C6F');

  assert.equal(result.status, 'normalized');
  assert.equal(result.canonicalText, 'Hello');
  assert.equal(result.depthUsed, 1);
  assert.equal(result.audit.steps.length, 1);
  assert.equal(result.audit.steps[0].transform, 'hex_decode');
  assert.equal(result.audit.steps[0].applied, true);
});

test('valid reverse_then_base64 text normalizes to decoded text', () => {
  const result = normalizeChatPdmInput('=8GbsVGS');

  assert.equal(result.status, 'normalized');
  assert.equal(result.canonicalText, 'Hello');
  assert.equal(result.depthUsed, 1);
  assert.equal(result.audit.steps[0].transform, 'reverse_then_base64_decode');
});

test('valid reverse_then_hex text normalizes to decoded text', () => {
  const result = normalizeChatPdmInput('9684');

  assert.equal(result.status, 'normalized');
  assert.equal(result.canonicalText, 'Hi');
  assert.equal(result.depthUsed, 1);
  assert.equal(result.audit.steps[0].transform, 'reverse_then_hex_decode');
});

test('percent decode can chain into base64 decode', () => {
  const result = normalizeChatPdmInput('%53%47%56%73%62%47%38%3D');

  assert.equal(result.status, 'normalized');
  assert.equal(result.canonicalText, 'Hello');
  assert.equal(result.depthUsed, 2);
  assert.deepEqual(
    result.audit.steps.map((step) => step.transform),
    ['percent_decode', 'base64_decode'],
  );
});

test('unicode NFC normalization composes combining marks', () => {
  const result = normalizeChatPdmInput('Cafe\u0301');

  assert.equal(result.status, 'normalized');
  assert.equal(result.canonicalText, 'Café');
  assert.equal(result.depthUsed, 1);
  assert.equal(result.audit.steps[0].transform, 'unicode_nfc');
});

test('malformed base64 is refused with INVALID_ENCODING', () => {
  const result = normalizeChatPdmInput('SGVsbG8===');

  assert.equal(result.status, 'refused');
  assert.equal(result.refusalCode, 'NORMALIZATION_INVALID_ENCODING');
  assert.equal(result.depthUsed, 0);
});

test('malformed hex is refused with INVALID_ENCODING', () => {
  const result = normalizeChatPdmInput('9684F');

  assert.equal(result.status, 'refused');
  assert.equal(result.refusalCode, 'NORMALIZATION_INVALID_ENCODING');
  assert.equal(result.depthUsed, 0);
});

test('non-UTF-8 output after decode is refused with NON_TEXT_OUTPUT', () => {
  const result = normalizeChatPdmInput('//8=');

  assert.equal(result.status, 'refused');
  assert.equal(result.refusalCode, 'NORMALIZATION_NON_TEXT_OUTPUT');
  assert.equal(result.depthUsed, 0);
});

test('too deep nested decoding is refused with TOO_DEEP', () => {
  const input = encodeBase64NTimes('Hello ChatPDM', 4);
  const result = normalizeChatPdmInput(input);

  assert.equal(result.status, 'refused');
  assert.equal(result.refusalCode, 'NORMALIZATION_TOO_DEEP');
  assert.equal(result.depthUsed, 3);
});

test('oversized input is refused with TOO_LARGE', () => {
  const input = 'a'.repeat(MAX_INPUT_BYTES + 1);
  const result = normalizeChatPdmInput(input);

  assert.equal(result.status, 'refused');
  assert.equal(result.refusalCode, 'NORMALIZATION_TOO_LARGE');
  assert.equal(result.depthUsed, 0);
});

test('ambiguous valid transforms with different outputs are refused', () => {
  const result = normalizeChatPdmInput('270A');

  assert.equal(result.status, 'refused');
  assert.equal(result.refusalCode, 'NORMALIZATION_AMBIGUOUS');
  assert.equal(result.depthUsed, 0);
  assert.equal(result.audit.steps.length, 2);
  assert.deepEqual(
    result.audit.steps.map((step) => step.transform),
    ['base64_decode', 'hex_decode'],
  );
});

test('raw input and canonical output stay equivalent across allowed encodings', () => {
  const plainText = 'ChatPDM boundary example';
  const base64Text = Buffer.from(plainText, 'utf8').toString('base64');
  const reverseBase64Text = reverseText(base64Text);

  const plainResult = normalizeChatPdmInput(plainText);
  const base64Result = normalizeChatPdmInput(base64Text);
  const reverseResult = normalizeChatPdmInput(reverseBase64Text);

  assert.equal(plainResult.canonicalText, plainText);
  assert.equal(base64Result.canonicalText, plainText);
  assert.equal(reverseResult.canonicalText, plainText);
  assert.equal(plainResult.status, 'unchanged');
  assert.equal(base64Result.status, 'normalized');
  assert.equal(reverseResult.status, 'normalized');
});

test('the same input produces the same normalization result and trace', () => {
  const first = normalizeChatPdmInput('SGVsbG8=');
  const second = normalizeChatPdmInput('SGVsbG8=');

  assert.deepEqual(first, second);
});


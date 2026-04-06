/// <reference path="../vocabulary/commonjs-globals.d.ts" />

import type {
  NormalizationAuditStep,
  NormalizationAuditTrail,
  NormalizationRefusalCode,
  NormalizationTransformKind,
} from './normalization.types.ts';

const {
  NORMALIZATION_PREVIEW_CHARS,
} = require('./normalization.constants.ts');

function assertStringText(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }
}

function byteLength(text: string): number {
  return Buffer.byteLength(text, 'utf8');
}

function previewText(text: string): string {
  const characters = Array.from(text);

  if (characters.length <= NORMALIZATION_PREVIEW_CHARS) {
    return characters.join('');
  }

  return `${characters.slice(0, NORMALIZATION_PREVIEW_CHARS).join('')}...`;
}

function createNormalizationStep({
  stepIndex,
  transform,
  attempted,
  applied,
  changed,
  inputText,
  outputText,
  refusalCode = null,
}: {
  stepIndex: number;
  transform: NormalizationTransformKind;
  attempted: boolean;
  applied: boolean;
  changed: boolean;
  inputText: string;
  outputText?: string | null;
  refusalCode?: NormalizationRefusalCode | null;
}): NormalizationAuditStep {
  assertStringText(inputText, 'inputText');

  if (typeof outputText === 'undefined' || outputText === null) {
    outputText = '';
  } else {
    assertStringText(outputText, 'outputText');
  }

  const step = {
    stepIndex,
    transform,
    attempted: Boolean(attempted),
    applied: Boolean(applied),
    changed: Boolean(changed),
    inputBytes: byteLength(inputText),
    outputBytes: outputText === '' ? 0 : byteLength(outputText),
    inputPreview: previewText(inputText),
    outputPreview: outputText === '' ? '' : previewText(outputText),
    refusalCode,
  };

  return Object.freeze(step);
}

function createNormalizationAuditTrail({
  rawText,
  canonicalText,
  depthUsed,
  steps,
}: {
  rawText: string;
  canonicalText: string | null;
  depthUsed: number;
  steps: readonly NormalizationAuditStep[];
}): NormalizationAuditTrail {
  assertStringText(rawText, 'rawText');

  if (canonicalText !== null) {
    assertStringText(canonicalText, 'canonicalText');
  }

  return Object.freeze({
    rawBytes: byteLength(rawText),
    canonicalBytes: canonicalText === null ? null : byteLength(canonicalText),
    depthUsed,
    steps: Object.freeze([...steps]),
  });
}

module.exports = {
  createNormalizationAuditTrail,
  createNormalizationStep,
  previewText,
  byteLength,
};


/// <reference path="../vocabulary/commonjs-globals.d.ts" />

import type { NormalizationTransformResult } from './normalization.types.ts';

const {
  NORMALIZATION_BASE64_ALLOWED_PATTERN,
  NORMALIZATION_BASE64_MARKER_PATTERN,
  NORMALIZATION_BASE64_MIN_LENGTH,
  NORMALIZATION_BASE64_TRAILING_PADDING_PATTERN,
  NORMALIZATION_HEX_ALLOWED_PATTERN,
  NORMALIZATION_HEX_MARKER_PATTERN,
  NORMALIZATION_HEX_MIN_LENGTH,
} = require('./normalization.constants.ts');
const {
  createNormalizationRefusal,
} = require('./normalization.errors.ts');

const STRICT_UTF8_DECODER = new TextDecoder('utf-8', { fatal: true });

function reverseText(text: string): string {
  return Array.from(text).reverse().join('');
}

function isStrictBase64Structure(text: string): boolean {
  if (typeof text !== 'string' || text.length < NORMALIZATION_BASE64_MIN_LENGTH) {
    return false;
  }

  if (!NORMALIZATION_BASE64_ALLOWED_PATTERN.test(text)) {
    return false;
  }

  if (!NORMALIZATION_BASE64_MARKER_PATTERN.test(text)) {
    return false;
  }

  const firstPaddingIndex = text.indexOf('=');

  if (firstPaddingIndex !== -1 && /[^=]/.test(text.slice(firstPaddingIndex))) {
    return false;
  }

  const paddingMatch = text.match(NORMALIZATION_BASE64_TRAILING_PADDING_PATTERN);
  const paddingLength = paddingMatch ? paddingMatch[0].length : 0;
  const dataLength = text.length - paddingLength;

  if (paddingLength > 2) {
    return false;
  }

  if (dataLength === 0) {
    return false;
  }

  if (dataLength % 4 === 1) {
    return false;
  }

  if (paddingLength === 1 && dataLength % 4 !== 3) {
    return false;
  }

  if (paddingLength === 2 && dataLength % 4 !== 2) {
    return false;
  }

  return true;
}

function isStrictHexStructure(text: string): boolean {
  if (typeof text !== 'string' || text.length < NORMALIZATION_HEX_MIN_LENGTH) {
    return false;
  }

  if (text.length % 2 !== 0) {
    return false;
  }

  if (!NORMALIZATION_HEX_ALLOWED_PATTERN.test(text)) {
    return false;
  }

  if (!NORMALIZATION_HEX_MARKER_PATTERN.test(text)) {
    return false;
  }

  return true;
}

function decodeUtf8Bytes(bytes: Buffer): NormalizationTransformResult {
  try {
    return {
      ok: true,
      text: STRICT_UTF8_DECODER.decode(bytes),
    };
  } catch {
    return createNormalizationRefusal('NORMALIZATION_NON_TEXT_OUTPUT');
  }
}

function applySurfaceCleanup(text: string): NormalizationTransformResult {
  return {
    ok: true,
    text: text.replace(/\r\n?/g, '\n').trim(),
  };
}

function applyUnicodeNfc(text: string): NormalizationTransformResult {
  return {
    ok: true,
    text: text.normalize('NFC'),
  };
}

function applyPercentDecode(text: string): NormalizationTransformResult {
  if (typeof text !== 'string' || !text.includes('%')) {
    return createNormalizationRefusal('NORMALIZATION_INVALID_ENCODING');
  }

  try {
    return {
      ok: true,
      text: decodeURIComponent(text),
    };
  } catch {
    return createNormalizationRefusal('NORMALIZATION_INVALID_ENCODING');
  }
}

function applyBase64Decode(text: string): NormalizationTransformResult {
  if (!isStrictBase64Structure(text)) {
    return createNormalizationRefusal('NORMALIZATION_INVALID_ENCODING');
  }

  const clean = text.replace(/=+$/, '');
  const padding = (4 - (clean.length % 4)) % 4;
  const padded = `${clean}${'='.repeat(padding)}`;
  const bytes = Buffer.from(padded, 'base64');

  return decodeUtf8Bytes(bytes);
}

function applyHexDecode(text: string): NormalizationTransformResult {
  if (!isStrictHexStructure(text)) {
    return createNormalizationRefusal('NORMALIZATION_INVALID_ENCODING');
  }

  const bytes = Buffer.from(text, 'hex');

  return decodeUtf8Bytes(bytes);
}

function applyReverseThenBase64Decode(text: string): NormalizationTransformResult {
  return applyBase64Decode(reverseText(text));
}

function applyReverseThenHexDecode(text: string): NormalizationTransformResult {
  return applyHexDecode(reverseText(text));
}

module.exports = {
  applySurfaceCleanup,
  applyUnicodeNfc,
  applyPercentDecode,
  applyBase64Decode,
  applyHexDecode,
  applyReverseThenBase64Decode,
  applyReverseThenHexDecode,
  reverseText,
  isStrictBase64Structure,
  isStrictHexStructure,
};


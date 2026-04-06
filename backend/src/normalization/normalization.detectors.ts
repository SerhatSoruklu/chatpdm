/// <reference path="../vocabulary/commonjs-globals.d.ts" />

import type { NormalizationDetection } from './normalization.types.ts';

const {
  NORMALIZATION_BASE64_ALLOWED_PATTERN,
  NORMALIZATION_BASE64_MIN_LENGTH,
  NORMALIZATION_HEX_ALLOWED_PATTERN,
  NORMALIZATION_HEX_MARKER_PATTERN,
  NORMALIZATION_HEX_MIN_LENGTH,
} = require('./normalization.constants.ts');
const {
  reverseText,
} = require('./normalization.transforms.ts');

function isBase64CandidateLike(text: string): boolean {
  if (typeof text !== 'string' || text.length < NORMALIZATION_BASE64_MIN_LENGTH) {
    return false;
  }

  if (!NORMALIZATION_BASE64_ALLOWED_PATTERN.test(text)) {
    return false;
  }

  if (!/[0-9+/=]/.test(text)) {
    return false;
  }

  return true;
}

function isHexCandidateLike(text: string): boolean {
  if (typeof text !== 'string' || text.length < NORMALIZATION_HEX_MIN_LENGTH) {
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

function detectSurfaceCleanup(text: string): NormalizationDetection {
  return {
    transform: 'surface_cleanup',
    state: text.replace(/\r\n?/g, '\n').trim() === text ? 'not_applicable' : 'candidate',
  };
}

function detectUnicodeNfc(text: string): NormalizationDetection {
  return {
    transform: 'unicode_nfc',
    state: text.normalize('NFC') === text ? 'not_applicable' : 'candidate',
  };
}

function detectPercentDecode(text: string): NormalizationDetection {
  return {
    transform: 'percent_decode',
    state: text.includes('%') ? 'candidate' : 'not_applicable',
  };
}

function detectBase64Decode(text: string): NormalizationDetection {
  return {
    transform: 'base64_decode',
    state: isBase64CandidateLike(text) ? 'candidate' : 'not_applicable',
  };
}

function detectHexDecode(text: string): NormalizationDetection {
  return {
    transform: 'hex_decode',
    state: isHexCandidateLike(text) ? 'candidate' : 'not_applicable',
  };
}

function detectReverseThenBase64Decode(text: string): NormalizationDetection {
  return {
    transform: 'reverse_then_base64_decode',
    state: isBase64CandidateLike(reverseText(text)) ? 'candidate' : 'not_applicable',
  };
}

function detectReverseThenHexDecode(text: string): NormalizationDetection {
  return {
    transform: 'reverse_then_hex_decode',
    state: isHexCandidateLike(reverseText(text)) ? 'candidate' : 'not_applicable',
  };
}

module.exports = {
  detectSurfaceCleanup,
  detectUnicodeNfc,
  detectPercentDecode,
  detectBase64Decode,
  detectHexDecode,
  detectReverseThenBase64Decode,
  detectReverseThenHexDecode,
  isBase64CandidateLike,
  isHexCandidateLike,
};

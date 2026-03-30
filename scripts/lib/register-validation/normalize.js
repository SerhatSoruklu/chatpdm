'use strict';

const KNOWN_PREFIX_PATTERNS = Object.freeze([
  /^simplified explanation:\s*/i,
  /^formal framing:\s*/i,
  /^in simple terms:\s*/i,
  /^formally:\s*/i,
]);

function stripKnownPrefixes(text) {
  let nextText = typeof text === 'string' ? text.trimStart() : '';
  let changed = true;

  while (changed) {
    changed = false;

    for (const pattern of KNOWN_PREFIX_PATTERNS) {
      if (pattern.test(nextText)) {
        nextText = nextText.replace(pattern, '').trimStart();
        changed = true;
      }
    }
  }

  return nextText;
}

function normalizeText(text) {
  return String(text ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = {
  KNOWN_PREFIX_PATTERNS,
  normalizeText,
  stripKnownPrefixes,
};

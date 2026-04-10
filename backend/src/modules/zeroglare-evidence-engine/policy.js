'use strict';

const crypto = require('node:crypto');

function normalizeCanonicalText(value) {
  return String(value ?? '').normalize('NFC');
}

function compareCanonicalText(left, right) {
  return Buffer.compare(
    Buffer.from(normalizeCanonicalText(left), 'utf8'),
    Buffer.from(normalizeCanonicalText(right), 'utf8'),
  );
}

function compareCanonicalNumber(left, right) {
  const leftIsFinite = Number.isFinite(left);
  const rightIsFinite = Number.isFinite(right);

  if (!leftIsFinite && !rightIsFinite) {
    return 0;
  }

  if (!leftIsFinite) {
    return 1;
  }

  if (!rightIsFinite) {
    return -1;
  }

  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

function stringifyArtifactPart(part) {
  if (part === null || part === undefined) {
    return '';
  }

  if (Buffer.isBuffer(part)) {
    return part.toString('hex');
  }

  if (Array.isArray(part)) {
    return JSON.stringify(part);
  }

  if (typeof part === 'object') {
    return JSON.stringify(part);
  }

  return normalizeCanonicalText(part);
}

function buildCanonicalArtifactId(namespace, parts) {
  const hash = crypto.createHash('sha256');
  hash.update(normalizeCanonicalText(namespace));

  for (const part of parts) {
    hash.update('\u001f');
    hash.update(stringifyArtifactPart(part));
  }

  return `${normalizeCanonicalText(namespace)}:${hash.digest('hex')}`;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let index = 0; index < table.length; index += 1) {
    let crc = index;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) !== 0
        ? (0xEDB88320 ^ (crc >>> 1))
        : (crc >>> 1);
    }

    table[index] = crc >>> 0;
  }

  return table;
})();

function computeCrc32(parts) {
  const buffers = Array.isArray(parts) ? parts : [parts];
  let crc = 0xFFFFFFFF;

  for (const part of buffers) {
    const buffer = Buffer.isBuffer(part)
      ? part
      : Buffer.from(stringifyArtifactPart(part), 'utf8');

    for (let index = 0; index < buffer.length; index += 1) {
      const tableIndex = (crc ^ buffer[index]) & 0xFF;
      crc = (CRC32_TABLE[tableIndex] ^ (crc >>> 8)) >>> 0;
    }
  }

  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function buildCanonicalFrameArtifactId(frameFingerprint) {
  return buildCanonicalArtifactId('zee-frame', [frameFingerprint]);
}

function buildCanonicalTraceArtifactId(frameArtifactIds, options, policyVersion) {
  return buildCanonicalArtifactId('zee-trace', [
    policyVersion,
    frameArtifactIds,
    options,
  ]);
}

module.exports = {
  buildCanonicalArtifactId,
  buildCanonicalFrameArtifactId,
  buildCanonicalTraceArtifactId,
  compareCanonicalNumber,
  compareCanonicalText,
  computeCrc32,
  normalizeCanonicalText,
};

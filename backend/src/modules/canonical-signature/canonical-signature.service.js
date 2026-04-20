'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const env = require('../../config/env');

const CANONICAL_SIGNATURE_ALGORITHM = 'RS256';
const CANONICAL_SIGNATURE_KEY_ID = 'chatpdm-vision-signature-v1';
const CANONICAL_SIGNATURE_IMAGE_PATH = '/assets/signature/serhat-v1.svg';
const CANONICAL_SIGNATURE_CONTEXT = Object.freeze({
  page: 'vision',
  section: 'founder-signature',
  scope: 'public-identity',
});
const CANONICAL_SIGNATURE_IMAGE_ABSOLUTE_PATH = path.resolve(
  __dirname,
  '../../../../frontend/src/assets/signature/serhat-v1.svg',
);
const CANONICAL_SIGNATURE_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsOiKV94HuRbBwXCFpMWO
ecAXA/9ixhGaPS29JDXRXzX7+9m8f3q8/pvXknnr5WbkaZBDRp6X5aWSX57EZc3k
DNrXcYoZnntDCSV8fWIZCpTgKdEEG951tgwsDPbI0dZ6Q5hx3qAezz1rVkTOkfHh
4IdNy9/fWmZVL1i0BgLUQcWo0mWFb1s+JJ/i4dog/EmseMIJsvkji+KxPE886c8r
oE2jGB2zK7OM7ael/uBtRJO8eVzXTPvy/hOcbBdBc7zytEjns1BYKUxlJ3HYR3uU
Yr2ZUvBghM1pq4F0E+rd3TSziH8uMTaSFhhsMP2NrxJQS0KQpg5QMSx7xpRP9H+j
FQIDAQAB
-----END PUBLIC KEY-----`;

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function canonicalJSONStringify(value) {
  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJSONStringify(item)).join(',')}]`;
  }

  if (isPlainObject(value)) {
    const entries = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJSONStringify(value[key])}`);

    return `{${entries.join(',')}}`;
  }

  throw new TypeError('Canonical signature payload must be serializable as a plain JSON value.');
}

function toSha256PrefixHex(input) {
  return `sha256:${crypto.createHash('sha256').update(input, 'utf8').digest('hex')}`;
}

function toSha512PrefixHex(buffer) {
  return `sha512:${crypto.createHash('sha512').update(buffer).digest('hex')}`;
}

function resolvePrivateKeyPath() {
  if (!env.signaturePrivateKeyFile) {
    throw new Error('CHATPDM_SIGNATURE_PRIVATE_KEY_FILE must be set for canonical signature signing.');
  }

  return path.resolve(__dirname, '../../../../', env.signaturePrivateKeyFile);
}

function readSignaturePrivateKeyPem() {
  const privateKeyPath = resolvePrivateKeyPath();

  if (!fs.existsSync(privateKeyPath)) {
    throw new Error(`Canonical signature private key file was not found at "${privateKeyPath}".`);
  }

  return fs.readFileSync(privateKeyPath, 'utf8').trim();
}

function computeSignatureImageHash() {
  if (!fs.existsSync(CANONICAL_SIGNATURE_IMAGE_ABSOLUTE_PATH)) {
    throw new Error(
      `Canonical signature image asset was not found at "${CANONICAL_SIGNATURE_IMAGE_ABSOLUTE_PATH}".`,
    );
  }

  const fileBuffer = fs.readFileSync(CANONICAL_SIGNATURE_IMAGE_ABSOLUTE_PATH);
  return toSha512PrefixHex(fileBuffer);
}

function buildCanonicalSignatureEnvelope() {
  const envelope = {
    signatureImagePath: CANONICAL_SIGNATURE_IMAGE_PATH,
    signatureImageHash: computeSignatureImageHash(),
    context: CANONICAL_SIGNATURE_CONTEXT,
    issuedAt: new Date().toISOString(),
  };
  envelope.payloadHash = toSha256PrefixHex(canonicalJSONStringify(envelope));

  const signatureInput = canonicalJSONStringify(envelope);
  const privateKeyPem = readSignaturePrivateKeyPem();
  const privateKey = crypto.createPrivateKey({
    key: privateKeyPem,
    format: 'pem',
  });
  const signature = crypto.sign('sha256', Buffer.from(signatureInput, 'utf8'), privateKey).toString('base64url');

  const signedEnvelope = {
    envelope,
    signature: {
      alg: CANONICAL_SIGNATURE_ALGORITHM,
      kid: CANONICAL_SIGNATURE_KEY_ID,
      value: signature,
    },
  };

  if (!verifyCanonicalSignatureEnvelope(signedEnvelope)) {
    throw new Error('Canonical signature envelope self-verification failed.');
  }

  return signedEnvelope;
}

function verifyCanonicalSignatureEnvelope(signedEnvelope) {
  if (!isPlainObject(signedEnvelope) || !isPlainObject(signedEnvelope.envelope) || !isPlainObject(signedEnvelope.signature)) {
    return false;
  }

  if (signedEnvelope.signature.alg !== CANONICAL_SIGNATURE_ALGORITHM || signedEnvelope.signature.kid !== CANONICAL_SIGNATURE_KEY_ID) {
    return false;
  }

  if (typeof signedEnvelope.signature.value !== 'string' || signedEnvelope.signature.value.length === 0) {
    return false;
  }

  const signatureInput = canonicalJSONStringify(signedEnvelope.envelope);
  const publicKey = crypto.createPublicKey({
    key: CANONICAL_SIGNATURE_PUBLIC_KEY_PEM,
    format: 'pem',
  });

  return crypto.verify(
    'sha256',
    Buffer.from(signatureInput, 'utf8'),
    publicKey,
    Buffer.from(signedEnvelope.signature.value, 'base64url'),
  );
}

function buildCanonicalSignatureResponse() {
  return {
    resource: 'vision-signature',
    status: 'signed',
    signedEnvelope: buildCanonicalSignatureEnvelope(),
  };
}

module.exports = {
  CANONICAL_SIGNATURE_ALGORITHM,
  CANONICAL_SIGNATURE_CONTEXT,
  CANONICAL_SIGNATURE_IMAGE_PATH,
  CANONICAL_SIGNATURE_KEY_ID,
  CANONICAL_SIGNATURE_PUBLIC_KEY_PEM,
  buildCanonicalSignatureEnvelope,
  buildCanonicalSignatureResponse,
  canonicalJSONStringify,
  computeSignatureImageHash,
  verifyCanonicalSignatureEnvelope,
};

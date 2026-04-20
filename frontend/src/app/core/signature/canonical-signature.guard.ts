import type {
  CanonicalSignatureEnvelope,
  CanonicalSignatureSignature,
  CanonicalSignedEnvelope,
} from './canonical-signature.types';
import {
  CANONICAL_SIGNATURE_ALGORITHM,
  CANONICAL_SIGNATURE_KEY_ID,
  CANONICAL_SIGNATURE_PUBLIC_KEY_PEM,
} from './canonical-signature.keys';

const CANONICAL_SIGNATURE_IMAGE_PATH = '/assets/signature/serhat-v1.svg';
const CANONICAL_SIGNATURE_CONTEXT = Object.freeze({
  page: 'vision',
  section: 'founder-signature',
  scope: 'public-identity',
});

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

export function canonicalJSONStringify(value: unknown): string {
  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJSONStringify(entry)).join(',')}]`;
  }

  if (isPlainObject(value)) {
    const entries = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJSONStringify(value[key])}`);

    return `{${entries.join(',')}}`;
  }

  throw new TypeError('Canonical signature values must be plain JSON data.');
}

async function digestHex(algorithm: 'SHA-256' | 'SHA-512', text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest(algorithm, bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function digestBufferHex(algorithm: 'SHA-256' | 'SHA-512', buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest(algorithm, buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem.replace(/-----BEGIN PUBLIC KEY-----/g, '').replace(/-----END PUBLIC KEY-----/g, '').replace(/\s+/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

function base64UrlToBytes(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = `${normalized}${'='.repeat((4 - (normalized.length % 4)) % 4)}`;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

async function importVisionSignaturePublicKey(publicKeyPem: string) {
  return crypto.subtle.importKey(
    'spki',
    pemToArrayBuffer(publicKeyPem),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['verify'],
  );
}

function normalizePayload(envelope: CanonicalSignatureEnvelope): CanonicalSignatureEnvelope {
  return {
    signatureImagePath: envelope.signatureImagePath,
    signatureImageHash: envelope.signatureImageHash,
    context: {
      page: envelope.context.page,
      section: envelope.context.section,
      scope: envelope.context.scope,
    },
    issuedAt: envelope.issuedAt,
    payloadHash: envelope.payloadHash,
    ...(envelope.expiresAt ? { expiresAt: envelope.expiresAt } : {}),
  };
}

function validateEnvelopeShape(signedEnvelope: CanonicalSignedEnvelope): string | null {
  if (!isPlainObject(signedEnvelope) || !isPlainObject(signedEnvelope.envelope) || !isPlainObject(signedEnvelope.signature)) {
    return 'Signature envelope is malformed.';
  }

  const envelope = signedEnvelope.envelope as CanonicalSignatureEnvelope;
  const signature = signedEnvelope.signature as CanonicalSignatureSignature;

  if (envelope['signatureImagePath'] !== CANONICAL_SIGNATURE_IMAGE_PATH) {
    return 'Signature image path does not match the canonical asset.';
  }

  if (typeof envelope['signatureImageHash'] !== 'string' || !envelope['signatureImageHash'].startsWith('sha512:')) {
    return 'Signature image hash is missing or malformed.';
  }

  if (!isPlainObject(envelope['context'])) {
    return 'Signature context is missing or malformed.';
  }

  const context = envelope['context'] as Record<string, unknown>;
  if (
    context['page'] !== CANONICAL_SIGNATURE_CONTEXT.page
    || context['section'] !== CANONICAL_SIGNATURE_CONTEXT.section
    || context['scope'] !== CANONICAL_SIGNATURE_CONTEXT.scope
  ) {
    return 'Signature context does not match the canonical vision scope.';
  }

  if (typeof envelope['issuedAt'] !== 'string' || envelope['issuedAt'].length === 0) {
    return 'Signature issuedAt is missing.';
  }

  if (typeof envelope['payloadHash'] !== 'string' || !envelope['payloadHash'].startsWith('sha256:')) {
    return 'Signature payload hash is missing or malformed.';
  }

  if (typeof signature['alg'] !== 'string' || signature['alg'] !== CANONICAL_SIGNATURE_ALGORITHM) {
    return 'Signature algorithm is not supported.';
  }

  if (typeof signature['kid'] !== 'string' || signature['kid'] !== CANONICAL_SIGNATURE_KEY_ID) {
    return 'Signature key identifier is not supported.';
  }

  if (typeof signature['value'] !== 'string' || signature['value'].length === 0) {
    return 'Signature value is missing.';
  }

  if (typeof envelope['expiresAt'] === 'string' && envelope['expiresAt'].length > 0) {
    const expiresAtMs = Date.parse(envelope['expiresAt']);
    if (Number.isNaN(expiresAtMs)) {
      return 'Signature expiration is malformed.';
    }
    if (Date.now() > expiresAtMs) {
      return 'Signature has expired.';
    }
  }

  return null;
}

async function fetchCanonicalSignatureImageHash(signatureImagePath: string, baseUrl: string): Promise<string> {
  const imageUrl = new URL(signatureImagePath, baseUrl).href;
  const response = await fetch(imageUrl, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Unable to load canonical signature asset from ${imageUrl}.`);
  }

  return `sha512:${await digestBufferHex('SHA-512', await response.arrayBuffer())}`;
}

export async function verifyCanonicalSignatureEnvelope(
  signedEnvelope: CanonicalSignedEnvelope,
  baseUrl: string,
  publicKeyPem: string = CANONICAL_SIGNATURE_PUBLIC_KEY_PEM,
): Promise<{ verified: true; signedEnvelope: CanonicalSignedEnvelope } | { verified: false; reason: string }> {
  const envelopeError = validateEnvelopeShape(signedEnvelope);
  if (envelopeError) {
    return { verified: false, reason: envelopeError };
  }

  const normalizedEnvelope = normalizePayload(signedEnvelope.envelope);
  const expectedPayloadHash = `sha256:${await digestHex('SHA-256', canonicalJSONStringify({
    context: normalizedEnvelope.context,
    issuedAt: normalizedEnvelope.issuedAt,
    signatureImageHash: normalizedEnvelope.signatureImageHash,
    signatureImagePath: normalizedEnvelope.signatureImagePath,
  }))}`;

  if (normalizedEnvelope.payloadHash !== expectedPayloadHash) {
    return { verified: false, reason: 'Signature payload hash does not match the canonical payload.' };
  }

  const expectedImageHash = await fetchCanonicalSignatureImageHash(normalizedEnvelope.signatureImagePath, baseUrl);
  if (normalizedEnvelope.signatureImageHash !== expectedImageHash) {
    return { verified: false, reason: 'Signature image hash does not match the canonical asset.' };
  }

  const publicKey = await importVisionSignaturePublicKey(publicKeyPem);
  const signatureInput = canonicalJSONStringify(normalizedEnvelope);
  const signature = base64UrlToBytes(signedEnvelope.signature.value);

  const verified = await crypto.subtle.verify(
    {
      name: 'RSASSA-PKCS1-v1_5',
    },
    publicKey,
    signature,
    new TextEncoder().encode(signatureInput),
  );

  if (!verified) {
    return { verified: false, reason: 'Signature verification failed.' };
  }

  return { verified: true, signedEnvelope };
}

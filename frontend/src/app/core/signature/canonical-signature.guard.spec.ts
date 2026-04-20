import '@angular/compiler';

import { createHash, generateKeyPairSync, sign } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import {
  CANONICAL_SIGNATURE_ALGORITHM,
  CANONICAL_SIGNATURE_KEY_ID,
} from './canonical-signature.keys';
import {
  canonicalJSONStringify,
  verifyCanonicalSignatureEnvelope,
} from './canonical-signature.guard';

const CANONICAL_SIGNATURE_IMAGE_PATH = '/assets/signature/serhat-v1.svg';
const CANONICAL_SIGNATURE_CONTEXT = Object.freeze({
  page: 'vision',
  section: 'founder-signature',
  scope: 'public-identity',
});

function createTestSignedEnvelope(signatureImageHash: string, expiresAt?: string) {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });

  const envelope = {
    signatureImagePath: CANONICAL_SIGNATURE_IMAGE_PATH,
    signatureImageHash,
    context: CANONICAL_SIGNATURE_CONTEXT,
    issuedAt: '2026-04-20T19:52:00.000Z',
    ...(expiresAt ? { expiresAt } : {}),
  };

  envelope.payloadHash = `sha256:${createHash('sha256')
    .update(
      canonicalJSONStringify({
        context: envelope.context,
        issuedAt: envelope.issuedAt,
        signatureImageHash: envelope.signatureImageHash,
        signatureImagePath: envelope.signatureImagePath,
      }),
      'utf8',
    )
    .digest('hex')}`;

  const signature = sign('sha256', Buffer.from(canonicalJSONStringify(envelope), 'utf8'), privateKey).toString('base64url');

  return {
    signedEnvelope: {
      envelope,
      signature: {
        alg: CANONICAL_SIGNATURE_ALGORITHM,
        kid: CANONICAL_SIGNATURE_KEY_ID,
        value: signature,
      },
    },
    publicKeyPem: publicKey.export({
      type: 'spki',
      format: 'pem',
    }).toString(),
  };
}

describe('canonical signature guard', () => {
  it('refuses a malformed signed envelope', async () => {
    const verification = await verifyCanonicalSignatureEnvelope(
      {} as Parameters<typeof verifyCanonicalSignatureEnvelope>[0],
      'http://127.0.0.1:4200/',
    );

    expect(verification).toEqual({
      verified: false,
      reason: 'Signature envelope is malformed.',
    });
  });

  it('verifies a canonical signed envelope and checks the image hash', async () => {
    const assetBytes = Buffer.from('canonical-signature-asset-bytes', 'utf8');
    const signatureImageHash = `sha512:${createHash('sha512').update(assetBytes).digest('hex')}`;
    const { signedEnvelope, publicKeyPem } = createTestSignedEnvelope(signatureImageHash);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => assetBytes.buffer.slice(assetBytes.byteOffset, assetBytes.byteOffset + assetBytes.byteLength),
    }));

    try {
      const verification = await verifyCanonicalSignatureEnvelope(signedEnvelope, 'http://127.0.0.1:4200/', publicKeyPem);

      expect(verification).toEqual({
        verified: true,
        signedEnvelope,
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('refuses a signed envelope when the asset hash does not match', async () => {
    const assetBytes = Buffer.from('canonical-signature-asset-bytes', 'utf8');
    const signatureImageHash = `sha512:${createHash('sha512').update(assetBytes).digest('hex')}`;
    const { signedEnvelope, publicKeyPem } = createTestSignedEnvelope(signatureImageHash);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => {
        const bytes = Buffer.from('different-bytes', 'utf8');
        return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      },
    }));

    try {
      const verification = await verifyCanonicalSignatureEnvelope(signedEnvelope, 'http://127.0.0.1:4200/', publicKeyPem);

      expect(verification).toEqual({
        verified: false,
        reason: 'Signature image hash does not match the canonical asset.',
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('refuses a signed envelope when the RSA signature is tampered with', async () => {
    const assetBytes = Buffer.from('canonical-signature-asset-bytes', 'utf8');
    const signatureImageHash = `sha512:${createHash('sha512').update(assetBytes).digest('hex')}`;
    const { signedEnvelope, publicKeyPem } = createTestSignedEnvelope(signatureImageHash);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => assetBytes.buffer.slice(assetBytes.byteOffset, assetBytes.byteOffset + assetBytes.byteLength),
    }));

    signedEnvelope.signature.value = `${signedEnvelope.signature.value.slice(0, -1)}A`;

    try {
      const verification = await verifyCanonicalSignatureEnvelope(signedEnvelope, 'http://127.0.0.1:4200/', publicKeyPem);

      expect(verification).toEqual({
        verified: false,
        reason: 'Signature verification failed.',
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('refuses a signed envelope when it has expired', async () => {
    const assetBytes = Buffer.from('canonical-signature-asset-bytes', 'utf8');
    const signatureImageHash = `sha512:${createHash('sha512').update(assetBytes).digest('hex')}`;
    const { signedEnvelope, publicKeyPem } = createTestSignedEnvelope(
      signatureImageHash,
      '2026-04-20T19:51:59.000Z',
    );

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => assetBytes.buffer.slice(assetBytes.byteOffset, assetBytes.byteOffset + assetBytes.byteLength),
    }));

    try {
      const verification = await verifyCanonicalSignatureEnvelope(signedEnvelope, 'http://127.0.0.1:4200/', publicKeyPem);

      expect(verification).toEqual({
        verified: false,
        reason: 'Signature has expired.',
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

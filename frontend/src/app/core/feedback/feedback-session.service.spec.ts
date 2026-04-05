import '@angular/compiler';

import { describe, expect, it } from 'vitest';

import { createSecureSessionId } from './feedback-session.service';

describe('createSecureSessionId', () => {
  it('uses crypto.randomUUID when available', () => {
    expect(
      createSecureSessionId({
        randomUUID: () => '123e4567-e89b-12d3-a456-426614174000',
      } as Pick<Crypto, 'randomUUID'>),
    ).toBe('chatpdm-123e4567-e89b-12d3-a456-426614174000');
  });

  it('falls back to crypto.getRandomValues without insecure randomness', () => {
    const bytes = Uint8Array.from([
      0x00, 0x01, 0x02, 0x03,
      0x04, 0x05, 0x06, 0x07,
      0x08, 0x09, 0x0a, 0x0b,
      0x0c, 0x0d, 0x0e, 0x0f,
    ]);

    const sessionId = createSecureSessionId({
      getRandomValues(target: Uint8Array) {
        target.set(bytes);
        return target;
      },
    } as Pick<Crypto, 'getRandomValues'>);

    expect(sessionId).toBe('chatpdm-00010203-0405-4607-8809-0a0b0c0d0e0f');
  });

  it('fails closed when secure crypto APIs are unavailable', () => {
    expect(() => createSecureSessionId(undefined)).toThrow('Secure crypto APIs are unavailable.');
  });
});

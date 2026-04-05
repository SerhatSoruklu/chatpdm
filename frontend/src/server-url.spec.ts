import { describe, expect, it } from 'vitest';

import { buildTrustedApiUrl, createTrustedApiOrigin } from './server-url';

describe('server-url', () => {
  it('keeps proxy targets pinned to the trusted API origin', () => {
    const apiOrigin = createTrustedApiOrigin('http://127.0.0.1:4301');
    const target = buildTrustedApiUrl(apiOrigin, '/api/v1/concepts/resolve?q=authority');

    expect(target.href).toBe('http://127.0.0.1:4301/api/v1/concepts/resolve?q=authority');
    expect(target.host).toBe('127.0.0.1:4301');
    expect(target.protocol).toBe('http:');
  });

  it('preserves path-only api requests without allowing host override', () => {
    const apiOrigin = createTrustedApiOrigin('https://api.chatpdm.com');
    const target = buildTrustedApiUrl(apiOrigin, '/api//evil.com?next=//other.example');

    expect(target.href).toBe('https://api.chatpdm.com/api//evil.com?next=//other.example');
    expect(target.host).toBe('api.chatpdm.com');
    expect(target.protocol).toBe('https:');
  });

  it('rejects unsupported API base schemes and non-api request targets', () => {
    expect(() => createTrustedApiOrigin('javascript:alert(1)')).toThrow('Unsupported API_BASE_URL protocol');
    expect(() => buildTrustedApiUrl(createTrustedApiOrigin('http://127.0.0.1:4301'), '//evil.com')).toThrow(
      'ChatPDM SSR API proxy only accepts /api request targets.',
    );
  });
});

export const CANONICAL_SIGNATURE_ALGORITHM = 'RS256';
export const CANONICAL_SIGNATURE_KEY_ID = 'chatpdm-vision-signature-v1';

export const CANONICAL_SIGNATURE_LOCALHOST_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsOiKV94HuRbBwXCFpMWO
ecAXA/9ixhGaPS29JDXRXzX7+9m8f3q8/pvXknnr5WbkaZBDRp6X5aWSX57EZc3k
DNrXcYoZnntDCSV8fWIZCpTgKdEEG951tgwsDPbI0dZ6Q5hx3qAezz1rVkTOkfHh
4IdNy9/fWmZVL1i0BgLUQcWo0mWFb1s+JJ/i4dog/EmseMIJsvkji+KxPE886c8r
oE2jGB2zK7OM7ael/uBtRJO8eVzXTPvy/hOcbBdBc7zytEjns1BYKUxlJ3HYR3uU
Yr2ZUvBghM1pq4F0E+rd3TSziH8uMTaSFhhsMP2NrxJQS0KQpg5QMSx7xpRP9H+j
FQIDAQAB
-----END PUBLIC KEY-----`;

export const CANONICAL_SIGNATURE_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvfUatMGuEVOHKNm4gInh
BJFy42WijETv0LQas1W4M2ayyg1OByBUCqIz5p+GLMq1fcpGbnYE99/AevmWmk+Q
pxCH/1NCQyLoavcqE4Im9RJI9zVy0SzQ/Tian/fR+dGFJDC0YUKeggu8DOyFSWHF
ODOOAgLiOvhB3CXVPCaaQjXuhtFlspzaCyjq9DFTifHXuxUzqrhu1RDr1I4rDQMe
J1mxL3WeppKJMxUP6Qil9q3h4yNXV/8PXmISzLxQ2gIxNlgnqjrO2quhOYXnCIWr
mmq5GUY/H9F3fxA6fXqSaQlxvg4kuWjBMFM2ycx6cvGnTq1Kq6AfMi1BHY32E5Un
CwIDAQAB
-----END PUBLIC KEY-----`;

function isLocalhostHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
}

export function resolveCanonicalSignaturePublicKeyPem(baseUrl: string): string {
  try {
    const { hostname } = new URL(baseUrl);
    return isLocalhostHostname(hostname)
      ? CANONICAL_SIGNATURE_LOCALHOST_PUBLIC_KEY_PEM
      : CANONICAL_SIGNATURE_PUBLIC_KEY_PEM;
  } catch {
    return CANONICAL_SIGNATURE_PUBLIC_KEY_PEM;
  }
}

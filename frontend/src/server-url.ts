const DEFAULT_API_ORIGIN = 'http://127.0.0.1:4301';

const SUPPORTED_API_PROTOCOLS = new Set(['http:', 'https:']);

export function createTrustedApiOrigin(rawValue?: string): URL {
  const value = String(rawValue ?? '').trim() || DEFAULT_API_ORIGIN;
  const parsed = new URL(value);

  if (!SUPPORTED_API_PROTOCOLS.has(parsed.protocol)) {
    throw new Error(`Unsupported API_BASE_URL protocol "${parsed.protocol}".`);
  }

  if (parsed.username || parsed.password) {
    throw new Error('API_BASE_URL must not include credentials.');
  }

  // The API origin is operator-controlled configuration. Request input is never allowed
  // to supply the host or scheme; only the trusted origin is used for SSR proxying.
  return new URL(parsed.origin);
}

export function buildTrustedApiUrl(apiOrigin: URL, requestTarget: string): URL {
  if (typeof requestTarget !== 'string' || requestTarget.length === 0) {
    throw new TypeError('requestTarget must be a non-empty string.');
  }

  if (!(requestTarget === '/api' || requestTarget.startsWith('/api/') || requestTarget.startsWith('/api?'))) {
    throw new Error('ChatPDM SSR API proxy only accepts /api request targets.');
  }

  const queryIndex = requestTarget.indexOf('?');
  const pathname = queryIndex === -1 ? requestTarget : requestTarget.slice(0, queryIndex);
  const search = queryIndex === -1 ? '' : requestTarget.slice(queryIndex);
  const target = new URL(apiOrigin.href);

  target.pathname = pathname;
  target.search = search;

  return target;
}

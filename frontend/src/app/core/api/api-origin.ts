export function resolveApiOrigin(document: Document | null | undefined): string {
  const location = document?.location;

  if (!location) {
    return 'http://127.0.0.1:4301';
  }

  if (
    location.hostname === 'localhost'
    || location.hostname === '127.0.0.1'
    || location.hostname === '0.0.0.0'
  ) {
    if (location.port === '4301') {
      return `${location.protocol}//${location.host}`;
    }

    return `${location.protocol}//${location.hostname}:4301`;
  }

  if (location.port === '4301') {
    return `${location.protocol}//${location.host}`;
  }

  return `${location.protocol}//${location.host}`;
}

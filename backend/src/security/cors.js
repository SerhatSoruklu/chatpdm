'use strict';

function createCorsMiddleware(allowedOrigins) {
  const originSet = new Set(normalizeOrigins(allowedOrigins));

  return function chatpdmCorsMiddleware(req, res, next) {
    const origin = req.get('origin');

    if (!origin) {
      next();
      return;
    }

    const normalizedOrigin = normalizeOrigin(origin);

    if (!originSet.has(normalizedOrigin)) {
      next();
      return;
    }

    res.setHeader('Access-Control-Allow-Origin', normalizedOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (typeof res.vary === 'function') {
      res.vary('Origin');
    }

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    next();
  };
}

function normalizeOrigins(value) {
  if (Array.isArray(value)) {
    return value.map((origin) => normalizeOrigin(origin)).filter(Boolean);
  }

  return [normalizeOrigin(value)].filter(Boolean);
}

function normalizeOrigin(value) {
  const trimmed = String(value ?? '').trim();
  let end = trimmed.length;

  while (end > 0 && trimmed.charCodeAt(end - 1) === 47) {
    end -= 1;
  }

  return trimmed.slice(0, end);
}

module.exports = {
  createCorsMiddleware,
};

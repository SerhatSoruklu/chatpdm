'use strict';

function createCorsOptions(allowedOrigins) {
  const originSet = new Set(normalizeOrigins(allowedOrigins));

  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = String(origin).trim().replace(/\/+$/, '');

      if (originSet.has(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
    optionsSuccessStatus: 204,
    maxAge: 86400,
  };
}

function normalizeOrigins(value) {
  if (Array.isArray(value)) {
    return value.map((origin) => String(origin ?? '').trim().replace(/\/+$/, '')).filter(Boolean);
  }

  return [String(value ?? '').trim().replace(/\/+$/, '')].filter(Boolean);
}

module.exports = {
  createCorsOptions,
};

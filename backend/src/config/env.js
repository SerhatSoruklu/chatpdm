'use strict';

function readNumber(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeUrl(value) {
  return String(value ?? '').trim().replace(/\/+$/, '');
}

function parseOrigins(value, fallbackValues) {
  const values = String(value ?? '')
    .split(',')
    .map((entry) => normalizeUrl(entry))
    .filter(Boolean);

  return [...new Set(values.length ? values : fallbackValues.map(normalizeUrl))];
}

function parseBoolean(value, fallbackValue = false) {
  if (typeof value !== 'string') {
    return fallbackValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function parseTrustProxy(value, fallbackValue) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return fallbackValue;
  }

  const normalized = String(value).trim().toLowerCase();

  if (['false', '0', 'off', 'no'].includes(normalized)) {
    return false;
  }

  if (['true', 'on', 'yes'].includes(normalized)) {
    return true;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isNaN(parsed) ? fallbackValue : parsed;
}

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const defaultFrontendUrl = isProduction ? 'https://chatpdm.com' : 'http://localhost:4200';
const defaultApiOrigin = isProduction ? 'https://api.chatpdm.com' : 'http://localhost:4301';
const frontendUrl = normalizeUrl(process.env.FRONTEND_URL || defaultFrontendUrl);
const frontendOrigins = parseOrigins(
  process.env.FRONTEND_ORIGINS,
  isProduction
    ? [frontendUrl, 'https://www.chatpdm.com']
    : [frontendUrl, 'http://127.0.0.1:4200'],
);
const mongodbUri = process.env.MONGODB_URI || (isProduction ? '' : 'mongodb://127.0.0.1:27017/chatpdm');

if (isProduction && !mongodbUri) {
  throw new Error('MONGODB_URI must be set in production.');
}

module.exports = {
  nodeEnv,
  isProduction,
  host: String(process.env.HOST || '127.0.0.1').trim() || '127.0.0.1',
  port: readNumber(process.env.PORT, 4301),
  mongoUri: mongodbUri,
  frontendUrl,
  frontendOrigins,
  apiOrigin: normalizeUrl(process.env.API_ORIGIN || defaultApiOrigin),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY, isProduction ? 1 : false),
  enableCompression: parseBoolean(process.env.ENABLE_COMPRESSION, true),
};

'use strict';

const dns = require('node:dns').promises;
const verificationConfig = require('./config/managed-access-verification.config');

function createFetchWithTimeout(timeoutMs) {
  return async function fetchWebsiteText(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'user-agent': 'ChatPDMManagedAccessVerifier/1.0',
          accept: 'text/plain,text/html;q=0.8,*/*;q=0.1',
        },
      });

      return {
        ok: response.ok,
        status: response.status,
        text: await response.text(),
      };
    } finally {
      clearTimeout(timeout);
    }
  };
}

const defaultAdapters = Object.freeze({
  resolveDnsTxtRecords: async (host) => dns.resolveTxt(host),
  fetchWebsiteText: createFetchWithTimeout(verificationConfig.websiteFetchTimeoutMs),
});

let activeAdapters = defaultAdapters;

async function resolveDnsTxtRecords(host) {
  return activeAdapters.resolveDnsTxtRecords(host);
}

async function fetchWebsiteText(url) {
  return activeAdapters.fetchWebsiteText(url);
}

function setManagedAccessVerificationProbeAdaptersForTest(overrides) {
  activeAdapters = {
    ...defaultAdapters,
    ...overrides,
  };
}

function resetManagedAccessVerificationProbeAdapters() {
  activeAdapters = defaultAdapters;
}

module.exports = {
  fetchWebsiteText,
  resetManagedAccessVerificationProbeAdapters,
  resolveDnsTxtRecords,
  setManagedAccessVerificationProbeAdaptersForTest,
};

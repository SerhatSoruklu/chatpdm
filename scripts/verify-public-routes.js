#!/usr/bin/env node
'use strict';

const EXPECTED_DOCS_ROUTE = 'https://chatpdm.com/api/';
const EXPECTED_WWW_ROUTE = 'https://www.chatpdm.com/api/';
const EXPECTED_ROUTE_SURFACE_MARKER = 'data-route-surface="api-docs"';
const PUBLIC_ROUTE_USER_AGENT = 'ChatPDM public route verifier';
const JSON_MODE_FLAG = '--json';
const JSON_MODE_ENV = 'CHATPDM_PUBLIC_ROUTE_VERIFY_JSON';

const argv = new Set(process.argv.slice(2));
const useJsonOutput = argv.has(JSON_MODE_FLAG) || isTruthyEnv(process.env[JSON_MODE_ENV]);

async function main() {
  const checks = [];

  for (const check of [
    verifyDocsRoute,
    verifyHealthRoute,
    verifyBackendApiRoute,
    verifyCanonicalRedirectRoute,
  ]) {
    try {
      checks.push(await check());
    } catch (error) {
      checks.push(formatFailedCheck(error));
    }
  }

  const failures = checks.filter((check) => check.status === 'fail');

  if (failures.length > 0) {
    if (useJsonOutput) {
      process.stdout.write(
        `${JSON.stringify(
          {
            ok: false,
            checks,
          },
          null,
          2,
        )}\n`,
      );
    } else {
      console.error('[chatpdm route verification] failed');
      for (const failure of failures) {
        console.error(`- ${failure.error}`);
      }
    }
    process.exitCode = 1;
    return;
  }

  if (useJsonOutput) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          checks,
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  for (const check of checks) {
    console.log(formatHumanSuccess(check));
  }
  console.log('[chatpdm route verification] passed');
}

async function verifyDocsRoute() {
  const { response, body } = await fetchText(EXPECTED_DOCS_ROUTE);

  if (response.status !== 200) {
    throw routeCheckError({
      actualStatus: `HTTP ${response.status}`,
      expectedBehavior: 'frontend docs route with stable api-docs marker',
      httpStatus: response.status,
      message: `chatpdm.com/api/ expected HTTP 200 from the frontend docs route, received ${response.status}.`,
      route: EXPECTED_DOCS_ROUTE,
      surface: 'api-docs',
    });
  }

  if (body.includes('Cannot GET /api/')) {
    throw routeCheckError({
      actualStatus: `HTTP ${response.status}`,
      expectedBehavior: 'frontend docs route with stable api-docs marker',
      httpStatus: response.status,
      message: 'chatpdm.com/api/ still looks like the backend 404 surface.',
      route: EXPECTED_DOCS_ROUTE,
      surface: 'api-docs',
    });
  }

  if (!body.includes(EXPECTED_ROUTE_SURFACE_MARKER)) {
    throw routeCheckError({
      actualStatus: `HTTP ${response.status}`,
      expectedBehavior: 'frontend docs route with stable api-docs marker',
      httpStatus: response.status,
      message: 'chatpdm.com/api/ did not return the stable route identity marker expected for the API docs page.',
      route: EXPECTED_DOCS_ROUTE,
      surface: 'api-docs',
    });
  }

  return {
    expectedBehavior: 'frontend docs route with stable api-docs marker',
    actualStatus: `HTTP ${response.status}`,
    httpStatus: response.status,
    route: EXPECTED_DOCS_ROUTE,
    status: 'pass',
    surface: 'api-docs',
  };
}

async function verifyHealthRoute() {
  const { response, body } = await fetchText('https://chatpdm.com/health');

  if (response.status !== 200) {
    throw routeCheckError({
      actualStatus: `HTTP ${response.status}`,
      expectedBehavior: 'backend health surface',
      httpStatus: response.status,
      message: `chatpdm.com/health expected HTTP 200 from the backend health route, received ${response.status}.`,
      route: 'https://chatpdm.com/health',
      surface: 'backend-health',
    });
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    throw routeCheckError({
      actualStatus: `HTTP ${response.status}`,
      expectedBehavior: 'backend health surface',
      httpStatus: response.status,
      message: 'chatpdm.com/health did not return JSON from the backend health route.',
      route: 'https://chatpdm.com/health',
      surface: 'backend-health',
    });
  }

  if (payload.service !== 'chatpdm-backend') {
    throw routeCheckError({
      actualStatus: `HTTP ${response.status}`,
      expectedBehavior: 'backend health surface',
      httpStatus: response.status,
      message: `chatpdm.com/health returned unexpected service "${payload.service ?? 'missing'}".`,
      route: 'https://chatpdm.com/health',
      surface: 'backend-health',
    });
  }

  if (payload.status !== 'ok' && payload.status !== 'degraded') {
    throw routeCheckError({
      actualStatus: `HTTP ${response.status}`,
      expectedBehavior: 'backend health surface',
      httpStatus: response.status,
      message: `chatpdm.com/health returned unexpected status "${payload.status ?? 'missing'}".`,
      route: 'https://chatpdm.com/health',
      surface: 'backend-health',
    });
  }

  return {
    expectedBehavior: 'backend health surface',
    actualStatus: `HTTP ${response.status}`,
    httpStatus: response.status,
    route: 'https://chatpdm.com/health',
    status: 'pass',
    surface: 'backend-health',
  };
}

async function verifyBackendApiRoute() {
  const { response, body } = await fetchText('https://api.chatpdm.com/api/');

  if (response.status !== 404) {
    throw routeCheckError({
      actualStatus: `HTTP ${response.status}`,
      expectedBehavior: 'backend /api/ surface with bounded 404 body',
      httpStatus: response.status,
      message: `api.chatpdm.com/api/ expected the backend's bounded 404 response, received HTTP ${response.status}.`,
      route: 'https://api.chatpdm.com/api/',
      surface: 'backend-surface',
    });
  }

  if (!body.includes('Cannot GET /api/')) {
    throw routeCheckError({
      actualStatus: `HTTP ${response.status}`,
      expectedBehavior: 'backend /api/ surface with bounded 404 body',
      httpStatus: response.status,
      message: 'api.chatpdm.com/api/ did not return the backend 404 body expected from the Express backend.',
      route: 'https://api.chatpdm.com/api/',
      surface: 'backend-surface',
    });
  }

  if (body.includes(EXPECTED_ROUTE_SURFACE_MARKER)) {
    throw routeCheckError({
      actualStatus: `HTTP ${response.status}`,
      expectedBehavior: 'backend /api/ surface with bounded 404 body',
      httpStatus: response.status,
      message: 'api.chatpdm.com/api/ unexpectedly contains the frontend route identity marker and may be routed to the SSR surface.',
      route: 'https://api.chatpdm.com/api/',
      surface: 'backend-surface',
    });
  }

  return {
    expectedBehavior: 'backend /api/ surface with bounded 404 body',
    actualStatus: `HTTP ${response.status}`,
    httpStatus: response.status,
    route: 'https://api.chatpdm.com/api/',
    status: 'pass',
    surface: 'backend-surface',
  };
}

async function verifyCanonicalRedirectRoute() {
  const response = await fetch(EXPECTED_WWW_ROUTE, {
    redirect: 'manual',
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'user-agent': PUBLIC_ROUTE_USER_AGENT,
    },
  });

  if (response.status !== 301 && response.status !== 302) {
    throw routeCheckError({
      actualStatus: `HTTP ${response.status}`,
      expectedBehavior: 'canonical redirect to chatpdm.com/api/',
      httpStatus: response.status,
      message: `www.chatpdm.com/api/ expected a 301 or 302 redirect to the canonical host, received HTTP ${response.status}.`,
      route: EXPECTED_WWW_ROUTE,
      surface: 'canonical-redirect',
    });
  }

  const location = response.headers.get('location');
  if (!location) {
    throw routeCheckError({
      actualStatus: `HTTP ${response.status}`,
      expectedBehavior: 'canonical redirect to chatpdm.com/api/',
      httpStatus: response.status,
      message: 'www.chatpdm.com/api/ returned a redirect status without a Location header.',
      route: EXPECTED_WWW_ROUTE,
      surface: 'canonical-redirect',
    });
  }

  const resolvedLocation = new URL(location, EXPECTED_WWW_ROUTE);
  if (
    resolvedLocation.origin !== 'https://chatpdm.com'
    || (resolvedLocation.pathname !== '/api/' && resolvedLocation.pathname !== '/api')
  ) {
    throw routeCheckError({
      actualStatus: `HTTP ${response.status}`,
      expectedBehavior: 'canonical redirect to chatpdm.com/api/',
      httpStatus: response.status,
      message: `www.chatpdm.com/api/ redirected to "${resolvedLocation.toString()}" instead of the canonical docs route on chatpdm.com.`,
      route: EXPECTED_WWW_ROUTE,
      surface: 'canonical-redirect',
    });
  }

  return {
    expectedBehavior: 'canonical redirect to chatpdm.com/api/',
    actualStatus: `HTTP ${response.status}`,
    httpStatus: response.status,
    route: EXPECTED_WWW_ROUTE,
    status: 'pass',
    surface: 'canonical-redirect',
  };
}

async function fetchText(url) {
  const response = await fetch(url, {
    redirect: 'manual',
    headers: {
      accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
      'user-agent': PUBLIC_ROUTE_USER_AGENT,
    },
  });

  return {
    response,
    body: await response.text(),
  };
}

function formatHumanSuccess(check) {
  return `${hostPath(check.route)} OK ${check.httpStatus} ${check.surface}`;
}

function formatFailedCheck(error) {
  if (error && typeof error === 'object' && 'route' in error) {
    return {
      actualStatus: error.actualStatus ?? null,
      error: error.message ?? String(error),
      expectedBehavior: error.expectedBehavior ?? 'unknown',
      httpStatus: error.httpStatus ?? null,
      route: error.route,
      status: 'fail',
      surface: error.surface ?? 'unknown',
    };
  }

  return {
    actualStatus: null,
    error: error instanceof Error ? error.message : String(error),
    expectedBehavior: 'unknown',
    httpStatus: null,
    route: 'unknown',
    status: 'fail',
    surface: 'unknown',
  };
}

function hostPath(route) {
  const parsed = new URL(route);
  return `${parsed.host}${parsed.pathname}`;
}

function routeCheckError({ actualStatus, expectedBehavior, httpStatus, message, route, surface }) {
  const error = new Error(message);
  error.actualStatus = actualStatus;
  error.expectedBehavior = expectedBehavior;
  error.httpStatus = httpStatus;
  error.route = route;
  error.surface = surface;
  return error;
}

function isTruthyEnv(value) {
  if (!value) {
    return false;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});

import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import type { Request, Response as ExpressResponse } from 'express';
import { extname, join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');
const apiBaseUrl = process.env['API_BASE_URL'] || 'http://127.0.0.1:4301';
const allowedHosts = (
  process.env['NG_ALLOWED_HOSTS']
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  ?? ['localhost', '127.0.0.1', '0.0.0.0', 'chatpdm.com', 'www.chatpdm.com', 'api.chatpdm.com']
);

const app = express();
const angularApp = new AngularNodeAppEngine({
  allowedHosts,
});

app.get('/health', async (_req: Request, res: ExpressResponse) => {
  try {
    const response = await fetch(new URL('/health', apiBaseUrl));
    const body = await response.text();

    res.status(response.status);
    copyProxyHeaders(response, res);
    res.type(response.headers.get('content-type') || 'application/json').send(body);
  } catch (error) {
    console.error('ChatPDM SSR health proxy failed:', error);
    res.status(502).json({
      status: 'error',
      code: 'SSR_HEALTH_PROXY_FAILED',
    });
  }
});

app.all('/api/{*splat}', express.json({ limit: '32kb' }), async (req: Request, res: ExpressResponse) => {
  try {
    await proxyRequest(req, res, req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body ?? {});
  } catch (error) {
    console.error('ChatPDM SSR API proxy failed:', error);
    res.status(502).json({
      success: false,
      code: 'CHATPDM_API_PROXY_FAILED',
      message: 'ChatPDM API is currently unavailable.',
    });
  }
});

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

app.use(async (req, res, next) => {
  if (looksLikeAssetRequest(req.path)) {
    res.status(404).end();
    return;
  }

  try {
    const response = await angularApp.handle(req);

    if (response) {
      await writeResponseToNodeResponse(response, res);
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const host = process.env['HOST'] || '127.0.0.1';
  const port = Number.parseInt(process.env['PORT'] || '4101', 10);

  app.listen(port, host, (error) => {
    if (error) {
      throw error;
    }

    console.log(`ChatPDM SSR listening on http://${host}:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);

function looksLikeAssetRequest(pathname: string): boolean {
  return extname(pathname).length > 0;
}

function copyProxyHeaders(source: globalThis.Response, target: ExpressResponse): void {
  const allowedHeaders = ['content-type', 'retry-after', 'x-rate-limit-limit', 'x-rate-limit-remaining'];

  allowedHeaders.forEach((headerName) => {
    const value = source.headers.get(headerName);

    if (value) {
      target.setHeader(headerName, value);
    }
  });

  const getSetCookie = source.headers.getSetCookie;
  if (typeof getSetCookie === 'function') {
    const setCookies = getSetCookie.call(source.headers);
    if (Array.isArray(setCookies) && setCookies.length > 0) {
      target.setHeader('set-cookie', setCookies);
    }
  }
}

function buildProxyHeaders(req: Request, hasBody: boolean): Headers {
  const headers = new Headers();
  const contentType = req.get('content-type');
  const cookie = req.get('cookie');
  const xForwardedFor = req.get('x-forwarded-for');

  if (contentType && hasBody) {
    headers.set('content-type', contentType);
  }

  if (cookie) {
    headers.set('cookie', cookie);
  }

  if (xForwardedFor) {
    headers.set('x-forwarded-for', xForwardedFor);
  }

  headers.set('x-forwarded-host', req.get('host') || 'chatpdm.com');
  headers.set('x-forwarded-proto', req.get('x-forwarded-proto') || req.protocol);

  return headers;
}

async function proxyRequest(req: Request, res: ExpressResponse, body?: unknown): Promise<void> {
  const response = await fetch(new URL(req.originalUrl, apiBaseUrl), {
    method: req.method,
    headers: buildProxyHeaders(req, body !== undefined),
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  copyProxyHeaders(response, res);

  const responseBody = await response.text();
  res.status(response.status);
  res.send(responseBody);
}

/**
 * Linkfail Website-as-a-Service — minimal Node HTTP API.
 * Made By Zer01
 */

import http from 'node:http';
import { URL } from 'node:url';
import {
  validateLicense,
  DEFAULT_POLAR_ORG_ID,
} from '../src/license.js';
import { crawlSite } from '../src/crawl.js';

const PRODUCT = 'linkfail-website';
const VERSION = '0.4.0';

/**
 * Read request body as UTF-8 string (with size cap).
 * @param {import('node:http').IncomingMessage} req
 * @param {number} [limit]
 * @returns {Promise<string>}
 */
export function readBody(req, limit = 1_000_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error('body_too_large'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/**
 * @param {import('node:http').ServerResponse} res
 * @param {number} status
 * @param {object} body
 */
export function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
  });
  res.end(payload);
}

/**
 * Create request handler (no long-lived server required for tests).
 * @param {object} [deps]
 * @returns {(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => Promise<void>}
 */
export function createHandler(deps = {}) {
  const fetchImpl = deps.fetchImpl || globalThis.fetch;
  const crawl = deps.crawlSite || crawlSite;
  const validate = deps.validateLicense || validateLicense;
  const orgDefault =
    deps.organizationId ||
    process.env.POLAR_ORGANIZATION_ID ||
    DEFAULT_POLAR_ORG_ID;

  return async function handler(req, res) {
    const host = req.headers.host || 'localhost';
    let pathname = '/';
    try {
      pathname = new URL(req.url || '/', `http://${host}`).pathname;
    } catch {
      pathname = '/';
    }

    const method = (req.method || 'GET').toUpperCase();

    try {
      if (method === 'GET' && pathname === '/health') {
        sendJson(res, 200, { ok: true, product: PRODUCT, version: VERSION });
        return;
      }

      if (method === 'GET' && (pathname === '/' || pathname === '')) {
        const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>Linkfail Website API</title></head>
<body style="font-family:system-ui;max-width:40rem;margin:2rem auto;padding:0 1rem">
  <h1>Linkfail Website</h1>
  <p>Website checking as a service. Made By Zer01.</p>
  <ul>
    <li><code>GET /health</code></li>
    <li><code>POST /v1/check</code> — JSON <code>{ url, licenseKey, maxPages?, maxDepth? }</code></li>
  </ul>
  <p><a href="https://github.com/zer01dollars/linkfail">Docs</a></p>
</body></html>`;
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }

      if (method === 'POST' && pathname === '/v1/check') {
        let raw;
        try {
          raw = await readBody(req);
        } catch (err) {
          sendJson(res, err.statusCode || 400, {
            ok: false,
            error: err.message || 'bad_request',
          });
          return;
        }

        let body;
        try {
          body = raw ? JSON.parse(raw) : {};
        } catch {
          sendJson(res, 400, { ok: false, error: 'invalid_json' });
          return;
        }

        const url = body.url || body.startUrl || body.start_url;
        const licenseKey = body.licenseKey || body.license_key || '';
        const maxPages = body.maxPages ?? body.max_pages;
        const maxDepth = body.maxDepth ?? body.max_depth;

        if (!url || !String(url).trim()) {
          sendJson(res, 400, { ok: false, error: 'url_required' });
          return;
        }

        const license = await validate({
          licenseKey,
          organizationId: orgDefault,
          fetchImpl,
        });
        if (!license.ok) {
          sendJson(res, 401, {
            ok: false,
            error: 'license_invalid',
            reason: license.reason,
          });
          return;
        }

        const report = await crawl({
          startUrl: String(url).trim(),
          maxPages: maxPages != null ? Number(maxPages) : 50,
          maxDepth: maxDepth != null ? Number(maxDepth) : 2,
          sameOriginOnly: body.sameOriginOnly !== false,
          concurrency: body.concurrency != null ? Number(body.concurrency) : 8,
          timeoutMs: body.timeoutMs != null ? Number(body.timeoutMs) : 10000,
          fetchImpl,
        });

        sendJson(res, 200, {
          ok: true,
          product: PRODUCT,
          version: VERSION,
          license: { tier: license.tier, reason: license.reason },
          startUrl: report.startUrl,
          pages: report.pages,
          pageCount: report.pages.length,
          urlCount: report.results.length,
          okCount: report.okCount,
          brokenCount: report.broken.length,
          broken: report.broken,
          links: report.links,
          results: report.results,
        });
        return;
      }

      sendJson(res, 404, { ok: false, error: 'not_found' });
    } catch (err) {
      sendJson(res, 500, {
        ok: false,
        error: 'internal_error',
        detail: String(err?.message || err),
      });
    }
  };
}

/**
 * @param {object} [options]
 * @returns {import('node:http').Server}
 */
export function createServer(options = {}) {
  const handler = createHandler(options);
  return http.createServer((req, res) => {
    handler(req, res).catch((err) => {
      try {
        sendJson(res, 500, {
          ok: false,
          error: 'internal_error',
          detail: String(err?.message || err),
        });
      } catch {
        res.destroy();
      }
    });
  });
}

/**
 * Listen on PORT (default 8787).
 * @param {object} [options]
 */
export function listen(options = {}) {
  const port = Number(options.port || process.env.PORT || 8787);
  const server = createServer(options);
  server.listen(port, () => {
    const info = typeof options.info === 'function' ? options.info : console.log;
    info(`Linkfail Website API listening on :${port} (${PRODUCT} ${VERSION})`);
  });
  return server;
}

const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith('service/server.js') ||
    process.argv[1].endsWith('/server.js'));

if (isMain) {
  listen();
}

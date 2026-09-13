import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createHandler, sendJson } from '../service/server.js';

function mockReq({ method = 'GET', url = '/', body = '', headers = {} } = {}) {
  const req = new EventEmitter();
  req.method = method;
  req.url = url;
  req.headers = { host: 'localhost:8787', ...headers };
  setImmediate(() => {
    if (body) req.emit('data', Buffer.from(body));
    req.emit('end');
  });
  req.destroy = () => {};
  return req;
}

function mockRes() {
  const res = {
    statusCode: 0,
    headers: {},
    body: '',
    writeHead(code, hdrs) {
      res.statusCode = code;
      res.headers = hdrs || {};
    },
    end(chunk) {
      res.body = chunk == null ? '' : String(chunk);
    },
    destroy() {},
  };
  return res;
}

describe('service handler', () => {
  it('GET /health', async () => {
    const handler = createHandler({
      validateLicense: async () => ({ ok: true, reason: 'skipped' }),
    });
    const req = mockReq({ method: 'GET', url: '/health' });
    const res = mockRes();
    await handler(req, res);
    assert.equal(res.statusCode, 200);
    const json = JSON.parse(res.body);
    assert.equal(json.ok, true);
    assert.equal(json.product, 'linkfail-website');
  });

  it('GET / returns html landing', async () => {
    const handler = createHandler({});
    const req = mockReq({ method: 'GET', url: '/' });
    const res = mockRes();
    await handler(req, res);
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /Linkfail Website/);
    assert.match(res.body, /Made By Zer01/);
    assert.ok(!/POINTY/i.test(res.body));
  });

  it('POST /v1/check validates license and crawls', async () => {
    const handler = createHandler({
      validateLicense: async ({ licenseKey }) =>
        licenseKey === 'GOOD'
          ? { ok: true, reason: 'granted', tier: 'monthly' }
          : { ok: false, reason: 'invalid_license_key' },
      crawlSite: async ({ startUrl }) => ({
        startUrl,
        pages: [{ url: startUrl, depth: 0, status: 200 }],
        links: [{ url: 'https://example.com/x', pages: [startUrl] }],
        results: [{ url: 'https://example.com/x', status: 'ok', httpStatus: 200 }],
        broken: [],
        okCount: 1,
        ignoredCount: 0,
      }),
    });

    const bad = mockRes();
    await handler(
      mockReq({
        method: 'POST',
        url: '/v1/check',
        body: JSON.stringify({ url: 'https://example.com/', licenseKey: 'BAD' }),
      }),
      bad,
    );
    assert.equal(bad.statusCode, 401);

    const good = mockRes();
    await handler(
      mockReq({
        method: 'POST',
        url: '/v1/check',
        body: JSON.stringify({
          url: 'https://example.com/',
          licenseKey: 'GOOD',
          maxPages: 5,
        }),
      }),
      good,
    );
    assert.equal(good.statusCode, 200);
    const json = JSON.parse(good.body);
    assert.equal(json.ok, true);
    assert.equal(json.brokenCount, 0);
    assert.equal(json.pageCount, 1);
  });

  it('POST /v1/check requires url', async () => {
    const handler = createHandler({
      validateLicense: async () => ({ ok: true, reason: 'granted' }),
    });
    const res = mockRes();
    await handler(
      mockReq({
        method: 'POST',
        url: '/v1/check',
        body: JSON.stringify({ licenseKey: 'X' }),
      }),
      res,
    );
    assert.equal(res.statusCode, 400);
    assert.equal(JSON.parse(res.body).error, 'url_required');
  });

  it('sendJson writes content-type', () => {
    const res = mockRes();
    sendJson(res, 200, { ok: true });
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'], /application\/json/);
  });
});

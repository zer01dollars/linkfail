import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkUrl, checkUrls, isFailure } from '../src/check.js';

describe('checkUrl', () => {
  it('classifies 200 as ok', async () => {
    const fetchImpl = async () => ({ ok: true, status: 200 });
    const r = await checkUrl('https://example.com/', { fetchImpl });
    assert.equal(r.status, 'ok');
    assert.equal(r.httpStatus, 200);
  });

  it('classifies 404 as broken', async () => {
    const fetchImpl = async () => ({ ok: false, status: 404 });
    const r = await checkUrl('https://example.com/404', { fetchImpl });
    assert.equal(r.status, 'broken');
    assert.equal(r.httpStatus, 404);
  });

  it('classifies AbortError as timeout', async () => {
    const fetchImpl = async () => {
      const e = new Error('aborted');
      e.name = 'AbortError';
      throw e;
    };
    const r = await checkUrl('https://example.com/slow', { fetchImpl });
    assert.equal(r.status, 'timeout');
  });

  it('falls back GET after HEAD 405', async () => {
    let calls = 0;
    const fetchImpl = async (_u, opts) => {
      calls++;
      if (opts.method === 'HEAD') return { ok: false, status: 405 };
      return { ok: true, status: 200 };
    };
    const r = await checkUrl('https://example.com/get-only', { fetchImpl });
    assert.equal(r.status, 'ok');
    assert.ok(calls >= 2);
  });

  it('checkUrls respects concurrency and isFailure', async () => {
    const urls = ['https://a.example/1', 'https://a.example/2'];
    const fetchImpl = async (url) =>
      String(url).endsWith('/2')
        ? { ok: false, status: 404 }
        : { ok: true, status: 200 };
    const results = await checkUrls(urls, { fetchImpl, concurrency: 2 });
    assert.equal(results.length, 2);
    assert.equal(isFailure(results[0]), false);
    assert.equal(isFailure(results[1]), true);
  });
});

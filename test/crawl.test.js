import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crawlSite, crawlToScanShape } from '../src/crawl.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const siteRoot = join(__dirname, 'fixtures', 'site');

function fixtureFetch(url, opts = {}) {
  const u = String(url);
  const method = (opts.method || 'GET').toUpperCase();

  // HEAD/GET health checks for discovered links
  if (u.includes('missing-404') || u.includes('about-404')) {
    return { ok: false, status: 404, headers: { get: () => '' }, text: async () => '' };
  }
  if (u.includes('cdn.example') || u.includes('external.example')) {
    return { ok: true, status: 200, headers: { get: () => '' }, text: async () => '' };
  }
  if (u.includes('example.com/about-ok') || u.includes('example.com/logo.png')) {
    return { ok: true, status: 200, headers: { get: () => '' }, text: async () => '' };
  }

  // Local site pages under https://site.test/
  let path;
  try {
    path = new URL(u).pathname;
  } catch {
    return { ok: false, status: 400, headers: { get: () => '' }, text: async () => '' };
  }

  if (path === '/' || path === '/index.html') {
    const body = readFileSync(join(siteRoot, 'index.html'), 'utf8');
    if (method === 'HEAD') {
      return {
        ok: true,
        status: 200,
        headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'text/html' : '') },
        text: async () => '',
      };
    }
    return {
      ok: true,
      status: 200,
      url: 'https://site.test/',
      headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'text/html' : '') },
      text: async () => body,
    };
  }
  if (path === '/about/' || path === '/about/index.html') {
    const body = readFileSync(join(siteRoot, 'about', 'index.html'), 'utf8');
    return {
      ok: true,
      status: 200,
      url: 'https://site.test/about/',
      headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'text/html' : '') },
      text: async () => body,
    };
  }
  if (path.startsWith('/assets/')) {
    return {
      ok: true,
      status: 200,
      headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'text/css' : '') },
      text: async () => 'body{}',
    };
  }
  if (path === '/missing-404') {
    return { ok: false, status: 404, headers: { get: () => '' }, text: async () => 'nope' };
  }

  return { ok: true, status: 200, headers: { get: () => '' }, text: async () => '' };
}

describe('crawlSite', () => {
  it('BFS crawls same-origin pages and reports broken links', async () => {
    const report = await crawlSite({
      startUrl: 'https://site.test/',
      maxPages: 10,
      maxDepth: 2,
      sameOriginOnly: true,
      fetchImpl: fixtureFetch,
    });

    assert.ok(report.pages.length >= 2, `expected >=2 pages, got ${report.pages.length}`);
    const pageUrls = report.pages.map((p) => p.url);
    assert.ok(pageUrls.some((u) => u.includes('site.test')));
    assert.ok(report.results.length >= 3);
    assert.ok(report.broken.length >= 1);
    assert.ok(report.broken.some((b) => String(b.url).includes('404')));

    const scan = crawlToScanShape(report);
    assert.equal(scan.broken.length, report.broken.length);
    assert.ok(scan.files.length >= 1);
  });

  it('respects maxPages and maxDepth', async () => {
    const report = await crawlSite({
      startUrl: 'https://site.test/',
      maxPages: 1,
      maxDepth: 0,
      fetchImpl: fixtureFetch,
    });
    assert.equal(report.pages.length, 1);
    // depth 0: should not follow to /about/
    assert.ok(!report.pages.some((p) => p.url.includes('/about')));
  });

  it('requires startUrl', async () => {
    await assert.rejects(() => crawlSite({ fetchImpl: fixtureFetch }), /startUrl/);
  });
});

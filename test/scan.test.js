import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.js';
import { scanRepo } from '../src/scan.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, 'fixtures');

function mockFetch(url) {
  const u = String(url);
  if (u.includes('/missing-404') || u.includes('/html-404')) {
    return Promise.resolve({ ok: false, status: 404 });
  }
  if (u.includes('/slow')) {
    const e = new Error('aborted');
    e.name = 'AbortError';
    return Promise.reject(e);
  }
  return Promise.resolve({ ok: true, status: 200 });
}

describe('scanRepo', () => {
  it('scans fixtures and finds broken + timeout; ignores shields', async () => {
    const config = loadConfig('linkfail.yml', fixtures);
    config.include = ['docs/**/*.md'];
    const scan = await scanRepo({
      config,
      cwd: fixtures,
      fetchImpl: mockFetch,
    });
    assert.ok(scan.files.length >= 2);
    assert.ok(scan.okCount >= 1);
    assert.ok(scan.broken.some((r) => r.url.includes('missing-404')));
    assert.ok(scan.broken.some((r) => r.status === 'timeout'));
    assert.ok(
      !scan.results.some((r) => r.url.includes('img.shields.io')),
      'shields should be ignored',
    );
  });

  it('can scan html when checkHtml include set', async () => {
    const config = loadConfig('linkfail.yml', fixtures);
    config.include = ['html/**/*.html'];
    config.ignoreUrls = [];
    const scan = await scanRepo({
      config,
      cwd: fixtures,
      fetchImpl: mockFetch,
    });
    assert.ok(scan.results.some((r) => r.url.includes('html-ok')));
    assert.ok(scan.broken.some((r) => r.url.includes('html-404')));
  });
});

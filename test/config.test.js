import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadConfig,
  shouldIgnoreUrl,
  defaultConfig,
} from '../src/config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, 'fixtures');

describe('config', () => {
  it('returns defaults when file missing', () => {
    const c = loadConfig('nope.yml', fixtures);
    assert.deepEqual(c.include, defaultConfig().include);
  });

  it('loads fixture linkfail.yml', () => {
    const c = loadConfig('linkfail.yml', fixtures);
    assert.ok(c.ignoreUrls.some((p) => p.includes('shields')));
    assert.equal(c.timeoutMs, 500);
  });

  it('shouldIgnoreUrl matches substring and glob', () => {
    assert.equal(
      shouldIgnoreUrl('https://img.shields.io/badge/x', [
        'https://img.shields.io',
      ]),
      true,
    );
    assert.equal(
      shouldIgnoreUrl('https://example.com/foo/bar', [
        'https://example.com/*',
      ]),
      true,
    );
    assert.equal(
      shouldIgnoreUrl('https://example.com/ok', ['https://other.com']),
      false,
    );
  });

  it('shouldIgnoreUrl supports /regex/', () => {
    assert.equal(
      shouldIgnoreUrl('https://cdn.example.com/a', [
        '/^https:\\/\\/cdn\\.example\\.com\\//',
      ]),
      true,
    );
  });
});

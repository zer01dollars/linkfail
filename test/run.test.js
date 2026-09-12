import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, 'fixtures');

function mockFetch(url) {
  if (String(url).includes('missing-404')) return { ok: false, status: 404 };
  if (String(url).includes('/slow')) {
    const e = new Error('aborted');
    e.name = 'AbortError';
    throw e;
  }
  return { ok: true, status: 200 };
}

describe('run', () => {
  it('fails when broken links and fail-on-broken', async () => {
    const inputs = {
      'skip-license': 'true',
      'fail-on-broken': 'true',
      'open-issue': 'false',
    };
    let failed = null;
    const result = await run({
      cwd: fixtures,
      getInput: (n) => inputs[n] || '',
      setFailed: (m) => {
        failed = m;
      },
      info: () => {},
      notice: () => {},
      setOutput: () => {},
      fetchImpl: mockFetch,
    });
    assert.equal(result.ok, false);
    assert.ok(failed);
  });

  it('succeeds with skip and fail-on-broken false', async () => {
    const inputs = {
      'skip-license': 'true',
      'fail-on-broken': 'false',
      'open-issue': 'false',
    };
    let failed = null;
    const result = await run({
      cwd: fixtures,
      getInput: (n) => inputs[n] || '',
      setFailed: (m) => {
        failed = m;
      },
      info: () => {},
      notice: () => {},
      setOutput: () => {},
      fetchImpl: mockFetch,
    });
    assert.equal(result.ok, true);
    assert.equal(failed, null);
  });

  it('fails license without key', async () => {
    delete process.env.SKIP_LICENSE;
    const inputs = {
      'skip-license': 'false',
      'polar-license-key': '',
      'fail-on-broken': 'false',
    };
    let failed = null;
    const result = await run({
      cwd: fixtures,
      getInput: (n) => inputs[n] || '',
      setFailed: (m) => {
        failed = m;
      },
      info: () => {},
      notice: () => {},
      setOutput: () => {},
      fetchImpl: async () => ({ ok: true, status: 200 }),
    });
    assert.equal(result.ok, false);
    assert.match(String(failed), /license/i);
  });

  it('mode auto on pull_request fails when links are broken', async () => {
    const inputs = {
      'skip-license': 'true',
      mode: 'auto',
      'fail-on-broken': '',
      'open-issue': '',
    };
    let failed = null;
    const result = await run({
      cwd: fixtures,
      eventName: 'pull_request',
      getInput: (n) => (n in inputs ? inputs[n] : ''),
      setFailed: (m) => {
        failed = m;
      },
      info: () => {},
      notice: () => {},
      setOutput: () => {},
      fetchImpl: mockFetch,
    });
    assert.equal(result.ok, false);
    assert.ok(failed);
  });

  it('mode auto on schedule does not fail the job', async () => {
    const inputs = {
      'skip-license': 'true',
      mode: 'auto',
      'fail-on-broken': '',
      'open-issue': '',
    };
    let failed = null;
    const result = await run({
      cwd: fixtures,
      eventName: 'schedule',
      getInput: (n) => (n in inputs ? inputs[n] : ''),
      setFailed: (m) => {
        failed = m;
      },
      info: () => {},
      notice: () => {},
      setOutput: () => {},
      fetchImpl: mockFetch,
    });
    assert.equal(result.ok, true);
    assert.equal(failed, null);
  });
});

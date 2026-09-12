import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, rmSync } from 'node:fs';
import { run } from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, 'fixtures');

function mockFetch(url) {
  const u = String(url);
  if (u.includes('api.polar.sh')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: 'lk', status: 'granted' }),
    };
  }
  if (u.includes('missing-404')) return { ok: false, status: 404 };
  if (u.includes('/slow')) {
    const e = new Error('aborted');
    e.name = 'AbortError';
    throw e;
  }
  return { ok: true, status: 200 };
}

describe('run', () => {
  afterEach(() => {
    const out = join(fixtures, 'linkfail-out');
    if (existsSync(out)) rmSync(out, { recursive: true, force: true });
  });

  it('fails when broken links and fail-on-broken', async () => {
    const inputs = {
      'skip-license': 'true',
      'fail-on-broken': 'true',
      'open-issue': 'false',
      'comment-on-pr': 'false',
    };
    let failed = null;
    const warnings = [];
    const result = await run({
      cwd: fixtures,
      getInput: (n) => inputs[n] || '',
      setFailed: (m) => {
        failed = m;
      },
      info: () => {},
      notice: () => {},
      warning: (m) => warnings.push(m),
      setOutput: () => {},
      fetchImpl: mockFetch,
    });
    assert.equal(result.ok, false);
    assert.ok(failed);
    assert.ok(warnings.length >= 1);
    assert.ok(existsSync(join(fixtures, 'linkfail-out', 'report.html')));
  });

  it('succeeds with skip and fail-on-broken false', async () => {
    const inputs = {
      'skip-license': 'true',
      'fail-on-broken': 'false',
      'open-issue': 'false',
      'comment-on-pr': 'false',
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
      warning: () => {},
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
      'comment-on-pr': 'false',
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
      warning: () => {},
      setOutput: () => {},
      fetchImpl: mockFetch,
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
      'comment-on-pr': 'false',
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
      warning: () => {},
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
      'comment-on-pr': 'false',
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
      warning: () => {},
      setOutput: () => {},
      fetchImpl: mockFetch,
    });
    assert.equal(result.ok, true);
    assert.equal(failed, null);
  });

  it('mode pr forces fail-on-broken', async () => {
    const inputs = {
      'skip-license': 'true',
      mode: 'pr',
      'fail-on-broken': '',
      'open-issue': '',
      'comment-on-pr': 'false',
    };
    let failed = null;
    const result = await run({
      cwd: fixtures,
      eventName: 'workflow_dispatch',
      getInput: (n) => (n in inputs ? inputs[n] : ''),
      setFailed: (m) => {
        failed = m;
      },
      info: () => {},
      notice: () => {},
      warning: () => {},
      setOutput: () => {},
      fetchImpl: mockFetch,
    });
    assert.equal(result.ok, false);
    assert.ok(failed);
  });
});

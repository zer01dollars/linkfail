import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initWorkflow, checkLocal } from '../bin/linkfail.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = resolve(__dirname, 'fixtures');

describe('cli', () => {
  it('init copies workflow', () => {
    const dir = mkdtempSync(join(tmpdir(), 'linkfail-init-'));
    const dest = initWorkflow(dir);
    assert.ok(existsSync(dest));
    const body = readFileSync(dest, 'utf8');
    assert.match(body, /zer01dollars\/linkfail@v1/);
    assert.match(body, /pull-requests:\s*write/);
    rmSync(dir, { recursive: true, force: true });
  });

  it('check writes reports with skip license', async () => {
    const outCwd = mkdtempSync(join(tmpdir(), 'linkfail-check-'));
    // use fixtures as scan root by copying config expectation — checkLocal uses cwd
    // Point config include via fixtures linkfail.yml; scan from fixtures
    const prev = process.env.SKIP_LICENSE;
    process.env.SKIP_LICENSE = '1';
    const mockFetch = async (url) => {
      if (String(url).includes('missing-404')) return { ok: false, status: 404 };
      if (String(url).includes('/slow')) {
        const e = new Error('aborted');
        e.name = 'AbortError';
        throw e;
      }
      return { ok: true, status: 200 };
    };
    const r = await checkLocal({
      cwd: fixtures,
      configPath: 'linkfail.yml',
      writeSarif: true,
      fetchImpl: mockFetch,
    });
    assert.ok(r.scan);
    process.exitCode = 0;
    assert.ok(existsSync(join(fixtures, 'linkfail-out', 'report.html')));
    assert.ok(existsSync(join(fixtures, 'linkfail-out', 'linkfail.sarif')));
    rmSync(join(fixtures, 'linkfail-out'), { recursive: true, force: true });
    rmSync(outCwd, { recursive: true, force: true });
    if (prev === undefined) delete process.env.SKIP_LICENSE;
    else process.env.SKIP_LICENSE = prev;
  });
});

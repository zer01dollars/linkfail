#!/usr/bin/env node
/**
 * Offline local proof against test/fixtures (mocked fetch).
 * Usage: npm run local
 *        SKIP_LICENSE=1 node scripts/local-run.js
 */

import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.js';
import { scanRepo } from '../src/scan.js';
import { formatConsoleSummary, formatIssueBody } from '../src/report.js';
import { validateLicense } from '../src/license.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const fixtures = join(root, 'test', 'fixtures');

process.env.SKIP_LICENSE = process.env.SKIP_LICENSE || '1';

const license = validateLicense({ skip: true });
console.log('license:', license);

/** @type {typeof fetch} */
const fetchImpl = async (url, opts = {}) => {
  const u = String(url);
  const method = opts.method || 'GET';
  if (u.includes('/missing-404') || u.includes('/html-404')) {
    return { ok: false, status: 404, statusText: 'Not Found' };
  }
  if (u.includes('/slow')) {
    const err = new Error('aborted');
    err.name = 'AbortError';
    throw err;
  }
  if (method === 'HEAD' && u.includes('/also-ok')) {
    return { ok: false, status: 405, statusText: 'Method Not Allowed' };
  }
  return { ok: true, status: 200, statusText: 'OK' };
};

const config = loadConfig('linkfail.yml', fixtures);
// scan markdown under fixtures/docs
config.include = ['docs/**/*.md'];

const scan = await scanRepo({ config, cwd: fixtures, fetchImpl });
console.log(formatConsoleSummary(scan));
console.log('');
console.log(formatIssueBody(scan, { repo: 'zer01dollars/linkfail (fixtures)' }));

if (scan.broken.length) {
  console.log(`\n(expected) ${scan.broken.length} broken in fixtures`);
  process.exitCode = 0; // proof script always succeeds offline
}

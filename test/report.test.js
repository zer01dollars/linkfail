import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  formatIssueBody,
  formatConsoleSummary,
  formatHtmlReport,
  formatSarif,
  writeReports,
} from '../src/report.js';

const sampleScan = {
  files: ['a.md'],
  results: [{ url: 'https://x', status: 'broken' }],
  broken: [
    {
      url: 'https://x',
      status: 'broken',
      httpStatus: 404,
    },
  ],
  okCount: 0,
  ignoredCount: 0,
  links: [{ url: 'https://x', files: ['a.md'] }],
};

describe('report', () => {
  it('formats issue body with broken links', () => {
    const body = formatIssueBody(sampleScan, {
      repo: 'o/r',
      generatedAt: '2026-01-01T00:00:00.000Z',
    });
    assert.match(body, /linkfail-report/);
    assert.match(body, /https:\/\/x/);
    assert.match(body, /Made By Zer01/);
    assert.doesNotMatch(body, /POINTY/i);
  });

  it('formats healthy summary', () => {
    const body = formatIssueBody({
      files: [],
      results: [],
      broken: [],
      okCount: 0,
      ignoredCount: 0,
    });
    assert.match(body, /healthy/i);
    assert.match(
      formatConsoleSummary({
        files: [1],
        results: [1, 2],
        okCount: 2,
        broken: [],
        ignoredCount: 0,
      }),
      /ok=2/,
    );
  });

  it('formats HTML dashboard', () => {
    const html = formatHtmlReport(sampleScan, {
      repo: 'o/r',
      generatedAt: '2026-01-01T00:00:00.000Z',
    });
    assert.match(html, /<!DOCTYPE html>/i);
    assert.match(html, /https:\/\/x/);
    assert.match(html, /Made By Zer01/);
    assert.match(html, /1 broken|broken/i);
    assert.doesNotMatch(html, /POINTY/i);
  });

  it('formats SARIF with broken-link rule', () => {
    const sarif = formatSarif(sampleScan, { version: '0.3.0' });
    assert.equal(sarif.version, '2.1.0');
    assert.equal(sarif.runs[0].results.length, 1);
    assert.equal(sarif.runs[0].results[0].ruleId, 'broken-link');
    assert.equal(
      sarif.runs[0].results[0].locations[0].physicalLocation.artifactLocation
        .uri,
      'a.md',
    );
  });

  it('writeReports writes md/html/sarif', () => {
    const dir = mkdtempSync(join(tmpdir(), 'linkfail-rep-'));
    const paths = writeReports({
      scan: sampleScan,
      outputDir: dir,
      cwd: '/',
      writeSarif: true,
      meta: { repo: 'o/r', version: '0.3.0' },
    });
    assert.match(readFileSync(paths.md, 'utf8'), /linkfail-report/);
    assert.match(readFileSync(paths.html, 'utf8'), /<!DOCTYPE html>/i);
    const sarif = JSON.parse(readFileSync(paths.sarif, 'utf8'));
    assert.equal(sarif.runs[0].tool.driver.name, 'Linkfail');
    rmSync(dir, { recursive: true, force: true });
  });
});

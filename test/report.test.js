import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatIssueBody, formatConsoleSummary } from '../src/report.js';

describe('report', () => {
  it('formats issue body with broken links', () => {
    const body = formatIssueBody(
      {
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
      },
      { repo: 'o/r', generatedAt: '2026-01-01T00:00:00.000Z' },
    );
    assert.match(body, /linkfail-report/);
    assert.match(body, /https:\/\/x/);
    assert.match(body, /Made By Zer01/);
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
    assert.match(formatConsoleSummary({ files: [1], results: [1, 2], okCount: 2, broken: [], ignoredCount: 0 }), /ok=2/);
  });
});

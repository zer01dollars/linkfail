import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { upsertPrComment, MARKER } from '../src/pr-comment.js';

describe('upsertPrComment', () => {
  it('creates when no existing marker comment', async () => {
    const calls = [];
    const octokit = {
      paginate: async () => [],
      rest: {
        issues: {
          listComments: {},
          createComment: async (opts) => {
            calls.push(['create', opts]);
            return { data: { id: 9, html_url: 'https://example/c/9' } };
          },
          updateComment: async () => {
            throw new Error('should not update');
          },
        },
      },
    };
    const r = await upsertPrComment({
      octokit,
      owner: 'o',
      repo: 'r',
      issueNumber: 3,
      body: `${MARKER}\nhello`,
    });
    assert.equal(r.created, true);
    assert.equal(calls[0][0], 'create');
    assert.match(calls[0][1].body, /linkfail-report/);
  });

  it('updates existing marker comment', async () => {
    const octokit = {
      paginate: async () => [
        { id: 42, body: `${MARKER}\nold` },
      ],
      rest: {
        issues: {
          listComments: {},
          createComment: async () => {
            throw new Error('should not create');
          },
          updateComment: async (opts) => ({
            data: { id: opts.comment_id, html_url: 'https://example/c/42' },
          }),
        },
      },
    };
    const r = await upsertPrComment({
      octokit,
      owner: 'o',
      repo: 'r',
      issueNumber: 3,
      body: 'fresh report',
    });
    assert.equal(r.created, false);
    assert.equal(r.id, 42);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatWebhookText, notifyWebhook } from '../src/webhook.js';

describe('webhook', () => {
  it('formats text with Made By Zer01', () => {
    const text = formatWebhookText(
      {
        okCount: 2,
        broken: [{ url: 'https://x', status: 'broken', httpStatus: 404 }],
      },
      { repo: 'o/r' },
    );
    assert.match(text, /1 broken/);
    assert.match(text, /Made By Zer01/);
    assert.doesNotMatch(text, /POINTY/i);
  });

  it('posts Slack-compatible payload and fails soft', async () => {
    let sent;
    const fetchImpl = async (url, opts) => {
      sent = { url, body: JSON.parse(opts.body) };
      return { ok: true, status: 200 };
    };
    const r = await notifyWebhook({
      webhookUrl: 'https://hooks.example/slack',
      scan: { okCount: 1, broken: [] },
      meta: { repo: 'o/r' },
      fetchImpl,
      info: () => {},
    });
    assert.equal(r.ok, true);
    assert.equal(sent.body.broken, 0);
    assert.equal(sent.body.ok, 1);
    assert.ok(sent.body.text);

    const soft = await notifyWebhook({
      webhookUrl: 'https://hooks.example/slack',
      scan: { okCount: 0, broken: [{ url: 'https://x', status: 'broken' }] },
      fetchImpl: async () => {
        throw new Error('down');
      },
      info: () => {},
    });
    assert.equal(soft.ok, false);
  });
});

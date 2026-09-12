/**
 * Soft-fail Slack-compatible incoming webhook notifier.
 */

/**
 * Build a short text summary for Slack-style webhooks.
 * @param {object} scan
 * @param {object} [meta]
 * @returns {string}
 */
export function formatWebhookText(scan, meta = {}) {
  const repo = meta.repo ? ` (${meta.repo})` : '';
  const broken = scan.broken?.length ?? 0;
  const ok = scan.okCount ?? 0;
  if (broken === 0) {
    return `Linkfail${repo}: all ${ok} link(s) healthy. Made By Zer01`;
  }
  const preview = (scan.broken || [])
    .slice(0, 5)
    .map((r) => `• ${r.url} [${r.status}${r.httpStatus ? ` ${r.httpStatus}` : ''}]`)
    .join('\n');
  const more =
    broken > 5 ? `\n…and ${broken - 5} more` : '';
  return `Linkfail${repo}: ${broken} broken / ${ok} ok\n${preview}${more}\nMade By Zer01`;
}

/**
 * POST Slack-incoming-webhook compatible JSON. Never throws — fail soft.
 * @param {object} options
 * @param {string} options.webhookUrl
 * @param {object} options.scan
 * @param {object} [options.meta]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {(m: string) => void} [options.info]
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
export async function notifyWebhook({
  webhookUrl,
  scan,
  meta = {},
  fetchImpl = globalThis.fetch,
  info = () => {},
} = {}) {
  const url = String(webhookUrl || '').trim();
  if (!url) return { ok: false, reason: 'no_webhook' };

  const text = formatWebhookText(scan, meta);
  const payload = {
    text,
    broken: scan.broken?.length ?? 0,
    ok: scan.okCount ?? 0,
    url: meta.runUrl || meta.repoUrl || '',
  };

  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      info(`Webhook returned HTTP ${res.status}; continuing`);
      return { ok: false, reason: `http_${res.status}` };
    }
    info('Webhook notified');
    return { ok: true };
  } catch (err) {
    info(`Webhook failed (soft): ${err.message || err}`);
    return { ok: false, reason: 'webhook_error' };
  }
}

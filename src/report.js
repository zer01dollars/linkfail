/**
 * Format Linkfail scan reports (console + GitHub Issue body).
 */

/**
 * @param {object} scan
 * @param {object} [meta]
 * @returns {string}
 */
export function formatIssueBody(scan, meta = {}) {
  const now = meta.generatedAt || new Date().toISOString();
  const repo = meta.repo || '';
  const lines = [];

  lines.push('<!-- linkfail-report -->');
  lines.push(`# Linkfail report`);
  lines.push('');
  lines.push(`Generated: \`${now}\`${repo ? ` · Repo: \`${repo}\`` : ''}`);
  lines.push('');
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|------:|`);
  lines.push(`| Files scanned | ${scan.files?.length ?? 0} |`);
  lines.push(`| Unique URLs | ${scan.results?.length ?? 0} |`);
  lines.push(`| OK | ${scan.okCount ?? 0} |`);
  lines.push(`| Broken / timeout / error | ${scan.broken?.length ?? 0} |`);
  lines.push(`| Ignored (patterns) | ${scan.ignoredCount ?? 0} |`);
  lines.push('');

  if (!scan.broken?.length) {
    lines.push('All checked links look healthy.');
    lines.push('');
    lines.push('---');
    lines.push('_Made By Zer01 — Artificially Intelligent, Digitally Enhanced_');
    return lines.join('\n');
  }

  lines.push('## Broken links');
  lines.push('');
  for (const r of scan.broken) {
    const files =
      scan.links?.find((l) => l.url === r.url)?.files?.join(', ') || '—';
    const detail = r.httpStatus
      ? `HTTP ${r.httpStatus}`
      : r.detail || r.status;
    lines.push(`- \`${r.status}\` ${detail} — ${r.url}`);
    lines.push(`  - Files: ${files}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('_Made By Zer01 — Artificially Intelligent, Digitally Enhanced_');
  return lines.join('\n');
}

/**
 * Compact console summary.
 * @param {object} scan
 * @returns {string}
 */
export function formatConsoleSummary(scan) {
  const parts = [
    `files=${scan.files?.length ?? 0}`,
    `urls=${scan.results?.length ?? 0}`,
    `ok=${scan.okCount ?? 0}`,
    `broken=${scan.broken?.length ?? 0}`,
    `ignored=${scan.ignoredCount ?? 0}`,
  ];
  return `Linkfail: ${parts.join(' ')}`;
}

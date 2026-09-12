/**
 * Format Linkfail scan reports (console, Issue/PR body, HTML, SARIF).
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

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

/**
 * Escape HTML text content / attributes.
 * @param {string} s
 * @returns {string}
 */
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Self-contained HTML dashboard.
 * @param {object} scan
 * @param {object} [meta]
 * @returns {string}
 */
export function formatHtmlReport(scan, meta = {}) {
  const now = meta.generatedAt || new Date().toISOString();
  const repo = meta.repo || '';
  const broken = scan.broken || [];
  const ok = scan.okCount ?? 0;
  const urls = scan.results?.length ?? 0;
  const files = scan.files?.length ?? 0;
  const ignored = scan.ignoredCount ?? 0;

  const rows = broken
    .map((r) => {
      const fileList =
        scan.links?.find((l) => l.url === r.url)?.files?.join(', ') || '—';
      const detail = r.httpStatus
        ? `HTTP ${r.httpStatus}`
        : r.detail || r.status;
      return `<tr>
        <td><span class="badge badge-${esc(r.status)}">${esc(r.status)}</span></td>
        <td>${esc(detail)}</td>
        <td><a href="${esc(r.url)}" rel="noopener noreferrer">${esc(r.url)}</a></td>
        <td class="files">${esc(fileList)}</td>
      </tr>`;
    })
    .join('\n');

  const statusColor = broken.length ? '#dc2626' : '#16a34a';
  const statusLabel = broken.length
    ? `${broken.length} broken`
    : 'All healthy';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Linkfail report${repo ? ` — ${esc(repo)}` : ''}</title>
<style>
  :root { --bg:#0f1419; --card:#1a2332; --text:#e7ecf3; --muted:#8b9bb4; --accent:#ef4444; --ok:#22c55e; --border:#2a3548; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; }
  .wrap { max-width: 960px; margin: 0 auto; padding: 2rem 1.25rem 3rem; }
  header { margin-bottom: 1.75rem; }
  h1 { margin: 0 0 .35rem; font-size: 1.75rem; letter-spacing: -0.02em; }
  .sub { color: var(--muted); font-size: .9rem; }
  .status { display:inline-block; margin-top:.75rem; padding:.35rem .75rem; border-radius:999px; background:${statusColor}22; color:${statusColor}; font-weight:600; font-size:.85rem; }
  .grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: .75rem; margin: 1.5rem 0; }
  .card { background: var(--card); border:1px solid var(--border); border-radius:12px; padding:1rem 1.1rem; }
  .card .n { font-size:1.6rem; font-weight:700; letter-spacing:-0.03em; }
  .card .l { color: var(--muted); font-size:.8rem; text-transform:uppercase; letter-spacing:.04em; }
  table { width:100%; border-collapse: collapse; background: var(--card); border:1px solid var(--border); border-radius:12px; overflow:hidden; }
  th, td { text-align:left; padding:.65rem .85rem; border-bottom:1px solid var(--border); font-size:.9rem; vertical-align:top; }
  th { color: var(--muted); font-weight:600; font-size:.75rem; text-transform:uppercase; letter-spacing:.04em; background:#121a24; }
  tr:last-child td { border-bottom:none; }
  a { color:#93c5fd; word-break:break-all; }
  .badge { display:inline-block; padding:.15rem .45rem; border-radius:6px; font-size:.75rem; font-weight:600; text-transform:uppercase; }
  .badge-broken, .badge-error { background:#7f1d1d; color:#fecaca; }
  .badge-timeout { background:#78350f; color:#fde68a; }
  .files { color: var(--muted); font-size:.85rem; }
  .empty { padding:1.5rem; text-align:center; color: var(--ok); background: var(--card); border:1px solid var(--border); border-radius:12px; }
  footer { margin-top:2rem; color: var(--muted); font-size:.8rem; text-align:center; }
</style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>Linkfail</h1>
      <div class="sub">Generated <code>${esc(now)}</code>${repo ? ` · <code>${esc(repo)}</code>` : ''}</div>
      <div class="status">${esc(statusLabel)}</div>
    </header>
    <div class="grid">
      <div class="card"><div class="n">${files}</div><div class="l">Files</div></div>
      <div class="card"><div class="n">${urls}</div><div class="l">URLs</div></div>
      <div class="card"><div class="n" style="color:var(--ok)">${ok}</div><div class="l">OK</div></div>
      <div class="card"><div class="n" style="color:var(--accent)">${broken.length}</div><div class="l">Broken</div></div>
      <div class="card"><div class="n">${ignored}</div><div class="l">Ignored</div></div>
    </div>
    ${
      broken.length
        ? `<table>
      <thead><tr><th>Status</th><th>Detail</th><th>URL</th><th>Files</th></tr></thead>
      <tbody>
${rows}
      </tbody>
    </table>`
        : `<div class="empty">All checked links look healthy.</div>`
    }
    <footer>Made By Zer01 — Artificially Intelligent, Digitally Enhanced</footer>
  </div>
</body>
</html>
`;
}

/**
 * SARIF 2.1.0 for GitHub Code Scanning.
 * @param {object} scan
 * @param {object} [meta]
 * @returns {object}
 */
export function formatSarif(scan, meta = {}) {
  const results = (scan.broken || []).map((r) => {
    const files =
      scan.links?.find((l) => l.url === r.url)?.files || [];
    const file = files[0] || undefined;
    const detail = r.httpStatus
      ? `HTTP ${r.httpStatus}`
      : r.detail || r.status;
    /** @type {Record<string, unknown>} */
    const result = {
      ruleId: 'broken-link',
      level: 'error',
      message: {
        text: `Broken link (${detail}): ${r.url}`,
      },
    };
    if (file) {
      result.locations = [
        {
          physicalLocation: {
            artifactLocation: { uri: file },
          },
        },
      ];
    }
    return result;
  });

  return {
    $schema:
      'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'Linkfail',
            version: meta.version || '0.3.0',
            informationUri: 'https://github.com/zer01dollars/linkfail',
            rules: [
              {
                id: 'broken-link',
                shortDescription: { text: 'Broken or unreachable http(s) link' },
                helpUri: 'https://github.com/zer01dollars/linkfail',
              },
            ],
          },
        },
        results,
      },
    ],
  };
}

/**
 * Write report.md, report.html, and optional SARIF under outputDir.
 * @param {object} options
 * @param {object} options.scan
 * @param {string} [options.outputDir]
 * @param {string} [options.cwd]
 * @param {boolean} [options.writeSarif]
 * @param {object} [options.meta]
 * @returns {{ md: string, html: string, sarif?: string }}
 */
export function writeReports({
  scan,
  outputDir = 'linkfail-out',
  cwd = process.cwd(),
  writeSarif = true,
  meta = {},
} = {}) {
  const dir = resolve(cwd, outputDir);
  mkdirSync(dir, { recursive: true });

  const mdPath = join(dir, 'report.md');
  const htmlPath = join(dir, 'report.html');
  const md = formatIssueBody(scan, meta);
  const html = formatHtmlReport(scan, meta);
  writeFileSync(mdPath, md + (md.endsWith('\n') ? '' : '\n'), 'utf8');
  writeFileSync(htmlPath, html, 'utf8');

  /** @type {{ md: string, html: string, sarif?: string }} */
  const out = { md: mdPath, html: htmlPath };

  if (writeSarif) {
    const sarifPath = join(dir, 'linkfail.sarif');
    const sarif = formatSarif(scan, meta);
    writeFileSync(sarifPath, JSON.stringify(sarif, null, 2) + '\n', 'utf8');
    out.sarif = sarifPath;
  }

  return out;
}

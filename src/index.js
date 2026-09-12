/**
 * Linkfail — GitHub Action entrypoint.
 * Made By Zer01 / Artificially Intelligent, Digitally Enhanced.
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import { validateLicense } from './license.js';
import { loadConfig } from './config.js';
import { scanRepo } from './scan.js';
import { formatConsoleSummary, formatIssueBody } from './report.js';
import { openOrUpdateIssue } from './issue.js';

function truthy(v, defaultValue = false) {
  if (v === undefined || v === null || v === '') return defaultValue;
  const s = String(v).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(s)) return true;
  if (['0', 'false', 'no', 'off'].includes(s)) return false;
  return defaultValue;
}

export async function run(deps = {}) {
  const getInput = deps.getInput || ((n, o) => core.getInput(n, o));
  const setFailed = deps.setFailed || ((m) => core.setFailed(m));
  const info = deps.info || ((m) => core.info(m));
  const setOutput = deps.setOutput || ((n, v) => core.setOutput(n, v));
  const cwd = deps.cwd || process.cwd();
  const fetchImpl = deps.fetchImpl || globalThis.fetch;

  const licenseKey = getInput('polar-license-key') || '';
  const skipLicense = truthy(getInput('skip-license'), false);
  const configPath = getInput('config-path') || 'linkfail.yml';
  const failOnBroken = truthy(getInput('fail-on-broken'), true);
  const openIssue = truthy(getInput('open-issue'), false);
  const issueTitle =
    getInput('issue-title') || 'Linkfail: broken links detected';
  const token =
    getInput('github-token') || process.env.GITHUB_TOKEN || '';

  const license = validateLicense({
    licenseKey,
    skip: skipLicense,
  });
  if (!license.ok) {
    setFailed(
      `Linkfail license check failed: ${license.reason}. Set polar-license-key or skip-license: true for local/CI.`,
    );
    return { ok: false, reason: license.reason };
  }
  info(`License: ${license.reason}`);

  const config = loadConfig(configPath, cwd);
  info(
    `Config: include=${config.include.join(',')} timeout=${config.timeoutMs}ms`,
  );

  const scan = await scanRepo({ config, cwd, fetchImpl });
  info(formatConsoleSummary(scan));

  setOutput('broken-count', String(scan.broken.length));
  setOutput('ok-count', String(scan.okCount));
  setOutput('url-count', String(scan.results.length));

  if (openIssue && token) {
    const octokit =
      deps.octokit || github.getOctokit(token);
    const context = deps.context || github.context;
    const body = formatIssueBody(scan, {
      repo: `${context.repo.owner}/${context.repo.repo}`,
      generatedAt: new Date().toISOString(),
    });
    try {
      const issue = await openOrUpdateIssue({
        octokit,
        owner: context.repo.owner,
        repo: context.repo.repo,
        title: issueTitle,
        body,
      });
      info(
        `${issue.created ? 'Opened' : 'Updated'} issue #${issue.number}: ${issue.html_url}`,
      );
      setOutput('issue-url', issue.html_url);
    } catch (err) {
      info(`Issue open/update skipped: ${err.message || err}`);
    }
  } else if (openIssue && !token) {
    info('open-issue set but no github-token; skipping issue');
  }

  if (scan.broken.length && failOnBroken) {
    const preview = scan.broken
      .slice(0, 10)
      .map((r) => `  - [${r.status}] ${r.url} ${r.detail || r.httpStatus || ''}`)
      .join('\n');
    setFailed(
      `Linkfail found ${scan.broken.length} broken link(s):\n${preview}`,
    );
    return { ok: false, scan };
  }

  info('Linkfail completed successfully.');
  return { ok: true, scan };
}

const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith('index.js') ||
    process.argv[1].endsWith('dist/index.js'));

if (isMain && !process.env.LINKFAIL_NO_AUTO_RUN) {
  run().catch((err) => {
    core.setFailed(err.message || String(err));
  });
}

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
  const issueTitle =
    getInput('issue-title') || 'Linkfail: broken links detected';
  const token =
    getInput('github-token') || process.env.GITHUB_TOKEN || '';

  // mode: auto | pr | schedule | report
  // auto → fail on PR/push, open Issue on schedule/workflow_dispatch
  const modeRaw = (getInput('mode') || 'auto').trim().toLowerCase();
  const eventName =
    deps.eventName ||
    process.env.GITHUB_EVENT_NAME ||
    (deps.context || github.context)?.eventName ||
    '';
  const isPrLike = eventName === 'pull_request' || eventName === 'pull_request_target';
  const isDigestEvent =
    eventName === 'schedule' || eventName === 'workflow_dispatch';

  let failOnBroken;
  let openIssue;
  if (modeRaw === 'auto') {
    const failIn = getInput('fail-on-broken');
    const openIn = getInput('open-issue');
    failOnBroken =
      failIn === '' || failIn == null
        ? isPrLike || eventName === 'push' || eventName === ''
        : truthy(failIn, true);
    openIssue =
      openIn === '' || openIn == null
        ? isDigestEvent
        : truthy(openIn, false);
    // If neither event hint: keep fail-on-broken true, open-issue false (local/Action default)
    if (!eventName) {
      failOnBroken = failIn === '' || failIn == null ? true : truthy(failIn, true);
      openIssue = openIn === '' || openIn == null ? false : truthy(openIn, false);
    }
  } else if (modeRaw === 'pr') {
    failOnBroken = truthy(getInput('fail-on-broken'), true);
    openIssue = truthy(getInput('open-issue'), false);
  } else if (modeRaw === 'schedule' || modeRaw === 'report') {
    failOnBroken = truthy(getInput('fail-on-broken'), false);
    openIssue = truthy(getInput('open-issue'), true);
  } else {
    failOnBroken = truthy(getInput('fail-on-broken'), true);
    openIssue = truthy(getInput('open-issue'), false);
  }
  info(`Mode: ${modeRaw} (event=${eventName || 'none'}) fail=${failOnBroken} issue=${openIssue}`);

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
  const notice =
    deps.notice ||
    ((m) => {
      try {
        core.notice(m);
      } catch {
        info(m);
      }
    });
  notice(
    `Linkfail: ${scan.results.length} URLs · ${scan.okCount} ok · ${scan.broken.length} broken`,
  );

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

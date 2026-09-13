/**
 * Linkfail — GitHub Action entrypoint.
 * Made By Zer01 / Artificially Intelligent, Digitally Enhanced.
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import { validateLicense } from './license.js';
import { loadConfig } from './config.js';
import { scanRepo } from './scan.js';
import { crawlSite, crawlToScanShape } from './crawl.js';
import {
  formatConsoleSummary,
  formatIssueBody,
  writeReports,
} from './report.js';
import { openOrUpdateIssue } from './issue.js';
import { upsertPrComment } from './pr-comment.js';
import { notifyWebhook } from './webhook.js';

function truthy(v, defaultValue = false) {
  if (v === undefined || v === null || v === '') return defaultValue;
  const s = String(v).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(s)) return true;
  if (['0', 'false', 'no', 'off'].includes(s)) return false;
  return defaultValue;
}

/**
 * First source file for a broken URL, if known.
 * @param {object} scan
 * @param {object} r
 * @returns {string|undefined}
 */
function fileForBroken(scan, r) {
  return scan.links?.find((l) => l.url === r.url)?.files?.[0];
}

export async function run(deps = {}) {
  const getInput = deps.getInput || ((n, o) => core.getInput(n, o));
  const setFailed = deps.setFailed || ((m) => core.setFailed(m));
  const info = deps.info || ((m) => core.info(m));
  const setOutput = deps.setOutput || ((n, v) => core.setOutput(n, v));
  const warning =
    deps.warning ||
    ((m, props) => {
      try {
        core.warning(m, props);
      } catch {
        info(m);
      }
    });
  const notice =
    deps.notice ||
    ((m) => {
      try {
        core.notice(m);
      } catch {
        info(m);
      }
    });
  const cwd = deps.cwd || process.cwd();
  const fetchImpl = deps.fetchImpl || globalThis.fetch;

  const licenseKey = getInput('polar-license-key') || '';
  const skipLicense = truthy(getInput('skip-license'), false);
  const organizationId =
    getInput('polar-organization-id') ||
    process.env.POLAR_ORGANIZATION_ID ||
    '';
  const configPath = getInput('config-path') || 'linkfail.yml';
  const issueTitle =
    getInput('issue-title') || 'Linkfail: broken links detected';
  const token =
    getInput('github-token') || process.env.GITHUB_TOKEN || '';
  const writeSarif = truthy(getInput('write-sarif'), true);
  const webhookUrl =
    getInput('webhook-url') ||
    process.env.LINKFAIL_WEBHOOK_URL ||
    '';
  const outputDir = getInput('output-dir') || 'linkfail-out';

  // mode: auto | pr | schedule | report
  const modeRaw = (getInput('mode') || 'auto').trim().toLowerCase();
  const eventName =
    deps.eventName ||
    process.env.GITHUB_EVENT_NAME ||
    (deps.context || github.context)?.eventName ||
    '';
  const isPrLike =
    eventName === 'pull_request' || eventName === 'pull_request_target';
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
    if (!eventName) {
      failOnBroken =
        failIn === '' || failIn == null ? true : truthy(failIn, true);
      openIssue =
        openIn === '' || openIn == null ? false : truthy(openIn, false);
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

  const commentIn = getInput('comment-on-pr');
  const commentOnPr =
    commentIn === '' || commentIn == null
      ? isPrLike
      : truthy(commentIn, false);

  info(
    `Mode: ${modeRaw} (event=${eventName || 'none'}) fail=${failOnBroken} issue=${openIssue} pr-comment=${commentOnPr}`,
  );

  const license = await validateLicense({
    licenseKey,
    skip: skipLicense,
    organizationId,
    fetchImpl,
  });
  if (!license.ok) {
    setFailed(
      `Linkfail license check failed: ${license.reason}. Set polar-license-key or skip-license: true for local/CI.`,
    );
    return { ok: false, reason: license.reason };
  }
  info(
    `License: ${license.reason}${license.tier ? ` (${license.tier})` : ''}`,
  );

  const config = loadConfig(configPath, cwd);
  const startUrl =
    getInput('start-url') ||
    getInput('startUrl') ||
    process.env.LINKFAIL_START_URL ||
    '';
  const isWebsite = modeRaw === 'website' || modeRaw === 'site';

  let scan;
  if (isWebsite) {
    if (!startUrl.trim()) {
      setFailed('mode=website requires start-url input');
      return { ok: false, reason: 'missing_start_url' };
    }
    const maxPages = Number(
      getInput('max-pages') || config.maxPages || 50,
    );
    const maxDepth = Number(
      getInput('max-depth') || config.maxDepth || 2,
    );
    info(
      `Website crawl: ${startUrl.trim()} maxPages=${maxPages} maxDepth=${maxDepth}`,
    );
    const crawl = await crawlSite({
      startUrl: startUrl.trim(),
      maxPages,
      maxDepth,
      sameOriginOnly: config.sameOriginOnly,
      concurrency: config.concurrency,
      timeoutMs: config.timeoutMs,
      userAgent: config.userAgent,
      ignoreUrls: config.ignoreUrls,
      fetchImpl,
    });
    scan = crawlToScanShape(crawl);
    info(
      `Crawled ${crawl.pages.length} page(s); checking ${scan.results.length} URL(s)`,
    );
  } else {
    info(
      `Config: include=${config.include.join(',')} timeout=${config.timeoutMs}ms`,
    );
    scan = await scanRepo({ config, cwd, fetchImpl });
  }

  info(formatConsoleSummary(scan));
  notice(
    `Linkfail: ${scan.results.length} URLs · ${scan.okCount} ok · ${scan.broken.length} broken`,
  );

  for (const r of scan.broken) {
    const file = fileForBroken(scan, r);
    const detail = r.httpStatus
      ? `HTTP ${r.httpStatus}`
      : r.detail || r.status;
    const msg = `Broken link (${detail}): ${r.url}`;
    warning(msg, file ? { file } : undefined);
  }

  const context = deps.context || github.context;
  let repoLabel = '';
  try {
    if (context?.repo?.owner && context?.repo?.repo) {
      repoLabel = `${context.repo.owner}/${context.repo.repo}`;
    }
  } catch {
    repoLabel = process.env.GITHUB_REPOSITORY || '';
  }
  const meta = {
    repo: repoLabel,
    generatedAt: new Date().toISOString(),
    version: '0.4.0',
  };

  let reportPaths;
  try {
    reportPaths = writeReports({
      scan,
      outputDir,
      cwd,
      writeSarif,
      meta,
    });
    info(`Wrote ${reportPaths.md}`);
    info(`Wrote ${reportPaths.html}`);
    if (reportPaths.sarif) info(`Wrote ${reportPaths.sarif}`);
    setOutput('report-dir', outputDir);
  } catch (err) {
    info(`Report write skipped: ${err.message || err}`);
  }

  setOutput('broken-count', String(scan.broken.length));
  setOutput('ok-count', String(scan.okCount));
  setOutput('url-count', String(scan.results.length));

  if ((openIssue || commentOnPr) && token) {
    const octokit = deps.octokit || github.getOctokit(token);
    const body = formatIssueBody(scan, meta);

    if (openIssue) {
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
    }

    if (commentOnPr) {
      const prNumber =
        deps.prNumber ||
        context.payload?.pull_request?.number ||
        (isPrLike ? context.issue?.number : undefined);
      if (prNumber) {
        try {
          const comment = await upsertPrComment({
            octokit,
            owner: context.repo.owner,
            repo: context.repo.repo,
            issueNumber: prNumber,
            body,
          });
          if (comment) {
            info(
              `${comment.created ? 'Created' : 'Updated'} PR comment${comment.html_url ? `: ${comment.html_url}` : ''}`,
            );
            setOutput('comment-url', comment.html_url || '');
          }
        } catch (err) {
          info(`PR comment skipped: ${err.message || err}`);
        }
      } else {
        info('comment-on-pr set but no PR number; skipping');
      }
    }
  } else if ((openIssue || commentOnPr) && !token) {
    info('Issue/PR comment requested but no github-token; skipping');
  }

  if (webhookUrl) {
    await notifyWebhook({
      webhookUrl,
      scan,
      meta: {
        ...meta,
        repoUrl: repoLabel
          ? `https://github.com/${repoLabel}`
          : '',
      },
      fetchImpl,
      info,
    });
  }

  if (scan.broken.length && failOnBroken) {
    const preview = scan.broken
      .slice(0, 10)
      .map(
        (r) =>
          `  - [${r.status}] ${r.url} ${r.detail || r.httpStatus || ''}`,
      )
      .join('\n');
    setFailed(
      `Linkfail found ${scan.broken.length} broken link(s):\n${preview}`,
    );
    return { ok: false, scan, reportPaths };
  }

  info('Linkfail completed successfully.');
  return { ok: true, scan, reportPaths };
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

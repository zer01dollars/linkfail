/**
 * BFS same-origin HTML crawl → collect links → check with check.js.
 */

import {
  extractHtmlLinks,
  extractHtmlPageLinks,
  looksLikeHtmlPage,
} from './html-extract.js';
import { shouldIgnoreUrl } from './config.js';
import { checkUrls, isFailure } from './check.js';

/**
 * @typedef {{ url: string, depth: number, status?: number, contentType?: string }} CrawledPage
 */

/**
 * Fetch a page body for crawling (GET).
 * @param {string} url
 * @param {object} options
 * @returns {Promise<{ ok: boolean, status: number, contentType: string, body: string, finalUrl: string }>}
 */
async function fetchPage(
  url,
  {
    timeoutMs = 10000,
    userAgent = 'Linkfail/0.4 (+https://github.com/zer01dollars/linkfail)',
    fetchImpl = globalThis.fetch,
  } = {},
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': userAgent,
        accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
      },
    });
    const contentType = String(
      res.headers?.get?.('content-type') ||
        res.headers?.['content-type'] ||
        '',
    ).toLowerCase();
    let body = '';
    if (typeof res.text === 'function') {
      body = await res.text();
    } else if (typeof res.body === 'string') {
      body = res.body;
    }
    const finalUrl =
      (typeof res.url === 'string' && res.url) || url;
    return {
      ok: res.ok || (res.status >= 200 && res.status < 400),
      status: res.status,
      contentType,
      body,
      finalUrl,
    };
  } finally {
    clearTimeout(timer);
  }
}

function sameOrigin(a, b) {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    return ua.origin === ub.origin;
  } catch {
    return false;
  }
}

function isHtmlContentType(contentType) {
  if (!contentType) return true; // unknown — allow for fixtures
  return (
    contentType.includes('text/html') ||
    contentType.includes('application/xhtml')
  );
}

/**
 * Crawl a website starting at startUrl.
 *
 * @param {object} options
 * @param {string} options.startUrl
 * @param {number} [options.maxPages=50]
 * @param {number} [options.maxDepth=2]
 * @param {boolean} [options.sameOriginOnly=true]
 * @param {number} [options.concurrency]
 * @param {number} [options.timeoutMs]
 * @param {string} [options.userAgent]
 * @param {string[]} [options.ignoreUrls]
 * @param {typeof fetch} [options.fetchImpl]
 * @returns {Promise<{
 *   startUrl: string,
 *   pages: CrawledPage[],
 *   links: { url: string, pages: string[] }[],
 *   results: import('./check.js').CheckResult[],
 *   broken: import('./check.js').CheckResult[],
 *   okCount: number,
 *   ignoredCount: number,
 * }>}
 */
export async function crawlSite({
  startUrl,
  maxPages = 50,
  maxDepth = 2,
  sameOriginOnly = true,
  concurrency = 8,
  timeoutMs = 10000,
  userAgent = 'Linkfail/0.4 (+https://github.com/zer01dollars/linkfail)',
  ignoreUrls = [],
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!startUrl || !String(startUrl).trim()) {
    throw new Error('startUrl is required');
  }

  let originUrl;
  try {
    originUrl = new URL(String(startUrl).trim()).href;
  } catch {
    throw new Error(`Invalid startUrl: ${startUrl}`);
  }

  const maxP = Math.max(1, Number(maxPages) || 50);
  const maxD = Math.max(0, Number(maxDepth) || 0);

  /** @type {CrawledPage[]} */
  const pages = [];
  /** @type {Map<string, Set<string>>} */
  const urlToPages = new Map();
  let ignoredCount = 0;

  const visited = new Set();
  /** @type {{ url: string, depth: number }[]} */
  const queue = [{ url: originUrl, depth: 0 }];

  const fetchOpts = { timeoutMs, userAgent, fetchImpl };

  while (queue.length && pages.length < maxP) {
    const { url, depth } = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);

    let page;
    try {
      page = await fetchPage(url, fetchOpts);
    } catch (err) {
      if (err?.name === 'AbortError') {
        pages.push({
          url,
          depth,
          status: 0,
          contentType: '',
          error: 'timeout',
        });
      } else {
        pages.push({
          url,
          depth,
          status: 0,
          contentType: '',
          error: String(err?.message || err),
        });
      }
      continue;
    }

    pages.push({
      url: page.finalUrl || url,
      depth,
      status: page.status,
      contentType: page.contentType,
    });

    if (!page.ok || !isHtmlContentType(page.contentType)) {
      continue;
    }

    const pageUrl = page.finalUrl || url;
    const allLinks = extractHtmlLinks(page.body, pageUrl);
    const pageLinks = extractHtmlPageLinks(page.body, pageUrl);

    for (const link of allLinks) {
      if (shouldIgnoreUrl(link, ignoreUrls)) {
        ignoredCount++;
        continue;
      }
      if (!urlToPages.has(link)) urlToPages.set(link, new Set());
      urlToPages.get(link).add(pageUrl);
    }

    if (depth >= maxD) continue;

    for (const link of pageLinks) {
      if (sameOriginOnly && !sameOrigin(originUrl, link)) continue;
      if (!looksLikeHtmlPage(link)) continue;
      if (visited.has(link)) continue;
      if (queue.some((q) => q.url === link)) continue;
      if (pages.length + queue.length >= maxP) break;
      queue.push({ url: link, depth: depth + 1 });
    }
  }

  const uniqueUrls = [...urlToPages.keys()];
  const results = await checkUrls(uniqueUrls, {
    timeoutMs,
    concurrency,
    userAgent,
    fetchImpl,
  });

  const broken = results.filter(isFailure);
  const okCount = results.filter((r) => r.status === 'ok').length;

  const links = uniqueUrls.map((url) => ({
    url,
    pages: [...(urlToPages.get(url) || [])].sort(),
  }));

  return {
    startUrl: originUrl,
    pages,
    links,
    results,
    broken,
    okCount,
    ignoredCount,
  };
}

/**
 * Adapt crawl result to the shape scanRepo returns (for reports).
 * @param {Awaited<ReturnType<typeof crawlSite>>} crawl
 */
export function crawlToScanShape(crawl) {
  return {
    files: crawl.pages.map((p) => p.url),
    links: crawl.links.map((l) => ({
      url: l.url,
      files: l.pages,
    })),
    results: crawl.results,
    broken: crawl.broken,
    okCount: crawl.okCount,
    ignoredCount: crawl.ignoredCount,
  };
}

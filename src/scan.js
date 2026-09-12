/**
 * Discover files, extract links, filter ignores, check URLs.
 */

import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import fg from 'fast-glob';
import { extractLinksFromFile } from './extract.js';
import { shouldIgnoreUrl } from './config.js';
import { checkUrls, isFailure } from './check.js';

/**
 * @param {object} options
 * @param {import('./config.js').LinkfailConfig} options.config
 * @param {string} [options.cwd]
 * @param {typeof fetch} [options.fetchImpl]
 * @returns {Promise<{
 *   files: string[],
 *   links: { url: string, files: string[] }[],
 *   results: import('./check.js').CheckResult[],
 *   broken: import('./check.js').CheckResult[],
 *   okCount: number,
 *   ignoredCount: number,
 * }>}
 */
export async function scanRepo({
  config,
  cwd = process.cwd(),
  fetchImpl = globalThis.fetch,
} = {}) {
  const patterns = config.include?.length ? config.include : ['**/*.md'];
  const files = await fg(patterns, {
    cwd,
    absolute: false,
    onlyFiles: true,
    ignore: config.exclude || [],
    dot: false,
  });

  /** @type {Map<string, Set<string>>} */
  const urlToFiles = new Map();
  let ignoredCount = 0;

  for (const file of files) {
    const abs = resolve(cwd, file);
    let content;
    try {
      content = readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    const { links } = extractLinksFromFile(file, content);
    for (const url of links) {
      if (shouldIgnoreUrl(url, config.ignoreUrls || [])) {
        ignoredCount++;
        continue;
      }
      if (!urlToFiles.has(url)) urlToFiles.set(url, new Set());
      urlToFiles.get(url).add(file);
    }
  }

  const uniqueUrls = [...urlToFiles.keys()];
  const results = await checkUrls(uniqueUrls, {
    timeoutMs: config.timeoutMs,
    concurrency: config.concurrency,
    userAgent: config.userAgent,
    fetchImpl,
  });

  const broken = results.filter(isFailure);
  const okCount = results.filter((r) => r.status === 'ok').length;

  const links = uniqueUrls.map((url) => ({
    url,
    files: [...(urlToFiles.get(url) || [])].sort(),
  }));

  return {
    files: files.map((f) => relative(cwd, resolve(cwd, f)) || f).sort(),
    links,
    results,
    broken,
    okCount,
    ignoredCount,
  };
}

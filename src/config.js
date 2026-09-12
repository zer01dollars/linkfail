/**
 * Load and normalize linkfail.yml configuration.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';

/** @typedef {{
 *   include: string[],
 *   exclude: string[],
 *   ignoreUrls: string[],
 *   timeoutMs: number,
 *   concurrency: number,
 *   checkHtml: boolean,
 *   userAgent: string,
 * }} LinkfailConfig */

/** @returns {LinkfailConfig} */
export function defaultConfig() {
  return {
    include: ['**/*.md'],
    exclude: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/coverage/**',
    ],
    ignoreUrls: [
      'localhost',
      '127.0.0.1',
      'https://img.shields.io/',
      'https://camo.githubusercontent.com/',
      'badge.fury.io',
    ],
    timeoutMs: 10000,
    concurrency: 8,
    checkHtml: false,
    userAgent: 'Linkfail/0.3 (+https://github.com/zer01dollars/linkfail)',
  };
}

/**
 * @param {string} [configPath]
 * @param {string} [cwd]
 * @returns {LinkfailConfig}
 */
export function loadConfig(configPath = 'linkfail.yml', cwd = process.cwd()) {
  const base = defaultConfig();
  const full = resolve(cwd, configPath);
  if (!existsSync(full)) {
    return base;
  }

  let raw;
  try {
    raw = yaml.load(readFileSync(full, 'utf8')) || {};
  } catch (err) {
    throw new Error(`Failed to parse ${configPath}: ${err.message}`);
  }

  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`Invalid config ${configPath}: expected mapping`);
  }

  const include = normalizeStringList(raw.include, base.include);
  const exclude = normalizeStringList(raw.exclude, base.exclude);
  const fileIgnores = normalizeStringList(
    raw.ignoreUrls ?? raw.ignore_urls ?? raw['ignore-urls'],
    [],
  );
  // Keep built-in ignores unless user sets ignoreUrlsDefaults: false
  const keepDefaults = raw.ignoreUrlsDefaults !== false && raw.ignore_urls_defaults !== false;
  const ignoreUrls = keepDefaults
    ? [...new Set([...base.ignoreUrls, ...fileIgnores])]
    : fileIgnores.length
      ? fileIgnores
      : [...base.ignoreUrls];

  let timeoutMs = Number(raw.timeoutMs ?? raw.timeout_ms ?? raw.timeout ?? base.timeoutMs);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) timeoutMs = base.timeoutMs;

  let concurrency = Number(raw.concurrency ?? base.concurrency);
  if (!Number.isFinite(concurrency) || concurrency < 1) concurrency = base.concurrency;

  const checkHtml = Boolean(
    raw.checkHtml ?? raw.check_html ?? raw.html ?? base.checkHtml,
  );

  const userAgent =
    (raw.userAgent || raw.user_agent || base.userAgent) &&
    String(raw.userAgent || raw.user_agent || base.userAgent).trim();

  const mergedInclude = [...include];
  if (checkHtml && !mergedInclude.some((g) => g.includes('.htm'))) {
    mergedInclude.push('**/*.{html,htm}');
  }

  return {
    include: mergedInclude,
    exclude,
    ignoreUrls,
    timeoutMs,
    concurrency: Math.floor(concurrency),
    checkHtml,
    userAgent: userAgent || base.userAgent,
  };
}

/**
 * @param {unknown} value
 * @param {string[]} fallback
 * @returns {string[]}
 */
function normalizeStringList(value, fallback) {
  if (value == null) return [...fallback];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  return [...fallback];
}

/**
 * Whether a URL should be ignored per config patterns.
 * Patterns: exact match, substring with *, or /regex/ flags.
 * @param {string} url
 * @param {string[]} patterns
 * @returns {boolean}
 */
export function shouldIgnoreUrl(url, patterns = []) {
  for (const pattern of patterns) {
    if (!pattern) continue;
    if (pattern.startsWith('/') && pattern.lastIndexOf('/') > 0) {
      const last = pattern.lastIndexOf('/');
      const body = pattern.slice(1, last);
      const flags = pattern.slice(last + 1);
      try {
        if (new RegExp(body, flags).test(url)) return true;
      } catch {
        // invalid regex — treat as literal substring
        if (url.includes(pattern)) return true;
      }
      continue;
    }
    if (pattern.includes('*')) {
      const escaped = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
      if (new RegExp(`^${escaped}$`).test(url)) return true;
      continue;
    }
    if (url === pattern || url.includes(pattern)) return true;
  }
  return false;
}

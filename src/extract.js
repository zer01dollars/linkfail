/**
 * Extract http(s) links from Markdown and simple HTML.
 */

import { readFileSync } from 'node:fs';

/**
 * @param {string} text
 * @param {'md'|'html'|'auto'} [kind]
 * @returns {string[]} unique absolute http(s) URLs in document order
 */
export function extractLinks(text, kind = 'auto') {
  const found = [];
  const seen = new Set();

  const push = (raw) => {
    if (!raw) return;
    let url = String(raw).trim();
    url = url.replace(/^<|>$/g, '');
    // strip common trailing punctuation from bare URLs
    url = url.replace(/[.,;:!?)]+$/g, '');
    if (!/^https?:\/\//i.test(url)) return;
    try {
      const u = new URL(url);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return;
      url = u.href;
    } catch {
      return;
    }
    if (seen.has(url)) return;
    seen.add(url);
    found.push(url);
  };

  const lowerKind =
    kind === 'html'
      ? 'html'
      : kind === 'md'
        ? 'md'
        : 'auto';

  if (lowerKind === 'md' || lowerKind === 'auto') {
    // [text](url) and [text](<url>)
    for (const m of text.matchAll(/\[([^\]]*)\]\(\s*<?(https?:\/\/[^)\s>]+)>?\s*\)/gi)) {
      push(m[2]);
    }
    // <https://...>
    for (const m of text.matchAll(/<(https?:\/\/[^>\s]+)>/gi)) {
      push(m[1]);
    }
    // bare URLs (line-ish)
    for (const m of text.matchAll(/(^|[\s("'\[])(https?:\/\/[^\s<>)"'\]]+)/gim)) {
      push(m[2]);
    }
  }

  if (lowerKind === 'html' || lowerKind === 'auto') {
    for (const m of text.matchAll(/(?:href|src)\s*=\s*["'](https?:\/\/[^"']+)["']/gi)) {
      push(m[1]);
    }
  }

  return found;
}

/**
 * @param {string} filePath
 * @param {string} [content]
 * @returns {{ file: string, links: string[] }}
 */
export function extractLinksFromFile(filePath, content) {
  const text = content != null ? content : readFileSync(filePath, 'utf8');
  const lower = filePath.toLowerCase();
  const kind =
    lower.endsWith('.html') || lower.endsWith('.htm') ? 'html' : 'md';
  return { file: filePath, links: extractLinks(text, kind) };
}

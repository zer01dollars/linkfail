/**
 * Extract absolute http(s) URLs from HTML resource attributes.
 * Resolves relative URLs against a page base URL.
 */

/**
 * @param {string} html
 * @param {string} [baseUrl]
 * @returns {string[]} unique absolute http(s) URLs in document order
 */
export function extractHtmlLinks(html, baseUrl = '') {
  const found = [];
  const seen = new Set();
  let base;
  try {
    base = baseUrl ? new URL(baseUrl) : null;
  } catch {
    base = null;
  }

  const push = (raw) => {
    if (!raw) return;
    let candidate = String(raw).trim();
    if (
      !candidate ||
      candidate.startsWith('#') ||
      candidate.toLowerCase().startsWith('javascript:') ||
      candidate.toLowerCase().startsWith('mailto:') ||
      candidate.toLowerCase().startsWith('tel:') ||
      candidate.toLowerCase().startsWith('data:')
    ) {
      return;
    }
    let url;
    try {
      url = base ? new URL(candidate, base) : new URL(candidate);
    } catch {
      return;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    const href = url.href;
    if (seen.has(href)) return;
    seen.add(href);
    found.push(href);
  };

  // a href, link href, img/script/iframe src (quoted)
  const attrRe =
    /<(?:a|link)\b[^>]*?\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))|<(?:img|script|iframe)\b[^>]*?\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;

  let m;
  while ((m = attrRe.exec(html)) !== null) {
    const raw = m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5] ?? m[6];
    push(raw);
  }

  return found;
}

/**
 * Links that are candidates for HTML page BFS (typically <a href>).
 * @param {string} html
 * @param {string} [baseUrl]
 * @returns {string[]}
 */
export function extractHtmlPageLinks(html, baseUrl = '') {
  const found = [];
  const seen = new Set();
  let base;
  try {
    base = baseUrl ? new URL(baseUrl) : null;
  } catch {
    base = null;
  }

  const push = (raw) => {
    if (!raw) return;
    let candidate = String(raw).trim();
    if (
      !candidate ||
      candidate.startsWith('#') ||
      candidate.toLowerCase().startsWith('javascript:') ||
      candidate.toLowerCase().startsWith('mailto:') ||
      candidate.toLowerCase().startsWith('tel:') ||
      candidate.toLowerCase().startsWith('data:')
    ) {
      return;
    }
    let url;
    try {
      url = base ? new URL(candidate, base) : new URL(candidate);
    } catch {
      return;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    const href = url.href;
    if (seen.has(href)) return;
    seen.add(href);
    found.push(href);
  };

  const aRe = /<a\b[^>]*?\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let m;
  while ((m = aRe.exec(html)) !== null) {
    push(m[1] ?? m[2] ?? m[3]);
  }
  return found;
}

/**
 * Rough heuristic: path looks like a crawlable HTML page (not a static asset).
 * @param {string} url
 * @returns {boolean}
 */
export function looksLikeHtmlPage(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  const path = u.pathname.toLowerCase();
  if (path.endsWith('/')) return true;
  const last = path.split('/').pop() || '';
  if (!last.includes('.')) return true;
  return /\.(html?|php|asp|aspx|jsp|cfm|xhtml)$/i.test(last);
}

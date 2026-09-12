/**
 * Check URLs with HEAD (fallback GET), classify ok / 404 / timeout / error.
 */

/**
 * @typedef {{ url: string, status: 'ok'|'broken'|'timeout'|'error', httpStatus?: number, detail?: string }} CheckResult
 */

/**
 * @param {string} url
 * @param {object} [options]
 * @param {number} [options.timeoutMs]
 * @param {string} [options.userAgent]
 * @param {typeof fetch} [options.fetchImpl]
 * @returns {Promise<CheckResult>}
 */
export async function checkUrl(
  url,
  {
    timeoutMs = 10000,
    userAgent = 'Linkfail/0.1',
    fetchImpl = globalThis.fetch,
  } = {},
) {
  const tryOnce = async (method) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, {
        method,
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'user-agent': userAgent,
          accept: '*/*',
        },
      });
      return res;
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    let res;
    try {
      res = await tryOnce('HEAD');
      // Some hosts reject HEAD — retry GET on 405/501/403
      if (res.status === 405 || res.status === 501 || res.status === 403) {
        res = await tryOnce('GET');
      }
    } catch (err) {
      if (err?.name === 'AbortError') {
        return { url, status: 'timeout', detail: 'request timed out' };
      }
      // HEAD network failure → try GET once
      try {
        res = await tryOnce('GET');
      } catch (err2) {
        if (err2?.name === 'AbortError') {
          return { url, status: 'timeout', detail: 'request timed out' };
        }
        return {
          url,
          status: 'error',
          detail: String(err2?.message || err2 || err),
        };
      }
    }

    const code = res.status;
    if (code >= 200 && code < 400) {
      return { url, status: 'ok', httpStatus: code };
    }
    if (code === 404 || code === 410) {
      return { url, status: 'broken', httpStatus: code, detail: `HTTP ${code}` };
    }
    // treat other 4xx/5xx as broken for CI purposes
    if (code >= 400) {
      return { url, status: 'broken', httpStatus: code, detail: `HTTP ${code}` };
    }
    return { url, status: 'ok', httpStatus: code };
  } catch (err) {
    if (err?.name === 'AbortError') {
      return { url, status: 'timeout', detail: 'request timed out' };
    }
    return { url, status: 'error', detail: String(err?.message || err) };
  }
}

/**
 * Run checks with simple concurrency pool.
 * @param {string[]} urls
 * @param {object} [options]
 * @returns {Promise<CheckResult[]>}
 */
export async function checkUrls(urls, options = {}) {
  const concurrency = Math.max(1, Number(options.concurrency) || 8);
  const results = new Array(urls.length);
  let next = 0;

  async function worker() {
    while (true) {
      const i = next++;
      if (i >= urls.length) break;
      results[i] = await checkUrl(urls[i], options);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, urls.length || 1) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

/**
 * True when result should fail CI (broken / timeout / error).
 * @param {CheckResult} r
 */
export function isFailure(r) {
  return r.status === 'broken' || r.status === 'timeout' || r.status === 'error';
}

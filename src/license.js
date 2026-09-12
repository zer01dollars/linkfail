/**
 * Polar license stub for Linkfail.
 * Full Polar product IDs TBD — see README DEFAULT note.
 * Accepts: skip=true / SKIP_LICENSE, or key length >= 8.
 */

/**
 * @param {object} [options]
 * @param {string} [options.licenseKey]
 * @param {boolean} [options.skip]
 * @returns {{ ok: boolean, reason: string }}
 */
export function validateLicense({ licenseKey, skip = false } = {}) {
  if (
    skip ||
    process.env.SKIP_LICENSE === '1' ||
    process.env.SKIP_LICENSE === 'true'
  ) {
    return { ok: true, reason: 'skipped' };
  }

  const key = String(licenseKey || '').trim();
  if (!key) {
    return { ok: false, reason: 'missing_license_key' };
  }

  if (key.length < 8) {
    return { ok: false, reason: 'invalid_license_key' };
  }

  // Stub: length gate only until Polar products are wired.
  return { ok: true, reason: 'stub_accepted' };
}

/**
 * Polar license validation against the customer-portal validate API.
 * Skip via SKIP_LICENSE / skip-license for CI and local runs.
 *
 * Tiers (prefix / benefit_id):
 *   LINKFAIL-1X  → single_use (+ increment_usage: 1)
 *   LINKFAIL-LT  → lifetime
 *   LINKFAIL     → monthly
 */

/** Default Polar organization id (driftwatch-kit). */
export const DEFAULT_POLAR_ORG_ID = 'b6303f05-be1c-4b45-b847-5979667a3d12';

/** Known Polar benefit ids for Linkfail. */
export const SINGLE_USE_BENEFIT_ID = '508650c0-9f6c-4a75-8af3-12e05569880e';
export const MONTHLY_BENEFIT_ID = '94f5b762-4875-432b-8fc4-3f7fa641ef57';
export const LIFETIME_BENEFIT_ID = 'cac8f272-3887-4f43-9a69-51cb7be9737c';

const VALIDATE_URL =
  'https://api.polar.sh/v1/customer-portal/license-keys/validate';

/**
 * Resolve Polar organization_id from input → env → config → default.
 * @param {object} [options]
 * @param {string} [options.organizationId]
 * @param {string} [options.configOrganizationId]
 * @returns {string}
 */
export function resolveOrganizationId({
  organizationId,
  configOrganizationId,
} = {}) {
  return (
    (organizationId && String(organizationId).trim()) ||
    (process.env.POLAR_ORGANIZATION_ID &&
      String(process.env.POLAR_ORGANIZATION_ID).trim()) ||
    (configOrganizationId && String(configOrganizationId).trim()) ||
    DEFAULT_POLAR_ORG_ID
  );
}

/**
 * @param {string} [licenseKey]
 * @param {string} [benefitId]
 * @returns {'single_use'|'monthly'|'lifetime'|undefined}
 */
export function detectTier(licenseKey = '', benefitId = '') {
  const key = String(licenseKey || '').trim();
  const bid = String(benefitId || '');

  if (
    key.startsWith('LINKFAIL-1X') ||
    process.env.LINKFAIL_LICENSE_TIER === 'single' ||
    bid === SINGLE_USE_BENEFIT_ID
  ) {
    return 'single_use';
  }
  if (
    key.startsWith('LINKFAIL-LT') ||
    process.env.LINKFAIL_LICENSE_TIER === 'lifetime' ||
    bid === LIFETIME_BENEFIT_ID
  ) {
    return 'lifetime';
  }
  if (
    key.startsWith('LINKFAIL') ||
    process.env.LINKFAIL_LICENSE_TIER === 'monthly' ||
    bid === MONTHLY_BENEFIT_ID
  ) {
    return 'monthly';
  }
  return undefined;
}

/**
 * @param {object} options
 * @param {string} [options.licenseKey]
 * @param {boolean} [options.skip]
 * @param {string} [options.organizationId]
 * @param {string} [options.configOrganizationId]
 * @param {typeof fetch} [options.fetchImpl]
 * @returns {Promise<{ ok: boolean, reason: string, tier?: string, benefitId?: string }>}
 */
export async function validateLicense({
  licenseKey,
  skip = false,
  organizationId,
  configOrganizationId,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (
    skip ||
    process.env.SKIP_LICENSE === '1' ||
    process.env.SKIP_LICENSE === 'true'
  ) {
    return { ok: true, reason: 'skipped', tier: detectTier(licenseKey) };
  }

  if (!licenseKey || !String(licenseKey).trim()) {
    return {
      ok: false,
      reason: 'missing_license_key',
    };
  }

  const key = String(licenseKey).trim();
  const orgId = resolveOrganizationId({
    organizationId,
    configOrganizationId,
  });

  const PLACEHOLDER = 'REPLACE_WITH_LINKFAIL_ORG_UUID';
  if (!orgId || orgId === PLACEHOLDER) {
    return {
      ok: false,
      reason: 'missing_organization_id',
    };
  }

  const tierHint = detectTier(key);
  /** @type {Record<string, unknown>} */
  const body = {
    key,
    organization_id: orgId,
  };
  if (tierHint === 'single_use') {
    body.increment_usage = 1;
  }

  let res;
  try {
    res = await fetchImpl(VALIDATE_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, reason: 'license_api_error' };
  }

  if (res.status === 404) {
    return { ok: false, reason: 'invalid_license_key' };
  }

  if (!res.ok) {
    if (res.status === 400 || res.status === 403 || res.status === 422) {
      return { ok: false, reason: 'invalid_license_key' };
    }
    return { ok: false, reason: 'license_api_error' };
  }

  let data;
  try {
    data = await res.json();
  } catch {
    return { ok: false, reason: 'license_api_error' };
  }

  const status = String(data?.status || '').toLowerCase();
  const valid =
    status === 'granted' ||
    data?.valid === true ||
    (status && status !== 'revoked' && status !== 'disabled' && data?.id);

  if (!valid || status === 'revoked' || status === 'disabled') {
    return { ok: false, reason: 'invalid_license_key' };
  }

  const benefitId = data?.benefit_id || data?.benefitId || '';
  const tier = detectTier(key, benefitId) || tierHint;

  return {
    ok: true,
    reason: 'granted',
    tier,
    benefitId: benefitId || undefined,
  };
}

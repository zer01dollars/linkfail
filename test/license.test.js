import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { validateLicense } from '../src/license.js';

describe('validateLicense', () => {
  const prev = process.env.SKIP_LICENSE;

  afterEach(() => {
    if (prev === undefined) delete process.env.SKIP_LICENSE;
    else process.env.SKIP_LICENSE = prev;
  });

  it('skips when skip=true', () => {
    delete process.env.SKIP_LICENSE;
    const r = validateLicense({ licenseKey: '', skip: true });
    assert.equal(r.ok, true);
    assert.equal(r.reason, 'skipped');
  });

  it('skips via SKIP_LICENSE env', () => {
    process.env.SKIP_LICENSE = '1';
    const r = validateLicense({ licenseKey: '' });
    assert.equal(r.ok, true);
    assert.equal(r.reason, 'skipped');
  });

  it('rejects missing key', () => {
    delete process.env.SKIP_LICENSE;
    const r = validateLicense({ licenseKey: '' });
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'missing_license_key');
  });

  it('rejects short key', () => {
    delete process.env.SKIP_LICENSE;
    const r = validateLicense({ licenseKey: 'short' });
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'invalid_license_key');
  });

  it('accepts key length >= 8 (stub)', () => {
    delete process.env.SKIP_LICENSE;
    const r = validateLicense({ licenseKey: '12345678' });
    assert.equal(r.ok, true);
    assert.equal(r.reason, 'stub_accepted');
  });
});

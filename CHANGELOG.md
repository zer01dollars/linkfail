
## 0.2.0

- Clearer README and 60-second setup
- `mode: auto` (fail on PR, Issue on schedule)
- Built-in ignore for localhost + badge hosts
- `examples/linkfail.yml` + `scripts/install.sh`
- Job notice summary
# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] — 2026-09-12

### Added

- Initial MVP: Node 20 ESM GitHub Action (`action.yml` + `src/` + ncc `dist/`)
- Markdown (+ optional HTML) http(s) link extraction
- HEAD/GET checker with timeout, exclude globs, ignore URL patterns (`linkfail.yml`)
- Inputs: `github-token`, `polar-license-key`, `skip-license`, `config-path`, `fail-on-broken`, `open-issue`, `issue-title`
- Polar license stub (skip or key length ≥ 8); products TBD
- PR fail + schedule Issue digest packaging
- Offline `scripts/local-run.js` and fixture tests
- Apache-2.0; CI workflow

Made By Zer01 — Artificially Intelligent, Digitally Enhanced.

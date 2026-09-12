# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0] — 2026-09-12

### Added

- Real Polar license validation (`POST …/license-keys/validate`) with org + benefit IDs
- Tier detection: `LINKFAIL-1X` (single_use + `increment_usage`), `LINKFAIL` (monthly), `LINKFAIL-LT` (lifetime)
- Service outputs under `linkfail-out/`: `report.md`, self-contained `report.html`, optional `linkfail.sarif`
- PR comment upsert (`comment-on-pr`, marker `<!-- linkfail-report -->`)
- Slack-compatible webhook (`webhook-url` / `LINKFAIL_WEBHOOK_URL`) — fail soft
- CLI: `linkfail init` and `linkfail check` (`bin/linkfail.js`)
- Landing page `docs/site/index.html` (GitHub Pages ready)
- Action inputs: `polar-organization-id`, `comment-on-pr`, `write-sarif`, `webhook-url`, `output-dir`
- Per-broken-link `core.warning` with source file when known
- Example workflow: `pull-requests: write` + artifact upload of `linkfail-out/`

### Changed

- README rewritten as full-service product page
- `scripts/install.sh` wraps CLI `init`
- Package version 0.3.0

## [0.2.0] — 2026-09-12

- Clearer README and 60-second setup
- `mode: auto` (fail on PR, Issue on schedule)
- Built-in ignore for localhost + badge hosts
- `examples/linkfail.yml` + `scripts/install.sh`
- Job notice summary

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

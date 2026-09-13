# Changelog

All notable changes to this project will be documented in this file.

## [0.4.1] — 2026-09-13

- Hosted Website API live at https://linkfail-api.fly.dev
- Dockerfile: `--ignore-scripts` so production image skips ncc prepare
- Fly.io + Render deploy configs; GitHub Action deploy workflow

## [0.4.0] — 2026-09-12

### Added

- Website crawl mode: BFS same-origin HTML pages → extract links → check with existing checker
- `src/html-extract.js` — absolute http(s) URLs from `a`/`link` href and `img`/`script`/`iframe` src
- `src/crawl.js` — configurable `maxPages` (50), `maxDepth` (2), concurrency, timeout
- Action inputs: `mode: website`, `start-url`, `max-pages`, `max-depth`
- CLI: `linkfail site <url> [--max-pages] [--max-depth] [--json]` and `linkfail serve [--port]`
- Hosted SaaS under `service/`: `GET /health`, `POST /v1/check` with Polar license validation
- Optional `service/Dockerfile`; env `PORT`, `POLAR_ORGANIZATION_ID`
- Unit tests for HTML extract, crawl (fixture site), and service handler (no long-lived server)

### Changed

- Package version 0.4.0
- README: Website as a Service section
- Docs landing pages mention website crawl / API

Made By Zer01 — Artificially Intelligent, Digitally Enhanced.

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

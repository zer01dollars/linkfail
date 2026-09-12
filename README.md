# Linkfail

**Docs links die. CI should notice.**

Teams pay Screaming Frog and site-audit SaaS to catch rotting URLs. [lychee](https://github.com/lycheeverse/lychee) is excellent free OSS — Linkfail packages the same painkiller as a **Polar-licensed GitHub Action** with PR fail gates and a weekly Issue digest.

**Made By Zer01** — Artificially Intelligent, Digitally Enhanced.

> Never POINTY.

## What it does

| Mode | Behavior |
|------|----------|
| **Pull request** | Scan `**/*.md` (optional HTML). Fail the job if links are broken (configurable). |
| **Schedule** | Same scan; open or update a GitHub Issue with a report. |

Checks use HTTP `HEAD` (falls back to `GET`), with timeouts, exclude globs, and ignore-URL patterns from `linkfail.yml`.

**Non-goals:** full site crawler, JS-rendered SPA spider, Cursor rules.

## Quick Start

### 1. Config (optional)

```bash
cp templates/linkfail.example.yml linkfail.yml
```

### 2. Workflow — PR gate + weekly digest

```yaml
# .github/workflows/linkfail.yml
name: Linkfail

on:
  pull_request:
  schedule:
    - cron: '0 9 * * 1'  # Mondays 09:00 UTC
  workflow_dispatch:

jobs:
  links:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write
      pull-requests: read
    steps:
      - uses: actions/checkout@v4
      - name: Linkfail
        uses: zer01dollars/linkfail@v0
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          polar-license-key: ${{ secrets.LINKFAIL_LICENSE_KEY }}
          # skip-license: true   # local/dev only
          fail-on-broken: ${{ github.event_name == 'pull_request' }}
          open-issue: ${{ github.event_name == 'schedule' || github.event_name == 'workflow_dispatch' }}
          issue-title: 'Linkfail: broken links detected'
```

### 3. License

| Input | Behavior |
|-------|----------|
| `skip-license: true` or `SKIP_LICENSE=1` | Skip check (CI of this repo / local) |
| `polar-license-key` | Stub accepts keys with **length ≥ 8** |

**DEFAULT / Polar TBD:** Polar products and organization IDs are **not wired yet**. The Action ships a license stub so workflows and secrets can land now; swap in real Polar validate when products exist. Until then, use `skip-license: true` for open testing or any ≥8-char placeholder key for packaging demos.

## Pricing

| Tier | Price | Buy |
|------|------:|-----|
| Single use | **$9** | [Checkout](https://buy.polar.sh/polar_cl_BaJHHZ30SJeeOOtfQkxWy8WAu1Lft5j2cVwG20suSWa) |
| Monthly | **$12/mo** | [Checkout](https://buy.polar.sh/polar_cl_nQHuiCYT1VVOCk4PWhU6KVUpcBkyEyb9Ssaay0YqiS9) |
| Lifetime | **$79** | [Checkout](https://buy.polar.sh/polar_cl_WPvBpcyTzu1KrtUwh8IlcTjvNd0RZxEFkO48D1N6Eoy) |

Licensed via [Polar](https://polar.sh) (org `driftwatch-kit`). Store your key as `LINKFAIL_LICENSE_KEY`.

## Config reference

See [`templates/linkfail.example.yml`](templates/linkfail.example.yml).

| Key | Default | Notes |
|-----|---------|-------|
| `include` | `**/*.md` | fast-glob patterns |
| `exclude` | `node_modules`, `.git`, `dist`, … | |
| `ignoreUrls` | `[]` | substring, `*` glob, or `/regex/` |
| `timeoutMs` | `10000` | per request |
| `concurrency` | `8` | parallel checks |
| `checkHtml` | `false` | also scan `*.html` / `*.htm` |

## Action inputs

| Input | Default | Description |
|-------|---------|-------------|
| `github-token` | `${{ github.token }}` | Issues API |
| `polar-license-key` | — | Polar key (stub) |
| `skip-license` | `false` | Skip license |
| `config-path` | `linkfail.yml` | Config path |
| `fail-on-broken` | `true` | Fail job on broken links |
| `open-issue` | `false` | Open/update digest Issue |
| `issue-title` | `Linkfail: broken links detected` | Issue title |

## Local proof (offline)

```bash
npm install
npm test
npm run local   # scans test/fixtures with mocked fetch — no network
```

Or:

```bash
SKIP_LICENSE=1 node scripts/local-run.js
```

## Develop

```bash
npm install
npm test
npm run build   # ncc → dist/
```

Requires **Node 20+**. Apache-2.0.

## Brand

Made By Zer01 / Artificially Intelligent, Digitally Enhanced. Never POINTY.

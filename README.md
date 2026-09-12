# Linkfail

**Broken docs links should fail CI — not surprise your users.**

Linkfail is a tiny GitHub Action: it checks `http(s)` links in your Markdown, fails the pull request when something is dead, and can open a weekly GitHub Issue with the full report.

Made By Zer01  
Artificially Intelligent, Digitally Enhanced.

---

## 60-second setup

**1. Buy a license** and add the key as a repo secret named `LINKFAIL_LICENSE_KEY`.

| | Price | |
|--|------:|--|
| Try one run | [$9](https://buy.polar.sh/polar_cl_BaJHHZ30SJeeOOtfQkxWy8WAu1Lft5j2cVwG20suSWa) | |
| Monthly | [$12/mo](https://buy.polar.sh/polar_cl_nQHuiCYT1VVOCk4PWhU6KVUpcBkyEyb9Ssaay0YqiS9) | |
| Lifetime | [$79](https://buy.polar.sh/polar_cl_WPvBpcyTzu1KrtUwh8IlcTjvNd0RZxEFkO48D1N6Eoy) | |

**2. Add one workflow** — copy [`examples/linkfail.yml`](examples/linkfail.yml) to `.github/workflows/linkfail.yml`:

```yaml
name: Linkfail
on:
  pull_request:
  schedule:
    - cron: '0 9 * * 1'   # weekly digest
  workflow_dispatch:

jobs:
  links:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write
    steps:
      - uses: actions/checkout@v4
      - uses: zer01dollars/linkfail@v1
        with:
          polar-license-key: ${{ secrets.LINKFAIL_LICENSE_KEY }}
```

**3. Push.** On PRs, broken links fail the check. On the Monday cron (or “Run workflow”), Linkfail opens or updates an Issue titled `Linkfail: broken links detected`.

No `linkfail.yml` required. Built-in defaults scan `**/*.md` and ignore localhost + common badge hosts.

Or from a clone of this repo:

```bash
./scripts/install.sh /path/to/your-repo
```

---

## What you get

| When | What happens |
|------|----------------|
| **Pull request** | Scan Markdown → **fail the job** if any link is broken |
| **Schedule / manual run** | Same scan → **open or update a GitHub Issue** with the report |

Under the hood: HTTP `HEAD` (falls back to `GET`), timeouts, parallel checks.

**Not included:** full-site crawling, JS-rendered SPA spidering, Cursor rules.

---

## Optional config

Only if you need it — create `linkfail.yml` at the repo root (see [`templates/linkfail.example.yml`](templates/linkfail.example.yml)):

```yaml
include:
  - "**/*.md"
exclude:
  - "**/CHANGELOG.md"
ignoreUrls:
  - "https://twitter.com/"   # added on top of built-in ignores
timeoutMs: 10000
concurrency: 8
checkHtml: false             # set true to also scan HTML
```

---

## Action inputs

| Input | Default | Meaning |
|-------|---------|---------|
| `polar-license-key` | — | Your Polar key |
| `mode` | `auto` | `auto` = fail on PR/push, Issue on schedule; or force `pr` / `schedule` |
| `fail-on-broken` | *(auto)* | Set only to override `mode` |
| `open-issue` | *(auto)* | Set only to override `mode` |
| `config-path` | `linkfail.yml` | Config file (optional) |
| `skip-license` | `false` | Try without a key (dev) |
| `github-token` | `GITHUB_TOKEN` | Needed for Issue digest |
| `issue-title` | `Linkfail: broken links detected` | Digest title |

Outputs: `broken-count`, `ok-count`, `url-count`, `issue-url`.

---

## Try locally (no network)

```bash
git clone https://github.com/zer01dollars/linkfail
cd linkfail
npm install
npm test
npm run local    # fixtures → expect 2 broken links
```

---

## License

Apache-2.0. Product license keys via [Polar](https://polar.sh) (org `driftwatch-kit`).

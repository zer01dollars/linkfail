# Linkfail — agent conventions

Polar-licensed GitHub Action + CLI that fails CI (or opens an Issue / PR comment) when Markdown/HTML docs links die.

## Layout

| Path | Role |
|------|------|
| `src/index.js` | Action entry (`run`) |
| `src/license.js` | Polar validate API (async); skip-license / SKIP_LICENSE |
| `src/config.js` | `linkfail.yml` load + URL ignore |
| `src/extract.js` | http(s) from md/html |
| `src/check.js` | HEAD/GET + classify |
| `src/scan.js` | glob → extract → check |
| `src/report.js` | console + Issue/PR body + HTML + SARIF + writeReports |
| `src/issue.js` | open/update Issue |
| `src/pr-comment.js` | upsert PR comment |
| `src/webhook.js` | Slack-compatible webhook (soft fail) |
| `src/html-extract.js` | HTML attribute URL extract (+ relative resolve) |
| `src/crawl.js` | BFS website crawl → check |
| `bin/linkfail.js` | CLI: `init`, `check`, `site`, `serve` |
| `service/` | Website-as-a-Service HTTP API |
| `docs/site/` | Marketing landing (GitHub Pages) |
| `examples/linkfail.yml` | example workflow |
| `scripts/install.sh` | wraps CLI init |
| `dist/` | ncc bundle (commit after `npm run build`) |

## Rules

- Node 20 ESM; tests via `node --test` with **mocked fetch** — no live network in `npm test`.
- Brand: Made By Zer01 / Artificially Intelligent, Digitally Enhanced. Never POINTY.
- Polar org `b6303f05-be1c-4b45-b847-5979667a3d12`; benefits LINKFAIL-1X / LINKFAIL / LINKFAIL-LT as in README.
- Non-goals: JS-rendered SPA spidering, Cursor rules.

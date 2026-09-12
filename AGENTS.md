# Linkfail — agent conventions

Polar-licensed GitHub Action that fails CI (or opens an Issue) when Markdown/HTML docs links die.

## Layout

| Path | Role |
|------|------|
| `src/index.js` | Action entry (`run`) |
| `src/license.js` | Stub: skip or key length ≥ 8 (Polar products TBD) |
| `src/config.js` | `linkfail.yml` load + URL ignore |
| `src/extract.js` | http(s) from md/html |
| `src/check.js` | HEAD/GET + classify |
| `src/scan.js` | glob → extract → check |
| `src/report.js` | console + Issue body |
| `src/issue.js` | open/update Issue |
| `templates/linkfail.example.yml` | example config |
| `scripts/local-run.js` | offline fixture run |
| `dist/` | ncc bundle (commit after `npm run build`) |

## Rules

- Node 20 ESM; tests via `node --test` with **mocked fetch** — no live network in `npm test`.
- License stub only until Polar product IDs exist; do not invent org/benefit UUIDs.
- Brand: Made By Zer01 / Artificially Intelligent, Digitally Enhanced. Never POINTY.
- Non-goals: site crawler, SPA spider, Cursor rules.

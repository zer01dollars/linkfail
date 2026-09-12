#!/usr/bin/env bash
# Install Linkfail workflow into a repo. Made By Zer01.
# Prefer: npx linkfail init  (or node bin/linkfail.js init)
set -euo pipefail
ROOT="${1:-.}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PKG_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
if [[ -f "$PKG_ROOT/bin/linkfail.js" ]]; then
  exec node "$PKG_ROOT/bin/linkfail.js" init "$ROOT"
fi
DEST="$ROOT/.github/workflows"
mkdir -p "$DEST"
SRC="$PKG_ROOT/examples/linkfail.yml"
if [[ ! -f "$SRC" ]]; then
  echo "Missing examples/linkfail.yml" >&2
  exit 1
fi
cp "$SRC" "$DEST/linkfail.yml"
echo "Wrote $DEST/linkfail.yml"
echo "Next: add repo secret LINKFAIL_LICENSE_KEY (buy at README), then push."

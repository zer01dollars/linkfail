#!/usr/bin/env bash
# Install Linkfail workflow into a repo. Made By Zer01.
set -euo pipefail
ROOT="${1:-.}"
DEST="$ROOT/.github/workflows"
mkdir -p "$DEST"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$SCRIPT_DIR/../examples/linkfail.yml"
if [[ ! -f "$SRC" ]]; then
  echo "Missing examples/linkfail.yml" >&2
  exit 1
fi
cp "$SRC" "$DEST/linkfail.yml"
echo "Wrote $DEST/linkfail.yml"
echo "Next: add repo secret LINKFAIL_LICENSE_KEY (buy at README), then push."

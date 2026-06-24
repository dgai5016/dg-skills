#!/usr/bin/env bash
# detect-framework.sh — detect static-site framework of a docs directory
# Usage: ./detect-framework.sh <docs-path>
# Prints one of: mkdocs | vitepress | unknown
# Exit codes: 0 = detected, 1 = unknown, 2 = usage error

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <docs-path>" >&2
  exit 2
fi

DOCS_PATH="$1"

if [[ ! -d "$DOCS_PATH" ]]; then
  echo "Error: directory does not exist: $DOCS_PATH" >&2
  exit 2
fi

# MkDocs Material / MkDocs: look for mkdocs.yml at the docs root or one level up
shopt -s nullglob
mkdocs_candidates=(
  "$DOCS_PATH/mkdocs.yml"
  "$DOCS_PATH/mkdocs.yaml"
  "$DOCS_PATH/../mkdocs.yml"
  "$DOCS_PATH/../mkdocs.yaml"
)
for f in "${mkdocs_candidates[@]}"; do
  if [[ -f "$f" ]]; then
    echo "mkdocs"
    exit 0
  fi
done

# VitePress: .vitepress/config.{ts,js,mts,mjs} inside the docs root
vp_candidates=(
  "$DOCS_PATH/.vitepress/config.ts"
  "$DOCS_PATH/.vitepress/config.js"
  "$DOCS_PATH/.vitepress/config.mts"
  "$DOCS_PATH/.vitepress/config.mjs"
  "$DOCS_PATH/docs/.vitepress/config.ts"
  "$DOCS_PATH/docs/.vitepress/config.js"
  "$DOCS_PATH/docs/.vitepress/config.mts"
  "$DOCS_PATH/docs/.vitepress/config.mjs"
)
for f in "${vp_candidates[@]}"; do
  if [[ -f "$f" ]]; then
    echo "vitepress"
    exit 0
  fi
done

echo "unknown"
exit 1

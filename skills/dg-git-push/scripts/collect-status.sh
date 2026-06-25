#!/usr/bin/env bash
# collect-status.sh — collect git repository status in one shot
# Usage: ./collect-status.sh [repo-path]
#   repo-path defaults to current directory
# Output: fixed sections (BRANCH / STATUS / DIFFSTAT / COMMIT-CONTEXT) in plain text
# Exit codes: 0 = ok, 1 = not a git repo, 2 = usage error
#
# Design goal: let the skill read git state in a single round-trip instead of
# running `git status` / `git rev-parse` / `git remote` / `git log` separately.
# Relies on git itself + bash builtins only (no sed/awk/grep) for portability.

set -euo pipefail

REPO_PATH="${1:-.}"

if [[ ! -d "$REPO_PATH" ]]; then
  echo "Error: directory does not exist: $REPO_PATH" >&2
  exit 2
fi

if ! git -C "$REPO_PATH" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: not a git repository: $REPO_PATH" >&2
  exit 1
fi

# === BRANCH ===
current_branch=$(git -C "$REPO_PATH" branch --show-current 2>/dev/null || true)
[[ -z "$current_branch" ]] && current_branch="(detached HEAD)"

upstream=$(git -C "$REPO_PATH" rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)
[[ -z "$upstream" ]] && upstream="(none)"

remotes=$(git -C "$REPO_PATH" remote 2>/dev/null || true)
if [[ -z "$remotes" ]]; then
  remote="(none)"
else
  # Take first line via bash parameter expansion (no head/awk dependency)
  remote="${remotes%%$'\n'*}"
fi

# ahead/behind: only meaningful when upstream exists
if [[ "$upstream" != "(none)" ]]; then
  ahead=$(git -C "$REPO_PATH" rev-list --count '@{u}..HEAD' 2>/dev/null || echo 0)
  behind=$(git -C "$REPO_PATH" rev-list --count 'HEAD..@{u}' 2>/dev/null || echo 0)
else
  ahead="(n/a)"
  behind="(n/a)"
fi

echo "=== BRANCH ==="
echo "current: $current_branch"
echo "upstream: $upstream"
echo "remote: $remote"
echo "ahead: $ahead"
echo "behind: $behind"
echo

# === STATUS ===
# Porcelain v1, include all untracked files (-uall, not collapsed into directories)
echo "=== STATUS ==="
status_output=$(git -C "$REPO_PATH" status --porcelain=v1 -uall 2>/dev/null || true)
if [[ -z "$status_output" ]]; then
  echo "(clean — no changes)"
else
  printf '%s\n' "$status_output"
fi
echo

# === DIFFSTAT ===
# HEAD vs working tree — covers both staged and unstaged tracked changes.
# Untracked files are not in diffstat (they're listed in STATUS above).
echo "=== DIFFSTAT ==="
diffstat_output=$(git -C "$REPO_PATH" diff --stat HEAD 2>/dev/null || true)
if [[ -z "$diffstat_output" ]]; then
  echo "(no tracked diffs)"
else
  printf '%s\n' "$diffstat_output"
fi
echo

# === COMMIT-CONTEXT ===
# Helps the skill infer project's commit-message style (language, prefix convention)
echo "=== COMMIT-CONTEXT ==="
last_short=$(git -C "$REPO_PATH" log -1 --pretty=format:'%h' 2>/dev/null || true)
last_subject=$(git -C "$REPO_PATH" log -1 --pretty=format:'%s' 2>/dev/null || true)
if [[ -z "$last_short" ]]; then
  echo "last_commit_short: (no commits yet)"
  echo "last_commit_subject: (no commits yet)"
else
  echo "last_commit_short: $last_short"
  echo "last_commit_subject: $last_subject"
fi

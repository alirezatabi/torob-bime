#!/usr/bin/env bash
# Compatible Claude Code environments: verify edits and block completion on errors.
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ ! -d node_modules ]]; then
  echo 'Install dependencies with pnpm install before verification.' >&2
  exit 2
fi
pnpm typecheck && pnpm lint || exit 2

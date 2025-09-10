#!/usr/bin/env bash
set -euo pipefail
msgfile="$1"
commit="$(git rev-parse HEAD)"
case "$commit" in
  028f495*) cat >"$msgfile" <<MSG
chore(format): apply Biome formatting (no functional changes)
MSG
  ;;
  *) ;;
esac

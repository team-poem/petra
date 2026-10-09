#!/bin/sh
set -eu
root=$1
manifest="$root/.petra/manifest.json"
[ -f "$manifest" ] && [ ! -L "$manifest" ] || { echo 'PETRA manifest 없음 또는 심링크' >&2; exit 1; }
if jq -e '.installation' "$manifest" >/dev/null; then
  exec node "$(dirname "$0")/petra-files.mjs" verify "$root"
fi
exec node "$(dirname "$0")/petra-files.mjs" verify-pack "$root"

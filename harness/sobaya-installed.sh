#!/bin/sh
# 설치형 소바야를 기존 Poem 프로젝트에 명시적으로 연결한다.
set -eu
ROOT=$(cd "$(dirname "$0")/.." && pwd -P)
. "$ROOT/harness/sobaya/installed-lib.sh"
die() { si_error "$@"; exit 2; }
command=${1:-}; [ "$#" -gt 0 ] && shift
case "$command" in attach|sync|bump|check) ;; *) die 'usage: attach|sync|bump|check --install-root STORE [options]' ;; esac
store= version= manifest= archive= cli=
while [ "$#" -gt 0 ]; do
  case "$1" in
    --install-root|--version|--manifest|--archive|--cli)
      [ "$#" -ge 2 ] && [ -n "$2" ] || die "missing value for $1"
      case "$2" in --*) die "missing value for $1" ;; esac
      case "$1" in
        --install-root) [ -z "$store" ] || die 'duplicate install-root'; store=$2 ;;
        --version) [ -z "$version" ] || die 'duplicate version'; version=$2 ;;
        --manifest) [ -z "$manifest" ] || die 'duplicate manifest'; manifest=$2 ;;
        --archive) [ -z "$archive" ] || die 'duplicate archive'; archive=$2 ;;
        --cli) [ -z "$cli" ] || die 'duplicate cli'; cli=$2 ;;
      esac
      shift 2 ;;
    *) die "unknown argument: $1" ;;
  esac
done
[ -n "$store" ] || die 'install-root is required'
case "$command" in
  attach) [ -n "$version" ] && [ -z "$manifest$archive$cli" ] || die 'attach requires version; other options are not supported' ;;
  sync) [ -z "$version$manifest" ] || die 'sync uses the reviewed root pins' ;;
  bump) [ -n "$version" ] && [ -n "$manifest" ] && [ -z "$cli" ] || die 'bump requires version and manifest' ;;
  check) [ -z "$version$manifest$archive$cli" ] || die 'check only accepts install-root' ;;
esac
for tool in git jq; do command -v "$tool" >/dev/null || die "$tool is required"; done
# Git hooks may export another worktree's repository variables.
for name in $(git rev-parse --local-env-vars); do unset "$name"; done
[ "$(git -C "$ROOT" rev-parse --show-toplevel)" = "$ROOT" ] && [ "$(git -C "$ROOT" rev-parse --is-bare-repository)" = false ] || die 'consumer repository required'
store=$(si_absolute "$store") || exit 2
case "$store/" in "$ROOT/"*) die 'install-root must be outside the consumer' ;; esac
si_no_legacy "$ROOT" || exit 2
connected=$(si_connection "$ROOT" "$store") || exit 2
cli=${cli:-$store/bin/sobaya}
[ -f "$cli" ] && [ -x "$cli" ] || die 'trusted CLI missing; preinstall the runtime or use sync --cli PATH'
if [ "$command" != attach ] || si_exists "$ROOT/sobaya.json" || si_exists "$ROOT/sobaya.lock"; then
  for file in sobaya.json sobaya.lock; do
    [ -f "$ROOT/$file" ] && [ ! -L "$ROOT/$file" ] || die "regular $file is required; mixed pins are not supported"
  done
  config=$("$cli" config check --root "$ROOT") || exit 2
  [ "$(printf '%s' "$config" | jq -r .mode)" = dependency ] || die 'dependency mode required'
fi
case "$command" in
  attach)
    [ "$(git -C "$ROOT" config --bool extensions.worktreeConfig || :)" = true ] || die 'prepare extensions.worktreeConfig=true before attach'
    for file in AGENTS.md spec.md failed-test.md; do
      [ -f "$ROOT/$file" ] && [ ! -L "$ROOT/$file" ] || die "existing regular $file required"
    done
    exec "$cli" init --root "$ROOT" --install-root "$store" --mode dependency --version "$version" ;;
  check)
    printf '%s' "$config" | jq --argjson connected "$connected" '{mode,version:.runtime.version,connected:$connected}' ;;
  sync)
    set -- sync --root "$ROOT" --install-root "$store"
    [ -z "$archive" ] || set -- "$@" --archive "$archive"
    exec "$cli" "$@" ;;
  bump)
    set -- bump --root "$ROOT" --install-root "$store" --version "$version" --manifest "$manifest"
    [ -z "$archive" ] || set -- "$@" --archive "$archive"
    exec "$cli" "$@" ;;
esac

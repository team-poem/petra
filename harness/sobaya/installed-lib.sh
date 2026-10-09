#!/bin/sh
# 설치형 연결의 읽기 전용 경로·메타데이터 검사. 런타임 검증은 공개 CLI가 맡는다.
si_error() { printf 'sobaya-installed: %s\n' "$*" >&2; return 1; }
si_exists() { [ -e "$1" ] || [ -L "$1" ]; }
si_absolute() (
  case "$1" in /*) path=$1 ;; *) path=$PWD/$1 ;; esac
  if [ -d "$path" ]; then cd "$path" && pwd -P; return; fi
  si_exists "$path" && { si_error 'install-root must be a directory'; exit 1; }
  parent=$(si_absolute "$(dirname "$path")") || exit 1
  case "$(basename "$path")" in
    .) printf '%s\n' "$parent" ;;
    ..) dirname "$parent" ;;
    *) printf '%s/%s\n' "${parent%/}" "$(basename "$path")" ;;
  esac
)
si_hook_path() (
  path=$(git -C "$1" rev-parse --git-path hooks) || exit 1
  case "$path" in /*) ;; *) path=$1/$path ;; esac
  si_absolute "$path"
)
si_no_legacy() (
  si_exists "$1/harness/sobaya.lock" && { si_error 'legacy lock present; retain the legacy workflow'; exit 1; }
  common=$(git -C "$1" rev-parse --git-common-dir) || exit 1
  case "$common" in /*) ;; *) common=$1/$common ;; esac
  if [ -f "$common/hooks/pre-commit" ] && grep -Eq '^# Sobaya app pre-commit v[12]$' "$common/hooks/pre-commit"; then
    si_error 'legacy managed pre-commit present; explicit migration is required'; exit 1
  fi
)
# 공개 v1 연결 훅 형식만 확인한다. 실행하거나 로컬 메타데이터를 수선하지 않는다.
si_forwarder() {
  /bin/bash -c '
    hook=$1; original=$2; root=$3; store=$4
    printf "#!/bin/bash\n# Sobaya connected hook v1\n"
    if [ "$hook" = pre-commit ]; then
      printf "if [ -x "; printf "%q" "$original/$hook"; printf " ]; then\n  "
      printf "%q" "$original/$hook"; printf " \"\$@\" || exit \"\$?\"\nfi\n"
      printf "exec /bin/bash "; printf "%q" "$store/bin/sobaya"
      printf " __hook --root "; printf "%q" "$root"
      printf " --install-root "; printf "%q" "$store"
      printf " --app "; printf "%q" "$root"; printf "\n"
    else
      printf "[ -x "; printf "%q" "$original/$hook"; printf " ] || exit 0\nexec "
      printf "%q" "$original/$hook"; printf " \"\$@\"\n"
    fi
  ' forwarder "$@"
}
si_connection() (
  root=$1; store=$2
  meta=$(git -C "$root" rev-parse --absolute-git-dir)/sobaya || exit 1
  [ ! -L "$meta" ] || { si_error 'connection metadata is a symlink'; exit 1; }
  [ ! -e "$meta" ] || [ -d "$meta" ] || { si_error 'connection metadata is not a directory'; exit 1; }
  if ! si_exists "$meta/connection.json"; then
    if si_exists "$meta/original-hooks.json" || si_exists "$meta/hooks" || [ "$(si_hook_path "$root")" != "$root/.githooks" ]; then
      si_error 'connection hook metadata/configuration conflicts'; exit 1
    fi
    printf 'false\n'; exit 0
  fi
  [ -f "$meta/connection.json" ] && [ ! -L "$meta/connection.json" ] &&
    jq -es --arg root "$root" --arg store "$store" 'length==1 and (.[0] | type=="object" and .connection_version==1 and .mode=="dependency" and .root==$root and .app==$root and .store==$store)' "$meta/connection.json" >/dev/null || {
      si_error 'connection does not match this worktree/store'; exit 1;
    }
  [ "$(git -C "$root" config --bool extensions.worktreeConfig)" = true ] &&
    [ -f "$meta/original-hooks.json" ] && [ ! -L "$meta/original-hooks.json" ] &&
    jq -es --arg original "$root/.githooks" 'length==1 and (.[0] | type=="object" and .hook_version==1 and .scope=="--worktree" and .original==$original)' "$meta/original-hooks.json" >/dev/null &&
    [ "$(si_hook_path "$root")" = "$meta/hooks" ] && [ -d "$meta/hooks" ] && [ ! -L "$meta/hooks" ] &&
    [ -x "$root/.githooks/pre-commit" ] && [ -f "$meta/hooks/pre-commit" ] || {
      si_error 'connection forwarding hook configuration conflicts'; exit 1;
    }
  for original in "$root/.githooks/"*; do
    case "$original" in *.sample) continue ;; esac
    [ -f "$original" ] && [ -x "$original" ] || continue
    hook=$meta/hooks/$(basename "$original")
    [ -f "$hook" ] && [ ! -L "$hook" ] && [ -x "$hook" ] || {
      si_error 'connection forwarding hook missing or invalid'; exit 1;
    }
  done
  for hook in "$meta/hooks/"*; do
    name=$(basename "$hook")
    [ -f "$hook" ] && [ ! -L "$hook" ] && [ -x "$hook" ] &&
      [ -f "$root/.githooks/$name" ] && [ -x "$root/.githooks/$name" ] &&
      si_forwarder "$name" "$root/.githooks" "$root" "$store" | cmp -s - "$hook" || {
        si_error 'connection forwarding hook content conflicts'; exit 1;
      }
  done
  printf 'true\n'
)
si_local_status() (
  meta=$(git -C "$1" rev-parse --absolute-git-dir)/sobaya || exit 1
  store=$(jq -ers 'select(length==1) | .[0] | select(type=="object") | .store | select(type=="string" and startswith("/"))' "$meta/connection.json") || {
    si_error 'connection store metadata missing or invalid'; exit 1;
  }
  adapter=$1/harness/sobaya-installed.sh
  if [ -f "$1/.petra/manifest.json" ] && jq -e '.schema==1 and .records==".petra/collab"' "$1/.petra/manifest.json" >/dev/null 2>&1; then
    adapter=$1/.petra/runtime/harness/sobaya-installed.sh
  fi
  sh "$adapter" check --install-root "$store"
)
si_setup_collab_hooks() (
  meta=$(git -C "$1" rev-parse --absolute-git-dir)/sobaya || exit 1
  if si_exists "$meta/connection.json" || si_exists "$meta/original-hooks.json" || si_exists "$meta/hooks"; then
    status=$(si_local_status "$1") && printf '%s' "$status" | jq -e '.connected==true' >/dev/null || {
      si_error 'connection conflicts; inspect before changing hooks'; exit 1;
    }
    exit 0
  fi
  scope=--local
  [ "$(git -C "$1" config --bool extensions.worktreeConfig || :)" != true ] || scope=--worktree
  git -C "$1" config "$scope" core.hooksPath .githooks
)

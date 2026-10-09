#!/bin/bash
# DRAFT: human approval is required before this becomes a CI acceptance test.
set -eu
set -o pipefail
umask 022
unset CLAUDE_PROJECT_DIR GITHUB_HEAD_REF GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE
unset GIT_COMMON_DIR GIT_OBJECT_DIRECTORY GIT_ALTERNATE_OBJECT_DIRECTORIES
unset GIT_CONFIG GIT_CONFIG_COUNT GIT_CONFIG_PARAMETERS SOBAYA_ROOT
unset COLLAB_RUN_FORCE COLLAB_SKIP_WIP COLLAB_ALLOW_PROTECTED_PUSH COLLAB_ALLOW_MERGED_PUSH
unset LEGACY_FAIL_CHMOD LEGACY_LINT_EXIT
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 GIT_ALLOW_PROTOCOL=file
SRC=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
UPSTREAM=${SOBAYA_TEST_SOURCE:?A Sobaya source checkout is required}
PIN=d06384544e81cd373d81e2a940ab336868e04854
CASE=${1:-all}
for tool in git jq cmp; do
  command -v "$tool" >/dev/null || { printf 'NOT PROBED: missing %s\n' "$tool"; exit 2; }
done
git -C "$UPSTREAM" cat-file -e "$PIN^{commit}"
R=$(mktemp -d "${TMPDIR:-/tmp}/poem-legacy-draft.XXXXXX")
R=$(cd "$R" && pwd -P)
cleanup() {
  if [ "${SOBAYA_KEEP_DRAFT_EVIDENCE:-0}" = 1 ]; then printf 'EVIDENCE: %s\n' "$R"; else rm -rf "$R"; fi
}
trap cleanup EXIT
mkdir "$R/git-template" "$R/bin"
export GIT_TEMPLATE_DIR="$R/git-template"
printf '#!/bin/sh\nexit 1\n' > "$R/bin/gh"
chmod +x "$R/bin/gh"
export PATH="$R/bin:$PATH"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
same() { cmp -s "$1" "$2" || fail "changed: $1"; }
snapshot_file() {
  if [ -f "$1" ]; then printf 'present\n'; cat "$1"; else printf 'absent\n'; fi > "$2"
}
snapshot_config() {
  snapshot_file "$PARENT/.git/config" "$W/$1.common"
  snapshot_file "$PARENT/.git/config.worktree" "$W/$1.parent"
  snapshot_file "$LEGACY_TARGET_CONFIG" "$W/$1.target"
}
fixture() {
  W="$R/$1"; PARENT="$W/app's path"; SOB="$W/sobaya source"
  mkdir -p "$PARENT"
  cp -R "$SRC/harness" "$SRC/scripts" "$SRC/.githooks" "$SRC/.claude" "$SRC/.codex" "$SRC/collab" "$SRC/.gitignore" "$PARENT/"
  rm -rf "$PARENT/.claude/cache" "$PARENT/collab/active" "$PARENT/collab/journal"
  rm -f "$PARENT/harness/sobaya.lock"
  mkdir -p "$PARENT/collab/active" "$PARENT/collab/journal"
  printf '# Fixture app\n- Test: `node --test`\n- Lint: `sh fixture-lint.sh`\n' > "$PARENT/AGENTS.md"
  cat > "$PARENT/fixture-lint.sh" <<'LINT'
#!/bin/sh
printf 'lint\n' >> "$LEGACY_CASE/lint-calls"
exit "${LEGACY_LINT_EXIT:-0}"
LINT
  printf '# Fixture specification\nPreserve existing files.\n' > "$PARENT/spec.md"
  printf '# Fixture plan\nNo application tests are approved.\n' > "$PARENT/failed-test.md"
  git -C "$PARENT" init -q -b main
  git -C "$PARENT" config user.name Fixture
  git -C "$PARENT" config user.email fixture@example.invalid
  git -C "$PARENT" config collab.me fixture
  git -C "$PARENT" config collab.onboarded true
  git -C "$PARENT" add -A
  git -C "$PARENT" -c core.hooksPath=/dev/null commit -qm fixture
  git clone -q --bare "$PARENT" "$W/origin.git"
  git -C "$PARENT" remote add origin "$W/origin.git"
  git -C "$PARENT" fetch -q origin main
  git -C "$PARENT" config core.hooksPath .githooks
  APP=$PARENT
  if [ "$1" != primary ]; then
    (cd "$PARENT"; sh scripts/collab.sh worktree feat/legacy) > "$W/worktree.log" 2>&1
    APP="$W/app's path-feat--legacy"
    [ "$(git -C "$APP" config --worktree core.hooksPath)" = .githooks ] || fail 'new worktree hook was not configured'
    case "$1" in
      absent) git -C "$PARENT" config --local --unset-all core.hooksPath ;;
      equal) : ;;
      *) git -C "$PARENT" config --local core.hooksPath .parent-hooks ;;
    esac
  fi
  mkdir -p "$PARENT/.parent-hooks"
  printf '#!/bin/sh\nexit 37\n' > "$PARENT/.parent-hooks/pre-commit"
  chmod +x "$PARENT/.parent-hooks/pre-commit"
  cp -p "$PARENT/.parent-hooks/pre-commit" "$W/parent-hook.before"
  git clone -q --no-hardlinks --no-checkout "$UPSTREAM" "$SOB"
  git -C "$SOB" checkout -q --detach "$PIN"
  git -C "$UPSTREAM" show "$PIN:tdd-set/bin/install.sh" > "$W/pinned-install.sh"
  same "$SOB/tdd-set/bin/install.sh" "$W/pinned-install.sh"
  mv "$SOB/tdd-set/bin/install.sh" "$SOB/tdd-set/bin/install-pinned.sh"
  cat > "$SOB/tdd-set/bin/install.sh" <<'OBSERVER'
#!/bin/bash
set -eu
snapshot_file() {
  if [ -f "$1" ]; then printf 'present\n'; cat "$1"; else printf 'absent\n'; fi > "$2"
}
observe() {
  snapshot_file "$LEGACY_PARENT/.git/config" "$LEGACY_CASE/observed.common"
  snapshot_file "$LEGACY_PARENT/.git/config.worktree" "$LEGACY_CASE/observed.parent"
  snapshot_file "$LEGACY_TARGET_CONFIG" "$LEGACY_CASE/observed.target"
  for scope in common parent target; do
    if ! cmp -s "$LEGACY_CASE/before.$scope" "$LEGACY_CASE/observed.$scope"; then
      printf '%s:%s:%s\n' "$LEGACY_ACTION" "$1" "$scope" >> "$LEGACY_CASE/config-changed-during-install"
    fi
  done
}
printf '%s\n' "$LEGACY_ACTION" >> "$LEGACY_CASE/installer-calls"
observe before
if [ "${LEGACY_FAIL_CHMOD:-0}" = 1 ]; then export PATH="$LEGACY_CASE/fail-bin:$PATH"; fi
if /bin/bash "$(dirname "$0")/install-pinned.sh" "$@"; then rc=0; else rc=$?; fi
observe after
exit "$rc"
OBSERVER
  chmod +x "$SOB/tdd-set/bin/install.sh"
  export LEGACY_PARENT="$PARENT" LEGACY_CASE="$W"
  export LEGACY_TARGET_CONFIG="$(git -C "$APP" rev-parse --absolute-git-dir)/config.worktree"
  COMMON="$PARENT/.git/hooks/pre-commit"
  mkdir -p "$APP/.claude/cache" "$(dirname "$COMMON")"
  cp -p "$APP/.githooks/pre-commit" "$W/collab-hook.before"
  for file in AGENTS.md spec.md failed-test.md; do cp "$APP/$file" "$W/$file.before"; done
  snapshot_config before
}
invoke() {
  export LEGACY_ACTION="$1"
  if (cd "$APP"; sh harness/attach-sobaya.sh "$1" --sobaya "$SOB") > "$W/$1.out" 2> "$W/$1.err"; then RC=0; else RC=$?; fi
  printf '%s\n' "$RC" > "$W/$1.rc"
}
preserved() {
  snapshot_config after
  for scope in common parent target; do same "$W/before.$scope" "$W/after.$scope"; done
  [ ! -e "$W/config-changed-during-install" ] || fail 'persistent Git config changed during the real installer call'
  same "$APP/.githooks/pre-commit" "$W/collab-hook.before"
  same "$PARENT/.parent-hooks/pre-commit" "$W/parent-hook.before"
  [ -x "$APP/.githooks/pre-commit" ] && [ -x "$PARENT/.parent-hooks/pre-commit" ] || fail 'hook lost executable permission'
  for file in AGENTS.md spec.md failed-test.md; do same "$APP/$file" "$W/$file.before"; done
}
managed_hook() {
  [ -x "$COMMON" ] && [ ! -L "$COMMON" ] || fail 'shared managed hook missing'
  head -n 2 "$COMMON" | grep -q '^# Sobaya app pre-commit v2$' || fail 'wrong shared hook marker'
  grep -Fq "$SOB/tdd-set/hooks/pre-commit.sh" "$COMMON" || fail 'shared hook points to wrong runtime'
}
exercise_hook() {
  for expected in 0 23; do
    export LEGACY_LINT_EXIT="$expected"
    : > "$W/lint-calls"
    if (cd "$APP"; sh .githooks/pre-commit) > "$W/hook-$expected.out" 2> "$W/hook-$expected.err"; then hook_rc=0; else hook_rc=$?; fi
    printf 'lint\n' > "$W/expected-lint"
    same "$W/lint-calls" "$W/expected-lint"
    if [ "$expected" = 0 ]; then [ "$hook_rc" = 0 ] || fail 'successful runtime hook was rejected'
    else [ "$hook_rc" -ne 0 ] || fail 'runtime hook failure was swallowed'; fi
  done
  unset LEGACY_LINT_EXIT
}
success_case() {
  fixture "$1"
  for action in attach sync update; do
    invoke "$action"
    preserved
    [ "$RC" -eq 0 ] || { cat "$W/$action.err" >&2; fail "$action returned $RC"; }
    managed_hook
    exercise_hook
    grep -qxF "sha=$PIN" "$APP/harness/sobaya.lock" || fail 'wrong legacy pin'
    [ ! -e "$APP/sobaya.json" ] && [ ! -e "$APP/sobaya.lock" ] || fail 'legacy connection migrated to installed mode'
    if [ "$action" = attach ]; then
      cp -p "$COMMON" "$W/managed-hook.before"
      cp "$APP/harness/sobaya.lock" "$W/legacy-lock.before"
    else
      same "$COMMON" "$W/managed-hook.before"
      if [ "$action" = sync ]; then same "$APP/harness/sobaya.lock" "$W/legacy-lock.before"; fi
    fi
  done
  printf 'attach\nsync\nupdate\n' > "$W/expected-calls"
  same "$W/installer-calls" "$W/expected-calls"
}
refusal_case() {
  fixture "$1"
  mkdir -p "$(dirname "$COMMON")"
  printf '#!/bin/sh\n# Existing user hook\nexit 41\n' > "$W/user-hook"
  chmod +x "$W/user-hook"
  if [ "$1" = symlink ]; then ln -s "$W/user-hook" "$COMMON"; else cp -p "$W/user-hook" "$COMMON"; fi
  cp -p "$W/user-hook" "$W/user-hook.before"
  for action in attach sync update; do
    invoke "$action"
    preserved
    [ "$RC" -ne 0 ] || fail "$action accepted a user-owned shared hook"
    cat "$W/$action.out" "$W/$action.err" > "$W/$action.log"
    grep -Fq "$COMMON" "$W/$action.log" || fail 'refusal did not identify the conflicting shared hook'
    same "$COMMON" "$W/user-hook.before"
    same "$W/user-hook" "$W/user-hook.before"
    [ -x "$COMMON" ] || fail 'user hook lost executable permission'
    if [ "$1" = symlink ]; then
      [ -L "$COMMON" ] && [ "$(readlink "$COMMON")" = "$W/user-hook" ] || fail 'user symlink replaced'
    else [ ! -L "$COMMON" ] || fail 'user hook became a symlink'; fi
    [ ! -e "$APP/harness/sobaya.lock" ] || fail 'failed install wrote a success pin'
  done
}
installer_failure_case() {
  fixture installer_failure
  mkdir "$W/fail-bin"
  cat > "$W/fail-bin/chmod" <<'FAIL_CHMOD'
#!/bin/sh
[ "$1" = 755 ] && [ -f "$2" ] || exit 74
head -n 2 "$2" > "$LEGACY_CASE/failed-candidate-head"
exit 73
FAIL_CHMOD
  chmod +x "$W/fail-bin/chmod"
  export LEGACY_FAIL_CHMOD=1
  find "$APP" "$PARENT/.git/hooks" -name .git -prune -o -print | LC_ALL=C sort > "$W/paths.before"
  for action in attach sync update; do
    rm -f "$W/failed-candidate-head"
    invoke "$action"
    preserved
    [ "$RC" -ne 0 ] || fail "$action swallowed installer failure"
    grep -qxF '# Sobaya app pre-commit v2' "$W/failed-candidate-head" || fail 'real installer did not reach candidate chmod'
    [ ! -e "$COMMON" ] && [ ! -L "$COMMON" ] || fail 'failed candidate was published'
    [ ! -e "$APP/harness/sobaya.lock" ] || fail 'failed install wrote a success pin'
    find "$APP" "$PARENT/.git/hooks" -name .git -prune -o -print | LC_ALL=C sort > "$W/paths.after"
    same "$W/paths.before" "$W/paths.after"
  done
}
export SRC UPSTREAM PIN R
total=0; failed=0
for name in primary absent equal distinct custom symlink installer_failure; do
  [ "$CASE" = all ] || [ "$CASE" = "$name" ] || continue
  total=$((total+1))
  case "$name" in
    primary|absent|equal|distinct) kind=success_case ;;
    installer_failure) kind=installer_failure_case ;;
    *) kind=refusal_case ;;
  esac
  # Run in a separate shell: an if-condition must not disable errexit inside a case.
  if /bin/bash -eu -o pipefail -c "$(declare -f); $kind \"\$1\"" _ "$name"; then
    printf 'ok %s\n' "$name"
  else failed=$((failed+1)); printf 'FAIL %s\n' "$name"; fi
done
[ "$total" -gt 0 ] || { printf 'Unknown case: %s\n' "$CASE" >&2; exit 2; }
printf '%s cases, %s failed\n' "$total" "$failed"
[ "$failed" -eq 0 ]

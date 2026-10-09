#!/bin/bash
# DRAFT: 사람이 승인하기 전에는 구현 기준이나 CI 테스트로 사용하지 않는다.
set -eu
set -o pipefail
unset CLAUDE_PROJECT_DIR GITHUB_HEAD_REF GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE
unset GIT_COMMON_DIR GIT_OBJECT_DIRECTORY GIT_ALTERNATE_OBJECT_DIRECTORIES GIT_CONFIG GIT_CONFIG_COUNT GIT_CONFIG_PARAMETERS
unset COLLAB_RUN_FORCE COLLAB_SKIP_WIP COLLAB_ALLOW_PROTECTED_PUSH COLLAB_ALLOW_MERGED_PUSH
unset DRAFT_SUITE_FAIL DRAFT_LINT_FAIL DRAFT_CUSTOM_FAIL SOBAYA_ROOT SOBAYA_DRAFT_ADAPTER
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 GIT_ALLOW_PROTOCOL=file
SRC=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
ASSETS=${SOBAYA_TEST_ASSETS:?공개 rc.1 자산 디렉터리가 필요합니다}
UPSTREAM=${SOBAYA_TEST_SOURCE:?소바야 소스 체크아웃이 필요합니다}
CASE=${1:-all}
for tool in git jq node tar gzip shasum cmp; do
  command -v "$tool" >/dev/null || { printf 'NOT PROBED: missing %s\n' "$tool"; exit 2; }
done
command -v shlock >/dev/null || command -v flock >/dev/null || { echo 'NOT PROBED: lock tool missing'; exit 2; }
V1=1.0.0-rc.1
V2=1.0.0-rc.2-fixture
PIN=d06384544e81cd373d81e2a940ab336868e04854
DIGEST=d8b4e49a149a0e637c94a6663fb6433b8d0621dc376e31d776babbea247551b8
MANIFEST="$ASSETS/sobaya-$V1.json"
ARCHIVE="$ASSETS/sobaya-$V1.tar.gz"
jq -e --arg c "$PIN" --arg h "$DIGEST" '.runtime.commit==$c and .runtime.sha256==$h and .runtime.version=="1.0.0-rc.1"' "$MANIFEST" >/dev/null
[ "$(shasum -a 256 "$ARCHIVE" | cut -d' ' -f1)" = "$DIGEST" ]
[ "$(shasum -a 256 "$ASSETS/install-runtime.sh" | cut -d' ' -f1)" = 4f2201dfe8afe7041233451bcfd4de24b86a9e3ddd5558f5e525bba9d7fb2ccf ]
[ "$(shasum -a 256 "$UPSTREAM/scripts/package-release.sh" | cut -d' ' -f1)" = "$(git -C "$UPSTREAM" show "$PIN:scripts/package-release.sh" | shasum -a 256 | cut -d' ' -f1)" ]
R=$(mktemp -d "${TMPDIR:-/tmp}/poem-installed-draft.XXXXXX")
R=$(cd "$R" && pwd -P)
mkdir "$R/git-template"
export GIT_TEMPLATE_DIR="$R/git-template"
LOCK_PID=
cleanup() {
  if [ -n "$LOCK_PID" ]; then kill "$LOCK_PID" 2>/dev/null || :; wait "$LOCK_PID" 2>/dev/null || :; fi
  if [ "${SOBAYA_KEEP_DRAFT_EVIDENCE:-0}" = 1 ]; then printf 'EVIDENCE: %s\n' "$R"; else rm -rf "$R"; fi
}
trap cleanup EXIT
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
same() { cmp -s "$1" "$2" || fail "changed: $1"; }
has() { grep -Fq -- "$2" "$1" || fail "missing <$2> in $1"; }
invoke() { if "$@" > "$R/out" 2> "$R/err"; then RC=0; else RC=$?; fi; }
okay() { [ "$RC" -eq 0 ] || { cat "$R/err" >&2; fail "exit $RC"; }; }
rejected() { [ "$RC" -ne 0 ] || fail 'expected refusal'; has "$R/err" "$1"; }
mkdir -p "$R/sentinels"
cat > "$R/sentinels/curl" <<'SENTINEL'
#!/bin/sh
printf '%s\n' "$0 $*" >> "$DRAFT_NETWORK_LOG"
exit 93
SENTINEL
cp "$R/sentinels/curl" "$R/sentinels/codex"
cat > "$R/sentinels/gh" <<'GH'
#!/bin/sh
# 협업 도구의 선택적인 GitHub 조회만 오프라인으로 대체한다.
exit 1
GH
chmod +x "$R/sentinels/"*
export DRAFT_NETWORK_LOG="$R/network" PATH="$R/sentinels:$PATH"
mkdir -p "$R/candidate-source" "$R/candidate-output"
tar -xzf "$ARCHIVE" -C "$R/candidate-source" --strip-components=1
git -C "$R/candidate-source" init -q
git -C "$R/candidate-source" config user.name Fixture
git -C "$R/candidate-source" config user.email fixture@example.invalid
git -C "$R/candidate-source" add -A
git -C "$R/candidate-source" -c core.hooksPath=/dev/null commit -qm fixture-runtime
CANDIDATE_SHA=$(git -C "$R/candidate-source" rev-parse HEAD)
git -C "$R/candidate-source" tag "v$V2"
/bin/bash "$UPSTREAM/scripts/package-release.sh" --source "$R/candidate-source" --version "$V2" --commit "$CANDIDATE_SHA" --output "$R/candidate-output/release" > "$R/package.json"
CANDIDATE_MANIFEST="$R/candidate-output/release/sobaya-$V2.json"
CANDIDATE_ARCHIVE="$R/candidate-output/release/sobaya-$V2.tar.gz"
serial=0
fixture() {
  serial=$((serial+1))
  W="$R/case-$serial"; APP="$W/app's path"; STORE="$W/store with spaces"
  mkdir -p "$APP" "$W/remote.git"
  cp -R "$SRC/harness" "$SRC/scripts" "$SRC/.githooks" "$SRC/.claude" "$SRC/.codex" "$SRC/collab" "$SRC/.gitignore" "$APP/"
  rm -rf "$APP/.claude/cache" "$APP/collab/active" "$APP/collab/journal"
  mkdir -p "$APP/.claude/cache" "$APP/collab/active/feat--runtime" "$APP/collab/journal" "$APP/src"
  cat > "$APP/AGENTS.md" <<'CONTRACT'
# Fixture application
- Test: `node --test suite.test.cjs`
- Lint: `node lint.cjs`
CONTRACT
  printf '# Fixture goal\nPreserve the existing collaboration contract.\n' > "$APP/spec.md"
  printf '# Fixture plan\nNo real application approval is granted.\n' > "$APP/failed-test.md"
  printf 'module.exports = 42;\n' > "$APP/src/value.cjs"
  cat > "$APP/suite.test.cjs" <<'SUITE'
// file: suite.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
test('baselineValue', () => {
  const pin = JSON.parse(fs.readFileSync('sobaya.json', 'utf8'));
  fs.appendFileSync(process.env.DRAFT_EVENTS, `suite:${pin.runtime.version}\n`);
  assert.equal(require('./src/value.cjs'), 42);
  assert.notEqual(process.env.DRAFT_SUITE_FAIL, '1');
});
SUITE
  cat > "$APP/lint.cjs" <<'LINT'
require('node:fs').appendFileSync(process.env.DRAFT_EVENTS, 'lint\n');
process.exit(process.env.DRAFT_LINT_FAIL === '1' ? 1 : 0);
LINT
  printf -- '---\nbranch: feat/runtime\nowner: fixture\nstarted: 2026-10-06\nstatus: active\ngoal: fixture\n---\n' > "$APP/collab/active/feat--runtime/claim.md"
  git -C "$W/remote.git" init -q --bare
  git -C "$APP" init -q -b main
  mkdir -p "$APP/.git/hooks"
  git -C "$APP" config user.name Fixture
  git -C "$APP" config user.email fixture@example.invalid
  git -C "$APP" config collab.me fixture
  git -C "$APP" config collab.onboarded true
  git -C "$APP" config extensions.worktreeConfig true
  git -C "$APP" config core.hooksPath .githooks
  git -C "$APP" remote add origin "$W/remote.git"
  fixture_commit
  git -C "$APP" push -q origin main
  git -C "$APP" switch -qc feat/runtime
  META=$(git -C "$APP" rev-parse --absolute-git-dir)/sobaya
  export DRAFT_EVENTS="$W/events"
  : > "$DRAFT_EVENTS"
  invoke /bin/bash "$ASSETS/install-runtime.sh" --root "$APP" --install-root "$STORE" --version "$V1" --manifest "$MANIFEST" --archive "$ARCHIVE"
  okay
}
fixture_commit() {
  git -C "$APP" add -A
  if ! git -C "$APP" diff --cached --quiet; then git -C "$APP" -c core.hooksPath=/dev/null commit -qm fixture; fi
}
adapter() {
  local script="$APP/harness/sobaya-installed.sh"
  [ -f "$script" ] || { echo 'NOT PROBED: harness/sobaya-installed.sh is absent' >&2; exit 2; }
  (cd "$APP"; invoke /bin/sh "$script" "$@"; printf '%s\n' "$RC" > "$R/rc")
  RC=$(cat "$R/rc")
}
attach() {
  adapter attach --install-root "$STORE" --version "$V1"
  okay
  [ -f "$META/connection.json" ] && [ -f "$APP/sobaya.json" ] && [ -f "$APP/sobaya.lock" ] || fail 'attach returned success without a connection'
}

snapshot_path() {
  local path=$1
  printf 'path %s\n' "$path"
  if [ -L "$path" ]; then printf 'link %s\n' "$(readlink "$path")"
  elif [ -f "$path" ]; then shasum -a 256 "$path"; [ ! -x "$path" ] || echo executable
  elif [ -d "$path" ]; then
    echo directory
    find "$path" -mindepth 1 -print | LC_ALL=C sort | while IFS= read -r child; do
      [ -d "$child" ] && [ ! -L "$child" ] && { printf 'directory %s\n' "$child"; continue; }
      snapshot_path "$child"
    done
  else echo absent; fi
}
connection_snapshot() {
  local root meta file
  for root in "$APP" "$TARGET"; do
    meta=$(git -C "$root" rev-parse --absolute-git-dir)
    for file in AGENTS.md spec.md failed-test.md sobaya.json sobaya.lock harness/sobaya.lock .githooks; do snapshot_path "$root/$file"; done
    for file in config.worktree sobaya; do snapshot_path "$meta/$file"; done
    git -C "$root" rev-parse HEAD
    git -C "$root" ls-files --stage
    find "$root" -name .git -prune -o -path "$root/.claude/cache" -prune -o -print | LC_ALL=C sort
  done
  snapshot_path "$COMMON/config"
  snapshot_path "$COMMON/hooks"
  git -C "$SOB" rev-parse HEAD
  for file in .git/config .git/FETCH_HEAD .git/info/exclude .claude CLAUDE.md; do snapshot_path "$SOB/$file"; done
}
installed_check() {
  adapter check --install-root "$STORE"
  okay
  jq -e '.connected==true' "$R/out" >/dev/null || fail 'installed connection lost'
}
exercise_installed_hook() {
  printf "module.exports = 43;\n" > "$APP/src/value.cjs"
  git -C "$APP" add src/value.cjs
  : > "$DRAFT_EVENTS"
  invoke /bin/sh -c 'cd "$1"; exec "$2"' hook "$APP" "$META/hooks/pre-commit"
  okay
  printf 'lint\n' > "$W/expected-lint"
  same "$DRAFT_EVENTS" "$W/expected-lint"
  local claim="$APP/collab/active/$(git -C "$APP" branch --show-current | sed 's#/#--#g')/claim.md"
  mv "$claim" "$W/claim.saved"
  : > "$DRAFT_EVENTS"
  invoke /bin/sh -c 'cd "$1"; exec "$2"' hook "$APP" "$META/hooks/pre-commit"
  [ "$RC" -ne 0 ] && [ ! -s "$DRAFT_EVENTS" ] || fail 'collaboration rejection lost'
  mv "$W/claim.saved" "$claim"
  git -C "$APP" reset -q HEAD -- src/value.cjs
  git -C "$APP" checkout -- src/value.cjs
}
prepare_source() {
  SOB="$W/sobaya source"
  git clone -q --no-hardlinks --no-checkout "$UPSTREAM" "$SOB"
  git -C "$SOB" checkout -qb fixture-pull "$PIN"
  git clone -q --bare "$SOB" "$W/source-origin.git"
  git -C "$SOB" remote set-url origin "$W/source-origin.git"
  git -C "$SOB" fetch -q origin fixture-pull
  git -C "$SOB" branch --set-upstream-to=origin/fixture-pull >/dev/null
  git clone -q "$W/source-origin.git" "$W/source-peer"
  git -C "$W/source-peer" -c user.name=Fixture -c user.email=fixture@example.invalid -c core.hooksPath=/dev/null commit -q --allow-empty -m fixture-source-update
  git -C "$W/source-peer" push -q origin fixture-pull
  [ "$(git -C "$SOB" rev-parse HEAD)" = "$PIN" ] || fail 'source fixture started at wrong commit'
}
mixed_refusal() {
  local topology=$1 action=$2 primary sibling
  fixture
  primary=$APP
  if [ "$topology" != same ]; then
    invoke env CLAUDE_PROJECT_DIR="$APP" /bin/sh "$APP/scripts/collab.sh" worktree feat/sibling
    okay
    sibling="$W/app's path-feat--sibling"
    mkdir -p "$sibling/collab/active/feat--sibling"
    sed 's#branch: feat/runtime#branch: feat/sibling#' "$APP/collab/active/feat--runtime/claim.md" > "$sibling/collab/active/feat--sibling/claim.md"
  fi
  case "$topology" in
    same) TARGET=$APP ;;
    installed_primary) TARGET=$sibling ;;
    installed_linked) TARGET=$primary; APP=$sibling; META=$(git -C "$APP" rev-parse --absolute-git-dir)/sobaya ;;
  esac
  attach; fixture_commit
  jq -n --arg head "$(git -C "$APP" rev-parse HEAD)" '{version:1,baseline:$head,calls:7,active:null,review:{head:$head},fixture:true}' > "$META/state.json"
  COMMON=$(cd "$APP" && cd "$(git rev-parse --git-common-dir)" && pwd -P)
  if [ "$topology" != same ]; then
    [ ! -e "$TARGET/sobaya.json" ] && [ ! -e "$TARGET/sobaya.lock" ] || fail 'legacy target unexpectedly has pins'
    [ ! -e "$(git -C "$TARGET" rev-parse --absolute-git-dir)/sobaya/connection.json" ] || fail 'legacy target unexpectedly connected'
  fi
  [ ! -e "$COMMON/hooks/pre-commit" ] || fail 'shared hook would mask mixed-mode defect'
  prepare_source
  installed_check; exercise_installed_hook
  connection_snapshot > "$W/before"
  invoke /bin/sh -c 'cd "$1"; exec sh harness/attach-sobaya.sh "$2" --sobaya "$3" --test "node --test changed.test.cjs"' legacy "$TARGET" "$action" "$SOB"
  cp "$R/out" "$W/legacy.out"; cp "$R/err" "$W/legacy.err"
  printf '%s\n' "$RC" > "$W/legacy.rc"
  connection_snapshot > "$W/after"
  [ "$RC" -ne 0 ] || fail "$topology/$action accepted installed/legacy mixing"
  cat "$W/legacy.out" "$W/legacy.err" > "$W/legacy.log"
  has "$W/legacy.log" "$APP"
  has "$W/legacy.log" '설치형'
  same "$W/before" "$W/after"
  installed_check; exercise_installed_hook
  [ ! -e "$DRAFT_NETWORK_LOG" ] || fail 'unexpected network/provider invocation'
}
legacy_state_control() {
  fixture; TARGET=$APP
  prepare_source
  mkdir -p "$META"
  printf '{"active":null,"fixture":true}\n' > "$META/state.json"
  cp "$META/state.json" "$W/state.before"
  for action in attach sync update; do
    invoke /bin/sh -c 'cd "$1"; exec sh harness/attach-sobaya.sh "$2" --sobaya "$3"' legacy "$APP" "$action" "$SOB"
    okay
    same "$META/state.json" "$W/state.before"
    [ ! -e "$APP/sobaya.json" ] && [ ! -e "$APP/sobaya.lock" ] && [ ! -e "$META/connection.json" ] || fail 'legacy state was migrated'
  done
  [ ! -e "$DRAFT_NETWORK_LOG" ] || fail 'unexpected network/provider invocation'
}
pin_sync_guidance() {
  fixture; attach; fixture_commit
  git -C "$APP" branch -f main HEAD
  git -C "$APP" -c core.hooksPath=/dev/null push -q origin main
  printf 'feature\n' > "$APP/feature.txt"; fixture_commit
  feature_head=$(git -C "$APP" rev-parse HEAD)
  git clone -q -b main "$W/remote.git" "$W/peer"
  jq --arg version "$V2" '.runtime.version=$version' "$APP/sobaya.json" > "$W/peer/sobaya.json"
  jq --argjson runtime "$(jq .runtime "$CANDIDATE_MANIFEST")" '.runtime=$runtime' "$APP/sobaya.lock" > "$W/peer/sobaya.lock"
  git -C "$W/peer" add sobaya.json sobaya.lock
  git -C "$W/peer" -c user.name=Peer -c user.email=peer@example.invalid -c core.hooksPath=/dev/null commit -qm fixture-team-pin
  git -C "$W/peer" push -q origin main
  peer_head=$(git -C "$W/peer" rev-parse HEAD)
  cp "$META/connection.json" "$W/connection.before"
  cp "$META/hooks/pre-commit" "$W/forwarder.before"
  invoke env CLAUDE_PROJECT_DIR="$APP" /bin/sh "$APP/scripts/collab.sh" pulse
  okay; cp "$R/out" "$W/pulse.out"
  git -C "$APP" merge-base --is-ancestor "$feature_head" HEAD
  git -C "$APP" merge-base --is-ancestor "$peer_head" HEAD
  [ -z "$(git -C "$APP" status --porcelain)" ] || fail 'pulse left dirty integration'
  same "$APP/sobaya.json" "$W/peer/sobaya.json"; same "$APP/sobaya.lock" "$W/peer/sobaya.lock"
  [ ! -e "$STORE/runtimes/$V2" ] || fail 'pulse auto-installed runtime'
  installed_check
  jq -e --arg version "$V2" '.version==$version' "$R/out" >/dev/null || fail 'check ignored team pin'
  invoke env CLAUDE_PROJECT_DIR="$APP" /bin/sh "$APP/scripts/collab.sh" digest
  okay; cp "$R/out" "$W/digest.out"
  same "$META/connection.json" "$W/connection.before"; same "$META/hooks/pre-commit" "$W/forwarder.before"
  [ ! -e "$META/state.json" ] && [ ! -e "$STORE/runtimes/$V2" ] || fail 'advisory changed approval/runtime'
  invoke /bin/sh -c 'cd "$1"; exec "$2"' hook "$APP" "$META/hooks/pre-commit"
  [ "$RC" -ne 0 ] || fail 'missing runtime unexpectedly ready'
  has "$R/err" 'selected runtime is not installed'
  adapter sync --install-root "$STORE" --archive "$CANDIDATE_ARCHIVE"
  okay
  exercise_installed_hook
  same "$APP/sobaya.json" "$W/peer/sobaya.json"; same "$APP/sobaya.lock" "$W/peer/sobaya.lock"
  same "$META/connection.json" "$W/connection.before"; same "$META/hooks/pre-commit" "$W/forwarder.before"
  [ ! -e "$META/state.json" ] && [ ! -e "$DRAFT_NETWORK_LOG" ] || fail 'sync changed approval or invoked network/provider'
  has "$W/digest.out" "$V2"
  has "$W/digest.out" 'sobaya-installed.sh sync --install-root'
}
export SRC ASSETS UPSTREAM R V1 V2 PIN MANIFEST ARCHIVE CANDIDATE_MANIFEST CANDIDATE_ARCHIVE
names='same/attach same/sync same/update installed_primary/attach installed_primary/sync installed_primary/update installed_linked/attach installed_linked/sync installed_linked/update legacy_state_control pin_sync_guidance'
total=0; failed=0
for name in $names; do
  [ "$CASE" = all ] || [ "$CASE" = "$name" ] || continue
  total=$((total+1))
  # A separate shell preserves errexit inside each case even though this caller uses if.
  if /bin/bash -eu -o pipefail -c "$(declare -f); serial=0; case \"\$1\" in pin_sync_guidance) pin_sync_guidance ;; legacy_state_control) legacy_state_control ;; *) mixed_refusal \"\${1%/*}\" \"\${1#*/}\" ;; esac" _ "$name"; then
    printf 'PASS: %s\n' "$name"
  else failed=$((failed+1)); printf 'FAIL: %s\n' "$name"; fi
  [ ! -d "$R/case-1" ] || mv "$R/case-1" "$R/${name//\//-}"
done
[ "$total" -gt 0 ] || fail "unknown case: $CASE"
printf '%s cases, %s failed\n' "$total" "$failed"
[ "$failed" -eq 0 ]

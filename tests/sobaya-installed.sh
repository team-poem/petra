#!/bin/bash
# DRAFT: 사람이 승인하기 전에는 구현 기준이나 CI 테스트로 사용하지 않는다.
set -eu
set -o pipefail
unset CLAUDE_PROJECT_DIR GITHUB_HEAD_REF GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE
unset GIT_COMMON_DIR GIT_OBJECT_DIRECTORY GIT_ALTERNATE_OBJECT_DIRECTORIES GIT_CONFIG GIT_CONFIG_COUNT GIT_CONFIG_PARAMETERS
unset COLLAB_RUN_FORCE COLLAB_SKIP_WIP COLLAB_ALLOW_PROTECTED_PUSH COLLAB_ALLOW_MERGED_PUSH
unset DRAFT_SUITE_FAIL DRAFT_LINT_FAIL DRAFT_CUSTOM_FAIL
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
fail() { printf 'FAIL: %s\n' "$*" >&2; [ ! -f "$R/err" ] || cat "$R/err" >&2; exit 1; }
same() { cmp -s "$1" "$2" || fail "changed: $1"; }
has() { grep -Fq -- "$2" "$1" || fail "missing <$2> in $1"; }
invoke() { if "$@" > "$R/out" 2> "$R/err"; then RC=0; else RC=$?; fi; }
okay() { [ "$RC" -eq 0 ] || fail "exit $RC"; }
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
  if [ -n "${SOBAYA_DRAFT_ADAPTER:-}" ]; then cp "$SOBAYA_DRAFT_ADAPTER" "$APP/harness/sobaya-installed.sh"; chmod +x "$APP/harness/sobaya-installed.sh"; fi
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
pins() { cp -p "$APP/sobaya.json" "$W/config.before"; cp -p "$APP/sobaya.lock" "$W/lock.before"; }
pins_same() { same "$APP/sobaya.json" "$W/config.before"; same "$APP/sobaya.lock" "$W/lock.before"; }
tracked_snapshot() {
  (cd "$APP"; git ls-files -z | while IFS= read -r -d '' path; do
    case "$path" in sobaya.json|sobaya.lock) continue ;; esac
    if [ -L "$path" ]; then printf 'link %s %s\n' "$path" "$(readlink "$path")";
    else cksum "$path"; [ ! -x "$path" ] || printf 'executable %s\n' "$path"; fi
  done) > "$1"
}
protected_state() {
  mkdir -p "$META"
  jq -n --arg b "$(git -C "$APP" rev-parse HEAD)" '{version:1,baseline:$b,calls:7,active:null,review:{head:$b},fixture:true}' > "$META/state.json"
  cp "$META/state.json" "$W/state.before"
}
busy() { (cd "$APP"; export CLAUDE_PROJECT_DIR="$APP"; . "$APP/harness/hooks/lib.sh"; sobaya_busy); }

attach_preserves_app() {
  fixture
  tracked_snapshot "$W/files.before"
  git -C "$APP" ls-files --stage > "$W/index.before"
  head_before=$(git -C "$APP" rev-parse HEAD)
  attach
  jq -e '.mode=="dependency" and .runtime.version=="1.0.0-rc.1"' "$APP/sobaya.json" >/dev/null || fail 'wrong mode/version'
  jq -e --argjson pin "$(jq .runtime "$MANIFEST")" '.runtime==$pin' "$APP/sobaya.lock" >/dev/null || fail 'wrong release identity'
  [ ! -e "$META/state.json" ] || fail 'attach must not approve'
  adapter check --install-root "$STORE"
  okay
  jq -e '.connected==true' "$R/out" >/dev/null || fail 'connection confused with approval'
  [ ! -e "$APP/CLAUDE.md" ] || fail 'app CLAUDE.md recreated'
  [ ! -e "$APP/harness/sobaya.lock" ] || fail 'legacy lock created'
  [ "$(git -C "$APP" rev-parse HEAD)" = "$head_before" ] || fail 'attach committed'
  if grep -Fq "$STORE" "$APP/sobaya.json" "$APP/sobaya.lock"; then fail 'personal store leaked into shared pins'; fi
  tracked_snapshot "$W/files.after"; same "$W/files.before" "$W/files.after"
  git -C "$APP" ls-files --stage > "$W/index.after"; same "$W/index.before" "$W/index.after"
  git -C "$APP" status --porcelain > "$W/status"
  printf '?? sobaya.json\n?? sobaya.lock\n' > "$W/status.expected"
  same "$W/status" "$W/status.expected"
  pins
  hook_before=$(git -C "$APP" config core.hooksPath)
  attach
  pins_same
  [ "$(git -C "$APP" config core.hooksPath)" = "$hook_before" ] || fail 'repeat attach changed hooks'
  cp "$META/connection.json" "$W/connection.before"
  jq '.store="/wrong-store"' "$W/connection.before" > "$META/connection.json"
  cp "$META/connection.json" "$W/connection.changed"
  adapter check --install-root "$STORE"
  rejected connection
  same "$META/connection.json" "$W/connection.changed"; pins_same
}

attach_rejects_conflicts() {
  for variant in missing-plan legacy-lock legacy-hook worktree-config; do
    fixture
    case "$variant" in
      missing-plan) rm "$APP/spec.md"; reason=spec.md ;;
      legacy-lock) printf 'repo=old\nsha=old\n' > "$APP/harness/sobaya.lock"; reason=legacy ;;
      legacy-hook) printf '#!/bin/sh\n# Sobaya app pre-commit v2\nexit 0\n' > "$APP/.git/hooks/pre-commit"; chmod +x "$APP/.git/hooks/pre-commit"; reason=legacy ;;
      worktree-config) git -C "$APP" config --unset extensions.worktreeConfig; reason=worktreeConfig ;;
    esac
    cp "$APP/.git/config" "$W/git.before"
    if [ -f "$APP/.git/hooks/pre-commit" ]; then cp "$APP/.git/hooks/pre-commit" "$W/hook.before"; fi
    adapter attach --install-root "$STORE" --version "$V1"
    rejected "$reason"
    same "$APP/.git/config" "$W/git.before"
    [ ! -e "$APP/sobaya.json" ] && [ ! -e "$APP/sobaya.lock" ] && [ ! -e "$META/connection.json" ] || fail 'partial connection'
    [ ! -e "$META/state.json" ] || fail 'unexpected approval'
    [ ! -f "$W/hook.before" ] || same "$APP/.git/hooks/pre-commit" "$W/hook.before"
  done
  fixture; attach; pins
  printf 'repo=old\nsha=old\n' > "$APP/harness/sobaya.lock"
  cp "$APP/harness/sobaya.lock" "$W/legacy.before"
  adapter sync --install-root "$STORE" --archive "$ARCHIVE"
  rejected legacy
  pins_same; same "$APP/harness/sobaya.lock" "$W/legacy.before"
  for variant in unknown missing duplicate inside; do
    fixture
    cp "$APP/.git/config" "$W/git.before"
    case "$variant" in
      unknown) adapter attach --install-root "$STORE" --version "$V1" --unknown ;;
      missing) adapter attach --install-root ;;
      duplicate) adapter attach --install-root "$STORE" --install-root "$STORE" --version "$V1" ;;
      inside) adapter attach --install-root "$APP/store" --version "$V1" ;;
    esac
    [ "$RC" -ne 0 ] && [ -s "$R/err" ] || fail 'invalid arguments accepted'
    same "$APP/.git/config" "$W/git.before"
    [ ! -e "$APP/sobaya.json" ] && [ ! -e "$APP/sobaya.lock" ] && [ ! -e "$META/connection.json" ] || fail 'invalid arguments changed connection'
  done
}

sync_restores_exact_pin_without_plans() {
  fixture; attach; pins
  trusted_cli="$STORE/bin/sobaya"
  rm "$APP/spec.md" "$APP/failed-test.md"
  rm -rf "$META"
  git -C "$APP" config --worktree core.hooksPath .githooks
  fixture_commit
  git -C "$APP" switch -qC main
  invoke env CLAUDE_PROJECT_DIR="$APP" /bin/sh "$APP/harness/join.sh" fixture
  okay; has "$R/out" 'sobaya-installed.sh sync'
  [ ! -e "$META/connection.json" ] && [ ! -e "$META/state.json" ] || fail 'join guessed runtime connection'
  fresh_store="$W/fresh store"
  adapter sync --install-root "$fresh_store" --cli "$trusted_cli" --archive "$ARCHIVE"
  okay; pins_same
  [ -x "$fresh_store/bin/sobaya" ] || fail 'runtime not restored'
  same "$fresh_store/runtimes/$V1/manifest.json" "$MANIFEST"
  [ ! -e "$APP/spec.md" ] && [ ! -e "$APP/failed-test.md" ] && [ ! -e "$META/state.json" ] && [ ! -e "$META/connection.json" ] || fail 'sync invented feature inputs/connection'
  [ "$(git -C "$APP" config core.hooksPath)" = .githooks ] || fail 'sync changed hooks'
  cp "$APP/.git/config" "$W/git.before"
  adapter sync --install-root "$fresh_store" --cli "$trusted_cli" --archive "$ARCHIVE"
  okay; pins_same; same "$APP/.git/config" "$W/git.before"
  adapter check --install-root "$fresh_store"
  okay
  jq -e '.mode=="dependency" and .version=="1.0.0-rc.1" and .connected==false' "$R/out" >/dev/null || fail 'incorrect unconnected status'
}

hooks_join_and_status_preserve_connection() {
  fixture
  cat > "$APP/.git/hooks/pre-commit" <<'CUSTOM'
#!/bin/sh
printf 'custom\n' >> "$DRAFT_EVENTS"
[ "${DRAFT_CUSTOM_FAIL:-0}" != 1 ] || exit 19
CUSTOM
  chmod +x "$APP/.git/hooks/pre-commit"
  cp "$APP/.git/hooks/pre-commit" "$W/custom.before"
  attach; fixture_commit; protected_state
  hook_before=$(git -C "$APP" config core.hooksPath)
  invoke env CLAUDE_PROJECT_DIR="$APP" /bin/sh "$APP/harness/join.sh" fixture
  okay
  [ "$(git -C "$APP" config core.hooksPath)" = "$hook_before" ] || fail 'join detached runtime hook'
  same "$META/state.json" "$W/state.before"
  invoke env CLAUDE_PROJECT_DIR="$APP" /bin/sh "$APP/harness/init.sh" Fixture fixture
  okay
  [ "$(git -C "$APP" config core.hooksPath)" = "$hook_before" ] || fail 'repeated init detached runtime hook'
  same "$META/state.json" "$W/state.before"
  invoke env CLAUDE_PROJECT_DIR="$APP" /bin/sh "$APP/scripts/collab.sh" state
  okay; has "$R/out" 'hooks=on'
  invoke env CLAUDE_PROJECT_DIR="$APP" /bin/sh "$APP/scripts/collab.sh" digest
  okay; has "$R/out" "$V1"
  if grep -Fq 'git 훅이 꺼져' "$R/out"; then fail 'false hooks warning'; fi
  adapter check --install-root "$STORE"
  okay
  jq -e '.mode=="dependency" and .version=="1.0.0-rc.1" and .connected==true' "$R/out" >/dev/null || fail 'incorrect connected status'
  printf 'module.exports = 43;\n' > "$APP/src/value.cjs"
  git -C "$APP" add src/value.cjs
  : > "$DRAFT_EVENTS"
  invoke git -C "$APP" commit -qm 'fixture checked hook'
  okay
  [ "$(grep -c '^lint$' "$DRAFT_EVENTS")" -eq 1 ] || fail 'hygiene must run exactly once'
  [ "$(grep -c '^custom$' "$DRAFT_EVENTS")" -eq 1 ] || fail 'custom hook must run exactly once'
  same "$APP/.git/hooks/pre-commit" "$W/custom.before"
  printf 'module.exports = 45;\n' > "$APP/src/value.cjs"
  git -C "$APP" add src/value.cjs
  : > "$DRAFT_EVENTS"
  invoke env DRAFT_CUSTOM_FAIL=1 git -C "$APP" commit -qm 'custom hook must block'
  [ "$RC" -ne 0 ] || fail 'custom hook rejection lost'
  printf 'custom\n' > "$W/expected"
  same "$DRAFT_EVENTS" "$W/expected"
  mv "$APP/collab/active/feat--runtime/claim.md" "$W/claim.saved"
  printf 'module.exports = 44;\n' > "$APP/src/value.cjs"
  git -C "$APP" add src/value.cjs
  : > "$DRAFT_EVENTS"
  invoke git -C "$APP" commit -qm 'must be blocked'
  [ "$RC" -ne 0 ] || fail 'collaboration rejection lost'
  [ ! -s "$DRAFT_EVENTS" ] || fail 'hygiene ran after collaboration rejection'
}

worktree_does_not_detach_sibling() {
  fixture; attach; fixture_commit; protected_state
  git -C "$APP" branch -f main HEAD
  git -C "$APP" -c core.hooksPath=/dev/null push -q origin main
  hook_before=$(git -C "$APP" config core.hooksPath)
  invoke env CLAUDE_PROJECT_DIR="$APP" /bin/sh "$APP/scripts/collab.sh" worktree feat/sibling
  okay
  sibling="$(dirname "$APP")/$(basename "$APP")-feat--sibling"
  [ "$(git -C "$APP" config core.hooksPath)" = "$hook_before" ] || fail 'sibling creation detached first worktree'
  same "$META/state.json" "$W/state.before"
  [ "$(git -C "$sibling" config core.hooksPath)" = .githooks ] || fail 'sibling inherited first forwarding hook'
  sibling_meta=$(git -C "$sibling" rev-parse --absolute-git-dir)/sobaya
  [ ! -e "$sibling_meta/state.json" ] && [ ! -e "$sibling_meta/connection.json" ] || fail 'approval/connection copied'
  old_app=$APP; APP=$sibling
  attach
  APP=$old_app
  jq -e --arg app "$sibling" '.root==$app and .app==$app' "$sibling_meta/connection.json" >/dev/null || fail 'sibling connection points to original'
  [ "$(git -C "$APP" config core.hooksPath)" = "$hook_before" ] || fail 'sibling attach changed original hook'
  same "$META/state.json" "$W/state.before"
}

bump_validates_and_preserves_state() {
  for outcome in success suite-failure active; do
    fixture; attach; fixture_commit; protected_state; pins
    if [ "$outcome" = active ]; then jq '.active={name:"pending"}' "$META/state.json" > "$W/active"; cp "$W/active" "$META/state.json"; cp "$META/state.json" "$W/state.before"; fi
    tracked_snapshot "$W/files.before"
    head_before=$(git -C "$APP" rev-parse HEAD)
    hook_before=$(git -C "$APP" config core.hooksPath)
    : > "$DRAFT_EVENTS"
    export DRAFT_SUITE_FAIL=0
    [ "$outcome" != suite-failure ] || export DRAFT_SUITE_FAIL=1
    adapter bump --install-root "$STORE" --version "$V2" --manifest "$CANDIDATE_MANIFEST" --archive "$CANDIDATE_ARCHIVE"
    unset DRAFT_SUITE_FAIL
    case "$outcome" in
      success)
        okay
        jq -e --arg v "$V2" '.runtime.version==$v' "$APP/sobaya.json" >/dev/null || fail 'candidate pin absent'
        jq -e --argjson p "$(jq .runtime "$CANDIDATE_MANIFEST")" '.runtime==$p' "$APP/sobaya.lock" >/dev/null || fail 'candidate identity absent'
        has "$DRAFT_EVENTS" "suite:$V2"; has "$DRAFT_EVENTS" lint ;;
      suite-failure) rejected validation; pins_same; has "$DRAFT_EVENTS" "suite:$V2" ;;
      active) rejected active; pins_same; [ ! -s "$DRAFT_EVENTS" ] || fail 'active run allowed validation' ;;
    esac
    same "$META/state.json" "$W/state.before"
    [ "$(git -C "$APP" rev-parse HEAD)" = "$head_before" ] || fail 'bump committed'
    [ "$(git -C "$APP" config core.hooksPath)" = "$hook_before" ] || fail 'bump changed hooks'
    tracked_snapshot "$W/files.after"; same "$W/files.before" "$W/files.after"
  done
}

busy_tracks_live_locks() {
  fixture
  mkdir -p "$META"
  jq -n '{active:null}' > "$META/state.json"
  invoke busy; [ "$RC" -ne 0 ] || fail 'idle considered busy'
  jq -n '{active:{name:"pending"}}' > "$META/state.json"
  invoke busy; okay
  jq -n '{active:null}' > "$META/state.json"
  for lock in "$META/lock.shell" "$APP/.git/sobaya-management.lock"; do
    if command -v shlock >/dev/null; then
      sleep 30 & LOCK_PID=$!
      shlock -p "$LOCK_PID" -f "$lock" || fail 'cannot acquire fixture shlock'
      invoke busy; okay
      kill "$LOCK_PID"; wait "$LOCK_PID" 2>/dev/null || :; LOCK_PID=
      invoke busy; [ "$RC" -ne 0 ] || fail 'dead PID lock considered busy'
      rm -f "$lock"
    else
      mkfifo "$W/release-lock"
      (exec 9> "$lock"; flock -n 9; touch "$W/ready"; IFS= read -r release < "$W/release-lock") & LOCK_PID=$!
      for attempt in {1..100}; do [ -f "$W/ready" ] && break; sleep 0.05; done
      [ -f "$W/ready" ] || fail 'fixture flock not acquired'
      invoke busy; okay
      printf 'release\n' > "$W/release-lock"
      wait "$LOCK_PID"; LOCK_PID=
      rm -f "$W/ready" "$W/release-lock"
      invoke busy; [ "$RC" -ne 0 ] || fail 'unlocked persistent flock file considered busy'
      rm -f "$lock"
    fi
  done
}

run_keeps_collaboration_boundary() {
  fixture; attach; fixture_commit
  printf '{"changed":true}\n' > "$APP/package.json"
  git -C "$APP" add package.json
  tree=$(git -C "$APP" write-tree)
  sha=$(printf fixture-wip | git -C "$APP" commit-tree "$tree" -p HEAD)
  git -C "$APP" reset -q HEAD package.json
  rm "$APP/package.json"
  git -C "$APP" push -q origin "$sha:refs/wip/other/feat--other"
  invoke env CLAUDE_PROJECT_DIR="$APP" /bin/sh "$APP/scripts/collab.sh" run -- /bin/sh -c 'touch "$1"' worker "$W/ran"
  [ "$RC" -ne 0 ] && [ ! -e "$W/ran" ] || fail 'worker ran despite hotspot conflict'
  has "$R/err" package.json
  git -C "$APP" push -q origin --delete refs/wip/other/feat--other
  git -C "$APP" update-ref -d refs/wip/other/feat--other
  invoke env CLAUDE_PROJECT_DIR="$APP" /bin/sh "$APP/scripts/collab.sh" run -- /bin/sh -c 'touch "$1"; exit 17' worker "$W/ran"
  [ "$RC" -eq 17 ] && [ -e "$W/ran" ] || fail 'worker result not forwarded'
}

published_runtime_completes_fixture_cycle() {
  fixture
  printf 'module.exports = (a, b) => 0;\n' > "$APP/src/add.cjs"
  cat > "$APP/failed-test.md" <<'PLAN'
# Fixture plan
## Add
```js
// file: suite.test.cjs
```
- [ ] installedAddition — sums the two inputs
```js
test('installedAddition', () => assert.equal(require('./src/add.cjs')(1, 2), 3));
```
PLAN
  cat > "$W/worker.sh" <<'WORKER'
#!/bin/bash
set -eu
cat >> "$DRAFT_PROMPTS"
if [ "$SOBAYA_ROLE" = implement ]; then
  printf 'module.exports = (a, b) => a + b;\n' > "$SOBAYA_APP/src/add.cjs"
fi
printf '%s\n' '{"status":"done","summary":"Deterministic fixture worker or review","reason":""}'
WORKER
  export DRAFT_PROMPTS="$W/prompts"
  jq -n --arg worker "$W/worker.sh" '{version:1,mode:"selected",default_worker:"fixture",review_worker:"fixture",max_calls:3,timeout_seconds:30,workers:{fixture:{adapter:"command",command:["/bin/bash",$worker],model:"fixture",guidance:"guided"}},escalation:[]}' > "$W/policy.json"
  if [ "$CASE" = --cycle-support ]; then
    invoke "$STORE/bin/sobaya" init --root "$APP" --install-root "$STORE" --mode dependency --version "$V1"
    okay
  else attach; fi
  fixture_commit
  baseline=$(git -C "$APP" rev-parse HEAD)
  invoke "$STORE/bin/sobaya" approve --root "$APP" --install-root "$STORE" --app "$APP"
  okay
  invoke env CLAUDE_PROJECT_DIR="$APP" /bin/sh "$APP/scripts/collab.sh" run -- "$STORE/bin/sobaya" loop --root "$APP" --install-root "$STORE" --app "$APP" --policy "$W/policy.json"
  okay; has "$R/out" RED; has "$R/out" PASS
  invoke "$STORE/bin/sobaya" gate --root "$APP" --install-root "$STORE" --app "$APP"
  okay
  head=$(git -C "$APP" rev-parse HEAD)
  jq -e --arg b "$baseline" --arg h "$head" '.baseline==$b and .calls==2 and .active==null and .status=="complete" and .review.head==$h' "$META/state.json" >/dev/null || fail 'cycle state/review continuity lost'
  has "$APP/failed-test.md" '[x] installedAddition'
  has "$DRAFT_PROMPTS" "$STORE/runtimes/$V1/runtime/tdd-set/AGENTS.md"
  has "$DRAFT_PROMPTS" "$APP/AGENTS.md"
  [ -z "$(git -C "$APP" status --porcelain)" ] || fail 'cycle left dirty app'
}

support_check() {
  fixture
  invoke "$STORE/bin/sobaya" init --root "$APP" --install-root "$STORE" --mode dependency --version "$V1"
  okay; fixture_commit; protected_state
  invoke "$STORE/bin/sobaya" bump --root "$APP" --install-root "$STORE" --version "$V2" --manifest "$CANDIDATE_MANIFEST" --archive "$CANDIDATE_ARCHIVE"
  okay; has "$DRAFT_EVENTS" "suite:$V2"
  same "$META/state.json" "$W/state.before"
}

CASES='attach_preserves_app attach_rejects_conflicts sync_restores_exact_pin_without_plans hooks_join_and_status_preserve_connection worktree_does_not_detach_sibling bump_validates_and_preserves_state busy_tracks_live_locks run_keeps_collaboration_boundary published_runtime_completes_fixture_cycle'
case "$CASE" in
  --support-check) support_check; echo 'SUPPORT CHECK PASSED (not adapter acceptance)' ;;
  --cycle-support) published_runtime_completes_fixture_cycle; echo 'CYCLE SUPPORT PASSED (not adapter acceptance)' ;;
  --list) printf '%s\n' $CASES ;;
  *)
    found=0
    for name in $CASES; do
      [ "$CASE" = all ] || [ "$CASE" = "$name" ] || continue
      found=1
      "$name"
      printf 'PASS: %s\n' "$name"
    done
    [ "$found" -eq 1 ] || fail "unknown case: $CASE" ;;
esac
[ ! -e "$DRAFT_NETWORK_LOG" ] || fail 'unexpected network/provider invocation'

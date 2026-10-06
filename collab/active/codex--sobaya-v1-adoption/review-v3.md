검토용 — 설명 주석은 실행 코드에 포함되지 않음

**이 교체안은 앞선 v2 한 줄 보완안을 대체한다.** 기존 승인 원본과 실행 테스트는 보존했다. 바뀐 것은 임시 Git 훅 디렉터리 생성 한 줄과, 워크트리 테스트 준비용 로컬 main push의 훅 우회 한 곳이다. 아홉 테스트의 제품 동작 단언은 그대로다.

빈 `GIT_TEMPLATE_DIR` 때문에 구형·사용자 훅 파일을 쓸 디렉터리가 없었다. 또한 공개 런타임 연결 뒤 fixture main을 준비하는 push가 실제 보호 훅에 막혔다. 이 임시 로컬 원격의 준비 push에만 `-c core.hooksPath=/dev/null`을 지정한다. 실제 커밋·워커·워크트리 검증의 훅은 켜둔다. 준비 실패를 제품 RED나 GREEN으로 세지 않는다.

교체 입력: `proposed-installed-tests-v3.sh`, 471줄, SHA-256 `f264e7533dc994ca30042fcf062963f6157572a7e51fd3bc446b07a98292e62b`. 아래 설명 주석을 제거하면 이 교체본과 바이트가 같다. 아래의 원문 스냅샷 정보는 이전 승인 기준의 이력이다.

대상은 Poem v1 도입 초안의 공통 준비 코드·도우미와 아홉 테스트 함수 전체입니다. 원문 파일은 `collab/active/codex--sobaya-v1-adoption/draft-installed-tests.sh`이며, 아래는 실행용 파일이 아닌 검토용 사본입니다. 기존 소스 주석·공백·순서를 유지하고 `# ┎` 또는 `// ┎` 설명 줄만 추가했습니다.

승인 후 실행 원문의 목적지는 `tests/sobaya-installed.sh`입니다. [도입 계획](plan.md)과 [초안 검증 기록](validation.md)을 함께 확인합니다.

원문 스냅샷: 470줄, SHA-256 `daf61fe2d54c8f82558e6de342053f34ce0a533878c8859663cc0eb24e627871`. 공통 도우미의 검증 범위는 정의부에서 한 번 설명하고, 각 사례에서는 구체적인 기대 결과를 설명합니다. 이 문서의 생성이나 fixture의 approve 호출은 실사용 앱 또는 이 초안에 대한 인간 승인을 의미하지 않습니다.

Git·Node·공개 rc.1 설치 코드는 실제로 실행하는 구조입니다. 설치 입력은 미리 확보한 로컬 공개 자산이며, bump 후보는 rc.1 내용을 다시 패키징한 로컬 fixture입니다. 모델 대신 결정적 셸 워커를 사용하므로 모델 리뷰 품질을 입증하지 않습니다. curl·codex는 기록 후 실패하는 감시 파일, gh는 선택적 조회를 실패시키는 대체 파일이며 일반적인 네트워크 격리를 증명하지 않습니다. `--support-check`와 `--cycle-support`는 어댑터를 우회하는 지원 확인입니다. shlock이 우선 선택되는 macOS의 결과만으로 Linux flock 실행을 입증하지 않습니다.

````bash
# ┎ Bash로 실행되는 테스트 초안이며, 아래 설명 줄은 실행 원문에 포함되지 않습니다.
#!/bin/bash
# ┎ 이 파일 전체는 아직 사람의 승인을 기다리는 초안이라는 원래 경고를 유지합니다.
# DRAFT: 사람이 승인하기 전에는 구현 기준이나 CI 테스트로 사용하지 않는다.
# ┎ 정의되지 않은 변수나 처리하지 않은 명령 실패가 있으면 테스트를 중단합니다.
set -eu
# ┎ 파이프의 앞 단계가 실패해도 검증이 성공한 것처럼 넘어가지 않게 합니다.
set -o pipefail
# ┎ 부모 세션의 앱 위치·브랜치·Git 작업 경로가 격리된 fixture를 바꾸지 않게 제거합니다.
unset CLAUDE_PROJECT_DIR GITHUB_HEAD_REF GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE
# ┎ 공통 Git 디렉터리·객체 저장소·설정 파일 경로(GIT_CONFIG)·주입된 Git 설정도 상속하지 않습니다.
unset GIT_COMMON_DIR GIT_OBJECT_DIRECTORY GIT_ALTERNATE_OBJECT_DIRECTORIES GIT_CONFIG GIT_CONFIG_COUNT GIT_CONFIG_PARAMETERS
# ┎ 협업 검사나 보호 브랜치 검사를 우회하는 환경 변수를 제거한 상태에서 시작합니다.
unset COLLAB_RUN_FORCE COLLAB_SKIP_WIP COLLAB_ALLOW_PROTECTED_PUSH COLLAB_ALLOW_MERGED_PUSH
# ┎ 앞선 실행의 의도적 실패 스위치가 이번 사례에 섞이지 않게 초기화합니다.
unset DRAFT_SUITE_FAIL DRAFT_LINT_FAIL DRAFT_CUSTOM_FAIL
# ┎ 사용자·시스템 Git 설정을 배제하고 Git 전송은 로컬 file 프로토콜만 허용합니다.
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 GIT_ALLOW_PROTOCOL=file
# ┎ 이 초안이 속한 소비자 저장소를 찾아 실제 Poem 협업 파일을 fixture에 복사할 출발점으로 사용합니다.
SRC=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
# ┎ 미리 확보한 공개 rc.1 자산 디렉터리를 필수로 받으며, 없으면 검증을 시작하지 않습니다.
ASSETS=${SOBAYA_TEST_ASSETS:?공개 rc.1 자산 디렉터리가 필요합니다}
# ┎ 로컬 후보 패키지를 만들 때 사용할 Sobaya 소스 체크아웃 경로를 필수로 받습니다.
UPSTREAM=${SOBAYA_TEST_SOURCE:?소바야 소스 체크아웃이 필요합니다}
# ┎ 지정한 사례 하나 또는 기본값 all에 해당하는 사례들을 실행하도록 선택합니다.
CASE=${1:-all}
# ┎ Git·jq·실제 Node 테스트 실행기와 압축·해시·비교 도구의 가용성을 먼저 확인합니다.
for tool in git jq node tar gzip shasum cmp; do
  # ┎ 필수 도구가 없으면 제품 실패로 간주하지 않고 NOT PROBED와 종료 코드 2로 구분합니다.
  command -v "$tool" >/dev/null || { printf 'NOT PROBED: missing %s\n' "$tool"; exit 2; }
done
# ┎ 실제 잠금 도구 둘 중 하나가 있어야 진행합니다. 한 호스트에서 두 잠금 방식을 모두 검증한다는 뜻은 아닙니다.
command -v shlock >/dev/null || command -v flock >/dev/null || { echo 'NOT PROBED: lock tool missing'; exit 2; }
# ┎ 공개 자산의 기준 버전을 rc.1로 고정합니다.
V1=1.0.0-rc.1
# ┎ bump용 다음 버전 이름은 로컬 fixture 전용이며, 실제 rc.2가 공개되었다는 뜻이 아닙니다.
V2=1.0.0-rc.2-fixture
# ┎ 기준 공개 런타임의 기대 Git 커밋을 고정합니다.
PIN=d06384544e81cd373d81e2a940ab336868e04854
# ┎ 기준 공개 압축 파일의 기대 SHA-256을 고정합니다.
DIGEST=d8b4e49a149a0e637c94a6663fb6433b8d0621dc376e31d776babbea247551b8
# ┎ 검증할 공개 버전 매니페스트의 로컬 파일 위치를 정합니다.
MANIFEST="$ASSETS/sobaya-$V1.json"
# ┎ 검증할 공개 버전 압축 파일의 로컬 파일 위치를 정합니다.
ARCHIVE="$ASSETS/sobaya-$V1.tar.gz"
# ┎ 매니페스트에 적힌 커밋·압축 해시·버전이 미리 고정한 rc.1 값과 모두 일치해야 합니다.
jq -e --arg c "$PIN" --arg h "$DIGEST" '.runtime.commit==$c and .runtime.sha256==$h and .runtime.version=="1.0.0-rc.1"' "$MANIFEST" >/dev/null
# ┎ 실제 압축 파일의 SHA-256도 기대값과 같아야 하므로 매니페스트 문자열만 믿지 않습니다.
[ "$(shasum -a 256 "$ARCHIVE" | cut -d' ' -f1)" = "$DIGEST" ]
# ┎ 설치 스크립트의 실제 바이트도 고정 해시와 일치해야 합니다.
[ "$(shasum -a 256 "$ASSETS/install-runtime.sh" | cut -d' ' -f1)" = 4f2201dfe8afe7041233451bcfd4de24b86a9e3ddd5558f5e525bba9d7fb2ccf ]
# ┎ 후보 패키징 스크립트가 고정된 rc.1 커밋의 파일과 해시가 같은지 확인합니다. 상위 체크아웃 전체의 동일성을 검사하는 줄은 아닙니다.
[ "$(shasum -a 256 "$UPSTREAM/scripts/package-release.sh" | cut -d' ' -f1)" = "$(git -C "$UPSTREAM" show "$PIN:scripts/package-release.sh" | shasum -a 256 | cut -d' ' -f1)" ]
# ┎ 소비자와 런타임 저장소를 만들 별도의 임시 디렉터리를 생성합니다.
R=$(mktemp -d "${TMPDIR:-/tmp}/poem-installed-draft.XXXXXX")
# ┎ 임시 경로의 심볼릭 링크 표현을 실제 절대 경로로 정규화합니다.
R=$(cd "$R" && pwd -P)
# ┎ 환경에 남아 있는 Git 템플릿 훅이 새 저장소에 들어오지 않도록 빈 템플릿을 만듭니다.
mkdir "$R/git-template"
# ┎ 이후 새로 만드는 Git 저장소들이 그 빈 템플릿을 사용하게 합니다.
export GIT_TEMPLATE_DIR="$R/git-template"
# ┎ 잠금 검증에서 띄운 프로세스를 종료 시 회수하기 위한 PID 보관값을 초기화합니다.
LOCK_PID=
# ┎ 성공·실패 뒤에 잠금 프로세스와 임시 자료를 정리하는 공통 함수를 정의합니다.
cleanup() {
  # ┎ 잠금 보유 프로세스가 남아 있으면 종료하고 기다리며, 이미 끝난 경우는 정리 실패로 보지 않습니다.
  if [ -n "$LOCK_PID" ]; then kill "$LOCK_PID" 2>/dev/null || :; wait "$LOCK_PID" 2>/dev/null || :; fi
  # ┎ 증거 보존 옵션이 1이면 임시 위치를 출력해 남기고, 그렇지 않으면 이번 fixture 자료를 삭제합니다.
  if [ "${SOBAYA_KEEP_DRAFT_EVIDENCE:-0}" = 1 ]; then printf 'EVIDENCE: %s\n' "$R"; else rm -rf "$R"; fi
}
# ┎ 어느 종료 경로에서도 공통 정리를 수행하도록 등록합니다.
trap cleanup EXIT
# ┎ 검증 실패 이유와 마지막 명령의 표준 오류를 함께 보여 주고 종료 코드 1로 끝내는 공통 도우미입니다.
fail() { printf 'FAIL: %s\n' "$*" >&2; [ ! -f "$R/err" ] || cat "$R/err" >&2; exit 1; }
# ┎ 두 파일의 바이트가 정확히 같아야 통과하는 보존 검증 도우미입니다. 권한이나 시간까지 비교하지는 않습니다.
same() { cmp -s "$1" "$2" || fail "changed: $1"; }
# ┎ 파일에 기대하는 리터럴 문자열이 하나라도 포함되어 있는지 검사하는 도우미입니다.
has() { grep -Fq -- "$2" "$1" || fail "missing <$2> in $1"; }
# ┎ 명령의 출력·오류·종료 코드를 기록하여, 예상되는 거부도 스크립트를 즉시 중단하지 않고 검증할 수 있게 합니다.
invoke() { if "$@" > "$R/out" 2> "$R/err"; then RC=0; else RC=$?; fi; }
# ┎ 직전에 기록한 명령의 종료 코드가 0이어야 통과합니다.
okay() { [ "$RC" -eq 0 ] || fail "exit $RC"; }
# ┎ 직전 명령이 실패했고 표준 오류에 기대 문자열이 있어야 거부 검증이 통과합니다.
rejected() { [ "$RC" -ne 0 ] || fail 'expected refusal'; has "$R/err" "$1"; }
# ┎ 네트워크·제공자 호출을 가로챌 실행 파일들을 둘 임시 디렉터리를 만듭니다.
mkdir -p "$R/sentinels"
# ┎ PATH에서 먼저 잡히는 curl 감시 스크립트를 만듭니다. HTTP 요청을 실행하지 않습니다.
cat > "$R/sentinels/curl" <<'SENTINEL'
# ┎ 이 감시 파일은 POSIX 셸로 실행됩니다.
#!/bin/sh
# ┎ curl 또는 복사된 codex가 호출되면 명령과 인자를 증거 파일에 기록합니다.
printf '%s\n' "$0 $*" >> "$DRAFT_NETWORK_LOG"
# ┎ 감시 대상 호출은 항상 93으로 실패시켜 실제 네트워크나 모델 실행으로 이어지지 않게 합니다.
exit 93
SENTINEL
# ┎ 같은 감시 동작을 codex에도 적용하여 실제 제공자 실행 시도를 검출합니다.
cp "$R/sentinels/curl" "$R/sentinels/codex"
# ┎ 선택적인 GitHub 조회를 오프라인 실패로 대체할 gh 스크립트를 따로 만듭니다.
cat > "$R/sentinels/gh" <<'GH'
# ┎ 선택적 GitHub 조회를 대체하는 파일도 POSIX 셸로 실행됩니다.
#!/bin/sh
# ┎ 원래 주석처럼 gh 대체물은 협업 도구의 선택적 조회가 성공하지 않도록 하는 용도입니다.
# 협업 도구의 선택적인 GitHub 조회만 오프라인으로 대체한다.
# ┎ gh 조회는 항상 실패합니다. curl·codex와 달리 별도의 호출 로그는 남기지 않습니다.
exit 1
GH
# ┎ 세 감시·대체 파일을 실행 가능하게 만듭니다.
chmod +x "$R/sentinels/"*
# ┎ 감시 로그 위치를 공유하고 PATH 앞에 배치합니다. 임의의 다른 네트워크 프로그램까지 차단하는 방화벽은 아닙니다.
export DRAFT_NETWORK_LOG="$R/network" PATH="$R/sentinels:$PATH"
# ┎ 로컬 bump 후보의 소스와 결과 패키지 디렉터리를 분리해서 만듭니다.
mkdir -p "$R/candidate-source" "$R/candidate-output"
# ┎ 검증한 rc.1 압축 내용을 풀어 후보의 출발점으로 씁니다. 새 제품 기능을 추가하는 후보는 아닙니다.
tar -xzf "$ARCHIVE" -C "$R/candidate-source" --strip-components=1
# ┎ 풀어 놓은 후보에 별도의 로컬 Git 저장소를 만듭니다.
git -C "$R/candidate-source" init -q
# ┎ fixture 커밋 작성자 이름을 로컬 설정으로 정합니다.
git -C "$R/candidate-source" config user.name Fixture
# ┎ fixture 커밋의 이메일도 외부 인물이 아닌 검증 전용 값으로 정합니다.
git -C "$R/candidate-source" config user.email fixture@example.invalid
# ┎ 풀어 놓은 후보 파일을 로컬 커밋 대상으로 올립니다.
git -C "$R/candidate-source" add -A
# ┎ 후보 준비 커밋은 훅을 비활성화하여 만듭니다. 이 커밋의 생성 자체는 훅 수용 검증이 아닙니다.
git -C "$R/candidate-source" -c core.hooksPath=/dev/null commit -qm fixture-runtime
# ┎ 새로 만든 후보 커밋을 이후 매니페스트의 실제 커밋 식별자로 사용합니다.
CANDIDATE_SHA=$(git -C "$R/candidate-source" rev-parse HEAD)
# ┎ 로컬 후보 저장소 안에만 fixture 버전 태그를 붙입니다. 원격 공개 작업은 하지 않습니다.
git -C "$R/candidate-source" tag "v$V2"
# ┎ 고정 버전과 같은 패키징 스크립트로 로컬 후보 압축·매니페스트를 생성하고 결과 JSON을 보관합니다.
/bin/bash "$UPSTREAM/scripts/package-release.sh" --source "$R/candidate-source" --version "$V2" --commit "$CANDIDATE_SHA" --output "$R/candidate-output/release" > "$R/package.json"
# ┎ 이후 bump가 읽을 로컬 후보 매니페스트 위치를 저장합니다.
CANDIDATE_MANIFEST="$R/candidate-output/release/sobaya-$V2.json"
# ┎ 이후 bump가 읽을 로컬 후보 압축 위치를 저장합니다.
CANDIDATE_ARCHIVE="$R/candidate-output/release/sobaya-$V2.tar.gz"
# ┎ 각 사례가 서로 다른 앱·저장소·로그를 쓰도록 fixture 번호를 초기화합니다.
serial=0
# ┎ 공개 런타임과 실제 Poem 협업 파일을 사용하는 격리된 소비자 fixture를 정의합니다.
fixture() {
  # ┎ 새 fixture를 만들 때마다 고유 번호를 증가시킵니다.
  serial=$((serial+1))
  # ┎ 앱 경로에는 작은따옴표와 공백, 설치 저장소에는 공백을 넣어 경로 인자 처리를 함께 확인합니다.
  W="$R/case-$serial"; APP="$W/app's path"; STORE="$W/store with spaces"
  # ┎ 소비자 앱과 로컬 bare 원격 저장소의 자리만 생성합니다.
  mkdir -p "$APP" "$W/remote.git"
  # ┎ 실제 소비자의 협업·훅·제공자 설정 파일을 복사합니다. 실제 앱의 승인 문서는 복사하지 않습니다.
  cp -R "$SRC/harness" "$SRC/scripts" "$SRC/.githooks" "$SRC/.claude" "$SRC/.codex" "$SRC/collab" "$SRC/.gitignore" "$APP/"
  # ┎ 선택적으로 지정한 초안 어댑터만 fixture 안에 주입합니다. 이 경로를 썼다면 실제 소비자 파일을 시험한 것과 구분해야 합니다.
  if [ -n "${SOBAYA_DRAFT_ADAPTER:-}" ]; then cp "$SOBAYA_DRAFT_ADAPTER" "$APP/harness/sobaya-installed.sh"; chmod +x "$APP/harness/sobaya-installed.sh"; fi
  # ┎ 복사된 세션 캐시·기존 claim·저널을 fixture에서 제거하여 다른 작업의 상태를 섞지 않습니다.
  rm -rf "$APP/.claude/cache" "$APP/collab/active" "$APP/collab/journal"
  # ┎ 검증 전용 캐시·작업 claim·저널·소스 디렉터리를 새로 만듭니다.
  mkdir -p "$APP/.claude/cache" "$APP/collab/active/feat--runtime" "$APP/collab/journal" "$APP/src"
  # ┎ fixture 전용 앱 계약을 작성합니다. 원래 소비자의 AGENTS.md를 수정하는 작업은 아닙니다.
  cat > "$APP/AGENTS.md" <<'CONTRACT'
# ┎ 이 문서는 실사용 앱이 아닌 fixture 애플리케이션의 계약임을 표시합니다.
# Fixture application
# ┎ 전체 테스트 명령을 실제 Node 내장 테스트 실행기로 선언합니다.
- Test: `node --test suite.test.cjs`
# ┎ 커밋 위생 검사에는 아래에서 만드는 실제 Node lint 스크립트를 선언합니다.
- Lint: `node lint.cjs`
CONTRACT
  # ┎ 협업 계약 보존이라는 fixture 목표를 적으며 실사용 앱의 인간 소유 spec을 수정하지 않습니다.
  printf '# Fixture goal\nPreserve the existing collaboration contract.\n' > "$APP/spec.md"
  # ┎ 초기 fixture 계획은 실사용 앱에 어떤 승인도 부여하지 않는다고 명시합니다.
  printf '# Fixture plan\nNo real application approval is granted.\n' > "$APP/failed-test.md"
  # ┎ 기존 동작 기준으로 42를 내보내는 작은 모듈을 만듭니다.
  printf 'module.exports = 42;\n' > "$APP/src/value.cjs"
  # ┎ 실제 Node가 실행할 기존 회귀 테스트 파일을 만듭니다.
  cat > "$APP/suite.test.cjs" <<'SUITE'
// ┎ 기존 테스트 파일 경로를 명시하는 원래 헤더를 그대로 둡니다.
// file: suite.test.cjs
// ┎ Node 내장 테스트 등록 함수를 가져오며 테스트 실행 결과를 가짜로 반환하지 않습니다.
const test = require('node:test');
// ┎ Node의 엄격한 동등성 검증을 사용합니다.
const assert = require('node:assert/strict');
// ┎ 런타임 핀을 읽고 테스트 실행 흔적을 쓰기 위해 실제 파일 시스템 모듈을 사용합니다.
const fs = require('node:fs');
// ┎ 기존 값이 보존되는지를 검사하는 baselineValue 회귀 테스트를 정의합니다.
test('baselineValue', () => {
  // ┎ 실행 시점의 소비자 설정을 직접 읽어 어느 버전 핀이 노출되어 있는지 확인할 준비를 합니다.
  const pin = JSON.parse(fs.readFileSync('sobaya.json', 'utf8'));
  // ┎ 테스트가 본 설정 버전을 이벤트에 남깁니다. 이 로그만으로 실행 중인 런타임 코드의 정체까지 증명하지는 않습니다.
  fs.appendFileSync(process.env.DRAFT_EVENTS, `suite:${pin.runtime.version}\n`);
  // ┎ 기존 소스 모듈의 값이 42여야 통과합니다.
  assert.equal(require('./src/value.cjs'), 42);
  // ┎ 의도적 suite 실패 스위치가 켜지면 이 실제 Node assertion을 실패시킵니다.
  assert.notEqual(process.env.DRAFT_SUITE_FAIL, '1');
});
SUITE
  # ┎ 호출 기록과 선택적 실패만 담당하는 단순한 Node 위생 검사 fixture를 만듭니다.
  cat > "$APP/lint.cjs" <<'LINT'
// ┎ 위생 검사가 호출될 때마다 lint 이벤트를 한 줄 추가합니다.
require('node:fs').appendFileSync(process.env.DRAFT_EVENTS, 'lint\n');
// ┎ 실패 스위치가 1이면 종료 코드 1을, 아니면 0을 반환합니다. 일반적인 코드 스타일 분석기는 아닙니다.
process.exit(process.env.DRAFT_LINT_FAIL === '1' ? 1 : 0);
LINT
  # ┎ feat/runtime 브랜치의 fixture 소유 claim을 만들어 Poem의 협업 검사 조건을 갖춥니다.
  printf -- '---\nbranch: feat/runtime\nowner: fixture\nstarted: 2026-10-06\nstatus: active\ngoal: fixture\n---\n' > "$APP/collab/active/feat--runtime/claim.md"
  # ┎ push 검증이 외부 서버에 닿지 않도록 로컬 bare Git 원격을 초기화합니다.
  git -C "$W/remote.git" init -q --bare
  # ┎ fixture 앱의 첫 브랜치를 main으로 초기화합니다.
  git -C "$APP" init -q -b main
  # ┎ 빈 Git 템플릿이 생성하지 않은 폴더를 준비해 구형 훅·사용자 훅 fixture를 쓸 수 있게 합니다.
  mkdir -p "$APP/.git/hooks"
  # ┎ 앱 준비 커밋의 작성자 이름을 로컬에서 지정합니다.
  git -C "$APP" config user.name Fixture
  # ┎ 앱 준비 커밋의 이메일을 검증용 주소로 지정합니다.
  git -C "$APP" config user.email fixture@example.invalid
  # ┎ Poem 협업 도구가 사용할 내 사용자 이름을 fixture로 설정합니다.
  git -C "$APP" config collab.me fixture
  # ┎ 초기 온보딩 완료 상태를 설정하여 해당 흐름의 다른 준비 질문을 배제합니다.
  git -C "$APP" config collab.onboarded true
  # ┎ 최초 연결 전부터 worktree별 설정 기능을 켭니다. 뒤늦은 설정 이관을 검증하는 fixture는 아닙니다.
  git -C "$APP" config extensions.worktreeConfig true
  # ┎ 초기 협업 훅은 소비자의 기존 .githooks 디렉터리를 사용하게 합니다.
  git -C "$APP" config core.hooksPath .githooks
  # ┎ origin은 같은 임시 디렉터리 안의 로컬 bare 저장소만 가리킵니다.
  git -C "$APP" remote add origin "$W/remote.git"
  # ┎ 공통 준비 커밋 도우미로 현재 fixture 파일을 기록합니다.
  fixture_commit
  # ┎ 초기 main을 로컬 원격에 실제 push하여 이후 협업 명령의 기준 브랜치를 만듭니다.
  git -C "$APP" push -q origin main
  # ┎ 소비자 작업 브랜치 feat/runtime을 새로 만들어 전환합니다.
  git -C "$APP" switch -qc feat/runtime
  # ┎ 이 Git 작업 디렉터리에 속한 Sobaya 메타데이터 위치를 구합니다.
  META=$(git -C "$APP" rev-parse --absolute-git-dir)/sobaya
  # ┎ Node 테스트·훅 등이 쓸 fixture별 이벤트 파일 위치를 공유합니다.
  export DRAFT_EVENTS="$W/events"
  # ┎ 이 fixture의 이벤트 기록을 빈 상태로 시작합니다.
  : > "$DRAFT_EVENTS"
  # ┎ 검증한 공개 설치 스크립트로 rc.1을 실제 설치하되, 매니페스트와 압축 파일은 로컬 인자로 제공하여 다운로드하지 않습니다.
  invoke /bin/bash "$ASSETS/install-runtime.sh" --root "$APP" --install-root "$STORE" --version "$V1" --manifest "$MANIFEST" --archive "$ARCHIVE"
  # ┎ 공개 런타임의 로컬 설치가 성공해야 이후 사례를 진행합니다.
  okay
}
# ┎ fixture 준비 상태를 커밋하는 공통 도우미입니다. 제품 체크포인트 검증을 대신하지 않습니다.
fixture_commit() {
  # ┎ fixture의 현재 변경을 전부 인덱스에 올립니다.
  git -C "$APP" add -A
  # ┎ 스테이징된 변경이 있을 때만 훅 없이 준비 커밋을 생성합니다.
  if ! git -C "$APP" diff --cached --quiet; then git -C "$APP" -c core.hooksPath=/dev/null commit -qm fixture; fi
}
# ┎ 소비자 설치형 어댑터를 앱 루트에서 호출하고 종료 결과를 회수하는 공통 도우미입니다.
adapter() {
  # ┎ 이번 fixture 안에 있어야 할 어댑터 파일을 선택합니다.
  local script="$APP/harness/sobaya-installed.sh"
  # ┎ 어댑터가 아직 없으면 성공이나 기능적 RED로 꾸미지 않고 NOT PROBED, 종료 코드 2로 구분합니다.
  [ -f "$script" ] || { echo 'NOT PROBED: harness/sobaya-installed.sh is absent' >&2; exit 2; }
  # ┎ 실제 /bin/sh로 어댑터를 실행하며 출력은 invoke에 맡기고 서브셸의 종료 결과를 파일로 전달합니다.
  (cd "$APP"; invoke /bin/sh "$script" "$@"; printf '%s\n' "$RC" > "$R/rc")
  # ┎ 부모 셸에서 그 결과를 읽어 다음 okay·rejected 검증에 사용합니다.
  RC=$(cat "$R/rc")
}
# ┎ rc.1 attach의 성공 코드뿐 아니라 연결·핀 파일의 존재까지 요구하는 공통 도우미입니다.
attach() {
  # ┎ 명시한 설치 저장소와 rc.1 버전으로 실제 소비자 어댑터 attach를 호출합니다.
  adapter attach --install-root "$STORE" --version "$V1"
  # ┎ 먼저 attach 명령이 성공해야 합니다.
  okay
  # ┎ 현재 META의 연결 파일과 대상 APP의 두 핀 파일이 모두 있어야 합니다. 아무 작업 없이 성공만 반환하는 attach를 걸러냅니다.
  [ -f "$META/connection.json" ] && [ -f "$APP/sobaya.json" ] && [ -f "$APP/sobaya.lock" ] || fail 'attach returned success without a connection'
}
# ┎ 설정과 잠금 파일을 이후 바이트 보존 비교를 위해 복사합니다. 여기서는 두 파일의 모든 메타데이터를 검증하지 않습니다.
pins() { cp -p "$APP/sobaya.json" "$W/config.before"; cp -p "$APP/sobaya.lock" "$W/lock.before"; }
# ┎ 앞서 복사한 두 핀 파일과 현재 파일의 바이트가 모두 같아야 합니다.
pins_same() { same "$APP/sobaya.json" "$W/config.before"; same "$APP/sobaya.lock" "$W/lock.before"; }
# ┎ 추적 파일의 내용·심볼릭 링크 대상·실행 가능 여부를 기록하는 공통 도우미입니다.
tracked_snapshot() {
  # ┎ Git 추적 경로를 NUL 구분으로 읽으므로 경로 공백을 파일 구분으로 오해하지 않습니다.
  (cd "$APP"; git ls-files -z | while IFS= read -r -d '' path; do
    # ┎ 런타임 갱신이 허용되는 sobaya.json과 sobaya.lock은 이 일반 파일 보존 목록에서 제외합니다.
    case "$path" in sobaya.json|sobaya.lock) continue ;; esac
    # ┎ 심볼릭 링크는 연결 대상 문자열을 기록하며 링크가 가리키는 파일 내용까지 따라가지 않습니다.
    if [ -L "$path" ]; then printf 'link %s %s\n' "$path" "$(readlink "$path")";
    # ┎ 일반 파일은 cksum과 실행 가능 표시를 기록합니다. 전체 파일 권한 비트나 수정 시간의 스냅샷은 아닙니다.
    else cksum "$path"; [ ! -x "$path" ] || printf 'executable %s\n' "$path"; fi
  # ┎ 완성된 추적 파일 기록을 호출자가 지정한 비교 파일에 저장합니다.
  done) > "$1"
}
# ┎ 상태 보존 사례를 위해 합성 Sobaya 상태를 만드는 도우미이며 실제 승인 절차가 아닙니다.
protected_state() {
  # ┎ 이번 fixture의 상태 파일을 놓을 메타데이터 디렉터리를 준비합니다.
  mkdir -p "$META"
  # ┎ 현재 HEAD·calls 7·비활성 상태·review HEAD가 든 fixture:true 합성 상태를 씁니다. 진짜 앱 승인이나 완료를 주장하지 않습니다.
  jq -n --arg b "$(git -C "$APP" rev-parse HEAD)" '{version:1,baseline:$b,calls:7,active:null,review:{head:$b},fixture:true}' > "$META/state.json"
  # ┎ 합성 상태 전체를 복사하여 이후 바이트 변화가 없는지 검사합니다.
  cp "$META/state.json" "$W/state.before"
}
# ┎ fixture 앱의 실제 Poem 공통 라이브러리를 읽고 sobaya_busy 판단을 호출합니다.
busy() { (cd "$APP"; export CLAUDE_PROJECT_DIR="$APP"; . "$APP/harness/hooks/lib.sh"; sobaya_busy); }

# ┎ 첫 사례: 새 연결과 반복 연결이 앱 파일·인덱스·HEAD·승인 부재를 보존하고 연결 충돌을 거부하는지 확인합니다.
attach_preserves_app() {
  # ┎ 독립 fixture 하나로 시작합니다.
  fixture
  # ┎ 연결 전의 추적 파일 내용·링크·실행 여부를 기록합니다.
  tracked_snapshot "$W/files.before"
  # ┎ 연결 전 인덱스의 파일 모드·객체 ID·stage·경로를 기록합니다.
  git -C "$APP" ls-files --stage > "$W/index.before"
  # ┎ 연결 전 커밋 위치를 보관합니다.
  head_before=$(git -C "$APP" rev-parse HEAD)
  # ┎ 어댑터를 통해 rc.1 연결을 수행하고 성공을 확인합니다.
  attach
  # ┎ 생성된 설정의 모드가 dependency이고 버전이 rc.1이어야 합니다.
  jq -e '.mode=="dependency" and .runtime.version=="1.0.0-rc.1"' "$APP/sobaya.json" >/dev/null || fail 'wrong mode/version'
  # ┎ 잠금의 runtime 객체 전체가 공개 매니페스트의 runtime 객체와 같아야 합니다.
  jq -e --argjson pin "$(jq .runtime "$MANIFEST")" '.runtime==$pin' "$APP/sobaya.lock" >/dev/null || fail 'wrong release identity'
  # ┎ 연결만으로 Sobaya 승인 상태 파일을 만들어서는 안 됩니다.
  [ ! -e "$META/state.json" ] || fail 'attach must not approve'
  # ┎ 어댑터의 check로 설치 연결 상태를 조회합니다.
  adapter check --install-root "$STORE"
  # ┎ 연결 상태 조회가 성공해야 합니다.
  okay
  # ┎ 승인 파일이 없어도 연결 자체는 connected:true로 구분되어야 합니다.
  jq -e '.connected==true' "$R/out" >/dev/null || fail 'connection confused with approval'
  # ┎ 설치 연결이 앱에 CLAUDE.md를 새로 만들어서는 안 됩니다.
  [ ! -e "$APP/CLAUDE.md" ] || fail 'app CLAUDE.md recreated'
  # ┎ 설치 연결이 예전 형식의 harness/sobaya.lock을 만들어서는 안 됩니다.
  [ ! -e "$APP/harness/sobaya.lock" ] || fail 'legacy lock created'
  # ┎ attach가 임의의 Git 커밋을 만들거나 HEAD를 바꾸지 않았어야 합니다.
  [ "$(git -C "$APP" rev-parse HEAD)" = "$head_before" ] || fail 'attach committed'
  # ┎ 공유할 두 핀 파일 안에 개인 설치 저장소 절대 경로가 들어가면 실패합니다.
  if grep -Fq "$STORE" "$APP/sobaya.json" "$APP/sobaya.lock"; then fail 'personal store leaked into shared pins'; fi
  # ┎ 연결 후 추적 파일 기록을 앞선 기록과 비교해 보존을 확인합니다.
  tracked_snapshot "$W/files.after"; same "$W/files.before" "$W/files.after"
  # ┎ Git 인덱스 기록도 연결 전과 정확히 같아야 합니다.
  git -C "$APP" ls-files --stage > "$W/index.after"; same "$W/index.before" "$W/index.after"
  # ┎ 작업 트리 상태를 실제 Git에서 읽습니다.
  git -C "$APP" status --porcelain > "$W/status"
  # ┎ 예상되는 변경은 두 핀 파일이 아직 추적되지 않았다는 표시뿐입니다.
  printf '?? sobaya.json\n?? sobaya.lock\n' > "$W/status.expected"
  # ┎ 실제 상태 출력 전체가 그 두 줄과 같아야 하므로 다른 가시적 변경도 함께 잡습니다.
  same "$W/status" "$W/status.expected"
  # ┎ 반복 연결 전 두 핀 파일을 보관합니다.
  pins
  # ┎ 반복 연결 전 유효한 훅 경로를 기억합니다.
  hook_before=$(git -C "$APP" config core.hooksPath)
  # ┎ 동일 인자로 attach를 한 번 더 수행합니다.
  attach
  # ┎ 두 번째 attach도 핀 파일 바이트를 바꾸지 않아야 합니다.
  pins_same
  # ┎ 두 번째 attach 뒤의 유효한 훅 경로도 같아야 합니다.
  [ "$(git -C "$APP" config core.hooksPath)" = "$hook_before" ] || fail 'repeat attach changed hooks'
  # ┎ 정상 로컬 연결 메타데이터를 보관합니다.
  cp "$META/connection.json" "$W/connection.before"
  # ┎ 메타데이터의 store만 잘못된 경로로 바꾸어 연결 충돌을 만듭니다.
  jq '.store="/wrong-store"' "$W/connection.before" > "$META/connection.json"
  # ┎ 의도적으로 변경한 충돌 파일을 따로 보관합니다.
  cp "$META/connection.json" "$W/connection.changed"
  # ┎ 정상 설치 저장소 인자로 check를 다시 요청합니다.
  adapter check --install-root "$STORE"
  # ┎ 잘못된 로컬 연결은 성공 처리되지 않고 connection 오류로 거부되어야 합니다.
  rejected connection
  # ┎ 거부 뒤에도 충돌 파일을 자동 수정하지 않고 두 핀 파일도 보존해야 합니다.
  same "$META/connection.json" "$W/connection.changed"; pins_same
}

# ┎ 두 번째 사례: 충돌하는 기존 설정이나 잘못된 인자를 부분 연결 없이 거부하는지 확인합니다.
attach_rejects_conflicts() {
  # ┎ spec 부재·레거시 잠금·레거시 훅·worktree 설정 부재를 각각 새 fixture에서 검사합니다.
  for variant in missing-plan legacy-lock legacy-hook worktree-config; do
    # ┎ 앞선 거부 사례의 파일이 다음 사례에 영향을 주지 않도록 매번 새 앱을 만듭니다.
    fixture
    # ┎ 이번에 만들 충돌의 종류와 기대 오류 문자열을 선택합니다.
    case "$variant" in
      # ┎ variant 이름은 missing-plan이지만 실제로 지우는 파일은 spec.md이며, 오류에도 그 파일명이 나와야 합니다.
      missing-plan) rm "$APP/spec.md"; reason=spec.md ;;
      # ┎ 예전 형식의 harness/sobaya.lock을 넣고 legacy 오류를 기대합니다.
      legacy-lock) printf 'repo=old\nsha=old\n' > "$APP/harness/sobaya.lock"; reason=legacy ;;
      # ┎ 레거시 Sobaya 표시가 있는 실행 가능한 공통 pre-commit을 넣고 legacy 오류를 기대합니다. 이 가짜 훅은 실제 옛 런타임을 실행하지 않습니다.
      legacy-hook) printf '#!/bin/sh\n# Sobaya app pre-commit v2\nexit 0\n' > "$APP/.git/hooks/pre-commit"; chmod +x "$APP/.git/hooks/pre-commit"; reason=legacy ;;
      # ┎ 미리 켜 둔 worktree별 설정을 제거하고 worktreeConfig 오류를 기대합니다.
      worktree-config) git -C "$APP" config --unset extensions.worktreeConfig; reason=worktreeConfig ;;
    esac
    # ┎ 충돌을 만든 뒤, attach 직전 공통 Git 설정 파일을 보관합니다.
    cp "$APP/.git/config" "$W/git.before"
    # ┎ 기존 공통 pre-commit이 있는 사례는 그 원본 바이트도 보관합니다.
    if [ -f "$APP/.git/hooks/pre-commit" ]; then cp "$APP/.git/hooks/pre-commit" "$W/hook.before"; fi
    # ┎ 충돌 상태에서 실제 어댑터의 attach를 요청합니다.
    adapter attach --install-root "$STORE" --version "$V1"
    # ┎ 요청은 실패하고 해당 충돌을 설명하는 문자열을 표준 오류에 남겨야 합니다.
    rejected "$reason"
    # ┎ 실패 뒤 공통 .git/config의 바이트가 바뀌어서는 안 됩니다.
    same "$APP/.git/config" "$W/git.before"
    # ┎ 실패 도중 설정·잠금·연결 파일 중 일부만 만들어지는 부분 연결도 없어야 합니다.
    [ ! -e "$APP/sobaya.json" ] && [ ! -e "$APP/sobaya.lock" ] && [ ! -e "$META/connection.json" ] || fail 'partial connection'
    # ┎ 실패한 연결이 승인 상태를 만들지 않아야 합니다.
    [ ! -e "$META/state.json" ] || fail 'unexpected approval'
    # ┎ 기존 공통 훅이 있었다면 그 바이트를 그대로 보존해야 합니다.
    [ ! -f "$W/hook.before" ] || same "$APP/.git/hooks/pre-commit" "$W/hook.before"
  done
  # ┎ 별도의 정상 연결을 만든 뒤 핀 파일을 보관하여 연결 후 레거시 충돌도 확인합니다.
  fixture; attach; pins
  # ┎ 정상 설치 연결에 예전 형식의 잠금 파일을 추가합니다.
  printf 'repo=old\nsha=old\n' > "$APP/harness/sobaya.lock"
  # ┎ 충돌을 일으킨 레거시 잠금도 보존 비교용으로 복사합니다.
  cp "$APP/harness/sobaya.lock" "$W/legacy.before"
  # ┎ 공개 압축 파일을 제공하며 sync를 요청합니다.
  adapter sync --install-root "$STORE" --archive "$ARCHIVE"
  # ┎ 설치형 핀과 레거시 잠금이 공존하면 sync도 legacy 오류로 거부되어야 합니다.
  rejected legacy
  # ┎ 거부 뒤 설치형 두 핀과 레거시 잠금 파일이 모두 원래 바이트를 유지해야 합니다.
  pins_same; same "$APP/harness/sobaya.lock" "$W/legacy.before"
  # ┎ 알 수 없는 옵션·값 누락·중복 옵션·앱 내부 설치 경로를 각각 검사합니다.
  for variant in unknown missing duplicate inside; do
    # ┎ 잘못된 인자 사례마다 별도의 새 fixture로 시작합니다.
    fixture
    # ┎ 인자 검증 전 공통 Git 설정을 보관합니다.
    cp "$APP/.git/config" "$W/git.before"
    # ┎ 이번 사례에 해당하는 잘못된 명령을 선택합니다.
    case "$variant" in
      # ┎ 정의되지 않은 --unknown 옵션을 전달합니다.
      unknown) adapter attach --install-root "$STORE" --version "$V1" --unknown ;;
      # ┎ --install-root의 값이 없는 요청을 전달합니다.
      missing) adapter attach --install-root ;;
      # ┎ 같은 설치 경로라도 --install-root를 두 번 쓰는 요청을 전달합니다.
      duplicate) adapter attach --install-root "$STORE" --install-root "$STORE" --version "$V1" ;;
      # ┎ 소비자 작업 트리 내부를 설치 저장소로 사용하는 요청을 전달합니다.
      inside) adapter attach --install-root "$APP/store" --version "$V1" ;;
    esac
    # ┎ 각 잘못된 요청은 0이 아닌 종료 코드와 비어 있지 않은 오류 설명을 남겨야 합니다.
    [ "$RC" -ne 0 ] && [ -s "$R/err" ] || fail 'invalid arguments accepted'
    # ┎ 인자 거부 뒤 공통 Git 설정 바이트가 그대로여야 합니다.
    same "$APP/.git/config" "$W/git.before"
    # ┎ 인자 검증 실패가 핀이나 연결 메타데이터를 생성해서는 안 됩니다.
    [ ! -e "$APP/sobaya.json" ] && [ ! -e "$APP/sobaya.lock" ] && [ ! -e "$META/connection.json" ] || fail 'invalid arguments changed connection'
  done
}

# ┎ 세 번째 사례: 기능 계획이 없는 main에서도 고정 런타임만 복원하고 승인·훅 연결은 만들지 않는지 확인합니다.
sync_restores_exact_pin_without_plans() {
  # ┎ 정상 연결을 만든 뒤 공유할 두 핀 파일을 보관합니다.
  fixture; attach; pins
  # ┎ 이미 설치된 로컬 Sobaya CLI를 새 저장소 복원의 명시적 출발점으로 기억합니다.
  trusted_cli="$STORE/bin/sobaya"
  # ┎ fixture의 기능 목표와 계획 문서를 모두 제거합니다.
  rm "$APP/spec.md" "$APP/failed-test.md"
  # ┎ 로컬 연결·훅·상태 메타데이터를 통째로 제거하여 핀만 남은 상황을 만듭니다.
  rm -rf "$META"
  # ┎ 현재 작업 트리의 훅을 다시 Poem .githooks로 지정합니다.
  git -C "$APP" config --worktree core.hooksPath .githooks
  # ┎ 그 준비 상태를 훅 없이 커밋합니다.
  fixture_commit
  # ┎ 현재 준비 커밋에서 main 브랜치로 전환하여 기능 작업 중이 아닌 소비 상태를 만듭니다.
  git -C "$APP" switch -qC main
  # ┎ 실제 Poem join을 fixture 사용자로 실행합니다.
  invoke env CLAUDE_PROJECT_DIR="$APP" /bin/sh "$APP/harness/join.sh" fixture
  # ┎ join은 성공하고 설치형 sync 명령을 안내해야 합니다.
  okay; has "$R/out" 'sobaya-installed.sh sync'
  # ┎ join이 임의로 연결 정보나 승인 상태를 만들어서는 안 됩니다.
  [ ! -e "$META/connection.json" ] && [ ! -e "$META/state.json" ] || fail 'join guessed runtime connection'
  # ┎ 아직 런타임이 없는 새 설치 저장소 경로를 지정합니다.
  fresh_store="$W/fresh store"
  # ┎ 기존의 명시적 CLI와 로컬 압축 파일로 새 저장소에 고정 런타임을 복원하도록 요청합니다.
  adapter sync --install-root "$fresh_store" --cli "$trusted_cli" --archive "$ARCHIVE"
  # ┎ sync가 성공하고 공유 핀 파일은 그대로여야 합니다.
  okay; pins_same
  # ┎ 새 저장소에 실행 가능한 안정 CLI가 생겨야 합니다.
  [ -x "$fresh_store/bin/sobaya" ] || fail 'runtime not restored'
  # ┎ 복원된 rc.1 매니페스트 바이트가 기준 공개 매니페스트와 같아야 합니다.
  same "$fresh_store/runtimes/$V1/manifest.json" "$MANIFEST"
  # ┎ sync가 없는 spec·계획·승인 상태·연결 정보를 임의로 만들어서는 안 됩니다.
  [ ! -e "$APP/spec.md" ] && [ ! -e "$APP/failed-test.md" ] && [ ! -e "$META/state.json" ] && [ ! -e "$META/connection.json" ] || fail 'sync invented feature inputs/connection'
  # ┎ sync 뒤에도 유효한 훅 경로는 .githooks여야 합니다.
  [ "$(git -C "$APP" config core.hooksPath)" = .githooks ] || fail 'sync changed hooks'
  # ┎ 반복 sync 전 공통 Git 설정 파일을 보관합니다.
  cp "$APP/.git/config" "$W/git.before"
  # ┎ 동일한 복원 요청을 다시 실행합니다.
  adapter sync --install-root "$fresh_store" --cli "$trusted_cli" --archive "$ARCHIVE"
  # ┎ 반복 sync는 성공하면서 두 핀과 공통 Git 설정을 그대로 유지해야 합니다.
  okay; pins_same; same "$APP/.git/config" "$W/git.before"
  # ┎ 복원된 저장소를 대상으로 어댑터 check를 실행합니다.
  adapter check --install-root "$fresh_store"
  # ┎ 런타임만 복원된 상태도 조회 자체는 성공해야 합니다.
  okay
  # ┎ 조회 결과는 dependency·rc.1을 표시하되 아직 로컬 연결이 없으므로 connected:false여야 합니다.
  jq -e '.mode=="dependency" and .version=="1.0.0-rc.1" and .connected==false' "$R/out" >/dev/null || fail 'incorrect unconnected status'
}

# ┎ 네 번째 사례: join·init·상태 안내가 연결을 보존하고 실제 커밋에서 협업 검사·사용자 훅·위생 검사가 함께 동작하는지 확인합니다.
hooks_join_and_status_preserve_connection() {
  # ┎ 기존 협업 훅이 있는 새 fixture로 시작합니다.
  fixture
  # ┎ Sobaya 레거시 훅이 아닌 사용자 공통 pre-commit을 fixture에 만듭니다.
  cat > "$APP/.git/hooks/pre-commit" <<'CUSTOM'
# ┎ 사용자 공통 훅은 POSIX 셸로 실행됩니다.
#!/bin/sh
# ┎ 사용자 훅이 호출될 때마다 custom 이벤트를 한 줄 남깁니다.
printf 'custom\n' >> "$DRAFT_EVENTS"
# ┎ 사용자 훅 실패 스위치가 1이면 종료 코드 19로 거부합니다.
[ "${DRAFT_CUSTOM_FAIL:-0}" != 1 ] || exit 19
CUSTOM
  # ┎ 사용자 공통 훅을 실행 가능하게 만듭니다.
  chmod +x "$APP/.git/hooks/pre-commit"
  # ┎ 연결 뒤에도 보존되어야 할 사용자 훅 원문을 복사합니다.
  cp "$APP/.git/hooks/pre-commit" "$W/custom.before"
  # ┎ 설치 연결을 준비 커밋한 다음 calls 7이 든 합성 상태를 넣어 상태 보존도 비교합니다.
  attach; fixture_commit; protected_state
  # ┎ 연결 직후의 유효한 훅 경로를 보관합니다.
  hook_before=$(git -C "$APP" config core.hooksPath)
  # ┎ 이미 연결된 앱에서 실제 join을 다시 실행합니다.
  invoke env CLAUDE_PROJECT_DIR="$APP" /bin/sh "$APP/harness/join.sh" fixture
  # ┎ 연결된 상태의 join도 성공해야 합니다.
  okay
  # ┎ join이 설치형 연결 훅을 .githooks로 되돌려서는 안 됩니다.
  [ "$(git -C "$APP" config core.hooksPath)" = "$hook_before" ] || fail 'join detached runtime hook'
  # ┎ join 뒤 합성 상태 전체의 바이트가 그대로여야 합니다.
  same "$META/state.json" "$W/state.before"
  # ┎ 같은 앱에서 실제 init 스크립트도 다시 실행합니다.
  invoke env CLAUDE_PROJECT_DIR="$APP" /bin/sh "$APP/harness/init.sh" Fixture fixture
  # ┎ 반복 init 역시 성공해야 합니다.
  okay
  # ┎ 반복 init이 설치형 훅 연결을 끊어서는 안 됩니다.
  [ "$(git -C "$APP" config core.hooksPath)" = "$hook_before" ] || fail 'repeated init detached runtime hook'
  # ┎ 반복 init 뒤에도 합성 상태 전체를 보존해야 합니다.
  same "$META/state.json" "$W/state.before"
  # ┎ Poem의 state 안내를 실제로 조회합니다.
  invoke env CLAUDE_PROJECT_DIR="$APP" /bin/sh "$APP/scripts/collab.sh" state
  # ┎ state 조회가 성공하고 훅이 켜졌다는 hooks=on을 포함해야 합니다.
  okay; has "$R/out" 'hooks=on'
  # ┎ Poem의 digest 안내를 실제로 조회합니다.
  invoke env CLAUDE_PROJECT_DIR="$APP" /bin/sh "$APP/scripts/collab.sh" digest
  # ┎ digest 조회가 성공하고 연결된 rc.1 버전 문자열을 포함해야 합니다.
  okay; has "$R/out" "$V1"
  # ┎ 유효한 연결에 대해 Git 훅이 꺼졌다는 잘못된 경고가 나와서는 안 됩니다.
  if grep -Fq 'git 훅이 꺼져' "$R/out"; then fail 'false hooks warning'; fi
  # ┎ 어댑터의 check로 설치 연결 상태를 다시 조회합니다.
  adapter check --install-root "$STORE"
  # ┎ 이 연결 조회가 성공해야 합니다.
  okay
  # ┎ dependency·rc.1·connected:true의 세 필드를 확인합니다.
  jq -e '.mode=="dependency" and .version=="1.0.0-rc.1" and .connected==true' "$R/out" >/dev/null || fail 'incorrect connected status'
  # ┎ 기존 값 42를 43으로 바꿉니다. 이 커밋 사례는 위생 훅을 검사하며 전체 Node 회귀 테스트 통과를 요구하지 않습니다.
  printf 'module.exports = 43;\n' > "$APP/src/value.cjs"
  # ┎ 바꾼 소스 파일을 실제 Git 인덱스에 올립니다.
  git -C "$APP" add src/value.cjs
  # ┎ 이 커밋에서 발생하는 이벤트만 세도록 로그를 비웁니다.
  : > "$DRAFT_EVENTS"
  # ┎ 훅을 끄지 않은 실제 git commit을 실행합니다.
  invoke git -C "$APP" commit -qm 'fixture checked hook'
  # ┎ 협업 조건과 사용자 훅이 허용한 이 커밋은 성공해야 합니다.
  okay
  # ┎ 커밋에서 lint 이벤트가 정확히 한 번 발생해야 하므로 위생 검사의 중복 호출을 잡습니다.
  [ "$(grep -c '^lint$' "$DRAFT_EVENTS")" -eq 1 ] || fail 'hygiene must run exactly once'
  # ┎ 사용자 공통 훅의 custom 이벤트도 정확히 한 번이어야 합니다.
  [ "$(grep -c '^custom$' "$DRAFT_EVENTS")" -eq 1 ] || fail 'custom hook must run exactly once'
  # ┎ 실행 뒤에도 원래 사용자 공통 훅 파일 바이트가 같아야 합니다.
  same "$APP/.git/hooks/pre-commit" "$W/custom.before"
  # ┎ 다음 거부 검증을 위해 소스를 45로 다시 바꿉니다.
  printf 'module.exports = 45;\n' > "$APP/src/value.cjs"
  # ┎ 그 소스 변경을 실제 인덱스에 올립니다.
  git -C "$APP" add src/value.cjs
  # ┎ 사용자 훅 거부 사례의 이벤트만 남기도록 로그를 비웁니다.
  : > "$DRAFT_EVENTS"
  # ┎ 사용자 훅 실패 스위치를 켠 실제 커밋을 요청합니다.
  invoke env DRAFT_CUSTOM_FAIL=1 git -C "$APP" commit -qm 'custom hook must block'
  # ┎ 사용자 훅의 거부가 상위 커밋까지 전달되어 0이 아닌 종료 코드가 나와야 합니다. 19라는 값 자체는 여기서 비교하지 않습니다.
  [ "$RC" -ne 0 ] || fail 'custom hook rejection lost'
  # ┎ 기대 이벤트를 custom 한 줄로 만듭니다.
  printf 'custom\n' > "$W/expected"
  # ┎ 실제 이벤트도 그 한 줄과 같아야 하므로 사용자 훅 거부 뒤 lint가 실행되면 실패합니다.
  same "$DRAFT_EVENTS" "$W/expected"
  # ┎ 브랜치의 작업 claim을 옮겨 협업 허가가 없는 상황을 만듭니다.
  mv "$APP/collab/active/feat--runtime/claim.md" "$W/claim.saved"
  # ┎ 새 소스 변경을 만들어 협업 검사에 걸릴 커밋 내용을 준비합니다.
  printf 'module.exports = 44;\n' > "$APP/src/value.cjs"
  # ┎ 그 소스 변경을 실제 인덱스에 올립니다.
  git -C "$APP" add src/value.cjs
  # ┎ 협업 거부 사례의 이벤트만 남기도록 로그를 비웁니다.
  : > "$DRAFT_EVENTS"
  # ┎ claim이 없는 상태로 실제 커밋을 요청합니다.
  invoke git -C "$APP" commit -qm 'must be blocked'
  # ┎ Poem 협업 거부가 상위 커밋을 실패시켜야 합니다.
  [ "$RC" -ne 0 ] || fail 'collaboration rejection lost'
  # ┎ 이때 이벤트 로그가 비어 있어야 하므로 뒤의 사용자 훅·lint 기록이 없어야 합니다.
  [ ! -s "$DRAFT_EVENTS" ] || fail 'hygiene ran after collaboration rejection'
}

# ┎ 다섯 번째 사례: 새 worktree 생성과 별도 attach가 원래 worktree의 연결·상태를 건드리지 않는지 확인합니다.
worktree_does_not_detach_sibling() {
  # ┎ 원래 앱을 연결하고 준비 커밋한 뒤 비교할 합성 상태를 만듭니다.
  fixture; attach; fixture_commit; protected_state
  # ┎ main을 현재 연결 준비 커밋으로 맞춰 새 worktree에 필요한 추적 파일이 포함되게 합니다.
  git -C "$APP" branch -f main HEAD
  # ┎ 임시 main 준비 push만 훅을 우회해 로컬 bare origin에 기록합니다. 뒤의 실제 worktree·커밋 검증에는 훅을 유지합니다.
  git -C "$APP" -c core.hooksPath=/dev/null push -q origin main
  # ┎ 원래 앱의 유효한 연결 훅 경로를 보관합니다.
  hook_before=$(git -C "$APP" config core.hooksPath)
  # ┎ 실제 Poem worktree 명령으로 feat/sibling 작업 트리를 만듭니다.
  invoke env CLAUDE_PROJECT_DIR="$APP" /bin/sh "$APP/scripts/collab.sh" worktree feat/sibling
  # ┎ worktree 생성 명령이 성공해야 합니다.
  okay
  # ┎ Poem 명명 규칙에 따른 새 작업 트리 경로를 계산합니다.
  sibling="$(dirname "$APP")/$(basename "$APP")-feat--sibling"
  # ┎ 생성 직후에도 원래 앱의 유효 훅 경로가 같아야 합니다. 이 줄은 공통 Git 설정 파일 전체를 비교하지는 않습니다.
  [ "$(git -C "$APP" config core.hooksPath)" = "$hook_before" ] || fail 'sibling creation detached first worktree'
  # ┎ 원래 앱의 합성 상태 바이트도 그대로여야 합니다.
  same "$META/state.json" "$W/state.before"
  # ┎ 새 작업 트리는 원래 앱의 절대 연결 훅을 물려받지 않고 .githooks를 사용해야 합니다.
  [ "$(git -C "$sibling" config core.hooksPath)" = .githooks ] || fail 'sibling inherited first forwarding hook'
  # ┎ 새 작업 트리의 고유 Git 디렉터리에서 Sobaya 메타데이터 위치를 구합니다.
  sibling_meta=$(git -C "$sibling" rev-parse --absolute-git-dir)/sobaya
  # ┎ 새 작업 트리에 원래의 승인 상태나 연결 메타데이터가 복사되어서는 안 됩니다.
  [ ! -e "$sibling_meta/state.json" ] && [ ! -e "$sibling_meta/connection.json" ] || fail 'approval/connection copied'
  # ┎ 공통 attach 도우미의 대상 앱을 잠시 새 작업 트리로 바꿉니다.
  old_app=$APP; APP=$sibling
  # ┎ 새 작업 트리에 대해 별도로 rc.1 attach를 수행합니다.
  attach
  # ┎ 이후 보존 검증은 다시 원래 앱을 대상으로 하도록 복원합니다.
  APP=$old_app
  # ┎ 새 연결의 root와 app은 모두 새 작업 트리 경로여야 합니다.
  jq -e --arg app "$sibling" '.root==$app and .app==$app' "$sibling_meta/connection.json" >/dev/null || fail 'sibling connection points to original'
  # ┎ 새 작업 트리의 attach 뒤에도 원래 앱의 훅 경로를 유지해야 합니다.
  [ "$(git -C "$APP" config core.hooksPath)" = "$hook_before" ] || fail 'sibling attach changed original hook'
  # ┎ 그 뒤에도 원래 앱의 합성 상태 전체 바이트가 같아야 합니다.
  same "$META/state.json" "$W/state.before"
}

# ┎ 여섯 번째 사례: 로컬 후보 bump의 성공·suite 실패·진행 중 거부가 핀과 상태를 어떻게 다루는지 확인합니다.
bump_validates_and_preserves_state() {
  # ┎ 세 결과를 서로 독립된 fixture에서 검사합니다.
  for outcome in success suite-failure active; do
    # ┎ 현재 rc.1 연결·준비 커밋·합성 상태·핀 백업을 갖춥니다.
    fixture; attach; fixture_commit; protected_state; pins
    # ┎ 진행 중 거부 사례에서는 합성 active 항목을 넣고 그 상태를 보존 기준으로 다시 저장합니다.
    if [ "$outcome" = active ]; then jq '.active={name:"pending"}' "$META/state.json" > "$W/active"; cp "$W/active" "$META/state.json"; cp "$META/state.json" "$W/state.before"; fi
    # ┎ bump 전 추적 파일의 보존 기록을 남깁니다. 두 런타임 핀은 이 목록에서 제외됩니다.
    tracked_snapshot "$W/files.before"
    # ┎ bump 전 HEAD를 보관합니다.
    head_before=$(git -C "$APP" rev-parse HEAD)
    # ┎ bump 전 유효 훅 경로를 보관합니다.
    hook_before=$(git -C "$APP" config core.hooksPath)
    # ┎ 이번 bump에서 발생한 suite·lint 이벤트만 기록하도록 비웁니다.
    : > "$DRAFT_EVENTS"
    # ┎ 기본적으로 기존 Node suite가 통과하도록 실패 스위치를 끕니다.
    export DRAFT_SUITE_FAIL=0
    # ┎ suite-failure 사례에서만 실제 Node assertion이 실패하도록 설정합니다.
    [ "$outcome" != suite-failure ] || export DRAFT_SUITE_FAIL=1
    # ┎ 어댑터를 통해 로컬 fixture 후보 버전으로 bump를 요청합니다. 공개 rc.2를 다운로드하거나 배포하는 동작은 아닙니다.
    adapter bump --install-root "$STORE" --version "$V2" --manifest "$CANDIDATE_MANIFEST" --archive "$CANDIDATE_ARCHIVE"
    # ┎ 명령이 끝나면 다음 검증에 실패 스위치가 새지 않게 제거합니다.
    unset DRAFT_SUITE_FAIL
    # ┎ 선택한 결과별로 기대되는 핀과 이벤트를 검사합니다.
    case "$outcome" in
      # ┎ 후보 검증이 성공해야 하는 경우의 기대값입니다.
      success)
        # ┎ 성공 사례의 bump 종료 코드가 0이어야 합니다.
        okay
        # ┎ 소비자 설정의 버전이 로컬 후보 버전으로 바뀌어야 합니다.
        jq -e --arg v "$V2" '.runtime.version==$v' "$APP/sobaya.json" >/dev/null || fail 'candidate pin absent'
        # ┎ 소비자 잠금의 runtime 객체가 로컬 후보 매니페스트와 정확히 같아야 합니다.
        jq -e --argjson p "$(jq .runtime "$CANDIDATE_MANIFEST")" '.runtime==$p' "$APP/sobaya.lock" >/dev/null || fail 'candidate identity absent'
        # ┎ Node suite가 후보 설정 버전을 읽었고 lint도 호출되었다는 기록이 있어야 합니다. 호출 횟수나 순서는 여기서 검사하지 않습니다.
        has "$DRAFT_EVENTS" "suite:$V2"; has "$DRAFT_EVENTS" lint ;;
      # ┎ suite 실패는 validation 오류로 거부되고 원래 두 핀을 복원해야 하며, 실패 전 후보 설정으로 suite를 실행한 기록은 있어야 합니다.
      suite-failure) rejected validation; pins_same; has "$DRAFT_EVENTS" "suite:$V2" ;;
      # ┎ 진행 중 상태는 active 오류로 거부하고 핀을 보존해야 하며, suite·lint 이벤트도 없어야 합니다.
      active) rejected active; pins_same; [ ! -s "$DRAFT_EVENTS" ] || fail 'active run allowed validation' ;;
    esac
    # ┎ 성공·실패·진행 중 거부 모두에서 합성 상태 전체의 바이트를 보존해야 합니다.
    same "$META/state.json" "$W/state.before"
    # ┎ bump는 어느 결과에서도 HEAD를 바꾸거나 커밋을 만들어서는 안 됩니다.
    [ "$(git -C "$APP" rev-parse HEAD)" = "$head_before" ] || fail 'bump committed'
    # ┎ bump는 어느 결과에서도 유효한 훅 경로를 바꾸지 않아야 합니다.
    [ "$(git -C "$APP" config core.hooksPath)" = "$hook_before" ] || fail 'bump changed hooks'
    # ┎ 두 핀을 제외한 추적 파일의 내용·링크·실행 여부 기록이 bump 전과 같아야 합니다.
    tracked_snapshot "$W/files.after"; same "$W/files.before" "$W/files.after"
  done
}

# ┎ 일곱 번째 사례: 진행 중 상태와 실제 잠금 소유 여부를 구분하며, 파일이 남아 있다는 이유만으로 계속 busy가 되지 않는지 확인합니다.
busy_tracks_live_locks() {
  # ┎ 설치만 된 새 fixture에서 시작하여 연결 여부와 별개로 busy 도우미를 검사합니다.
  fixture
  # ┎ 잠금과 상태를 둘 fixture 메타데이터 디렉터리를 준비합니다.
  mkdir -p "$META"
  # ┎ 진행 중 항목이 없는 최소 합성 상태를 만듭니다.
  jq -n '{active:null}' > "$META/state.json"
  # ┎ 잠금도 active 항목도 없으면 busy는 0이 아닌 코드를 반환해야 합니다.
  invoke busy; [ "$RC" -ne 0 ] || fail 'idle considered busy'
  # ┎ 진행 중 항목이 있는 합성 상태로 바꿉니다.
  jq -n '{active:{name:"pending"}}' > "$META/state.json"
  # ┎ OS 잠금 파일이 없어도 active 항목이 있으면 busy 판단이 참이어야 합니다.
  invoke busy; okay
  # ┎ 다음에는 OS 잠금만으로 판단하도록 active를 다시 null로 바꿉니다.
  jq -n '{active:null}' > "$META/state.json"
  # ┎ 앱 실행 잠금과 워크스페이스 관리 잠금 두 경로가 각각 busy 판단에 반영되는지 검사합니다.
  for lock in "$META/lock.shell" "$APP/.git/sobaya-management.lock"; do
    # ┎ shlock이 있으면 그 방식을 우선 사용합니다. 이 macOS 분기의 통과가 Linux flock 분기의 실행 증거가 되지는 않습니다.
    if command -v shlock >/dev/null; then
      # ┎ 실제 살아 있는 PID를 만들기 위해 30초 대기 프로세스를 백그라운드에 띄웁니다.
      sleep 30 & LOCK_PID=$!
      # ┎ 그 PID를 소유자로 하는 실제 shlock을 만들며, 준비에 실패하면 사례를 중단합니다.
      shlock -p "$LOCK_PID" -f "$lock" || fail 'cannot acquire fixture shlock'
      # ┎ 살아 있는 소유자가 잠금을 갖고 있을 때 busy는 참이어야 합니다.
      invoke busy; okay
      # ┎ 소유 프로세스를 종료하고 회수하되 잠금 파일은 다음 검증을 위해 남겨 둡니다.
      kill "$LOCK_PID"; wait "$LOCK_PID" 2>/dev/null || :; LOCK_PID=
      # ┎ 죽은 PID가 적힌 파일만 남았을 때는 busy가 거짓이어야 합니다.
      invoke busy; [ "$RC" -ne 0 ] || fail 'dead PID lock considered busy'
      # ┎ 이번 경로의 죽은 잠금 파일을 정리합니다.
      rm -f "$lock"
    # ┎ shlock이 없는 호스트에서는 시작 단계에서 확인한 flock을 사용해 다른 잠금 방식을 검사합니다.
    else
      # ┎ 잠금 보유 프로세스에 명시적으로 해제 시점을 알릴 로컬 FIFO를 만듭니다.
      mkfifo "$W/release-lock"
      # ┎ 백그라운드 프로세스가 실제 flock을 잡고 준비 표시를 남긴 뒤 FIFO 입력까지 기다리게 합니다.
      (exec 9> "$lock"; flock -n 9; touch "$W/ready"; IFS= read -r release < "$W/release-lock") & LOCK_PID=$!
      # ┎ 잠금 준비 표시가 생길 때까지 최대 100회 짧게 기다려 보유 상태에서 검사하도록 맞춥니다.
      for attempt in {1..100}; do [ -f "$W/ready" ] && break; sleep 0.05; done
      # ┎ 준비 표시가 없으면 잠금 검증을 수행했다고 주장하지 않고 실패합니다.
      [ -f "$W/ready" ] || fail 'fixture flock not acquired'
      # ┎ 실제 flock을 보유한 동안에는 busy가 참이어야 합니다.
      invoke busy; okay
      # ┎ FIFO에 해제 신호를 보내 잠금 보유 프로세스가 끝나도록 합니다.
      printf 'release\n' > "$W/release-lock"
      # ┎ 프로세스 종료와 파일 디스크립터 해제를 기다린 뒤 PID 정리값을 비웁니다.
      wait "$LOCK_PID"; LOCK_PID=
      # ┎ 동기화에 사용한 준비 표시와 FIFO를 정리합니다.
      rm -f "$W/ready" "$W/release-lock"
      # ┎ flock 파일은 남아 있어도 소유 디스크립터가 해제되었으므로 busy는 거짓이어야 합니다. 이 분기는 현재 macOS 실행으로 검증되지 않았습니다.
      invoke busy; [ "$RC" -ne 0 ] || fail 'unlocked persistent flock file considered busy'
      # ┎ 다음 잠금 경로를 검사하기 전에 남은 파일을 정리합니다.
      rm -f "$lock"
    fi
  done
}

# ┎ 여덟 번째 사례: 설치형 연결 후에도 collab run의 충돌 차단과 자식 명령 종료 결과 전달을 유지하는지 확인합니다.
run_keeps_collaboration_boundary() {
  # ┎ 설치 연결을 만들고 준비 커밋으로 기록합니다.
  fixture; attach; fixture_commit
  # ┎ 동료가 공통 관심 파일 package.json을 바꾼 상황을 만들기 위한 임시 내용을 씁니다.
  printf '{"changed":true}\n' > "$APP/package.json"
  # ┎ 동료 WIP에 넣을 내용을 인덱스에 올립니다.
  git -C "$APP" add package.json
  # ┎ 현재 인덱스를 Git 트리 객체로 저장합니다.
  tree=$(git -C "$APP" write-tree)
  # ┎ 현재 HEAD를 부모로 갖는 합성 WIP 커밋 객체를 만듭니다. 현재 브랜치 HEAD를 움직이는 커밋 명령은 아닙니다.
  sha=$(printf fixture-wip | git -C "$APP" commit-tree "$tree" -p HEAD)
  # ┎ 자신의 인덱스에서는 임시 package.json 변경을 되돌립니다.
  git -C "$APP" reset -q HEAD package.json
  # ┎ 자신의 작업 트리에서도 그 임시 파일을 제거합니다.
  rm "$APP/package.json"
  # ┎ 만든 WIP 객체를 로컬 원격의 다른 사용자 참조로 실제 push합니다.
  git -C "$APP" push -q origin "$sha:refs/wip/other/feat--other"
  # ┎ 실제 collab run에 표식 파일을 만드는 간단한 셸 명령을 넘깁니다. 유료 모델 워커를 호출하지 않습니다.
  invoke env CLAUDE_PROJECT_DIR="$APP" /bin/sh "$APP/scripts/collab.sh" run -- /bin/sh -c 'touch "$1"' worker "$W/ran"
  # ┎ 동료의 hotspot 충돌이 있으면 run은 실패해야 하고 자식 명령의 표식 파일도 없어야 합니다.
  [ "$RC" -ne 0 ] && [ ! -e "$W/ran" ] || fail 'worker ran despite hotspot conflict'
  # ┎ 거부 오류에 충돌 파일 package.json이 포함되어야 합니다.
  has "$R/err" package.json
  # ┎ 로컬 원격에서 동료 WIP 참조를 삭제하여 충돌을 해소합니다.
  git -C "$APP" push -q origin --delete refs/wip/other/feat--other
  # ┎ 소비자 저장소의 해당 로컬 WIP 참조도 제거합니다.
  git -C "$APP" update-ref -d refs/wip/other/feat--other
  # ┎ 충돌이 없는 상태에서는 표식을 만들고 17로 종료하는 자식 명령을 같은 collab run 경로로 실행합니다.
  invoke env CLAUDE_PROJECT_DIR="$APP" /bin/sh "$APP/scripts/collab.sh" run -- /bin/sh -c 'touch "$1"; exit 17' worker "$W/ran"
  # ┎ 표식이 생기고 종료 코드 17이 그대로 전달되어야 하므로 자식의 실행과 결과 전달을 함께 확인합니다.
  [ "$RC" -eq 17 ] && [ -e "$W/ran" ] || fail 'worker result not forwarded'
}

# ┎ 아홉 번째 사례: 공개 rc.1 코드로 격리된 fixture의 승인·RED·수정·검증·완료 상태까지 이어지는 흐름을 확인합니다.
published_runtime_completes_fixture_cycle() {
  # ┎ 실제 Poem 파일과 공개 런타임을 갖춘 새 fixture를 만듭니다.
  fixture
  # ┎ 덧셈 대신 항상 0을 반환하는 의도적인 오답 소스를 준비하여 새 테스트가 먼저 실패하게 합니다.
  printf 'module.exports = (a, b) => 0;\n' > "$APP/src/add.cjs"
  # ┎ fixture 안의 계획을 아래 한 항목으로 바꿉니다. 실사용 앱의 계획을 승인하거나 수정하는 행위가 아닙니다.
  cat > "$APP/failed-test.md" <<'PLAN'
# ┎ 이 문서가 격리된 fixture의 테스트 계획임을 표시합니다.
# Fixture plan
# ┎ 덧셈 항목을 담는 계획 구역입니다.
## Add
# ┎ 아래 헤더를 JavaScript 코드 블록으로 선언합니다.
```js
// ┎ 기존 suite.test.cjs에 새 테스트를 추가하도록 대상 파일을 지정합니다.
// file: suite.test.cjs
```
# ┎ 아직 완료되지 않은 installedAddition 항목과 두 입력의 합이라는 기대를 기록합니다.
- [ ] installedAddition — sums the two inputs
# ┎ 승인·materialize 경로가 읽을 실제 JavaScript 테스트 본문을 시작합니다.
```js
// ┎ 실제 모듈을 1과 2로 호출한 결과가 3이어야 합니다. 준비한 0 반환 구현에서는 실제 Node assertion이 실패합니다.
test('installedAddition', () => assert.equal(require('./src/add.cjs')(1, 2), 3));
```
PLAN
  # ┎ 모델 호출 대신 사용할 결정적인 fixture 워커 셸 스크립트를 만듭니다.
  cat > "$W/worker.sh" <<'WORKER'
# ┎ 이 워커는 Bash로 실행됩니다.
#!/bin/bash
# ┎ 워커 자체의 미정의 변수나 명령 오류도 실패로 드러내도록 합니다.
set -eu
# ┎ 런타임이 표준 입력으로 준 프롬프트를 보관하여 계약 경로 전달을 나중에 확인합니다.
cat >> "$DRAFT_PROMPTS"
# ┎ 런타임이 implement 역할로 호출했을 때만 소스를 수정합니다.
if [ "$SOBAYA_ROLE" = implement ]; then
  # ┎ 그 역할에서는 지정된 fixture 앱의 덧셈 소스를 고정된 올바른 식으로 바꿉니다. 생성형 모델 추론은 없습니다.
  printf 'module.exports = (a, b) => a + b;\n' > "$SOBAYA_APP/src/add.cjs"
fi
# ┎ 구현과 review 호출 모두 고정된 done 응답을 반환합니다. 독립된 모델의 품질 판단을 증명하는 리뷰는 아닙니다.
printf '%s\n' '{"status":"done","summary":"Deterministic fixture worker or review","reason":""}'
WORKER
  # ┎ 워커가 받은 프롬프트를 모을 로그 경로를 공유합니다.
  export DRAFT_PROMPTS="$W/prompts"
  # ┎ 구현·review 둘 다 같은 결정적 command 워커를 쓰고 호출 상한 3·시간 제한 30초를 설정합니다. fixture라는 model 문자열은 실제 제공자 모델이 아닙니다.
  jq -n --arg worker "$W/worker.sh" '{version:1,mode:"selected",default_worker:"fixture",review_worker:"fixture",max_calls:3,timeout_seconds:30,workers:{fixture:{adapter:"command",command:["/bin/bash",$worker],model:"fixture",guidance:"guided"}},escalation:[]}' > "$W/policy.json"
  # ┎ --cycle-support는 새 소비자 어댑터를 우회하고 공개 런타임 자체의 준비 가능성을 확인하는 별도 모드입니다.
  if [ "$CASE" = --cycle-support ]; then
    # ┎ 지원 확인 모드에서는 어댑터 없이 공개 CLI의 dependency init을 직접 실행합니다.
    invoke "$STORE/bin/sobaya" init --root "$APP" --install-root "$STORE" --mode dependency --version "$V1"
    # ┎ 직접 init이 성공해야 cycle 지원 확인을 계속합니다.
    okay
  # ┎ 일반 사례에서는 공통 attach 도우미를 통해 실제 소비자 어댑터를 거칩니다.
  else attach; fi
  # ┎ fixture 계획·소스·핀을 준비 커밋으로 기록합니다.
  fixture_commit
  # ┎ 이 fixture의 승인 기준으로 삼을 현재 HEAD를 저장합니다.
  baseline=$(git -C "$APP" rev-parse HEAD)
  # ┎ 실제 공개 CLI의 approve를 오직 임시 fixture 앱에 실행합니다. 실사용 Poem 앱이나 이번 초안에 대한 인간 승인을 대신하지 않습니다.
  invoke "$STORE/bin/sobaya" approve --root "$APP" --install-root "$STORE" --app "$APP"
  # ┎ fixture 승인 명령이 성공해야 합니다.
  okay
  # ┎ Poem의 실제 collab run 경계를 통해 공개 런타임 loop를 실행하고, 결정적 fixture 정책을 명시합니다.
  invoke env CLAUDE_PROJECT_DIR="$APP" /bin/sh "$APP/scripts/collab.sh" run -- "$STORE/bin/sobaya" loop --root "$APP" --install-root "$STORE" --app "$APP" --policy "$W/policy.json"
  # ┎ loop가 성공하며 출력에 RED와 PASS가 있어야 합니다. 두 문자열의 시간 순서를 이 줄 자체가 비교하지는 않습니다.
  okay; has "$R/out" RED; has "$R/out" PASS
  # ┎ loop 뒤 공개 런타임의 실제 최종 gate를 다시 실행합니다.
  invoke "$STORE/bin/sobaya" gate --root "$APP" --install-root "$STORE" --app "$APP"
  # ┎ 최종 gate도 성공해야 합니다.
  okay
  # ┎ 완료 뒤 현재 커밋 위치를 확인합니다.
  head=$(git -C "$APP" rev-parse HEAD)
  # ┎ 승인 baseline 유지·calls 2·active null·complete 상태·현재 HEAD를 가리키는 review를 확인합니다. review 판단자는 앞의 결정적 fixture입니다.
  jq -e --arg b "$baseline" --arg h "$head" '.baseline==$b and .calls==2 and .active==null and .status=="complete" and .review.head==$h' "$META/state.json" >/dev/null || fail 'cycle state/review continuity lost'
  # ┎ 계획에 installedAddition 완료 표시가 포함되어 있어야 합니다.
  has "$APP/failed-test.md" '[x] installedAddition'
  # ┎ 수집한 프롬프트에 설치된 rc.1의 실제 TDD 계약 경로가 포함되어야 합니다.
  has "$DRAFT_PROMPTS" "$STORE/runtimes/$V1/runtime/tdd-set/AGENTS.md"
  # ┎ 같은 프롬프트 기록에 소비자 앱 AGENTS.md 경로도 포함되어야 합니다.
  has "$DRAFT_PROMPTS" "$APP/AGENTS.md"
  # ┎ 완료 뒤 Git 상태 출력이 비어 있어야 하므로 보이는 작업 트리·인덱스 변경이 남아서는 안 됩니다.
  [ -z "$(git -C "$APP" status --porcelain)" ] || fail 'cycle left dirty app'
}

# ┎ 어댑터 없이 공개 런타임·로컬 후보·fixture 도구가 함께 실행 가능한지만 확인하는 지원 도우미입니다.
support_check() {
  # ┎ 새 fixture를 준비합니다.
  fixture
  # ┎ 공개 CLI의 dependency init을 직접 호출하므로 이 단계는 소비자 어댑터 attach를 검증하지 않습니다.
  invoke "$STORE/bin/sobaya" init --root "$APP" --install-root "$STORE" --mode dependency --version "$V1"
  # ┎ init 성공 뒤 준비 커밋과 보존 비교용 합성 상태를 만듭니다.
  okay; fixture_commit; protected_state
  # ┎ 공개 CLI로 로컬 fixture 후보 bump를 직접 요청합니다. 소비자 어댑터 bump 수용 증거는 아닙니다.
  invoke "$STORE/bin/sobaya" bump --root "$APP" --install-root "$STORE" --version "$V2" --manifest "$CANDIDATE_MANIFEST" --archive "$CANDIDATE_ARCHIVE"
  # ┎ bump가 성공하고 Node suite가 후보 설정 버전을 읽은 이벤트가 있어야 합니다.
  okay; has "$DRAFT_EVENTS" "suite:$V2"
  # ┎ 지원 확인에서도 합성 상태 바이트는 바뀌지 않아야 합니다.
  same "$META/state.json" "$W/state.before"
}

# ┎ 일반 실행 대상은 앞서 정의한 아홉 개 사례이며, 지원 확인 도우미는 별도 옵션으로만 실행합니다.
CASES='attach_preserves_app attach_rejects_conflicts sync_restores_exact_pin_without_plans hooks_join_and_status_preserve_connection worktree_does_not_detach_sibling bump_validates_and_preserves_state busy_tracks_live_locks run_keeps_collaboration_boundary published_runtime_completes_fixture_cycle'
# ┎ 요청된 옵션에 따라 지원 확인·목록 출력·실제 사례 실행을 구분합니다.
case "$CASE" in
  # ┎ --support-check는 지원 도우미만 실행하고, 출력에도 어댑터 수용 증거가 아니라고 명시합니다.
  --support-check) support_check; echo 'SUPPORT CHECK PASSED (not adapter acceptance)' ;;
  # ┎ --cycle-support는 직접 init을 쓰는 fixture cycle만 실행하고, 어댑터 수용 증거가 아니라고 명시합니다.
  --cycle-support) published_runtime_completes_fixture_cycle; echo 'CYCLE SUPPORT PASSED (not adapter acceptance)' ;;
  # ┎ --list는 사례 이름들을 출력합니다. 파일 상단의 자산 확인·후보 준비는 이 분기 전에 이미 수행되는 구조입니다.
  --list) printf '%s\n' $CASES ;;
  # ┎ 그 외 인자는 all 또는 특정 사례 이름으로 처리합니다.
  *)
    # ┎ 요청한 사례를 찾았는지 기록할 값을 초기화합니다.
    found=0
    # ┎ 등록된 아홉 사례 이름을 순서대로 확인합니다.
    for name in $CASES; do
      # ┎ all이거나 정확히 요청한 이름과 일치하는 사례만 실행합니다.
      [ "$CASE" = all ] || [ "$CASE" = "$name" ] || continue
      # ┎ 실행할 사례를 찾았음을 기록합니다.
      found=1
      # ┎ 선택한 테스트 함수를 실제로 호출합니다.
      "$name"
      # ┎ 해당 함수가 정상 종료한 뒤에만 그 사례의 PASS를 출력합니다.
      printf 'PASS: %s\n' "$name"
    done
    # ┎ 실행 대상으로 일치하는 이름이 하나도 없으면 알 수 없는 사례 오류로 실패합니다.
    [ "$found" -eq 1 ] || fail "unknown case: $CASE" ;;
esac
# ┎ 끝까지 진행했을 때 curl·codex 호출 로그가 조금이라도 만들어졌으면 실패합니다. gh 대체 조회나 임의의 다른 네트워크 경로까지 검증하는 조건은 아닙니다.
[ ! -e "$DRAFT_NETWORK_LOG" ] || fail 'unexpected network/provider invocation'
````

#!/bin/sh
# 실제 bare 원격과 서로 다른 소비 프로젝트 clone으로 경로/협업을 검증한다.
set -eu
SOURCE=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)
TMP=$(mktemp -d "${TMPDIR:-/tmp}/petra-consumer.XXXXXX")
trap '[ "${PETRA_KEEP_FIXTURE:-0}" = 1 ] || rm -rf "$TMP"' EXIT HUP INT TERM
unset CLAUDE_PROJECT_DIR PETRA_PROJECT_ROOT RUNTIME_ROOT GIT_DIR GIT_WORK_TREE GIT_COMMON_DIR
export GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null
export GIT_AUTHOR_NAME=fixture GIT_AUTHOR_EMAIL=fixture@example.invalid GIT_COMMITTER_NAME=fixture GIT_COMMITTER_EMAIL=fixture@example.invalid
count=0
ok() { count=$((count+1)); printf 'ok %s - %s\n' "$count" "$1"; }
has() { grep -qF -- "$2" "$1" || { echo "실패: $2 ($1)" >&2; cat "$1" >&2; exit 1; }; ok "$3"; }
deny() { if "$@" > "$TMP/deny.out" 2>&1; then echo "차단 실패: $*" >&2; exit 1; fi; }
p() { sh "$1/.petra/bin/petra" "$2" ${3:+"$3"}; }
commit() { git -C "$1" add -A; git -C "$1" commit -qm "$2"; }
claim() {
  repo=$1; branch=$2; owner=$3; goal=$4
  git -C "$repo" switch -qc "$branch" origin/main
  slug=$(printf '%s' "$branch" | sed 's#/#--#g')
  mkdir -p "$repo/.petra/collab/active/$slug"
  printf '%s\n' '---' "branch: $branch" "owner: $owner" "goal: $goal" 'status: active' '---' > "$repo/.petra/collab/active/$slug/claim.md"
  commit "$repo" '작업 선언'
  git -C "$repo" push -qu origin HEAD
}
sh "$SOURCE/bin/petra" pack "$TMP/package"
deny sh "$SOURCE/bin/petra" pack "$TMP/package"
ok '기존 경로에 패키징하지 않음'
sh "$TMP/package/.petra/bin/petra" verify
ok '관리 파일 해시와 Git 훅 권한 검증'
[ ! -e "$TMP/package/README.md" ] && [ ! -e "$TMP/package/AGENTS.md" ] && [ ! -e "$TMP/package/tests" ]
ok '제작 리포의 앱 문서/테스트가 배포되지 않음'
[ "$(find "$TMP/package/.petra/collab" -type f ! -name README.md | wc -l | tr -d ' ')" = 0 ]
ok '실제 팀 claim/저널이 배포되지 않음'
git init -q --bare --initial-branch=main "$TMP/origin.git"
git init -q --initial-branch=main "$TMP/package"
mkdir -p "$TMP/package/lib" "$TMP/package/app"
printf '# 쇼핑몰\n프로젝트가 소유하는 README.\n' > "$TMP/package/README.md"
printf '# 쇼핑몰 에이전트 계약\n- Test: `node --test`\n협업은 .petra/AGENTS.md를 읽고 시작한다.\n' > "$TMP/package/AGENTS.md"
printf 'export const price = (value) => value;\n' > "$TMP/package/lib/price.js"
printf '{}\n' > "$TMP/package/package.json"
commit "$TMP/package" '쇼핑몰 초기 코드'
git -C "$TMP/package" remote add origin "$TMP/origin.git"
git -C "$TMP/package" push -qu origin main
git clone -q "$TMP/origin.git" "$TMP/solp"
git clone -q "$TMP/origin.git" "$TMP/amazon"
A="$TMP/solp"; B="$TMP/amazon"
mkdir -p "$A/app" "$B/app"
before=$(shasum -a 256 "$A/README.md" "$A/AGENTS.md")
p "$A" join solp; p "$B" join amazon
[ "$(git -C "$A" config core.hooksPath)" = .githooks ]
ok '각 clone에서 실제 Git 훅 활성화'
[ "$before" = "$(shasum -a 256 "$A/README.md" "$A/AGENTS.md")" ]
ok '합류 후 앱 문서와 Test 계약 보존'
deny p "$A" guard "$A/app/page.js"
ok '소비 프로젝트 main 코드 수정 차단'
git -C "$A" switch -qc feat/no-claim origin/main
printf 'no claim\n' > "$A/app/page.js"
git -C "$A" add app/page.js
deny git -C "$A" commit -qm '선언 없는 변경'
ok 'CLI 호출 없이 실제 pre-commit이 claim 없는 커밋 차단'
git -C "$A" reset -q
rm "$A/app/page.js"
git -C "$A" switch -q main
claim "$A" feat/products solp '상품 가격 표시'
claim "$B" feat/cart amazon '장바구니 합계'
mkdir -p "$A/app" "$B/app"
p "$A" digest --fetch > "$TMP/start.out"
has "$TMP/start.out" '@amazon' '다른 clone의 작업 선언을 원격에서 읽음'
has "$TMP/start.out" '장바구니 합계' '동료 목표를 읽음'
printf 'import { price } from "../lib/price.js";\nexport const total = price(10);\n' > "$B/app/cart.js"
printf 'export const price = (value, currency) => value;\n' > "$A/lib/price.js"
day=$(date +%F)
printf '# 가격 계약\n\n## 이벤트\n- changed lib/price.js currency 인자가 추가됨 → 호출자는 통화를 넘겨야 함\n- ask @amazon 장바구니가 KRW를 사용할까요?\n\n## 남은 것\n- 가격 표시 UI\n' > "$A/.petra/collab/journal/$day-solp-price.md"
commit "$A" '가격 함수 계약 공유'
p "$B" digest --fetch > "$TMP/events.out"
has "$TMP/events.out" 'currency 인자가 추가됨' '다른 파일의 import 관계로 변경 이벤트 도착'
has "$TMP/events.out" 'KRW' '질문 수신'
printf '{"editing":"amazon"}\n' > "$B/package.json"
p "$B" pulse > "$TMP/pulse.out"
p "$A" digest --fetch > "$TMP/wip.out"
deny p "$A" guard "$A/package.json"
ok '동료가 미커밋 편집 중인 허브 파일 차단'
p "$A" guard "$A/app/products.js"
ok '다른 기능 파일은 차단하지 않음'
printf '# 답\n\n## 이벤트\n- reply @solp 장바구니는 KRW를 사용합니다\n\n## 남은 것\n- 수량 UI\n' > "$B/.petra/collab/journal/$day-amazon-reply.md"
commit "$B" '장바구니 가격 호출과 답변'
p "$A" digest --fetch > "$TMP/reply.out"
p "$A" guard "$A/package.json"
ok '동료 커밋 이후 허브의 편집 잠금 해제'
has "$TMP/reply.out" 'KRW를 사용합니다' '저널 답변이 상대에게 도착'
p "$B" digest > "$TMP/answered.out"
if grep -qF 'KRW를 사용할까요' "$TMP/answered.out"; then echo '답한 질문이 남아 있음' >&2; exit 1; fi
ok '답변 후 질문 반복 종료'
p "$A" check > "$TMP/check.out"
has "$TMP/check.out" '통과' '소비 경로의 저널과 claim으로 PR 검사'
p "$A" pr-body > "$TMP/pr.out"
has "$TMP/pr.out" 'currency' '소비 경로에서 PR 본문 생성'
[ ! -e "$A/.claude/cache" ] && [ -d "$A/.git/petra" ]
ok '캐시는 앱 파일이 아닌 Git 메타데이터에 위치'
git -C "$A" worktree add -q -b feat/other "$TMP/worktree" origin/main
p "$TMP/worktree" join solp
p "$TMP/worktree" digest > "$TMP/worktree.out"
meta=$(git -C "$TMP/worktree" rev-parse --absolute-git-dir)
[ -d "$meta/petra" ] && [ "$meta/petra" != "$A/.git/petra" ]
ok 'worktree별 캐시 격리'
(cd "$B" && GIT_DIR="$B/.git" GIT_WORK_TREE="$B" CLAUDE_PROJECT_DIR="$B" p "$A" digest --json) > "$TMP/target.json"
[ "$(jq -r '.me' "$TMP/target.json")" = solp ]
ok '다른 프로젝트 cwd/Git 환경에서도 명시적 PETRA 대상 유지'
git clone -q "$TMP/origin.git" "$TMP/legacy"
L="$TMP/legacy"
git -C "$L" switch -qc feat/legacy origin/main
rm -rf "$L/.petra"
mkdir -p "$L/collab/active/feat--legacy" "$L/collab/journal"
printf '%s\n' '---' 'branch: feat/legacy' 'owner: legacy' 'goal: 예전 경로 브랜치' 'status: active' '---' > "$L/collab/active/feat--legacy/claim.md"
printf '# 구형\n\n## 이벤트\n- added lib/legacy.js 구형 브랜치 이벤트\n\n## 남은 것\n- 없음\n' > "$L/collab/journal/$day-legacy-entry.md"
printf 'export const legacy = true;\n' > "$L/lib/legacy.js"
commit "$L" '이전 구조의 브랜치'
git -C "$L" push -qu origin HEAD
p "$A" digest --fetch > "$TMP/legacy.out"
has "$TMP/legacy.out" '예전 경로 브랜치' 'manifest 없는 원격 브랜치의 collab claim 읽기'
has "$TMP/legacy.out" '구형 브랜치 이벤트' '원격 브랜치 자체 경로에서 저널 읽기'
deny git -C "$A" push origin HEAD:main
ok '실제 pre-push에서 main 직접 push 차단'
printf 'tampered\n' >> "$TMP/package/.petra/runtime/scripts/collab.sh"
deny p "$TMP/package" verify
ok '관리 실행 코드 변경 검출'
printf '\n%s checks passed\nfixture=%s\n' "$count" "$TMP"

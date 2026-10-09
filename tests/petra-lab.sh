#!/bin/sh
# 수동 실험실의 재사용·보존·경로 제약을 실제 Git 환경에서 검증한다.
set -eu
SOURCE=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)
name="${PETRA_LAB_TEST_NAME:-lifecycle-$$}"
LAB="$SOURCE/.petra-lab/$name"
lab() { sh "$SOURCE/scripts/petra-lab.sh" --name "$name" "$@"; }
count=0
ok() { count=$((count+1)); echo "ok $count - $1"; }
deny() { if "$@"; then echo '거절해야 하는 요청을 허용함' >&2; exit 1; fi; }
lab status
[ ! -e "$LAB" ]; ok 'status는 없는 환경을 만들지 않음'
lab up
old=$(readlink "$LAB/current")
printf '수동 작업 보존\n' > "$LAB/current/solp/manual.txt"
lab up
[ "$(readlink "$LAB/current")" = "$old" ] && [ -f "$LAB/current/solp/manual.txt" ]
ok 'up을 다시 실행해도 수동 작업 보존'
(cd "$LAB/current/solp" && node --test)
ok '실제 앱 Test 명령 동작'
lab reset
[ "$(readlink "$LAB/current")" != "$old" ] && [ -f "$LAB/$old/solp/manual.txt" ] && [ ! -e "$LAB/current/solp/manual.txt" ]
ok 'reset은 이전 작업을 보관하고 새 환경으로 전환'
for owner in solp amazon; do
  [ "$(git -C "$LAB/current/$owner" config collab.me)" = "$owner" ]
  [ "$(git -C "$LAB/current/$owner" config core.hooksPath)" = .githooks ]
done
ok '두 clone의 핸들과 실제 Git 훅 준비'
deny sh "$SOURCE/scripts/petra-lab.sh" --name ../escape reset
ok '이름으로 실험실 경로를 벗어날 수 없음'
mkdir "$LAB/.lock"
deny lab reset
rmdir "$LAB/.lock"
ok '동일 환경 동시 초기화 차단'
ln -s "$SOURCE" "$SOURCE/.petra-lab/symlink-$$"
deny sh "$SOURCE/scripts/petra-lab.sh" --name "symlink-$$" reset
rm "$SOURCE/.petra-lab/symlink-$$"
ok '외부 디렉토리로 연결된 실험실 거절'
git -C "$SOURCE" check-ignore -q .petra-lab/
ok '생성한 환경은 제작 리포 커밋에서 제외'
current=$(readlink "$LAB/current")
printf '자동 검사와 수동 작업은 독립\n' > "$LAB/current/solp/manual.txt"
lab test
jq -e '.status == "passed" and .exit_code == 0' "$LAB/last-test.json" >/dev/null
ok '자동 검사 결과와 로그를 저장'
[ "$(readlink "$LAB/current")" = "$current" ] && [ -f "$LAB/current/solp/manual.txt" ]
ok '자동 검사는 수동 세션을 초기화하지 않음'
printf '\n%s lab checks passed\n' "$count"

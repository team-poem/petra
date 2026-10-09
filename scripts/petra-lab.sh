#!/bin/sh
# 이 리포의 fixture로 수동 작업 공간과 매번 독립된 회귀 실행을 만든다.
set -eu
SOURCE=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)
. "$SOURCE/tests/support/petra-fixture.sh"
petra_fixture_isolate
name=dev
if [ "${1:-}" = --name ]; then [ $# -ge 2 ] || exit 1; name=$2; shift 2; fi
case "$name" in ''|*[!a-z0-9-]*|-*) echo '실험실 이름은 소문자·숫자·하이픈을 사용합니다' >&2; exit 1 ;; esac
command=${1:-status}; [ $# -le 1 ] || exit 1
BASE="$SOURCE/.petra-lab"; LAB="$BASE/$name"
fail() { echo "PETRA lab: $*" >&2; exit 2; }
for dir in "$BASE" "$LAB" "$LAB/runs"; do [ ! -L "$dir" ] || fail "실험실 디렉토리는 심링크일 수 없습니다: $dir"; done

validate_lab() {
  [ -f "$LAB/owner.json" ] && [ ! -L "$LAB/owner.json" ] || fail '이 도구가 만든 실험실이 아닙니다'
  jq -e --arg source "$SOURCE" --arg name "$name" '.schema == 1 and .source == $source and .name == $name' "$LAB/owner.json" >/dev/null || fail '실험실 소유 경로가 다릅니다'
}
ensure_lab() {
  if [ -e "$LAB" ]; then validate_lab
  else
    mkdir -p "$LAB/runs"
    jq -n --arg source "$SOURCE" --arg name "$name" '{schema:1,source:$source,name:$name}' > "$LAB/owner.json"
  fi
}
current_run() {
  [ -L "$LAB/current" ] || { [ ! -e "$LAB/current" ] || fail 'current가 관리 심링크가 아닙니다'; return 1; }
  link=$(readlink "$LAB/current")
  case "$link" in runs/manual.*) ;; *) fail 'current가 관리 실행 경로 밖을 가리킵니다' ;; esac
  tail=${link#runs/}; case "$tail" in *[!a-zA-Z0-9.-]*) fail '잘못된 실행 경로' ;; esac
  [ ! -L "$LAB/$link" ] && [ -f "$LAB/$link/environment.json" ] || fail '수동 환경 기록이 없습니다'
  printf '%s' "$LAB/$link"
}
show_current() {
  if current=$(current_run); then :; else
    rc=$?; [ "$rc" = 1 ] || exit "$rc"
    echo '수동 환경 없음: sh scripts/petra-lab.sh up'; return
  fi
  echo "solp:   $LAB/current/solp"
  echo "amazon: $LAB/current/amazon"
  echo "원격:   $current/origin.git (이 리포 내부)"
  source_commit=$(jq -r .source_commit "$current/environment.json")
  echo "준비한 소스: $source_commit"
  [ "$source_commit" = "$(git -C "$SOURCE" rev-parse HEAD)" ] || echo '현재 HEAD와 다릅니다. 최신 코드로 다시 준비하려면 reset을 실행하세요.'
  [ "$(jq -r .source_dirty "$current/environment.json")" != true ] || echo '준비 당시 커밋 전 변경도 포함됐습니다. 정확한 파일은 package/.petra/manifest.json에 기록됐습니다.'
}
make_current() {
  if previous=$(current_run); then :; else
    rc=$?; [ "$rc" = 1 ] || exit "$rc"; previous=''
  fi
  run=$(mktemp -d "$LAB/runs/manual.XXXXXX")
  sh "$SOURCE/bin/petra" pack "$run/package"
  petra_fixture_seed "$SOURCE" "$run"
  for owner in solp amazon; do sh "$run/$owner/.petra/bin/petra" join "$owner"; done
  jq '{source_commit,source_dirty,version}' "$run/package/.petra/manifest.json" > "$run/environment.json"
  ln -sfn "runs/${run##*/}" "$LAB/current"
  [ -z "$previous" ] || echo "이전 수동 작업은 보존됐습니다: $previous"
  show_current
}

case "$command" in
  status)
    [ -e "$LAB" ] || { echo '실험실 없음: sh scripts/petra-lab.sh up'; exit 0; }
    validate_lab; show_current
    if [ -f "$LAB/last-test.json" ]; then
      jq -r '"최근 자동 검사: \(.status) (exit \(.exit_code))\n결과: \(.run)/result.json\n로그: \(.run)/test.log"' "$LAB/last-test.json"
    fi
    exit 0 ;;
  up|reset|test) ensure_lab ;;
  *) fail '사용법: sh scripts/petra-lab.sh [--name <이름>] up|status|reset|test' ;;
esac
mkdir "$LAB/.lock" 2>/dev/null || fail "다른 실험실 명령이 실행 중입니다: $LAB/.lock"
trap 'rmdir "$LAB/.lock"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM HUP
case "$command" in
  up)
    if current_run >/dev/null; then show_current; else make_current; fi ;;
  reset) make_current ;;
  test)
    run=$(mktemp -d "$LAB/runs/test.XXXXXX")
    echo "자동 검사 실행 중: $run/test.log"
    rc=0
    sh "$SOURCE/tests/petra.sh" --keep-at "$run/fixture" > "$run/test.log" 2>&1 || rc=$?
    cat "$run/test.log"
    status=passed; [ "$rc" = 0 ] || status=failed
    jq -n --arg status "$status" --arg run "$run" --arg source_commit "$(git -C "$SOURCE" rev-parse HEAD)" --argjson rc "$rc" \
      '{status:$status,exit_code:$rc,run:$run,source_commit:$source_commit}' > "$run/result.json"
    [ ! -L "$LAB/last-test.json" ] && [ ! -d "$LAB/last-test.json" ] || fail '최근 검사 기록 경로가 파일이 아닙니다'
    cp "$run/result.json" "$LAB/.last-test.$$"
    mv -f "$LAB/.last-test.$$" "$LAB/last-test.json"
    echo "검사 결과: $run/result.json"
    exit "$rc" ;;
esac

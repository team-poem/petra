#!/bin/sh
# 이미 설정된 프로젝트에 합류하는 사람의 개인 설정. 멱등. 사용: sh harness/join.sh <핸들>
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"; cd "$ROOT"
. "$ROOT/harness/sobaya/installed-lib.sh"
si_setup_collab_hooks "$ROOT"
handle="${1:-}"; [ -n "$handle" ] || { printf '핸들 (영문, 공백·하이픈 없이): '; read -r handle; }
handle="$(printf '%s' "$handle" | tr ' -' '__')"; [ -n "$handle" ] || { echo "핸들이 필요합니다"; exit 1; }
git config collab.me "$handle"; git config rerere.enabled true
chmod +x harness/hooks/*.sh harness/*.sh .githooks/* scripts/*.sh tests/*.sh 2>/dev/null || true
echo "✓ 핸들 @$handle · rerere · 협업 git 훅(기존 설치형 연결 유지)"
if [ -f harness/sobaya.lock ]; then
  if sh harness/attach-sobaya.sh sync >/dev/null 2>&1; then echo "✓ sobaya 동기화 (팀 lock 기준)"; else echo "! sobaya 동기화 실패 — sh harness/attach-sobaya.sh check 로 확인 (워크스페이스가 없으면 이 리포를 <sobaya>/apps/ 아래에 두세요)"; fi
fi
if [ -e sobaya.json ] || [ -e sobaya.lock ]; then
  echo '설치형 sobaya: sh harness/sobaya-installed.sh sync --install-root "$store" (빈 저장소는 --cli "$trusted_cli" 추가). 기능 명세를 준비한 뒤 attach 하세요.'
fi
echo "합류 완료. 세션을 켜면 협업 현황이 먼저 뜹니다. 첫 작업은 start-work."

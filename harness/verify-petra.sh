#!/bin/sh
set -eu
root=$1
manifest="$root/.petra/manifest.json"
[ -f "$manifest" ] && [ ! -L "$manifest" ] || { echo 'PETRA manifest 없음 또는 심링크' >&2; exit 1; }
jq -e '.schema == 1 and .records == ".petra/collab" and (.managed | type == "array" and length > 0) and all(.managed[]; (.path | test("^(\\.petra/|\\.githooks/|\\.claude/)")) and (.path | contains("..") | not) and (.sha256 | test("^[a-f0-9]{64}$")))' "$manifest" >/dev/null
list=$(mktemp); trap 'rm -f "$list"' EXIT HUP INT TERM
jq -r '.managed[] | [.path,.sha256] | @tsv' "$manifest" > "$list"
while IFS="$(printf '\t')" read -r path expected; do
  file="$root/$path"
  [ -f "$file" ] && [ ! -L "$file" ] || { echo "PETRA 파일 없음/심링크: $path" >&2; exit 1; }
  parent=$(CDPATH= cd -- "$(dirname -- "$file")" && pwd -P)
  case "$parent" in "$root"/*) ;; *) echo 'PETRA 경로가 프로젝트 밖을 가리킵니다' >&2; exit 1 ;; esac
  actual=$(shasum -a 256 "$file" | awk '{print $1}')
  [ "$actual" = "$expected" ] || { echo "PETRA 파일 변경 감지: $path" >&2; exit 1; }
done < "$list"
for file in pre-commit pre-push post-commit pre-merge-commit; do [ -x "$root/.githooks/$file" ] || { echo "Git 훅 실행 권한 없음: $file" >&2; exit 1; }; done
echo 'PETRA 패키지 파일 검증 통과 (에이전트 자동 훅 지원 판정은 별도)'

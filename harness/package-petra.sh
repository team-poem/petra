#!/bin/sh
# 기존 프로젝트를 건드리지 않는 staging 패키지. 적용은 install이 맡는다.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)
[ $# -eq 1 ] || { echo '사용법: sh bin/petra pack <존재하지 않는 경로>' >&2; exit 1; }
command -v jq >/dev/null || { echo 'jq 필요' >&2; exit 1; }
out=$1
[ ! -e "$out" ] && [ ! -L "$out" ] || { echo '기존 경로에는 패키징하지 않습니다' >&2; exit 1; }
mkdir -p "$out/.petra/runtime/scripts" "$out/.petra/runtime/harness/hooks" "$out/.petra/runtime/harness/sobaya" "$out/.petra/bin" "$out/.petra/collab/active" "$out/.petra/collab/journal" "$out/.petra/templates" "$out/.githooks" "$out/.claude" "$out/.agents/skills/petra" "$out/.claude/skills/petra" "$out/.github/workflows" "$out/.github/PULL_REQUEST_TEMPLATE"
cp "$ROOT/bin/petra" "$out/.petra/bin/petra"
cp "$ROOT/scripts/collab.sh" "$out/.petra/runtime/scripts/collab.sh"
for file in lib.sh guard.sh session-start.sh post-edit.sh stop.sh; do cp "$ROOT/harness/hooks/$file" "$out/.petra/runtime/harness/hooks/$file"; done
cp "$ROOT/harness/sobaya/installed-lib.sh" "$out/.petra/runtime/harness/sobaya/installed-lib.sh"
cp "$ROOT/harness/sobaya-installed.sh" "$out/.petra/runtime/harness/sobaya-installed.sh"
cp "$ROOT/harness/verify-petra.sh" "$out/.petra/runtime/harness/verify-petra.sh"
cp "$ROOT/harness/petra-files.mjs" "$out/.petra/runtime/harness/petra-files.mjs"
cp "$ROOT/harness/run-petra.mjs" "$out/.petra/runtime/harness/run-petra.mjs"
cp "$ROOT/harness/checkpoint-petra.mjs" "$out/.petra/runtime/harness/checkpoint-petra.mjs"
cp "$ROOT/collab/templates/claim.md" "$out/.petra/templates/claim.md"
cp "$ROOT/harness/templates/petra/journal.md" "$out/.petra/templates/journal.md"
for file in pre-commit pre-push post-commit pre-merge-commit; do cp "$ROOT/.githooks/$file" "$out/.githooks/$file"; chmod +x "$out/.githooks/$file"; done
for file in AGENTS.md README.md config.sh; do cp "$ROOT/harness/templates/petra/$file" "$out/.petra/$file"; done
cp "$ROOT/harness/templates/petra/skills/petra/SKILL.md" "$out/.agents/skills/petra/SKILL.md"
cp "$ROOT/harness/templates/petra/skills/petra/SKILL.md" "$out/.claude/skills/petra/SKILL.md"
cp "$ROOT/harness/templates/petra/pull-request.md" "$out/.github/PULL_REQUEST_TEMPLATE/petra.md"
cp "$ROOT/harness/templates/petra/petra-check.yml" "$out/.github/workflows/petra-check.yml"
printf '# 작업 선언\n브랜치별 claim.md를 새로 추가한다.\n' > "$out/.petra/collab/active/README.md"
printf '# 팀 저널\n실제 이벤트는 새 날짜-owner 파일로 기록한다.\n' > "$out/.petra/collab/journal/README.md"
jq -n '{hooks:{SessionStart:[{matcher:"startup|resume|clear",hooks:[{type:"command",command:"sh \"$CLAUDE_PROJECT_DIR/.petra/bin/petra\" hook session-start"}]}],PreToolUse:[{matcher:"Write|Edit|MultiEdit|NotebookEdit|Bash",hooks:[{type:"command",command:"sh \"$CLAUDE_PROJECT_DIR/.petra/bin/petra\" hook guard"}]}],PostToolUse:[{matcher:"Write|Edit|MultiEdit|NotebookEdit|Bash",hooks:[{type:"command",command:"sh \"$CLAUDE_PROJECT_DIR/.petra/bin/petra\" hook post-edit"}]}],Stop:[{hooks:[{type:"command",command:"sh \"$CLAUDE_PROJECT_DIR/.petra/bin/petra\" hook stop"}]}]}}' > "$out/.claude/settings.json"
list=$(mktemp); trap 'rm -f "$list"' EXIT HUP INT TERM
# 설정과 협업 기록은 프로젝트 소유. manifest 자체는 순환 해시로 만들지 않는다.
find "$out/.petra" "$out/.githooks" "$out/.claude" "$out/.agents" "$out/.github" -type f ! -path "$out/.petra/config.sh" ! -path "$out/.petra/collab/*" | LC_ALL=C sort | while IFS= read -r file; do
  hash=$(shasum -a 256 "$file" | awk '{print $1}')
  jq -nc --arg path "${file#"$out"/}" --arg sha256 "$hash" '{path:$path,sha256:$sha256}'
done > "$list"
source=$(git -C "$ROOT" rev-parse HEAD)
dirty=false; [ -z "$(git -C "$ROOT" status --porcelain)" ] || dirty=true
jq -n --arg version "$(cat "$ROOT/harness/VERSION")" --arg source "$source" --argjson dirty "$dirty" --slurpfile managed "$list" '{schema:1,version:$version,source_commit:$source,source_dirty:$dirty,records:".petra/collab",managed:$managed}' > "$out/.petra/manifest.json"
printf '개발용 PETRA 패키지: %s\n' "$out"

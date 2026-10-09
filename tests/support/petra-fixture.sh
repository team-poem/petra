#!/bin/sh
# 테스트와 수동 실험실이 같은 앱 골격·Git 준비 절차를 사용한다.
petra_fixture_isolate() {
  for petra_var in $(git rev-parse --local-env-vars); do unset "$petra_var"; done
  unset CLAUDE_PROJECT_DIR PETRA_PROJECT_ROOT RUNTIME_ROOT GITHUB_HEAD_REF
  export GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null
  export GIT_AUTHOR_NAME=fixture GIT_AUTHOR_EMAIL=fixture@example.invalid
  export GIT_COMMITTER_NAME=fixture GIT_COMMITTER_EMAIL=fixture@example.invalid
}

petra_fixture_seed() (
  petra_source=$1; petra_dir=$2
  [ -f "$petra_dir/package/.petra/manifest.json" ] || { echo '먼저 PETRA pack이 필요합니다' >&2; exit 1; }
  for petra_path in origin.git solp amazon package/.git package/README.md package/AGENTS.md package/package.json package/lib package/tests; do
    [ ! -e "$petra_dir/$petra_path" ] && [ ! -L "$petra_dir/$petra_path" ] || { echo "기존 실험 환경은 덮어쓰지 않습니다: $petra_path" >&2; exit 1; }
  done
  cp -R "$petra_source/tests/fixtures/shop/." "$petra_dir/package/"
  git init -q --bare --initial-branch=main "$petra_dir/origin.git"
  git init -q --initial-branch=main "$petra_dir/package"
  git -C "$petra_dir/package" add -A
  git -C "$petra_dir/package" commit -qm '테스트 쇼핑몰 초기 코드'
  git -C "$petra_dir/package" remote add origin "$petra_dir/origin.git"
  git -C "$petra_dir/package" push -qu origin main
  for petra_owner in solp amazon; do
    git clone -q "$petra_dir/origin.git" "$petra_dir/$petra_owner"
    git -C "$petra_dir/$petra_owner" config user.name "$petra_owner"
    git -C "$petra_dir/$petra_owner" config user.email "$petra_owner@example.invalid"
    mkdir -p "$petra_dir/$petra_owner/app"
  done
)

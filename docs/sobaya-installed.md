# 설치형 Sobaya 연결하기

이 문서는 기존 프로젝트와 이 템플릿으로 만든 프로젝트에 **Sobaya v1을 선택적으로 연결하는 절차**다. Sobaya는 사람이 승인한 테스트의 구현·검증을, Poem은 작업 선언·충돌 확인·인수인계를 담당한다. 설치형 유지보수 테스트의 v3 교체본은 2026-10-07 사람의 승인을 받아 적용했다. 실제 소비자 앱의 명세와 테스트는 각 프로젝트에서 별도로 검토·승인한다.

## 연결 방식과 파일

| 방식 | 프로젝트 위치 | 팀이 공유하는 버전 | 명령 |
|---|---|---|---|
| 기존 소스 클론 | `<sobaya>/apps/<프로젝트>` | `harness/sobaya.lock`의 소스 커밋 | `harness/attach-sobaya.sh attach\|sync\|update\|check` |
| 설치형 종속 모드 | 기존 Git 프로젝트 위치 유지 | 루트 `sobaya.json`과 `sobaya.lock`의 정확한 버전·커밋·아카이브 해시 | `harness/sobaya-installed.sh attach\|sync\|bump\|check` |

설치형은 현재 프로젝트 자체를 Sobaya의 소비 루트이자 앱으로 사용한다. 프로젝트를 Sobaya 소스 안으로 옮기지 않는다. 개인 런타임 저장소는 프로젝트 밖에 두고 명령마다 `--install-root`로 지정한다. 경로를 공유 pin에 기록하지 않는다.

```text
~/projects/shop/                   소비 프로젝트
  AGENTS.md                       기존 실제 파일과 Test: 유지
  sobaya.json · sobaya.lock        팀의 정확한 출시 버전
  spec.md · failed-test.md         기능 브랜치에서만 존재
~/.local/share/sobaya-store/       개인 설치 저장소의 예
  bin/sobaya
  runtimes/1.0.0-rc.1/
```

연결·승인·전달 훅 정보는 각 worktree의 Git 메타데이터 아래에 둔다. `connected=true`는 테스트 승인이나 완료를 뜻하지 않는다. 앱의 `CLAUDE.md` 링크를 다시 만들지 않는다.

## 1. 신뢰한 공개 버전 설치

Bash 3.2, jq, Git, tar, gzip, shasum과 macOS/BSD의 shlock 또는 Linux의 flock이 필요하다. 앱의 전체 테스트·포맷·린트 도구와 검토된 worker policy의 실행기는 별도다. 다운로드할 때는 curl도 필요하다.

기준 시험판은 [Sobaya v1.0.0-rc.1](https://github.com/team-poem/sobaya/releases/tag/v1.0.0-rc.1)이다. 이 릴리스의 `install-runtime.sh`, `sobaya-1.0.0-rc.1.json`, `sobaya-1.0.0-rc.1.tar.gz`를 별도로 확보한다. GitHub의 자동 생성 Source code 압축 파일을 대신 쓰지 않는다. 설치기와 매니페스트의 출처를 확인한 뒤, 실행 전에 다음 SHA-256과 비교한다.

| 파일 | SHA-256 |
|---|---|
| `install-runtime.sh` | `4f2201dfe8afe7041233451bcfd4de24b86a9e3ddd5558f5e525bba9d7fb2ccf` |
| `sobaya-1.0.0-rc.1.json` | `e19564a05a104e4f38c4403495d100ede632d7c844daf64fae67adeada3b3e26` |
| `sobaya-1.0.0-rc.1.tar.gz` | `d8b4e49a149a0e637c94a6663fb6433b8d0621dc376e31d776babbea247551b8` |

매니페스트의 `runtime.version`은 `1.0.0-rc.1`, `runtime.commit`은 `d06384544e81cd373d81e2a940ab336868e04854`다. 버전 문자열에는 `v`를 붙이지 않는다. 해시 비교는 받은 파일의 일치를 확인하며, 신뢰하지 않는 매니페스트의 출처를 대신 증명하지 않는다.

프로젝트 디렉터리에서, 실제 절대 경로로 바꿔 실행한다. 세 해시가 모두 일치하기 전에는 설치기를 실행하지 않는다.

```sh
app_root=$(pwd -P)
store="/absolute/path/to/personal-sobaya-store"
assets="/absolute/path/to/verified-rc1-assets"

(cd "$assets" && shasum -a 256 install-runtime.sh sobaya-1.0.0-rc.1.json sobaya-1.0.0-rc.1.tar.gz)

/bin/bash "$assets/install-runtime.sh" \
  --root "$app_root" --install-root "$store" --version 1.0.0-rc.1 \
  --manifest "$assets/sobaya-1.0.0-rc.1.json" \
  --archive "$assets/sobaya-1.0.0-rc.1.tar.gz"
```

설치는 프로젝트의 명세·테스트·승인을 만들지 않는다. 이후 명령도 별도의 설치기나 실행 코드를 암묵적으로 받아 실행하지 않는다. 설치가 끝나면 `$store/bin/sobaya`를 사용한다.

## 2. 최초 attach 전에 worktree 설정 확인

승인 상태는 git-dir마다 하나이므로 승인 브랜치와 다른 작업은 `sh scripts/collab.sh worktree <branch>`로 분리한다. 설치형 연결 전에 `extensions.worktreeConfig=true`가 준비돼 있어야 한다. 이 설정은 저장소 전체의 설정 해석을 바꾸므로, 기존 worktree와 설정을 먼저 확인한다.

```sh
git rev-parse --is-bare-repository
git worktree list --porcelain
git config --show-origin --get-all core.hooksPath || :
git config --local --get-regexp '^(core\.(bare|worktree|sparseCheckout)|extensions\.worktreeConfig)$' || :
```

비 bare 프로젝트에서 준비한다. 특히 공통 설정의 `core.worktree`, `core.bare=true`, worktree마다 다른 훅이나 sparse-checkout 설정이 있으면 그대로 확장을 켜지 않는다. Git의 `git help worktree` 중 CONFIGURATION FILE 절에 따라 주 worktree의 `config.worktree`로 옮길 값과 각 worktree의 영향을 확인한다. 기존 `core.bare=false`를 포함한 공통 설정도 점검한다. 이미 연결된 다른 scope를 자동 이전하거나 다른 worktree의 훅을 덮어쓰지 않는다.

필요한 설정 정리를 마친 뒤 최초 연결 전에 다음을 실행한다.

```sh
git config extensions.worktreeConfig true
```

`collab.sh worktree`는 구형·미연결 저장소의 단순한 설정에서만 worktreeConfig를 준비할 수 있다. 로컬 `core.worktree`가 없고 `core.bare=true`가 아니며 기존 설치형 연결이 없는 경우에 한한다. 그 밖에는 설정을 바꾸기 전에 명시적 준비를 요구한다. 새 worktree의 훅은 그 worktree 범위에만 설정한다. 이 동작과 별개로 설치형 `attach`는 이미 준비된 worktreeConfig를 요구한다.

Poem의 `.githooks`가 정상적으로 연결돼 있어야 한다. 설치 후에는 Sobaya 전달 훅이 그 앞에 놓이므로 `core.hooksPath`가 `.githooks` 문자열과 다를 수 있다. 이때 경로를 수동으로 되돌리지 않는다. `check`로 확인한다. 새 worktree는 자체 `.githooks` 설정과 별도 연결을 사용하며 기존 worktree의 승인·훅을 복제하지 않는다.

## 3. 기능 브랜치에서 attach와 승인

기존 start-work 절차로 브랜치와 claim을 준비한다. 사람 소유의 명세와 검토할 테스트 초안을 기존 개발 절차로 준비한다. `attach`는 실제 파일인 `AGENTS.md`, `spec.md`, `failed-test.md`를 요구하며, 파일을 생성하거나 `Test:`를 덮어쓰지 않는다. 승인된 테스트나 명세를 연결 도구에 맞춰 바꾸지 않는다.

```sh
sh harness/sobaya-installed.sh attach --install-root "$store" --version 1.0.0-rc.1
sh harness/sobaya-installed.sh check --install-root "$store"
cat sobaya.json sobaya.lock
git status --short -- sobaya.json sobaya.lock
```

첫 연결로 생기는 두 pin 파일을 검토한다. 승인 전에는 명세·초안·claim·pin과 다른 변경도 검토·커밋해 작업트리와 인덱스를 깨끗하게 한다. 기존 claim·저널 규칙을 그대로 따른다. 같은 연결은 반복할 수 있지만 다른 버전·설치 경로·훅 구성은 암묵적으로 바꾸지 않는다. 사용자의 정확한 테스트 승인을 받은 뒤에만 공개 CLI의 `approve`를 호출한다. `attach`, `sync`, `bump`나 이 문서는 승인을 대신하지 않는다.

```sh
# 사람이 이 앱의 정확한 테스트 입력을 승인한 뒤에만 실행한다.
"$store/bin/sobaya" approve --root "$app_root" --install-root "$store" --app "$app_root"

# 실제 워커는 Poem의 충돌 검사 경계를 통과한다.
reviewed_policy="/absolute/path/to/reviewed-worker-policy.json"
sh scripts/collab.sh run -- "$store/bin/sobaya" loop \
  --root "$app_root" --install-root "$store" --app "$app_root" --policy "$reviewed_policy"
```

사용자 승인 뒤 변경된 테스트가 필요하면 새 초안과 검토본으로 다시 승인받는다. 구현·재시도 중에 승인 기준을 약화하지 않는다. 실행 중인 항목이나 살아 있는 잠금이 있으면 협업 pulse는 main 따라잡기를 보류한다. 승인 브랜치는 main을 merge로 따라잡고 rebase하지 않는다.

## 4. 합류와 명세 없는 main의 sync

새 clone에서 `sh harness/join.sh <핸들>`은 협업 개인 설정을 준비한다. root pin이 있어도 설치 저장소를 추측하거나 기능 문서를 만들지 않는다. main에는 `spec.md`·`failed-test.md`가 없어도 되며, 이때는 정확한 설치본 복원만 한다.

이미 사용 가능한 설치 저장소라면:

```sh
sh harness/sobaya-installed.sh sync --install-root "$store" --archive "$assets/sobaya-1.0.0-rc.1.tar.gz"
```

빈 저장소로 복원하려면, 별도로 확보한 신뢰 CLI를 명시한다. `--cli`는 `sync`에서만 허용한다.

```sh
trusted_cli="/absolute/path/to/trusted/bin/sobaya"
sh harness/sobaya-installed.sh sync --install-root "$store" --cli "$trusted_cli" \
  --archive "$assets/sobaya-1.0.0-rc.1.tar.gz"
sh harness/sobaya-installed.sh check --install-root "$store"
```

`sync`는 root pin을 바꾸지 않고 그 버전·커밋·해시에 맞는 런타임만 준비한다. `--archive`를 생략하면 공개 CLI의 고정 릴리스 다운로드 주소를 쓴다. 최신 버전 검색이나 Git 브랜치 pull은 하지 않는다. feature 문서가 없는 main에 `attach`를 강행하지 않는다. 기능 브랜치가 준비되면 별도로 연결한다.

`check`는 `mode`, `version`, `connected` JSON을 돌려준다. pin만 있고 아직 연결 전이면 `connected:false`이며, 연결 정보와 현재 worktree의 전달 훅이 맞으면 `true`다. 잘못된 연결 정보를 자동 수선하지 않는다. 이는 **설정·연결·전달 훅 검사**이며 전체 설치 payload의 무결성 검사, 테스트 승인, gate 통과를 의미하지 않는다. 실제 Sobaya 명령은 선택된 설치본을 자체 검증한다. digest에서도 이 경계를 안내한다. 동료의 bump를 pull이나 pulse로 반영했으면, 연결 확인과 별개로 `sh harness/sobaya-installed.sh sync --install-root "$store"`를 실행해 새 팀 pin의 런타임을 준비한다. digest는 새 릴리스를 검색하거나 자동 설치하지 않는다.

## 5. 후속 버전 bump PR

첫 도입 PR은 연결 코드·문서·검증을 포함한다. 그다음 런타임 업데이트의 변경 대상은 루트 `sobaya.json`과 `sobaya.lock` 두 pin이다. 기존 claim·저널·PR 검토 규칙은 계속 지킨다. 런타임 소스나 개인 설치 경로를 소비 저장소에 복사하지 않는다.

정상 연결된 깨끗한 작업트리에서, 실행 중인 항목·워커가 없는지 확인하고 후보 릴리스의 설치 자료를 별도로 검토한다. 아래 후보는 사용자가 고른 실제 출시 버전이며 자동으로 최신 버전을 선택하지 않는다.

```sh
candidate="<reviewed-release-version>"
manifest="/absolute/path/to/trusted-candidate.json"
archive="/absolute/path/to/verified-candidate.tar.gz"
sh harness/sobaya-installed.sh bump --install-root "$store" --version "$candidate" \
  --manifest "$manifest" --archive "$archive"
git diff -- sobaya.json sobaya.lock
```

공개 CLI가 후보로 선언된 전체 앱 테스트와 필요한 포맷·린트를 실행한다. 성공하면 pin 변경을 남기고, 실패하면 이전 pin과 보호 상태를 복원한다. 자동 승인·커밋·push는 하지 않는다. 결과와 pin diff를 PR에서 검토한 뒤 다른 팀원은 `sync`로 같은 버전을 복원한다.

새 clone이나 연결 없는 worktree는 먼저 위 연결 절차를 충족해야 한다. bump만 가능하게 하려고 명세·승인을 만들어내거나 다른 worktree의 연결·상태 파일을 복사하지 않는다. 완료된 bump를 되돌릴 때도 검토한 이전 버전을 명시한 별도 bump와 검증이 필요하다. 진행 중 상태를 다른 버전에서 이어 실행하는 절차는 이번 범위에 없다.

## 6. 완료와 계획 보관

`loop`의 최종 gate·리뷰를 마치고 공개 `status`에서 `review.head`가 현재 HEAD인지 확인한다. handoff 순서대로 마지막 커밋에서 `spec.md`·`failed-test.md`를 `collab/journal/plans/<날짜-owner-slug>/`로 옮긴다. 보관 뒤에는 그 브랜치에서 Sobaya 명령을 다시 실행하지 않는다. 추가 구현이 필요하면 보관을 되돌리고 사람 승인부터 다시 따른다.

협업 `sh scripts/collab.sh check`를 통과시킨 뒤 PR 본문에 보관 전 리뷰 HEAD와 현재 HEAD의 관계를 남긴다. root pin은 팀 버전 파일이므로 계획 문서와 함께 보관하지 않는다. 명세 없는 main에 root pin이 남는 것은 정상이다.

## 7. 구형 연결과 후속 범위

기존 `harness/attach-sobaya.sh`와 `harness/sobaya.lock`은 소스 클론 방식으로 그대로 사용한다. 구형 lock이나 알려진 구형 Sobaya 관리 훅이 남으면 설치형 연결은 거절한다. 일반 사용자 훅은 보존한다. 충돌을 없애려고 lock·훅·승인 상태를 자동 삭제하지 않는다. 기존 사용자는 구형 연결을 유지하거나 별도 검토한 이전 작업을 진행한다.

구형 attach·sync·update는 현재 루트의 설치형 pin, 또는 같은 Git 공용 디렉터리를 쓰는 checkout의 설치형 연결 기록이 있으면 먼저 거절한다. 이 검사는 `Test:` 변경·소바야 source setup·pull보다 먼저 실행하며, 충돌 위치를 안내한다. 명령 대상은 스크립트가 속한 앱으로 고정하고 상위 세션에서 전달된 Git 저장소 환경변수는 제거한다. 깨진 연결 JSON·심링크·부분적으로 남은 설치형 metadata도 자동 삭제하거나 무시하지 않는다. 구형 state·lock만 있는 정상 metadata 디렉터리는 허용한다. 서로 다른 clone은 이 검사 범위를 공유하지 않는다.

설치형 연결이 없는 구형 프로젝트는 새 worktree에서도 공통·worktree의 Git 설정을 그대로 두고 연결한다. 설치기 호출에만 임시 훅 경로를 적용하고, 설치가 성공한 관리 훅을 기존 공용 위치에 게시한다. 공용 pre-commit이 사용자 파일이나 심링크이면 해당 경로를 알리고 중단한다. 설치·게시가 실패하면 임시 파일을 정리하고 어댑터 설정·버전 기록으로 진행하지 않는다. 정상 sync는 종료 코드 0을 반환한다.

구형 연결의 자동 이전, 설치형 신규 릴리스 주간 알림, 진행 중 항목의 버전 간 재개는 후속 범위다. 기존 소스 클론용 주간 알림은 유지한다. Poem 폴더 재배치·라이브러리화·명칭 변경도 이 도입에 포함하지 않는다.

## 8. 템플릿 유지보수 검증

이 템플릿의 유지보수 테스트는 셸로 실행한다. Sobaya에서 셸 테스트를 앱 TDD로 돌리려고 Node 래퍼를 만들지 않는다. 기존 세 스위트 164개, 설치형 아홉 항목, 구형 worktree 회귀 일곱 항목, 혼합 연결·sync 안내 열한 항목을 함께 검증한다.

```sh
sh tests/hooks.sh
sh tests/loop.sh
sh tests/sobaya.sh

export SOBAYA_TEST_ASSETS="/absolute/path/to/verified-rc1-assets"
export SOBAYA_TEST_SOURCE="/absolute/path/to/sobaya-source-containing-the-public-commit"
/bin/bash tests/sobaya-installed.sh --support-check
/bin/bash tests/sobaya-installed.sh --cycle-support
/bin/bash tests/sobaya-installed.sh all
/bin/bash tests/sobaya-legacy-worktree.sh all
/bin/bash tests/sobaya-mixed-mode.sh all
```

`SOBAYA_TEST_SOURCE`는 공개 커밋 `d06384544e81cd373d81e2a940ab336868e04854`를 포함한 로컬 checkout이다. 설치형 스위트는 이 소스의 패키지 생성 스크립트를 확인하고 로컬 bump 후보를 만든다. 구형 스위트는 별도 임시 clone에서 이 커밋의 실제 설치기를 실행한다. 테스트의 Node는 임시 앱 테스트 실행기다. 후보 `1.0.0-rc.2-fixture`는 공개 rc.1을 다시 묶은 로컬 자료이며 공개 릴리스가 아니다.

두 support 명령은 fixture와 공개 런타임의 사용 가능성을 확인하며 새 어댑터의 합격 증거가 아니다. 결정적인 worker·review 대역은 실제 모델 품질이나 비용을 측정하지 않는다. 테스트 준비 실패, 제품 RED, 도구 부족으로 인한 NOT PROBED를 구분하고 macOS와 Linux의 실제 잠금 분기를 각각 확인한다.

현재 `tests/sobaya-installed.sh`는 fixture 준비 두 곳을 고친 v3 원문이며, SHA-256은 `f264e7533dc994ca30042fcf062963f6157572a7e51fd3bc446b07a98292e62b`다. [사람의 교체 승인](../collab/journal/2026-10-07-Kangmin_Kim-sobaya-v1-fixture-approved.md)에 따라 적용했고 기존 제품 동작 단언을 유지했다. 원문에 남아 있는 DRAFT 주석은 바이트 보존을 위한 것이며 현재 승인 상태는 이 기록을 따른다. [도입 계획](../collab/active/codex--sobaya-v1-adoption/plan.md)은 최초 제안 이력으로 보존하고, 현재 승인·실행 범위는 [구현 검증 기록](../collab/active/codex--sobaya-v1-adoption/implementation.md)에서 확인한다.

`tests/sobaya-legacy-worktree.sh`는 [2026-10-08 승인 기록](../collab/journal/2026-10-08-Kangmin_Kim-sobaya-legacy-approved.md)의 SHA-256 `d736cb05b581bf44f48918599053dffb6039cc8c57743d9255041d362e7d1b12` 원문이다. DRAFT 주석도 보존했다. 설정 파일을 설치기 호출 전후에 관찰하고 실제 훅의 성공·실패 전달을 검사한다. 실패 사례는 실제 설치기의 chmod만 대역으로 바꾼다. 관찰 래퍼 때문에 임시 소스 clone은 dirty이므로 네트워크 pull은 생략하며 고정 버전의 로컬 재설치를 검증한다.

`tests/sobaya-mixed-mode.sh`는 [2026-10-09 승인 기록](../collab/journal/2026-10-09-Kangmin_Kim-sobaya-mixed-mode-approved.md)의 SHA-256 `cafb8d85a57cbb761e886f4f70a4e76d8381a5c245e0adf86236ce9ba0d303ce` 원문이다. 같은 checkout과 두 방향의 형제 worktree에서 세 구형 명령을 각각 검증한다. 깨끗한 소스와 한 커밋 앞선 로컬 origin으로 거절 전에 pull하지 않는지도 확인한다. 정상 구형 상태 대조군과 실제 peer push·pulse 병합·미설치 훅 실패·명시적 sync 복구를 포함하며, 마지막에는 digest의 sync 안내를 검사한다. 임시 앱의 합성 상태는 실제 사용자의 승인이나 완료 리뷰가 아니다.

CI는 고정된 공개 rc.1 소스·자산으로 전체 191개를 실행한다. Linux 작업은 `flock`의 가용성과 `shlock`의 부재를 확인해 실제 flock 분기를 검증한다. macOS에서는 shlock 분기를 별도로 실행한다. 승인되지 않은 대조군의 통과나 기존 스위트의 통과만으로 전체 연결 기능을 완료 처리하지 않는다.

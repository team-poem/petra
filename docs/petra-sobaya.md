# 새 PETRA 설치본에서 Sobaya 사용하기

이 문서는 `.petra/bin/petra`가 있는 프로젝트 기준이다. PETRA 설치와 합류를 마친 뒤 진행한다.
기존 `harness/` 구조는 [기존 연결 안내](sobaya-installed.md)를 따른다. 이미 Sobaya를 쓰는 프로젝트를 새 PETRA로 자동 이전하는 절차는 아니다.

## 각각 무엇을 하나

- PETRA: 동료의 작업·파일 겹침을 확인하고, claim·저널·커밋·PR의 협업 규칙을 적용한다.
- Sobaya: 사람이 승인한 명세와 테스트를 기준으로 구현·검증·리뷰를 진행한다.
- 팀: 사용할 Sobaya 버전을 PR로 결정한다. 실행 파일은 각자의 프로젝트 밖 개인 저장소에 둔다.

```text
shop/
  AGENTS.md                       앱 계약과 실제 Test 명령
  .petra/bin/petra                 협업 및 Sobaya 연결 진입점
  .petra/collab/                   팀 claim과 저널
  sobaya.json, sobaya.lock         팀이 검토한 정확한 런타임 버전
  spec.md, failed-test.md          기능 브랜치의 명세와 테스트 초안
개인 저장소/bin/sobaya             외부에 설치한 공개 런타임
worktree Git 메타데이터/sobaya/    개인 연결·승인·진행 상태
```

## 1. 최초 연결

[공개 런타임 확보와 해시 확인](sobaya-installed.md#1-신뢰한-공개-버전-설치)을 먼저 진행한다.
검증 기준은 `1.0.0-rc.1`이다. PETRA가 설치기를 자동 다운로드하거나 최신 버전을 임의 선택하지 않는다.
Sobaya에는 Bash, jq, Git, tar, gzip, shasum과 macOS의 shlock 또는 Linux의 flock이 필요하다.

앱에서 `join`하고 작업 브랜치와 `.petra/collab/active/<slug>/claim.md`를 준비해 커밋·push한다.
기존 Git/worktree 설정을 [사전 점검](sobaya-installed.md#2-최초-attach-전에-worktree-설정-확인)한 뒤 `extensions.worktreeConfig=true`를 준비한다.
`core.worktree`, worktree별 훅, sparse-checkout 등이 있으면 설정을 무조건 켜지 말고 먼저 영향을 확인한다.

사람 소유의 `spec.md`, `failed-test.md`와 실제 `- Test:`가 있는 일반 파일 `AGENTS.md`를 준비한다.
연결 도구는 이 파일을 만들거나 테스트를 고치지 않는다.

```sh
app_root=$(pwd -P)
store="/absolute/path/to/personal-sobaya-store"

sh .petra/bin/petra sobaya attach --install-root "$store" --version 1.0.0-rc.1
sh .petra/bin/petra sobaya check --install-root "$store"
git diff -- sobaya.json sobaya.lock
```

두 pin과 연결 결과를 검토한다. `connected:true`는 현재 worktree와 전달 훅이 맞다는 뜻이며,
테스트 승인·설치 payload 전체 무결성·개발 완료를 뜻하지 않는다. 실제 런타임 명령이 자신의 설치본을 검증한다.
정상 연결 뒤 `join`을 다시 해도 연결·승인·전달 훅을 유지한다. 손상된 연결은 자동 초기화하지 않고 중단한다.

## 2. 개발 루프

명세·초안·claim·pin을 검토해 커밋하고 작업 트리를 깨끗하게 만든다.
**사람이 정확한 테스트 입력을 승인한 뒤에만** approve를 실행한다. attach나 join은 승인이 아니다.

```sh
"$store/bin/sobaya" approve --root "$app_root" --install-root "$store" --app "$app_root"

sh .petra/bin/petra run -- "$store/bin/sobaya" loop \
  --root "$app_root" --install-root "$store" --app "$app_root" \
  --policy /absolute/path/to/reviewed-worker-policy.json
```

`run`은 동료가 편집 중인 공용 파일을 실행 전에 확인한다. Sobaya 체크포인트 커밋도 PETRA Git 훅을 거쳐 공유된다.
진행 중인 Sobaya 항목이나 살아 있는 잠금이 있으면 `pulse`의 자동 main 따라잡기는 보류한다.
승인한 테스트를 통과시키려고 에이전트가 기준을 약화하지 않는다. 변경이 필요하면 교체 초안을 다시 승인받는다.

다른 작업을 동시에 시작하려면 `sh .petra/bin/petra worktree feat/another-task`로 분리한다.
새 worktree는 자신의 핸들·claim·연결을 준비하며 기존 승인을 복사하지 않는다.

## 3. 마무리와 PR

1. Sobaya gate와 review 결과를 확인하고 review가 가리키는 HEAD를 기록한다.
2. 새 저널의 `## 이벤트`, `## 남은 것`을 채우고 claim 상태를 갱신한다.
3. 마지막 커밋에서 `spec.md`와 `failed-test.md`를 `.petra/collab/journal/plans/<고유한-작업명>/`으로 옮긴다.
4. `sh .petra/bin/petra check`와 `pr-body`로 협업 검사·PR 초안을 준비하고 push한다.

plan 보관 커밋은 review HEAD 이후의 커밋이므로 PR에 그 관계를 남긴다.
보관 후 같은 브랜치에서 Sobaya 작업을 다시 실행하지 않는다. 계속 개발해야 하면 명세·승인 상태부터 재검토한다.

## 4. 동료의 합류와 버전 변경

새 clone에서는 `sh .petra/bin/petra join amazon`으로 협업 설정을 먼저 준비한다.
팀 pin은 있지만 main에 기능 문서가 없을 때는 attach가 아니라 **sync**로 정확한 런타임만 준비한다.

```sh
sh .petra/bin/petra sobaya sync --install-root "$store" \
  --cli /absolute/path/to/trusted/bin/sobaya \
  --archive /absolute/path/to/verified/sobaya-1.0.0-rc.1.tar.gz
```

이미 해당 개인 저장소에 CLI가 있으면 `--cli`는 생략한다. sync는 pin·HEAD·명세·승인을 바꾸거나 연결을 자동 생성하지 않는다.
기능 브랜치와 문서를 준비했을 때 별도로 attach한다.

버전을 올리는 사람은 [후보 검토와 bump 절차](sobaya-installed.md#5-후속-버전-bump-pr)를 따르되 명령 앞부분만 바꾼다.

```sh
sh .petra/bin/petra sobaya bump --install-root "$store" \
  --version '<검토한-후보-버전>' --manifest /path/to/candidate.json --archive /path/to/candidate.tar.gz
```

후보로 전체 앱 검증이 통과하면 pin 변경을 PR로 검토한다. 다른 팀원은 변경을 받은 뒤 sync한다.
digest는 현재 팀 pin과 sync 절차를 안내한다. **새 upstream 릴리스 검색·자동 업데이트는 아니다.**
Sobaya 버전 변경과 PETRA 자체 업데이트는 별개이며 PETRA 업데이트·롤백 명령은 아직 없다.

## 검증 범위

이 리포 내부에서 아래 명령으로 임시 앱을 실제 설치하고 공개 런타임에 연결한다.
외부 테스트 프로젝트나 모델 API 키는 필요 없다.

```sh
SOBAYA_TEST_ASSETS=/absolute/path/to/verified-rc1-assets \
  node --test tests/petra-sobaya.test.mjs
```

attach의 입력 보존, 반복 join, 손상된 훅 거절, worktree 격리, plan 없는 clone의 sync,
공개 런타임의 RED→구현→gate→review, plan 보관과 PR 검사를 확인한다.
워커만 고정된 대역을 쓰므로 **실제 모델의 구현·리뷰 품질 검증은 별도**다. 기존 승인 스위트도 그대로 실행한다.

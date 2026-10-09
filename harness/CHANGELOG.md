# 하네스 변경 기록

하위 프로젝트는 `harness/VERSION` 으로 어느 템플릿에서 왔는지 안다. 필요한 항목만 가져간다.

## 0.1.0 — PETRA 협업과 프로젝트 수명주기 (릴리스 준비)

- 작업 스냅샷 전송·원격 조회·자동 브랜치 push의 상태와 마지막 성공 시각을 기록하고 실패·오래됨·미확인을 구분한다. 읽기만 한 digest가 조회 시각을 갱신하지 않으며 새 세션은 관련 이벤트를 다시 받는다.
- `run`의 실행 수명에 묶인 주기 공유와 독립 실행 잠금, 검증된 파일만 선택하는 `checkpoint`를 추가한다. 워커의 HEAD/인덱스/승인 상태에 별도 커밋이나 merge를 끼워 넣지 않는다.
- 관리 파일 update/rollback, 출처 대조형 구형 기록 migrate, 중단 복구 recover를 plan 확인과 파일별 백업 위에 추가한다. 사용자 편집과 Sobaya 연결을 보존한다.
- 새 소비 패키지에 petra 스킬 하나, onboard 안내, 별도 PR 양식과 읽기 전용 협업 CI를 포함한다. 공개 README는 소개로 유지하고 상세 설명을 문서로 분리한다.
- 배포 버전은 VERSION 한 곳에서 가져온다. 승인·병합된 main의 CI 성공 뒤 실행하는 릴리스 워크플로와 해시를 가진 소스/소비 배포물을 준비한다.
- 아래 미출시 0.0.10/PETRA 배치도 0.1.0에 포함한다. 상세 검증 및 실제 모델 접근 제한은 `docs/petra-010-testing.md` 참고.

## PETRA 소비 구조 후속 배치 (미출시)

- 새 `.petra` 패키지에 설치형 Sobaya 어댑터를 포함하고 `petra sobaya attach|sync|bump|check`를 노출한다. 실행 파일 위치로 앱을 찾고 기존 제작 리포 경로도 유지한다.
- `join`은 정상적인 Sobaya 전달 훅·승인 상태를 검증해 보존하고 손상된 연결은 거절한다. 새 worktree는 독립적으로 합류한다. 최초 설치의 구형 상태 차단은 유지한다.
- Linux/macOS CI에 실제 PETRA 설치본과 공개 rc.1 런타임을 연결하는 소비자 테스트를 추가한다. 고정 worker로 개발 루프와 plan 보관까지 검증하며 기존 승인 스위트는 수정하지 않는다.
- 한국어·영어 README를 공개 프로젝트 소개로 정리하고, 기존 상세 문서는 `docs/reference.md`로 옮긴다. 새 설치본의 Sobaya 절차는 `docs/petra-sobaya.md`로 분리한다.
- 구형 프로젝트 이전, PETRA 업데이트·롤백, 새 소비 구조의 온보딩·CI 배포는 후속 범위다.

## 0.0.10 — 설치형 Sobaya 종속 모드 도입 (미출시)

- 설치형 연결 후 구형 attach·sync·update를 실행하면 앱·소바야 소스를 바꾸기 전에 중단한다. 같은 Git 공용 디렉터리의 형제 연결도 확인하며, 상위 세션의 프로젝트·Git 환경변수가 명령 대상을 바꾸지 않게 한다. 팀 pin 변경 뒤 명시적 sync 안내를 digest에 추가하고, 2026-10-09 승인된 혼합 연결·복구 회귀 11개를 CI에 연결한다.

- 새 worktree에서 구형 소스 연결이 실패하던 회귀를 수정한다. 공통·worktree Git 설정을 쓰지 않고 임시 훅을 설치한 뒤 공용 관리 훅을 게시하며, 사용자 훅·심링크와 실패 상태를 보존한다. 정상 sync의 종료 코드도 0으로 고친다. 2026-10-08 승인된 실제 설치기 회귀 7개를 CI에 추가한다.
- 기존 프로젝트 위치에서 공개 rc.1을 개인 외부 저장소에 설치하고 `sobaya-installed.sh attach|sync|bump|check`로 명시적으로 연결하는 경로를 추가한다. root pin 두 파일과 구형 `harness/sobaya.lock`을 구분하며 기존 소스 클론 명령은 유지한다.
- 연결·전달 훅의 worktree 격리, join·init의 연결 보존, 살아 있는 실행·관리 잠금에 따른 pulse 보류를 검증한다. 설치·연결·bump는 명세·테스트 승인이나 gate를 대신하지 않는다.
- 설치·Git 설정 사전 점검·기능 승인·명세 없는 main의 sync·후속 pin bump PR을 `docs/sobaya-installed.md`에 모으고 기존 안내·스킬을 연결 방식에 맞춰 정리한다. 앱 CLAUDE.md를 재생성하지 않는다.
- 기존 셸 세 스위트를 보존하고 공개 런타임과 결정적인 worker 대역을 쓰는 설치형 아홉 항목을 추가한다. fixture 준비 두 곳을 고친 v3 교체본은 2026-10-07 사람의 승인을 받아 원문 그대로 적용했다. Linux CI에 새 스위트를 연결하고 macOS·Linux 전체 검증과 독립 완료 리뷰를 수행한다. 출시와 실제 소비자 앱의 승인은 별도다.
- 구형 연결 자동 이전, 설치형 주간 릴리스 알림, 진행 중 항목의 버전 간 재개와 Poem 구조 재배치는 후속 범위다.

## 0.0.9 — cairn-landing 실전 보고 9건 수정
2인·PR 10개로 실제 운영한 세션이 보고한 문제들. 전부 재현 후 수정.
- **작업 브랜치의 머지가 훅에 막히던 회귀(0.0.4)**: main 에 동료 claim 이 있으면 `git merge main` 이 항상 차단됐다. 문서는 merge 인데 훅이 막아 rebase + force 로 몰렸다. 통합 커밋(머지·체리픽)은 소유권 규칙 대상에서 제외. `pre-merge-commit` 은 보호 브랜치에서만 검사
- **내 다른 브랜치를 동료로 오인**: `for_each_other_claim`·`wip_table` 이 owner 가 나인 브랜치도 포함해 겹침 경고가 도배됐다. 이제 제외하고 digest 에 "내 다른 브랜치" 목록으로만. 알림 양 문제도 같이 해소
- **claim 디렉토리 경로 오판정**: `git add collab/active/<slug>` 는 막히고 `.../claim.md` 는 통과하던 것 수정
- **PR 본문이 사람용이 아니던 것**: goal → 변경 요약(diff --stat) → 검증 을 앞에 두고, 이벤트와 겹침은 `<details>` 로 접고 상위 5개 + "외 N개"
- **스택 브랜치**: claim 에 `base:`. `check`·`pr-body`·pulse 따라잡기가 이 기준을 쓴다
- **저널 정정**: `supersedes <경로|낱말>` 이벤트. 같은 owner 의 앞선 이벤트를 digest 에서 숨긴다
- **머지된 브랜치에 계속 커밋**: pre-push 가 차단(`COLLAB_ALLOW_MERGED_PUSH=1` 로 해제), digest·pulse 가 경고. gh 가 있으면 PR 상태로, 없으면 origin 브랜치 내용이 main 에 들어갔는지로 판정
- **되돌리기 명령이 막히던 것**: 커밋된 저널을 실수로 고치면 `git checkout --`·`git restore` 로 되돌리는 것까지 차단돼 빠져나갈 길이 없었다. 되돌리기 계열은 판정에서 제외 (`git rm` 은 그대로 차단)
- **따옴표로 guard 를 우회할 수 있던 구멍**: 쓰기 판정용 스크럽이 작은따옴표 안을 지워, `echo x > 'prisma/schema.prisma'` 가 허브 파일 검사를 통째로 비껴갔다. 쓰기 여부는 스크럽본으로, 경로는 원본에서 뽑는다
- **Stop 훅이 작업 중간을 막던 것**: "오늘 저널 없음" → "**push 된** 코드 변경이 있는데 저널 없음". 끝나지도 않은 작업의 저널을 쓰게 강요하던 것이 `supersedes` 가 필요해진 원인이었다
- **CI prune 이 원격에 브랜치를 쌓던 것**: 매번 타임스탬프 브랜치를 만들던 것을 `chore/collab-prune` 하나 재사용 + 기존 PR 갱신으로
- **환경변수 없이 lib.sh 를 source 하면 조용히 틀린 ROOT**: 현재 위치에서 위로 올라가 하네스를 가진 리포를 찾는다
- **테스트 픽스처가 템플릿의 실제 협업 데이터를 물려받던 문제**: 오늘 날짜의 진짜 저널이 검사에 섞여 날짜에 따라 결과가 달라졌다. 세 스위트 모두 저널·claim 을 비우고 시작한다
- **머지 충돌 오진**: 내 브랜치가 머지돼서 생긴 충돌을 "동료와 충돌" 로 말하던 문구 수정. 충돌 파일을 바꾼 동료가 있으면 그 이름을, 없으면 머지 여부 확인을 안내

## 0.0.8 — PR 추가 작업 중 상태 전환 안정화
- 같은 PR 에서 편집 → 커밋 → 재편집하면 겹침을 다시 알린다. pulse 는 과거 전체가 아닌 직전 겹침과 비교하고, 수정 훅은 동료·브랜치·편집/커밋 상태를 구분한다. 브랜치명을 시간으로 표시하던 오류도 수정
- main 동기화 알림을 브랜치·기준 커밋·보류 이유별로 기록. sobaya 작업 종료 뒤 미커밋 변경이 남으면 커밋 안내를 새로 보내고, 동기화 성공 시 기록을 지운다
- 실제 로컬 원격과 클론 둘로 PR 추가 커밋·재편집을 재현. sobaya 보류 → 미커밋 → 체크포인트 → 동일 main 따라잡기와 충돌 abort 뒤 HEAD·인덱스·파일 보존 검증을 보강
- PR CI 의 GITHUB_HEAD_REF 가 임시 테스트 리포로 새지 않도록 분리. 남의 claim 변경과 detached HEAD 검사는 실제 스테이지·실패 이유·종료 상태까지 확인

## 0.0.7 — sobaya 는 바꾸지 않는다 (sobaya#4 흡수)
- amazon 의 결정에 따라 9개 요청을 전부 협업 하네스 규칙으로 흡수. `harness/sobaya/PROPOSAL.md` → `RULES.md` (성질 ↔ 우리 규칙 표)
- `collab.sh run -- <명령>`: 워커 실행 전 동료가 편집 중인 허브 파일이면 중단(`COLLAB_RUN_FORCE=1` 강행), 실행 후 워커가 건드린 허브 파일과 겹침 보고
- `collab.sh worktree <branch>`: 승인 브랜치가 있는 클론에서 새 브랜치를 워크트리로 (설정 복사)
- AGENTS.md §8, start-work 스킬에 반영

## 0.0.6 — 온보딩 실전 테스트 후 수정
- 실제 클론에서 Claude 를 띄워 온보딩을 끝까지 돌려봄. 초기화 커밋의 첫 push 를 우리 pre-push 가 막던 것 수정: 하네스 메타만 바뀐 push 와 원격에 없던 브랜치의 첫 publish 는 통과
- GitHub 정책(squash·브랜치 삭제·main 보호)을 `init.sh` 에서 빼서 `harness/github-policy.sh` 로. 첫 push 뒤 온보딩이 부른다 (보호를 먼저 걸면 초기화 커밋을 못 올린다)
- onboard 스킬: 셸 승인이 안 나는 환경에서의 대처 절

## 0.0.5 — 첫 세션 온보딩
- `collab.sh state` 가 리포 상태를 `setup`(플레이스홀더 남음) / `join`(개인 설정만 없음) / `ready` 로 판정. 세션 시작 훅이 준비 안 됐으면 협업 현황 대신 온보딩을 주입
- `onboard` 스킬: 인사 → 메뉴(이 폴더 초기화 / 기존 GitHub 프로젝트에 붙이기 / 새 프로젝트 / 5분 설명) 또는 합류 절차 → 검증 → 첫 작업 제안. 허브 파일은 스택을 보고 에이전트가 먼저 제안
- `harness/join.sh <핸들>`: 합류자 개인 설정(핸들·rerere·git 훅·sobaya sync). `harness/install-into.sh <리포>`: 기존 리포에 하네스 복사 + init (기존 AGENTS.md 보존)
- 템플릿 개발 중엔 `git config collab.onboarded true` 로 건너뜀

## 0.0.4 — 동시 작업 점검 후 수정
- 판정: squash/rebase 머지된 브랜치도 머지된 것으로 인식(유령 claim·중복 이벤트 제거). CI(detached HEAD)에서 자기 브랜치를 남으로 보던 것 수정. digest 한 실행 안 이벤트 중복 제거
- 처리량: 허브 파일 차단을 "동료가 지금 편집 중(커밋 전)" 으로 좁힘. 커밋됐지만 미머지인 겹침은 알림 + 선행 PR 제안. claim `next:` 로 "곧 겹침" 예고. 동료 브랜치 마지막 커밋 시각, 14일 방치 표시
- sobaya: 루트 어댑터가 `loop.sh apps/shop` 도 앱으로 라우팅(정규식). sobaya 가 항목 진행 중이면 pulse 의 따라잡기 보류. 승인 브랜치가 있으면 새 브랜치는 워크트리 안내. handoff 의 plan 보관 순서와 주의문
- git 흐름: 기본 따라잡기 merge. wip ref 를 `refs/wip/<me>/<branch>` 로(워크트리·무인 루프 공존). post-commit 이 스냅샷·브랜치 push(루프 중에도 보임). pre-push 가 보호 브랜치 직접 push 차단, pre-merge-commit 이 main 로컬 머지 차단. prune 이 죽은 wip ref 정리. init.sh 가 GitHub squash-only + 브랜치 자동 삭제 설정 시도. `pr-body` 로 PR 본문 자동
- 캐시(seen/asked/overlaps)를 브랜치별로. import 판정에 배럴·별칭 키. hooksPath 꺼진 클론 경고. Bash 감시 오탐(따옴표 안 `>`, `*.log`) 제거

## 0.0.3 — 도구 중립
- 훅 스크립트를 `harness/hooks/` 로, 스킬을 `.agents/skills/` 로 (`.claude/skills` 는 심링크). `.claude/settings.json` 과 새 `.codex/hooks.json` 은 같은 스크립트를 가리키는 얇은 배선
- git 훅 `.githooks/pre-commit`(스테이지 파일마다 guard 와 같은 판정, sobaya 앱 훅 이어서 실행)·`pre-push`(저널 경고). `init.sh` 가 `core.hooksPath` 로 켠다
- `collab.sh precommit|prepush`. AGENTS.md 에 "훅이 없는 환경이면 digest/pulse 를 직접" 절. `Skill(x)` 표현을 도구 중립으로
- attach-sobaya: install 동안 hooksPath 를 잠깐 풀어 sobaya 의 거부를 피함. 검사도 자체 방식으로

## 0.0.2 — 개발 하네스 sobaya 결합
- `AGENTS.md` 가 실제 파일, `CLAUDE.md` 가 심링크 (sobaya 는 심링크를 읽지 않는다). `## App facts` 절에 `- Test:` 등 앱 계약
- `harness/attach-sobaya.sh attach|sync|update|check`: 앱 계약 설치, 루트 세션용 훅 어댑터, `harness/sobaya.lock` 으로 팀의 sobaya 버전 고정
- sobaya 승인 브랜치는 main 을 rebase 대신 merge 로 따라잡음 (`SYNC_MODE=auto`)
- `spec.md`·`failed-test.md` 는 브랜치 단위. handoff 가 `collab/journal/plans/` 로 옮기고 `check` 가 main 유입을 막음
- 훅의 상대경로를 훅 cwd 기준으로 해석. sobaya 루트에서 `apps/<x>/…` 를 쓰는 Bash 도 그 앱 규칙으로 판정
- 주간 CI: upstream sobaya 가 lock 보다 앞서면 이슈

## 0.0.1 — 첫 릴리즈
- 협업 전용 하네스. 여러 사람이 각자 AI 에이전트를 데리고 한 리포에서 **동시에** 일하기 위한 것
- claim(무엇을 만드는가) 없이는 Write/Edit 도 Bash 쓰기도 막힘
- 저널은 에이전트가 읽는 **이벤트 로그** (`- <type> <경로> <무엇> → <상대가 할 일>`). digest 는 나에게 영향 있는 이벤트만 주입
- pulse 가 작업 트리 스냅샷을 `refs/wip/<me>` 로 올려 커밋 전이라도 파일 단위 겹침을 냄. 허브 파일(HOTSPOTS)만 차단, 나머지 알림
- main 이 바뀌면 트리가 깨끗할 때 자동 rebase, 충돌이면 abort + 알림
- 저널 없이 끝내면 Stop 훅이 한 번 세움
- 훅 4 · 스킬 2 · `scripts/collab.sh` (digest · pulse · guard · check · prune) · 테스트 58개
- 다른 하네스용 접점: `collab.sh guard <path>`, `digest --json`, 파일 위치로 리포 루트 탐색

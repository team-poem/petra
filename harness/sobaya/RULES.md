# sobaya 와 함께 쓰는 규칙 — 협업 하네스 쪽에서 흡수한 것

[sobaya#4](https://github.com/team-poem/sobaya/issues/4)의 기존 합의대로 소비자 맞춤과 협업 규칙은 이쪽에서 유지한다. 공개 설치형 v1의 연결 경계만 추가하며 명세·테스트 승인·검증 규칙은 바꾸지 않는다. 명령과 준비 절차는 [설치형 안내](../../docs/sobaya-installed.md)를 기준으로 한다.

| sobaya 의 성질 | 우리 규칙 | 어디서 강제·안내 |
|---|---|---|
| 승인 기준이 baseline **커밋 sha** 라 rebase 하면 깨진다 | 승인 브랜치는 main 을 **merge** 로만 따라잡는다. 기본 `SYNC_MODE=merge` | pulse 가 자동. `SYNC_MODE=auto` 여도 승인 상태를 보고 merge |
| `spec.md`·`failed-test.md` 가 앱 **루트 고정** | 브랜치(기능) 단위로 쓰고 main 에는 두지 않는다. gate·review 뒤 **마지막 커밋**으로 `collab/journal/plans/<날짜-owner-slug>/` 에 옮긴다. 그 뒤 그 브랜치에서 sobaya 명령을 치지 않는다 | handoff 스킬. `check` 가 main 유입을 막음. `pr-body` 가 review HEAD 를 적음 |
| 워커는 에디터 훅을 **거치지 않는다** | sobaya 명령은 `scripts/collab.sh run -- …` 으로 감싼다. 실행 전 동료가 편집 중인 허브 파일이면 중단(`COLLAB_RUN_FORCE=1` 로 강행), 실행 후 워커가 건드린 허브 파일과 겹침을 보고. 커밋마다 post-commit 이 스냅샷을 올려 동료가 본다. pre-commit 은 허브 편집 경고 | `collab.sh run`, `.githooks/post-commit`, `precommit` |
| 승인 상태(`state.json`)가 **git-dir 당 하나** | 승인 브랜치가 있는 클론에서 새 브랜치는 워크트리: `scripts/collab.sh worktree <branch>`. wip ref 도 브랜치별이라 워크트리끼리 안 덮어쓴다 | start-work 스킬 |
| 구형 설치기는 기존 사용자 pre-commit을 덮어쓰지 않음 | attach/sync/update는 설정 파일을 쓰지 않고 명령 범위의 임시 hooksPath로 설치한다. 실제 공용 사용자 훅·심링크는 보존하며, 성공한 관리 훅만 공용 위치에 게시한다. 우리 `.githooks/pre-commit`이 이어서 exec | `attach-sobaya.sh` |
| review 가 HEAD 에 **바인딩** | plan 이동 커밋이 review 뒤에 오므로 어긋난다. `pr-body` 가 review HEAD 와 현재 HEAD 를 적어 사람이 확인 | `pr-body` |
| 구형 Sobaya 소스 루트에 `AGENTS.md`만 있음 | 구형 `attach`가 Sobaya 소스 클론에 `CLAUDE.md -> AGENTS.md` 심링크를 만들고 `.git/info/exclude` 에 넣는다 | `attach-sobaya.sh` |
| 구형 Sobaya 소스 루트에 `.claude/`가 없고 gitignore도 없음 | 루트 세션 어댑터와 `settings.local.json` 을 `.git/info/exclude` 로 숨긴다 | `attach-sobaya.sh` |
| `_contract_text` 가 **심링크를 거부** | 앱의 `AGENTS.md` 를 실제 파일로 유지 | 템플릿 구조, `install-into.sh` |
| `contract_clean` 이 **untracked 포함 깨끗한 트리** 요구 | 저널·claim·lock 을 커밋한 뒤 sobaya 명령. `.claude/cache/` 는 gitignore 라 안 걸림 | handoff 순서 |
| 항목 진행 중 HEAD가 바뀌면 **죽는다** | pulse는 진행 항목이나 살아 있는 실행·관리 잠금이 있으면 따라잡기를 보류한다. 죽은 소유자나 해제 뒤 남은 잠금 파일만으로 계속 멈추지 않는다 | pulse |

## 설치형 종속 모드의 추가 경계

| 공개 v1의 성질 | 소비자 규칙 |
|---|---|
| 소비 루트와 설치 저장소가 분리됨 | 프로젝트 위치를 유지하고 개인 저장소는 밖에 둔다. root `sobaya.json`·`sobaya.lock`만 팀 버전으로 공유한다 |
| init은 기존 앱 입력을 요구하며 승인하지 않음 | 기능 브랜치에서 사람 소유 명세·검토할 초안을 먼저 준비한다. attach가 생성·수정하지 않으며 사람의 정확한 승인 뒤에만 approve한다 |
| sync는 pin에 맞는 설치 복원만 수행 | 문서 없는 main이나 새 clone에서도 사용한다. join은 개인 저장소를 추측하거나 자동 attach하지 않는다 |
| 전달 훅과 연결 정보가 worktree에 속함 | 최초 attach 전에 기존 설정을 점검하고 worktreeConfig를 준비한다. join·init·새 worktree 생성으로 기존 전달 훅을 덮어쓰지 않는다 |
| check는 연결·전달 훅의 일치 검사 | 전체 payload 검증이나 gate로 표현하지 않는다. 충돌한 메타데이터를 자동 고치지 않는다 |
| bump는 후보의 전체 선언 스위트를 검증 | 깨끗하고 유휴인 연결에서 명시적 후보를 사용한다. 실패 시 보호 상태와 pin을 복원하고, 성공한 두 pin 변경을 PR로 검토한다 |
| 구형 관리 훅과 함께 실행하면 중복될 수 있음 | 구형 lock·알려진 관리 훅이 있으면 거절한다. 기존 소스 클론 명령은 유지하고 자동 이전하지 않는다. 앱 CLAUDE.md를 재생성하지 않는다 |

계획 보관 뒤 root pin은 남는다. 보관한 브랜치에서 Sobaya 명령을 다시 실행하지 않는 기존 순서를 유지한다. 구형 소스 클론용 주간 알림은 유지하고, 설치형 주간 릴리스 알림·자동 이전은 후속 작업이다.

## 이 표를 유지하는 방법

구형 `attach-sobaya.sh update` 또는 설치형 후보 bump를 검토할 때 공개 계약과 이 표를 함께 확인한다. 기존 `tests/hooks.sh`·`tests/loop.sh`·`tests/sobaya.sh`, 설치형 `tests/sobaya-installed.sh`, 실제 구형 설치기와 연결하는 `tests/sobaya-legacy-worktree.sh`를 실행한다. 테스트 입력 변경은 사람이 정확한 교체본을 승인해야 한다. fixture v3는 [2026-10-07 승인 기록](../../collab/journal/2026-10-07-Kangmin_Kim-sobaya-v1-fixture-approved.md), 구형 회귀 7개는 [2026-10-08 승인 기록](../../collab/journal/2026-10-08-Kangmin_Kim-sobaya-legacy-approved.md)의 정확한 입력을 적용했다. 실제 소비자 앱의 승인이나 최종 검증은 이 승인으로 대체하지 않는다.

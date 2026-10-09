# PETRA 협업 계약

이 프로젝트에서는 여러 사람이 각자 에이전트로 동시에 일한다. 프로젝트의 루트 AGENTS.md는 앱 계약이며 이 문서는 협업 계약이다. 앱 문서·테스트 명령을 덮어쓰지 않는다.

1. 처음에는 `sh .petra/bin/petra onboard`로 안내를 읽고 `join <핸들>`로 개인 Git 훅을 준비한다. 세션 시작에 `sh .petra/bin/petra digest --fetch --session`을 실행하고 질문·동료 목표·변경 이벤트·편집 파일을 읽는다. 자동 훅이 없는 도구에서도 직접 실행한다. `--session`은 새 세션에서만 쓴다.
2. 코드 변경 전에 main에서 새 작업 브랜치를 만든다. `.petra/templates/claim.md`를 `.petra/collab/active/<branch-slug>/claim.md`로 복사하고 실제 branch, owner, goal을 채운 뒤 커밋·push한다. slug는 `/`를 `--`로 바꾼 값이다.
3. 서로 다른 기능은 병렬로 진행한다. 디렉토리를 독점하지 않는다. 같은 허브 파일을 동료가 편집 중이면 멈춰 사용자에게 알려 순서를 정한다. 커밋된 미머지 변경도 충돌 가능성이 있으므로 확인한다.
4. 파일 몇 개를 고친 뒤 `sh .petra/bin/petra pulse`를 실행한다. 새 겹침과 질문에 반응한다. 동료가 변경한 함수의 호출부를 확인하고, 동료가 만든 공용 코드를 중복 구현하지 않는다. `sharing`의 실패·stale·unknown을 '동료 작업 없음'으로 판단하지 않는다. 스냅샷은 `.gitignore`로 제외하지 않은 파일 내용도 Git 원격에 올린다.
5. 마무리에는 `.petra/collab/journal/YYYY-MM-DD-<owner>-<slug>.md`를 새로 쓴다. `## 이벤트`에 `- changed <경로> <변경> → <상대가 할 일>`을 기록한다. 질문은 `ask @핸들`, 답은 `reply @핸들`. `## 남은 것`에는 이어받을 내용을 쓴다. 기존 저널은 수정하지 않는다.
6. claim 상태를 갱신하고 실제 앱 테스트, `sh .petra/bin/petra check`, `sh .petra/bin/petra pr-body`를 실행한다. 작은 의미 단위로 커밋·push하고 PR로 squash merge한다. main 직접 push, 남의 claim 수정, force push는 하지 않는다.

중간 공유: 에이전트는 독립된 변경을 검증했을 때 `checkpoint --message "변경 요지" -- <이번 파일들>`을 실행한다. 테스트를 생략하거나 타이머에 코드를 커밋시키지 않는다. 계약 변경·질문·허브 작업 완료는 즉시 새 저널도 커밋·push한다. 스냅샷과 브랜치/저널 전송은 다르다. 상세 절차는 `petra` 스킬을 따른다.

최초 설치는 제작 리포의 `install --dry-run`과 `--apply --expect-plan`으로 준비한다. Git, jq, Node.js 22 이상이 필요하다. 설치·검증은 앱 테스트나 모델 동작 검증을 대신하지 않는다.
구형 이전·업데이트·롤백은 검토한 제작 리포의 migrate/update/rollback으로 계획을 확인한 뒤 적용한다. 실행 중인 워커에는 적용하지 않는다. 기존 연결·승인 상태를 다른 worktree에서 복사하지 않는다.

## Sobaya와 함께 개발할 때

- 프로젝트 밖의 신뢰한 설치 저장소를 명시하고 `sh .petra/bin/petra sobaya attach|sync|bump|check --install-root <저장소>`를 사용한다. 팀 pin은 앱 루트의 `sobaya.json`·`sobaya.lock`이다. 연결 전에 기존 Git 설정을 점검하고 `extensions.worktreeConfig=true`를 준비한다.
- attach에는 기존 일반 파일 `AGENTS.md`, `spec.md`, `failed-test.md`가 필요하다. 명세·테스트를 생성하거나 승인하지 않는다. 정확한 테스트 입력에 대한 사용자 승인 뒤에만 Sobaya approve를 실행한다. 승인 기준을 수정·약화하지 않는다.
- 워커는 `sh .petra/bin/petra run -- <신뢰한 Sobaya 명령>`으로 실행한다. 실행 중에도 기본 60초마다 스냅샷을 공유하지만 커밋·main 따라잡기는 끼워 넣지 않으며 승인 브랜치에서 rebase하지 않는다.
- 별도 작업은 `sh .petra/bin/petra worktree <branch>`로 격리하고 독립된 claim·연결을 준비한다. 정상 연결 뒤 join은 전달 훅과 승인 상태를 보존한다. 손상된 연결은 자동 초기화하지 않는다.
- gate·review 확인 후 마지막 커밋에서 plan을 `.petra/collab/journal/plans/<고유한-작업명>/`에 보관한다. PR에 review HEAD와 보관 커밋의 관계를 남긴다. 보관 후 같은 브랜치에서 Sobaya를 재실행하지 않는다.
- plan 없는 main에서는 sync만 한다. 새 팀 pin을 받으면 명시적으로 sync하며, 후보 버전 변경은 bump의 앱 검증 후 PR로 검토한다. 연결·sync·bump는 테스트 승인이나 자동 업데이트가 아니다.

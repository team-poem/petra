# PETRA

쇼핑몰을 만든다고 생각하면 solp는 상품 화면, amazon은 장바구니를 만든다. 각각의 브랜치에 작업 목표를 써서 공유하고, Git 스냅샷으로 지금 고치는 파일을 서로 본다. solp가 가격 계산 함수를 바꾸면 저널에 새 사용법을 남긴다. amazon의 에이전트가 그 함수를 쓰고 있다면 다음 digest에서 변경을 읽고 호출부를 확인한다.

첫 합류는 `sh .petra/bin/petra onboard`로 안내를 읽고 `join <내 핸들>`. 매 세션은 `digest --fetch --session`으로 시작하고, 작업 중 `pulse`, 마무리는 새 저널과 `check`다. 명령 앞에는 `sh .petra/bin/petra`를 붙인다. 상대가 공유하고 내가 조회한 미커밋 변경을 알 수 있으며, fetch 실패·오래된 스냅샷은 안전 보장이 아니다.

독립된 변경이 검증됐을 때 에이전트가 `checkpoint --message "변경" -- <파일들>`로 커밋·push한다. 계약 변경과 질문은 그때 새 저널로 알린다. `run -- <워커>`는 실행 중 기본 60초마다 별도 스냅샷을 보내지만 코드 커밋/merge를 끼워 넣지 않는다. `sharing` 상태의 failed·stale·unknown은 상대가 쉬고 있다는 뜻이 아니다. 스냅샷에는 ignore하지 않은 파일 내용도 포함된다.

앱 코드·README·AGENTS는 프로젝트 루트에 그대로 둔다. `.petra/runtime`은 실행 코드, `.petra/collab`은 팀 기록, `.petra/config.sh`는 프로젝트 설정이다. 캐시는 worktree별 Git 메타데이터에 생기므로 앱 파일로 커밋되지 않는다.

최초 설치는 검토한 PETRA 제작 리포의 `sh bin/petra install --target <앱 루트> --dry-run`으로 확인하고, 출력된 plan_id를 `--apply --expect-plan <id>`에 전달한다. 설치는 커밋·push나 Git 설정 변경을 하지 않는다. 결과를 검토해 커밋한 뒤 각 팀원이 join한다. Git, jq, Node.js 22 이상이 필요하다.

구형 이전과 업데이트·롤백은 검토한 제작 리포의 migrate/update/rollback으로 dry-run한 뒤 계획을 지정해 적용한다. 설정·저널·앱·Sobaya 승인은 보존한다. 기존 사용자 Git 훅이나 별도 hooksPath는 자동으로 감싸지 않고 설치 전에 멈춘다. Claude의 얇은 훅 연결은 기존 설정에 추가한다. Codex는 AGENTS와 petra 스킬에서 같은 CLI를 직접 호출한다. 패키지 검증과 실제 에이전트 검증을 혼동하지 않는다.

선택용 PR 양식은 `.github/PULL_REQUEST_TEMPLATE/petra.md`, 읽기 전용 CI는 `.github/workflows/petra-check.yml`이다. 기존 앱 테스트 CI와 함께 사용한다. 팀 승인이 필수인 GitHub main 보호 규칙은 관리자가 따로 설정한다.

새 설치를 마친 뒤에는 `sh .petra/bin/petra sobaya attach|sync|bump|check --install-root <외부 개인 저장소>`로 설치형 Sobaya를 연결할 수 있다. PETRA는 협업을, Sobaya는 승인된 테스트의 구현·검증을 맡는다. 팀 버전은 루트의 `sobaya.json`·`sobaya.lock`이며 새 버전은 PR로 검토하고 각자가 sync한다. 자동 최신 업데이트는 하지 않는다. 연결 전 준비와 승인 경계는 [협업 계약](AGENTS.md)의 Sobaya 절을 읽는다.

설치가 강제 종료되면 Git 메타데이터의 `petra-install.lock/backup.json`을 남기고 verify/join이 멈춘다. 제작 리포의 `recover --target <앱> --dry-run`으로 검사한 뒤 `--apply`로 이번 변경만 복구한다. 동시 편집이 있으면 수동 검토하며 잠금만 지워 정상으로 취급하지 않는다.

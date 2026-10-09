# PETRA

쇼핑몰을 만든다고 생각하면 solp는 상품 화면, amazon은 장바구니를 만든다. 각각의 브랜치에 작업 목표를 써서 공유하고, Git 스냅샷으로 지금 고치는 파일을 서로 본다. solp가 가격 계산 함수를 바꾸면 저널에 새 사용법을 남긴다. amazon의 에이전트가 그 함수를 쓰고 있다면 다음 digest에서 변경을 읽고 호출부를 확인한다.

첫 합류는 `sh .petra/bin/petra join solp`. 매 세션은 `digest --fetch`로 시작하고, 작업 중 `pulse`, 마무리는 새 저널과 `check`다. 명령 앞에는 `sh .petra/bin/petra`를 붙인다. 두 사람이 동시에 확인하기 전에는 서로의 미커밋 변경을 알 수 없으며, fetch 실패·오래된 스냅샷은 안전 보장이 아니다.

앱 코드·README·AGENTS는 프로젝트 루트에 그대로 둔다. `.petra/runtime`은 실행 코드, `.petra/collab`은 팀 기록, `.petra/config.sh`는 프로젝트 설정이다. 캐시는 worktree별 Git 메타데이터에 생기므로 앱 파일로 커밋되지 않는다.

최초 설치는 검토한 PETRA 제작 리포의 `sh bin/petra install --target <앱 루트> --dry-run`으로 확인하고, 출력된 plan_id를 `--apply --expect-plan <id>`에 전달한다. 설치는 커밋·push나 Git 설정 변경을 하지 않는다. 결과를 검토해 커밋한 뒤 각 팀원이 join한다. Git, jq, Node.js 22 이상이 필요하다.

구형 하네스 이전과 PETRA 업데이트·롤백은 후속 구현이다. 기존 사용자 Git 훅이나 별도 hooksPath는 자동으로 감싸지 않고 설치 전에 멈춘다. Claude의 얇은 훅 연결은 기존 설정에 추가한다. Codex는 자동 훅을 보장하지 않으며 AGENTS에서 같은 CLI를 직접 호출한다. 패키지 검증과 실제 에이전트 검증을 혼동하지 않는다.

새 설치를 마친 뒤에는 `sh .petra/bin/petra sobaya attach|sync|bump|check --install-root <외부 개인 저장소>`로 설치형 Sobaya를 연결할 수 있다. PETRA는 협업을, Sobaya는 승인된 테스트의 구현·검증을 맡는다. 팀 버전은 루트의 `sobaya.json`·`sobaya.lock`이며 새 버전은 PR로 검토하고 각자가 sync한다. 자동 최신 업데이트는 하지 않는다. 연결 전 준비와 승인 경계는 [협업 계약](AGENTS.md)의 Sobaya 절을 읽는다.

설치가 강제 종료되면 Git 메타데이터의 `petra-install.lock/backup.json`을 남기고 verify/join이 멈춘다. 백업을 보존하고 실제 변경 파일을 확인한 뒤 수동 복구한다. 잠금만 지워 설치를 정상으로 취급하지 않는다.

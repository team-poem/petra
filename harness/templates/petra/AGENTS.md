# PETRA 협업 계약

이 프로젝트에서는 여러 사람이 각자 에이전트로 동시에 일한다. 프로젝트의 루트 AGENTS.md는 앱 계약이며 이 문서는 협업 계약이다. 앱 문서·테스트 명령을 덮어쓰지 않는다.

1. 처음에는 `sh .petra/bin/petra join <핸들>`로 개인 Git 훅을 준비한다. 세션 시작에 `sh .petra/bin/petra digest --fetch`를 실행하고 질문·동료 목표·변경 이벤트·편집 파일을 읽는다. 자동 훅이 없는 도구에서도 직접 실행한다.
2. 코드 변경 전에 main에서 새 작업 브랜치를 만든다. `.petra/templates/claim.md`를 `.petra/collab/active/<branch-slug>/claim.md`로 복사하고 실제 branch, owner, goal을 채운 뒤 커밋·push한다. slug는 `/`를 `--`로 바꾼 값이다.
3. 서로 다른 기능은 병렬로 진행한다. 디렉토리를 독점하지 않는다. 같은 허브 파일을 동료가 편집 중이면 멈춰 사용자에게 알려 순서를 정한다. 커밋된 미머지 변경도 충돌 가능성이 있으므로 확인한다.
4. 파일 몇 개를 고친 뒤 `sh .petra/bin/petra pulse`를 실행한다. 새 겹침과 질문에 반응한다. 동료가 변경한 함수의 호출부를 확인하고, 동료가 만든 공용 코드를 중복 구현하지 않는다.
5. 마무리에는 `.petra/collab/journal/YYYY-MM-DD-<owner>-<slug>.md`를 새로 쓴다. `## 이벤트`에 `- changed <경로> <변경> → <상대가 할 일>`을 기록한다. 질문은 `ask @핸들`, 답은 `reply @핸들`. `## 남은 것`에는 이어받을 내용을 쓴다. 기존 저널은 수정하지 않는다.
6. claim 상태를 갱신하고 실제 앱 테스트, `sh .petra/bin/petra check`, `sh .petra/bin/petra pr-body`를 실행한다. 작은 의미 단위로 커밋·push하고 PR로 squash merge한다. main 직접 push, 남의 claim 수정, force push는 하지 않는다.

최초 설치는 제작 리포의 `install --dry-run`과 `--apply --expect-plan`으로 준비한다. Git, jq, Node.js 22 이상이 필요하다. 설치·검증은 앱 테스트나 모델 동작 검증을 대신하지 않는다.
구형 하네스 이전·업데이트와 Sobaya 신규 연결은 후속 범위다. 현재 연결·승인·spec·failed-test 파일을 변경하거나 복사하지 않는다.

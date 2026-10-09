# PETRA 최초 설치와 보존 검증

## 이벤트
- added harness/install-petra.mjs 최초 설치 계획과 적용 → 제작 리포의 bin/petra install --target <앱 루트> --dry-run 후 --apply --expect-plan <id>를 사용한다. 앱은 별도 브랜치와 깨끗한 상태로 준비한다.
- added harness/petra-files.mjs 관리 파일 해시·권한과 공유 문서 구역·Claude 훅 항목 검증 → manifest는 schema 1을 유지하고 installation/shared 필드로 설치 정보를 구분한다. 설치와 verify/join에 Node.js 22 이상이 필요하다.
- changed bin/petra 같은 설치의 재실행은 파일을 쓰지 않으며 최초 설치는 Git 설정·커밋·push를 하지 않음 → diff 검토와 커밋 뒤 각 clone에서 join한다. 사용자 Git 훅과 custom hooksPath는 자동 체인하지 않는다.
- changed scripts/petra-lab.sh up/reset이 실제 dry-run/apply로 쇼핑몰을 설치한 뒤 두 clone을 준비 → 기존 수동 환경은 up에서 보존되며 최신 환경은 reset으로 만든다. 자동 검사는 install.log도 남긴다.
- rule 기존 collab·하네스·Sobaya pin 또는 현재/형제 worktree의 Sobaya 상태를 발견하면 최초 설치 거절 → 이번 PR을 구형 이전이나 Sobaya 새 배치 연결로 사용하지 않는다.
- rule 실패 시 이번 설치 변경만 복구하고 동시 편집·강제 종료는 Git 메타데이터 petra-install.lock/backup.json을 보존 → 잠금만 삭제하지 말고 원본·설치본·현재 변경을 비교해 수동 복구한다.

## 남은 것
- 구형 배치 이전, 소비 배치의 Sobaya 연결, 업데이트/롤백, 소비자 CI·PR 양식·세 스킬의 배포는 후속 PR이다. 이슈 #4 전체 완료나 정식 릴리스가 아니다.
- Codex는 AGENTS/공통 CLI, Claude는 설정에 추가된 얇은 훅을 사용한다. 실제 모델 호출과 도구별 자동 훅 지원은 별도 검증이며 이번 테스트는 실제 Git/CLI와 결정적 fixture 검증이다.
- 로컬: 최초 설치 25개, 기존 hooks 84개·loop 48개·sobaya 32개·소비 26개·실험실 11개 통과. Linux/macOS 설치 검사와 기존 설치형·혼합 Sobaya 검사를 PR CI로 확인한다.

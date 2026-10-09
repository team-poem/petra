# codex/petra-first-slice · solp · 2026-10-09
- claim: collab/active/codex--petra-first-slice/claim.md

## 이벤트
- added bin/petra PETRA 첫 소비 배치 진입점 → 제작 리포는 pack, 테스트 소비 프로젝트는 .petra/bin/petra를 사용한다. 기존 프로젝트 적용 설치기로 쓰지 않는다.
- changed harness/hooks/lib.sh 프로젝트 ROOT와 실행 코드 RUNTIME_ROOT를 분리하고 원격 ref의 manifest로 기록 경로를 선택함 → 구형 collab/와 신규 .petra/collab/ 브랜치를 함께 읽는다. 원격 설정을 실행하지 않는다.
- changed .githooks/pre-commit 소비 manifest가 있으면 PETRA로 위임하되 파일 주소와 Sobaya 훅 체인은 유지함 → 기존 설치형 연결을 자동 이관하지 않는다.
- changed scripts/collab.sh 미추적 하위 파일과 확장자가 있는 import도 영향 판정에 포함함 → 새 기능 파일도 공용 함수 변경 이벤트를 받을 수 있다.
- added tests/petra.sh 임시 쇼핑몰·bare 원격·solp/amazon clone과 worktree의 26개 검사 → 새 배치 회귀는 이 테스트와 기존 191개를 함께 실행한다.
- rule 실제 Codex의 계약 읽기·digest·KRW 회신 해석은 확인했으나 sandbox의 fetch 실패는 별도 미검증이다. Claude의 SessionStart 계약/이벤트 주입은 확인했고 모델 호출은 조직 접근 제한 403으로 중단됐다 → 두 도구의 전체 개발 검증이라고 말하지 않는다.

## 남은 것
- 기존 프로젝트용 설치 dry-run/apply, 업데이트·롤백, 사용자 수정 관리, 기록 이전은 구현하지 않았다.
- 신규 소비 배치의 Sobaya 연결과 외부 루트 어댑터 이관, 세 스킬 배포는 후속 단계다. Sobaya 코드·root pin·승인 상태는 변경하지 않았다.
- 실제 두 도구의 최신 원격 갱신과 Claude 모델 응답은 접근 가능한 환경에서 후속 검증한다.

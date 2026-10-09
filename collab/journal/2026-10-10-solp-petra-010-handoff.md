# codex/petra-010 · solp · 2026-10-10
- claim: collab/active/codex--petra-010/claim.md

## 이벤트
- changed scripts/collab.sh 미커밋 공유의 성공/실패/오래됨/미확인을 구분하고 checkpoint와 워커 실행 중 공유를 제공한다 → 타이머가 코드를 커밋한다고 설명하지 말고 검증된 의미 단위에서 에이전트가 checkpoint를 호출할 것.
- added harness/lifecycle-petra.mjs 검토한 배포물을 기준으로 update/rollback/migrate/recover를 제공한다 → dry-run의 plan_id를 확인하고 앱·저널·설치형 Sobaya 승인 상태 보존을 검토할 것.
- added harness/source-petra.mjs Git 메타데이터가 없는 소스 배포물에서도 출처·관리 파일을 확인하고 설치한다 → GitHub 자동 소스가 아니라 릴리스의 검증된 source 자산을 사용할 것.
- changed harness/VERSION 0.1.0 버전과 노트, main 검사 후 수동 릴리스 워크플로를 준비했다 → 이 브랜치의 버전 변경을 정식 배포 완료로 간주하지 말고 멤버 승인·병합을 거칠 것.
- rule docs/petra-010-testing.md 로컬 회귀와 실제 에이전트 smoke를 구분했다 → Codex의 협업 현황 조회는 확인했고 Claude 응답은 조직 403으로 미검증임을 유지할 것.

## 남은 것
- 최종 PR의 Linux/macOS CI, 동료 리뷰 및 main 병합. 병합 뒤 PETRA 릴리스 워크플로로 v0.1.0을 발행한다.
- Claude 모델 응답 smoke는 조직의 정상 접근 권한이 준비된 뒤 재검증한다. 계정 설정이나 Sobaya 승인 규칙은 변경하지 않았다.

# codex/sobaya-v1-adoption · Kangmin_Kim · 2026-10-09
- claim: collab/active/codex--sobaya-v1-adoption/claim.md

## 이벤트
- changed harness/attach-sobaya.sh 구형 attach·sync·update는 같은 Git 공용 디렉터리의 설치형 연결 기록을 앱 계약·source setup·pull 전에 확인하고 거절함 → 혼합 연결을 자동 이전하지 말고 충돌 경로를 확인할 것.
- changed scripts/collab.sh digest는 연결 확인과 실행기 준비를 구분하고 팀 pin 변경 후 sync 명령을 안내함 → 동료 bump를 받아왔으면 개인 저장소에서 명시적으로 sync할 것.
- added tests/sobaya-mixed-mode.sh 승인된 11개를 전체 CI에 연결함 → 기존 180개와 함께 총 191개를 실행하며 원문·도우미·fixture를 바꾸지 말 것.

## 검증과 인수인계
- 최종 macOS Bash 3.2/shlock 전체 191개 통과. 로그는 `/private/tmp/poem-mixed-final-macos.mybhIE`, 정확한 코드·테스트 해시와 한계는 `collab/active/codex--sobaya-v1-adoption/mixed-mode-implementation.md`에 기록했다.
- 독립 검토에서 환경변수로 검사·실행 대상이 달라지는 경로를 재현해 보완했다. 최종 소스·문서·CI에서 남은 차단 사항 없음. 승인 원문 3개 해시와 기존 세 테스트는 보존했다.

## 남은 것
- Linux CI 실행 ID·결과와 커밋 결합 완료 리뷰는 PR #5 본문·검사에서 확인한다. 외부 동료 재검토·병합 판단은 남아 있으며 병합이나 출시는 수행하지 않았다.

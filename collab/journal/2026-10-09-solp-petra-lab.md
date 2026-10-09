# codex/petra-first-slice · solp · 2026-10-09
- claim: collab/active/codex--petra-first-slice/claim.md

## 이벤트
- added scripts/petra-lab.sh 이 리포 내부의 수동 쇼핑몰과 자동 검사 공간을 준비함 → up/status/reset/test를 사용한다. reset은 이전 작업을 보존하며 test는 수동 세션을 건드리지 않는다.
- added tests/fixtures/shop/ 로컬·CI가 공유하는 앱 원본과 실제 Node 테스트 → 외부 GitHub 프로젝트나 테스트 전용 장기 브랜치 없이 같은 원본을 사용한다.
- changed tests/petra.sh CI의 GITHUB_HEAD_REF와 호출자 Git 환경을 격리함 → 최초 PR Linux CI에서 쇼핑몰 claim을 잘못 찾던 실패를 수정했다. 기존 로컬 통과 기록과 원격 CI 결과를 구분한다.
- changed scripts/collab.sh import 영향 판정에서 파이프 입력을 끝까지 읽음 → Linux에서 여러 import 키가 맞을 때 생기던 broken pipe 진단을 없앴다.
- changed .github/workflows/harness-check.yml Linux/macOS에 내부 실험실 11개와 협업 26개 검사를 연결하고 로그를 아티팩트로 저장함 → PR의 PETRA 내부 실험실 두 결과를 함께 확인한다.
- added docs/petra-lab.md 리포 내부에서 반복 실험하는 절차 → 새 PETRA 코드로 수동 실험할 때는 reset, 자동 회귀는 test를 실행한다.

## 남은 것
- 이 실험실에 정식 설치·이전·업데이트와 소비 배치의 Sobaya 연결 시나리오를 후속 구현하며 추가한다.
- 실제 모델의 이해·구현은 별도 수동 실험이다. CI는 계정이나 모델 API 키 없이 Git·CLI·훅 프로토콜을 검증한다.

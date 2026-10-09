# docs/petra-install-design · solp · 2026-10-09
- claim: collab/active/docs--petra-install-design/claim.md

## 이벤트
- changed docs/design/petra-installation.md PR #5 머지본 823d823 기준으로 연결 보호, 최초 안내, 소비자 정책, 외부 어댑터와 팀 전환 순서를 보완 → 초기 검토본의 대기 조건 대신 현행 계약을 기준으로 검토할 것
- changed docs/design/petra-acceptance.md 기존 191개 회귀를 명시하고 수용 시나리오를 42개로 정리 → 새 시나리오는 미실행이며 정확한 테스트 입력은 별도 승인받을 것
- added docs/design/petra-first-slice.md 첫 구현의 파일 배치와 solp·amazon의 두 clone 협업 시나리오 → 설치·이전 전체를 한 번에 구현하지 말고 작은 소비 배치에서 실제 계약 소비부터 확인할 것

## 검증
- 세 문서의 로컬 링크 7개, 코드 펜스, 현행 기준 커밋과 수용 ID 42개의 순서·중복 검사 통과. 첫 구현 체크리스트는 미완료 상태다.
- git diff로 AGENTS, 실행 코드, VERSION, 도구/CI 설정, 기존 승인 테스트가 origin/main과 동일함을 확인했다. 문서만 변경하므로 제품 테스트 191개는 이번 세션에서 다시 실행하지 않았다.
- 사용자 방향 동의와 착수 요청을 아직 작성하지 않은 테스트의 승인이나 출시 승인으로 취급하지 않았다.

## 남은 것
- 첫 구현 범위의 정확한 테스트·fixture 초안을 작성하고 사람이 검토한 뒤 적용한다. 현재 PETRA 배치나 설치 명령은 아직 실행할 수 없다.
- 첫 구현은 앱 안에서 여는 세션을 대상으로 한다. 외부에 복사된 구형 Sobaya 루트 어댑터의 재연결이 해결되지 않으면 해당 프로젝트의 배치 이전은 거절하는 기준이다.
- Codex·Claude 실제 세션과 두 clone의 협업 시나리오를 검증한 뒤 설치·이전·업데이트 단계로 진행한다. 지원 여부나 새 동작의 PASS를 아직 주장하지 않는다.

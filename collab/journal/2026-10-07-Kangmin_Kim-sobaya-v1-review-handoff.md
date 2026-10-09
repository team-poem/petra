# codex/sobaya-v1-adoption · Kangmin_Kim · 2026-10-07
- claim: collab/active/codex--sobaya-v1-adoption/claim.md

## 이벤트
- supersedes collab/journal/2026-10-07-Kangmin_Kim-sobaya-v1-fixture-approved.md 승인 입력 적용과 CI 연결을 마쳤고 d89c729에서 macOS·Linux 전체 스위트가 통과했다 → 최종 PR head의 검사와 완료 보고를 확인한다.
- rule tests/sobaya-installed.sh 승인된 v3 해시 f264e7533dc994ca30042fcf062963f6157572a7e51fd3bc446b07a98292e62b를 그대로 보존한다 → 이후 수정도 사람의 정확한 교체 승인이 필요하다.
- changed .github/workflows/harness-check.yml Linux CI가 flock 가용성과 shlock 부재를 명시적으로 확인한다 → OS 이름만으로 잠금 분기 실행을 추정하지 않는다.
- done harness/sobaya-installed.sh 설치형 첫 연결과 후속 bump 절차를 구현·문서화했다 → 구형 소스 클론 방식은 유지하며 실제 소비자의 root pin 갱신은 소비 프로젝트의 별도 PR로 진행한다.

## 검증
- d89c729: macOS 기존 84+48+32와 설치형 9개, 협업 검사 통과. shlock 사용, 실행 전후 동일 HEAD·깨끗한 작업 트리 확인.
- d89c729에 대한 Linux PR CI 37587169323: 같은 네 스위트와 협업 검사 통과. https://github.com/team-poem/poem-collaboration-harness-template/actions/runs/37587169323
- 기존 세 스위트·구형 어댑터는 base와 동일하다. 설치형 실행 파일은 승인된 v3와 바이트 단위로 같다.
- 독립 리뷰가 JSON 다중 문서 거절을 재현하고 보호 입력·CI 연결을 확인했다. 최종 PR head의 검사·리뷰는 PR #5 완료 보고에 결합한다.

## 남은 것
- 최종 문서·CI 정리 커밋의 macOS·Linux 검증과 독립 리뷰 결과를 확인한 뒤 PR #5를 Ready for review로 전환한다. 병합과 공개 출시는 별도 판단이다.
- 구형 연결 자동 이전, 설치형 릴리스 주간 알림, 진행 중 작업의 버전 간 재개와 Poem 구조 개편은 이 PR 범위 밖이다.

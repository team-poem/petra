# docs/petra-install-design · solp · 2026-10-07
- claim: collab/active/docs--petra-install-design/claim.md

## 이벤트
- added docs/design/petra-installation.md 이슈 #4의 PETRA 배치·파일 소유권·설치·업데이트·이전 기준 제안 → 팀 검토 전 구현 완료나 승인된 계약으로 안내하지 말 것
- added docs/design/petra-acceptance.md 설치·이전·동시 작업·도구 연결의 수용 테스트 36개 계획 → 모두 미실행이며 구현 PR에서 증거를 채울 것
- touching docs/design/ 이번 작업은 문서만 다룸 → PR #5의 실행 코드와 브랜치는 변경하지 않음

## 남은 것
- solp·amazon의 설계 검토. 신규 기록은 .petra/collab, 기존 기록과 구형 lock은 보존하는 단계적 이전을 제안했다.
- PR #5의 worktree 훅 범위 회귀 수정·머지 후 그 결과에 맞춰 구현 A/B를 진행한다. 구현 PR이나 릴리스는 이번에 만들지 않는다.
- 실제 Codex·Claude 자동 연결과 소비 프로젝트 CI의 동작은 아직 검증하지 않았다. 같은 JSON 모양만으로 지원을 주장하지 않는다.
- 이번 검증은 문서 링크·수용 항목 ID·diff 범위·협업 검사에 한정한다. 실행 코드·기존 테스트·VERSION은 그대로다.

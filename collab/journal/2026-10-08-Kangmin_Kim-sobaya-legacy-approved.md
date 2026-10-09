# codex/sobaya-v1-adoption · Kangmin_Kim · 2026-10-08
- claim: collab/active/codex--sobaya-v1-adoption/claim.md

## 이벤트
- supersedes collab/journal/2026-10-08-Kangmin_Kim-sobaya-legacy-regression-draft.md 사용자가 검토본의 일곱 테스트와 정상 sync 종료 코드 0 기준을 승인했다 → 아래 정확한 입력으로 구형 연결 회귀를 수정하고 검증할 것
- added tests/sobaya-legacy-worktree.sh 승인 원문을 바이트 그대로 추가했다 → 초안의 DRAFT 주석은 원문 보존이며 실제 승인 상태는 이 기록을 따를 것

## 승인 근거
- 사용자는 전체 코드·구간별 설명 검토본과 추가 sync 기준에 대한 승인 요청에 "승인한다"고 답했다.
- 정확한 SHA-256: `d736cb05b581bf44f48918599053dffb6039cc8c57743d9255041d362e7d1b12`.
- 검토 원문: `collab/active/codex--sobaya-v1-adoption/proposed-legacy-worktree-tests.sh`.
- 실행 대상: `tests/sobaya-legacy-worktree.sh`. 내용 변경이나 설명 제거 없이 그대로 추가했다.
- 기존 설치형 승인 입력 SHA-256 `f264e7533dc994ca30042fcf062963f6157572a7e51fd3bc446b07a98292e62b`와 기존 세 스위트는 보호한다.
- 템플릿 자체의 가짜 앱 명세·승인 상태를 만들지 않는다. 기존 셸 유지보수 절차로 구현·검증한다.

## 남은 것
- 공유 Git 설정을 쓰지 않는 설치와 공용 훅 보호·실패 정리, 정상 sync의 종료 코드 수정.
- 기존 173개와 새 7개, macOS·Linux CI, 협업 검사와 독립 완료 리뷰. 구현 성공이나 병합·출시는 아직 기록하지 않는다.

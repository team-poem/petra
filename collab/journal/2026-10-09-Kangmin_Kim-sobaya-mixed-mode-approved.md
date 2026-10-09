# codex/sobaya-v1-adoption · Kangmin_Kim · 2026-10-09
- claim: collab/active/codex--sobaya-v1-adoption/claim.md

## 이벤트
- supersedes collab/journal/2026-10-09-Kangmin_Kim-sobaya-mixed-mode-draft.md 사용자가 전체 원문과 ┎ 설명 검토본의 11개 입력을 승인했다 → 이 기록의 정확한 원문으로 구현·검증할 것.
- added tests/sobaya-mixed-mode.sh 승인 원문 308줄·16,054바이트를 그대로 추가했다 → DRAFT 주석은 원문 보존이며 실제 승인 상태는 이 기록을 따를 것.

## 승인 근거
- 사용자는 전체 코드·설명과 실제 RED 근거를 보고 정확한 원문으로 구현 진행을 승인해 달라는 요청에 “승인한다”고 답했다.
- SHA-256: `cafb8d85a57cbb761e886f4f70a4e76d8381a5c245e0adf86236ce9ba0d303ce`.
- 원문: `collab/active/codex--sobaya-v1-adoption/proposed-mixed-mode-tests.sh`.
- 실행 대상: `tests/sobaya-mixed-mode.sh`. 바이트·주석·도우미·fixture·판정 기준을 그대로 보존한다.
- 기존 승인 180개와 설치형 `f264e7533dc994ca30042fcf062963f6157572a7e51fd3bc446b07a98292e62b`, 구형 worktree `d736cb05b581bf44f48918599053dffb6039cc8c57743d9255041d362e7d1b12` 입력은 보호한다.
- 초안 macOS 검증에서 아홉 혼합 허용 RED·한 안내 누락 RED·한 구형 대조 GREEN을 확인했다. 입력 승인은 구현 성공을 뜻하지 않는다.
- 템플릿 자체의 가짜 앱 명세나 Sobaya 승인 상태를 만들지 않는다. 기존 셸 유지보수 절차로 구현·검증한다.

## 남은 것
- source setup·pull 전에 같은 Git 저장소의 설치형 연결을 확인하는 구형 명령 사전 차단.
- digest에서 팀 pin 변경 후 명시적인 sync 안내. 연결 검사 의미는 유지하며 자동 설치·승인은 하지 않는다.
- 전체 191개 macOS·Linux 검증, 협업 검사와 독립 완료 리뷰. 병합·출시는 별도다.

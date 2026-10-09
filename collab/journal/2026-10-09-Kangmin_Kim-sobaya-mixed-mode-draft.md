# codex/sobaya-v1-adoption · Kangmin_Kim · 2026-10-09
- claim: collab/active/codex--sobaya-v1-adoption/claim.md

## 이벤트
- added collab/active/codex--sobaya-v1-adoption/mixed-mode-proposal.md PR #5 추가 리뷰의 11개 회귀 초안과 코드 밖 ┎ 설명·실제 RED 근거를 준비함 → 정확한 원문 승인 후 구현하며 기존 승인 테스트를 유지할 것.
- rule harness/attach-sobaya.sh 설치형 연결 후 구형 attach·sync·update가 같은 Git 저장소의 연결을 훼손하는 문제를 9개 배치/명령 조합으로 재현함 → 최종 수정 전 PR #5를 병합하지 말고 현재/형제 worktree와 source setup·pull 이전 경계를 함께 검토할 것.

## 남은 것
- 새 입력 SHA-256 `cafb8d85a57cbb761e886f4f70a4e76d8381a5c245e0adf86236ce9ba0d303ce`의 사람 승인은 아직 없다. 308줄/16,054바이트 원문과 43개 ┎ 설명 구간은 mixed-mode-review.md에서 확인한다.
- macOS Bash 3.2 최종 초안 탐침: 9개 혼합 허용 RED + 1개 sync 안내 누락 RED + 1개 정상 구형 대조 GREEN. 준비 오류로 실패한 중간 탐침은 결과로 세지 않았다.
- 독립 원문 검토에서 남은 차단 사항 없음. 제품 코드·기존 승인 180개·CI는 변경하지 않았다. 기존 설치형/구형 입력 해시도 유지했다.
- 승인 후 사전 차단과 digest 안내 구현, 전체 191개 검증·Linux CI·독립 완료 리뷰가 남아 있다. check의 connected 의미를 준비 완료·승인으로 바꾸거나 자동 sync하지 않는다.

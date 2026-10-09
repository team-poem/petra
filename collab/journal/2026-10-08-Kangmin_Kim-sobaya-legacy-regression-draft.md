# codex/sobaya-v1-adoption · Kangmin_Kim · 2026-10-08
- claim: collab/active/codex--sobaya-v1-adoption/claim.md

## 이벤트
- supersedes collab/journal/2026-10-07-Kangmin_Kim-sobaya-v1-review-handoff.md 솔피 검토에서 구형 새 worktree attach 회귀와 공통 설정 오염을 실제 설치기로 재현했다 → 앞선 173개 성공을 병합 충분 조건으로 사용하지 말 것
- added collab/active/codex--sobaya-v1-adoption/legacy-worktree-proposal.md 일곱 회귀 사례의 원문·전체 코드 검토본·RED 및 독립 대조 실험을 기록했다 → 사람의 정확한 입력 승인 전에는 구현 기준·CI로 사용하지 말 것

## 남은 것
- 새 실행 입력 SHA-256 `d736cb05b581bf44f48918599053dffb6039cc8c57743d9255041d362e7d1b12`의 사람 승인. 정상 sync가 0을 반환해야 한다는 기준에는 base부터 있던 종료 코드 오류 수정도 포함된다.
- 승인 후 구형 install_app 수정, 기존 승인 입력을 보존하며 전체 180개·macOS/Linux·협업 검사·독립 완료 리뷰를 진행한다. 이번 턴에는 제품 코드·기존 테스트·CI를 변경하지 않았다.
- 공통 설정을 잠깐 지웠다 복구하는 방식도 실행 중 다른 worktree에 영향을 준다. 설치기 호출 직전·직후의 디스크 설정 관찰을 초안에 포함했다.
- 실제 installer는 유지하고 얇은 관찰 래퍼와 chmod 실패 대역만 격리 fixture에 썼다. 독립 검토는 그 보조 코드와 성공·실패 대조 실험을 확인했으며 제품 GREEN을 주장하지 않는다.

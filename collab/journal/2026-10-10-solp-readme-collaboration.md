# codex/readme-collaboration · solp · 2026-10-10
- claim: collab/active/codex--readme-collaboration/claim.md

## 이벤트
- changed README.md Poem 팀의 Agentic Coding 협업 도구로 소개를 정리하고 작업 중 공유와 변경 조율을 설명한다 → 공개 설명을 바꿀 때 README.en.md도 함께 맞출 것.
- changed README.en.md 사용자가 다듬은 한국어판의 내용과 구성을 반영한다 → 도구별 구현 세부 사항은 상세 문서를 참고할 것.
- added docs/assets/petra-banner.svg Poem 깃펜 마크를 참고한 배너와 PETRA 정식 명칭을 추가한다 → 한영 README에서 같은 배너를 사용할 것.
- added docs/assets/petra-flow.svg 병렬 Inner Loop와 작업 중 공유·겹침 확인·조율을 반복하는 Outer Loop를 설명한다 → 충돌 없는 병합이나 실시간 잠금을 보장하는 도식으로 해석하지 말 것.

## 검증
- 한영 README의 1200px, 375px, 320px 브라우저 렌더링과 상대 링크 확인.
- SVG 이미지의 애니메이션, 움직임 줄이기 설정, 텍스트 경계 확인.
- SVG XML 구문과 git diff --check 통과. 실행 코드 변경이 없어 전체 런타임 테스트는 재실행하지 않았다.

## 남은 것
- main 반영 결과 확인. 현재 브랜치 보호는 관리자에게도 PR과 1명 승인을 요구하므로 직접 push가 거절되면 PR로 반영해야 한다.

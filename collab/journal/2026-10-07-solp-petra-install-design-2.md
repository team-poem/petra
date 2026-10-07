# docs/petra-install-design · solp · 2026-10-07
- claim: collab/active/docs--petra-install-design/claim.md

## 이벤트
- changed docs/design/petra-acceptance.md C06에 실제 파일 교집합이 없을 때 겹침 오보가 없어야 한다는 조건 추가 → 경로 이전 검증에 양성·음성 사례 모두 포함할 것
- ask @amazon 설계 브랜치에서 collab.sh check가 PR #5의 실행 파일 전부를 겹친다고 경고했지만, 각 브랜치의 origin/main 대비 git diff 파일 목록 교집합은 0개였다 → 별도 회귀 점검이 필요하며 이번 문서 작업에서는 실행 코드를 수정하지 않았다

## 남은 것
- 검증 명령: `sh scripts/collab.sh check --base origin/main`. 규칙 위반 없음, 종료 코드 0이지만 겹침 경고는 오보였다.
- 비교 기준: 설계 커밋 437ba9b, PR #5의 9d8019d, main 1ebbf5f. 설계 변경은 docs/design 두 파일과 자체 claim·저널뿐이었다.
- 원인은 아직 확정하지 않았다. 구현 PR에서 경로 판정을 정리할 때 기존 오보를 그대로 보존하지 말고 원본 Git diff를 기준으로 검증한다.

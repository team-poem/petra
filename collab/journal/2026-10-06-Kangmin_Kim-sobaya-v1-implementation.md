# 소바야 설치형 연결 구현과 인수인계

## 이벤트
- added harness/sobaya-installed.sh 기존 프로젝트에서 명시적 외부 저장소로 attach·sync·bump·check한다. 개인 경로는 공유 pin에 넣지 않고 공개 런타임 CLI를 사용한다.
- changed harness/join.sh 설치형 연결을 유지하며 새 clone에는 명시적 sync를 안내한다. init·state·digest도 전달 훅을 인식한다.
- changed scripts/collab.sh 새 worktree의 훅을 해당 worktree 범위에만 설정한다. 기존 연결·승인을 복사하지 않는다.
- changed harness/hooks/lib.sh 살아 있는 실행·관리 잠금과 진행 항목으로 busy를 판단한다. 해제 뒤 남은 파일만으로 계속 보류하지 않는다.
- added docs/sobaya-installed.md 첫 도입과 후속 pin bump PR, 신뢰한 설치 자료, worktree 설정·승인·계획 보관 절차를 설명한다. 기존 소스 클론 연결은 유지한다.
- rule tests/sobaya-installed.sh 최초 승인 원본을 보존했다. 준비 오류 두 곳의 v3 교체본은 별도 사람 승인 전 적용하거나 전체 합격으로 세지 않는다.

## 검증
기존 164개는 macOS·Linux에서 통과했다. 원본 잠금 항목은 실제 shlock·flock 양쪽에서 통과했다. v3 아홉 항목의 양 플랫폼 실행은 참고 검증만 통과했다. 독립 코드 리뷰의 JSON 다중 문서 오판을 수정했고 `fc7ec9a`에서 남은 지적은 없었다. Linux 전체 기록은 그 수정 이전 `e947b10`이며, 수정 후 원본 연결 항목과 독립 변조 재검증은 macOS에서 통과했다. 상세 범위·증거는 `collab/active/codex--sobaya-v1-adoption/implementation.md`에 있다.

## 남은 것
`review-v3.md`의 `┎` 전체 검토본과 교체 실행본 SHA-256 `f264e7533dc994ca30042fcf062963f6157572a7e51fd3bc446b07a98292e62b`에 대한 사용자 승인을 기다린다. 승인 후 원문 적용, 승인 기록, 준비된 CI 연결, 최종 revision의 전체 macOS·Linux 검증을 마치고 PR #5를 ready로 바꾼다. 현재 PR은 draft다. 이전 v2 한 줄 제안은 v3 두 곳 수정 제안으로 대체됐으며 기존 테스트의 제품 단언은 바뀌지 않는다. 이번 작업은 실제 앱 승인이나 설치형 전체 출시를 뜻하지 않는다.

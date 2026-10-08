# codex/sobaya-v1-adoption · Kangmin_Kim · 2026-10-08
- claim: collab/active/codex--sobaya-v1-adoption/claim.md

## 이벤트
- changed harness/attach-sobaya.sh 공유 설정 파일을 쓰지 않는 임시 설치·공용 훅 게시로 구형 worktree 연결 회귀를 수정했다 → 새 worktree에서도 기존 attach·sync·update 명령을 사용할 것
- changed harness/attach-sobaya.sh 설치·게시 실패 후 adapter·pin 갱신으로 진행하지 않으며 정상 sync는 0을 반환한다 → 실패 경로의 사용자 훅·심링크를 삭제해 우회하지 말 것
- added tests/sobaya-legacy-worktree.sh 사람 승인 원문 일곱 항목을 Linux CI에 연결했다 → 기존 173개와 함께 전체 180개를 검증할 것
- done collab/active/codex--sobaya-v1-adoption/legacy-worktree-implementation.md f17eeb5의 macOS/Linux 전체 180개와 독립 완료 검토를 기록했다 → PR #5의 수정 diff와 최신 CI로 재검토할 것

## 검증
- 사용자 승인 입력 d736cb05를 그대로 적용했다. 기존 f264e753 설치형 v3 및 hooks·loop·sobaya 테스트는 변경하지 않았다.
- macOS Bash 3.2·shlock: 84+48+32+9+7 통과. 실행 코드 SHA-256 `4756bbcb8eb592d579f76a43329174b663dfef3616af49b205a1358a62f70205`가 커밋된 소스와 일치한다.
- Linux CI: https://github.com/team-poem/poem-collaboration-harness-template/actions/runs/37739640693 — f17eeb55d7d3852e08c2b9b9834eff02aca5add1의 PR merge ref에서 180개·flock 확인·협업 검사 통과.
- 독립 완료 검토는 f17eeb5에 바인딩했다. 사용자 훅·심링크 보존, 게시 실패 전파·정리, 승인 입력과 문서 일치를 확인했고 차단 사항은 없다.
- 인수인계 커밋은 collab 기록만 변경한다. 최신 PR head CI는 PR 본문과 검사 탭에서 확인한다.

## 남은 것
- PR #5에 대한 동료 재검토와 별도의 병합·출시 판단.
- 새 회귀 테스트는 고정 공개 버전의 로컬 설치를 검사한다. 실제 네트워크 pull, 외부 동시 훅 교체, 유료 모델 품질을 검증한 것으로 확대 해석하지 않는다.

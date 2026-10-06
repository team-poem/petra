# 기여 절차 (사람용)

에이전트용 규칙은 `AGENTS.md`. 이건 사람이 지키는 것. 외울 규칙은 셋이다. **시작에 claim, 끝에 저널, 남한테 할 말은 `ask @핸들`.**

## 처음 한 번
- 클론하고 `claude` 나 `codex` 를 켠다. 첫 세션은 온보딩이다 — 에이전트가 인사하고 핸들·테스트 명령·허브 파일을 물은 뒤 설정한다. 합류자는 핸들과 협업 설정을 준비하고, 설치형 pin이 있으면 명시적 개인 저장소의 sync 절차를 따른다.
- 훅이 없는 도구면 `sh harness/init.sh <이름> <핸들>` 또는 `sh harness/join.sh <핸들>`. 세션 시작에 `sh scripts/collab.sh digest --fetch` 를 직접 친다.
- Claude Code 든 Codex 든 같다.
- `git config rerere.enabled true` (init.sh 가 해준다). 같은 충돌을 두 번 풀지 않는다.

## 브랜치
- `main` 은 보호 브랜치. PR 로만. 브랜치 하나 = claim 하나 = PR 하나.
- 브랜치는 짧게. 하루 안에 머지하는 걸 목표로. 오래 끌수록 충돌은 커진다.

## 흐름
1. `start-work` 로 브랜치와 claim 을 만들고 **바로 push**. 동료가 보는 건 원격뿐이다.
2. 작게 커밋하고 자주 push. 에이전트가 "겹침" 이나 "허브 파일 차단" 을 알리면 당사자와 한마디 나눈다.
3. 끝나면 `handoff`. 저널 없는 PR, 이벤트 절 없는 저널은 CI 가 막는다.

## PR 과 머지
- 본문은 `scripts/collab.sh pr-body` 가 만든다. 사람은 "검증" 칸만 채운다. 제목 = claim goal.
- **머지는 squash 만, 머지 시 브랜치 삭제.** 첫 push 뒤 `sh harness/github-policy.sh` 가 GitHub 설정을 건다 (온보딩이 한다). 하네스의 머지 감지와 prune 이 이 전제로 돈다.
- **PR 규칙(GitHub 룰셋, `github-policy.sh` 가 건다):** 다른 멤버 1명 이상 승인, 새 커밋이 올라오면 재승인, 리뷰 대화 전부 해결, CI 두 job 통과, 브랜치가 main 최신. 관리자도 예외 없음 — 아무도 main 에 직접 push 못 한다.
- 리뷰어는 서로. 하루에 PR 여러 개, 400줄 넘기 전에. 공유 파일(스키마·의존성) 변경은 작은 선행 PR 로 먼저.
- CI 가 여는 claim 정리 PR("chore(collab): prune claims")도 사람이 승인해야 머지된다. 보이면 승인한다.
- 먼저 머지되는 쪽이 이기고 나중 쪽이 main 을 merge 로 따라잡는다 (pulse 가 자동). `check` 가 "다른 열린 브랜치와 같은 파일" 을 알려준다.
- **main 보호:** 리포는 public 으로 둔다 (조직이 Free 플랜이라 private 에는 브랜치 보호를 못 건다). `github-policy.sh` 가 PR 필수·CI 통과 필수·force push 금지를 건다. git 훅도 같은 걸 막으므로 이중이다. private 로 만들어야 하면 git 훅만 남는다는 걸 알고 쓴다.

## AI 사용 고지
- 에이전트가 diff 의 의미 있는 부분을 썼으면 커밋에 `Assisted-by: <모델명>`.
- 결과는 사람이 소유한다. 설명 못 하는 줄은 지운다.

## sobaya 와 함께 쓸 때
- 설치형은 기존 프로젝트 위치를 유지한다. 공개 시험판을 신뢰한 자료로 설치하고 worktree 설정을 점검한 뒤 기능 브랜치에서 `sobaya-installed.sh attach`한다. 전체 절차는 [설치형 안내](docs/sobaya-installed.md) 하나를 기준으로 한다. 설치·연결은 실제 명세나 테스트의 사람 승인을 대신하지 않는다.
- 설치형 팀 버전은 루트 `sobaya.json`·`sobaya.lock`이다. 합류자는 명시적 개인 저장소에 `sync`하고, 후속 업데이트는 검토한 후보의 `bump` 결과인 두 pin을 별도 PR로 검토한다. main에 기능 명세가 없어도 sync할 수 있다.
- 기존 소스 클론은 계속 `<sobaya>/apps/<이름>`에서 `harness/attach-sobaya.sh`와 `harness/sobaya.lock`을 사용한다. 기존 update·sync와 주간 upstream 이슈는 유지한다. 구형 연결 자동 이전과 설치형 주간 릴리스 알림은 후속 작업이다.
- 스택 PR: 아래 브랜치 위에 쌓을 때 claim 에 `base: <아래 브랜치>` 를 적는다. 그래야 `check` 와 PR 본문이 올바른 기준으로 본다.
- 머지된 브랜치에는 더 커밋하지 않는다. pre-push 가 막는다 — 새 브랜치를 파고 cherry-pick 한다.
- `spec.md`·`failed-test.md` 는 브랜치 단위. PR 전에 handoff 가 `collab/journal/plans/` 로 옮긴다. main 에 남기지 않는다.

## 하네스를 고칠 때
- 하네스를 고치면 `sh tests/hooks.sh`, `sh tests/loop.sh`, `sh tests/sobaya.sh`와 `/bin/bash tests/sobaya-installed.sh all`을 실행한다. 새 스위트는 `SOBAYA_TEST_ASSETS`·`SOBAYA_TEST_SOURCE`가 필요하다. [검증 준비와 한계](docs/sobaya-installed.md#8-템플릿-유지보수-검증)를 따른다.
- 승인된 테스트는 그대로 유지한다. 현재 fixture 수정 v3는 사람 승인 대기 중이므로 원본과 바꿔 합격 처리하지 않는다. macOS·Linux 검증과 별도 완료 리뷰 전에는 전체 완료나 ready를 선언하지 않는다.
- `harness/VERSION` 을 올리고 `harness/CHANGELOG.md` 에 한 줄.
